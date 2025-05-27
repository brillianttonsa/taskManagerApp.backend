// Authentication routes
import express from "express"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { query } from "../config/database.js"
import { sendEmail, emailTemplates } from "../config/email.js"
import { generateToken } from "../middleware/auth.js"
import { validateRegistration, validateLogin } from "../middleware/validation.js"
import { asyncHandler } from "../middleware/errorHandler.js"

const router = express.Router()

// User Registration
router.post(
  "/register",
  validateRegistration,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists with this email or username" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, hashedPassword],
    )

    const newUser = result.rows[0]

    // Generate JWT token
    const token = generateToken(newUser)

    // Send welcome email
    await sendEmail(newUser.email, "Welcome to TaskFlow!", emailTemplates.welcomeEmail(newUser.username))

    console.log("✅ User registered:", { id: newUser.id, username, email })

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
      token,
    })
  }),
)

// User Login
router.post(
  "/login",
  validateLogin,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Find user
    const result = await query("SELECT id, username, email, password_hash FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const user = result.rows[0]

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate JWT token
    const token = generateToken(user)

    console.log("✅ User logged in:", { id: user.id, username: user.username, email })

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  }),
)

// Forgot Password
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Find user
    const result = await query("SELECT id, username, email FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    const user = result.rows[0]

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP",
      [user.id, resetToken, resetTokenExpiry],
    )

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    await sendEmail(
      user.email,
      "Password Reset Request - TaskFlow",
      emailTemplates.passwordReset(user.username, resetUrl),
    )

    console.log("🔑 Password reset requested for:", user.email)
    console.log("🔗 Reset URL:", resetUrl)

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  }),
)

export default router

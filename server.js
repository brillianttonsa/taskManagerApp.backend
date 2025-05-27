// Main server entry point - Clean and modular
import express from "express"
import cors from "cors"
import dotenv from "dotenv"


// Import configurations
import { testConnection } from "./config/database.js"
import { setupEmail } from "./config/email.js"

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js"

// Import routes
import authRoutes from "./routes/auth.js"
import taskRoutes from "./routes/tasks.js"
import familyRoutes from "./routes/family.js"
import dashboardRoutes from "./routes/dashboard.js"

// Load environment variables
dotenv.config()

console.log("🚀 Starting TaskFlow Server...")
console.log("📦 Node.js version:", process.version)

// Initialize express app
const app = express()
const PORT = process.env.PORT || 5000

// Basic middleware
// app.use(
//   cors({
//     origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
//     credentials: true,
//   }),
// )
app.use(cors());
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))


// Test connections on startup
await testConnection()
await setupEmail()

console.log("🔧 Setting up routes...")

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "TaskFlow Server is running",
    timestamp: new Date().toISOString(),
    node_version: process.version,
    uptime: process.uptime(),
  })
})

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API Server",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/*",
      tasks: "/api/tasks/*",
      family: "/api/family/*",
      dashboard: "/api/dashboard/*",
    },
  })
})

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/family", familyRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🌐 API Base URL: http://localhost:${PORT}`)
  console.log(`📚 Available endpoints:`)
  console.log(`   🔐 Auth: /api/auth/register, /api/auth/login`)
  console.log(`   📋 Tasks: /api/tasks (GET, POST, PUT, DELETE)`)
  console.log(`   👨‍👩‍👧‍👦 Family: /api/family/* (info, create, join, members, tasks)`)
  console.log(`   📊 Dashboard: /api/dashboard/stats`)
  console.log(`✅ Server startup complete!`)
})

export default app

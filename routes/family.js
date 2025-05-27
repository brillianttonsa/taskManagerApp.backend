// Family management routes
import express from "express"
import { query, withTransaction } from "../config/database.js"
import { authenticateToken } from "../middleware/auth.js"
import { validateFamily, validateTaskId } from "../middleware/validation.js"
import { asyncHandler } from "../middleware/errorHandler.js"
import { getCurrentWeekStart, generateInvitationCode } from "../utils/helpers.js"

const router = express.Router()
const isDev = process.env.NODE_ENV !== "production"

// All routes require authentication
router.use(authenticateToken)

// Get family info
router.get(
  "/info",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT f.* FROM families f 
     JOIN family_members fm ON f.id = fm.family_id 
     WHERE fm.user_id = $1`,
      [req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "You are not part of any family" })
    }

    res.json(result.rows[0])
  }),
)

// Create family
router.post(
  "/create",
  validateFamily,
  asyncHandler(async (req, res) => {
    const { name } = req.body

    const result = await withTransaction(async (client) => {
      const existingMember = await client.query("SELECT id FROM family_members WHERE user_id = $1", [req.user.id])

      if (existingMember.rows.length > 0) {
        throw new Error("You are already a member of a family")
      }

      const invitationCode = generateInvitationCode()

      const familyResult = await client.query(
        "INSERT INTO families (name, created_by, invitation_code) VALUES ($1, $2, $3) RETURNING *",
        [name.trim(), req.user.id, invitationCode],
      )

      const newFamily = familyResult.rows[0]

      await client.query("INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)", [newFamily.id, req.user.id])

      return newFamily
    })

    if (isDev) {
      console.log("✅ Family created:", { id: result.id, name: name.trim() }) // Removed invitation_code
    }

    res.status(201).json({
      message: "Family created successfully",
      family_id: result.id,
      name: result.name,
      invitation_code: result.invitation_code, // This is returned but not logged
    })
  }),
)

// Join family
router.post(
  "/join",
  asyncHandler(async (req, res) => {
    const { invitationCode } = req.body

    if (!invitationCode || invitationCode.trim().length === 0) {
      return res.status(400).json({ error: "Invitation code is required" })
    }

    const result = await withTransaction(async (client) => {
      const existingMember = await client.query("SELECT id FROM family_members WHERE user_id = $1", [req.user.id])

      if (existingMember.rows.length > 0) {
        throw new Error("You are already a member of a family")
      }

      const familyResult = await client.query("SELECT * FROM families WHERE invitation_code = $1", [
        invitationCode.trim().toUpperCase(),
      ])

      if (familyResult.rows.length === 0) {
        throw new Error("Invalid invitation code")
      }

      const family = familyResult.rows[0]

      await client.query("INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)", [family.id, req.user.id])

      return family
    })

    if (isDev) {
      console.log("✅ User joined a family.") // Removed userId and familyId
    }

    res.json({
      message: "Successfully joined family",
      family_id: result.id,
      name: result.name,
    })
  }),
)

// Get family members
router.get(
  "/members",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT u.id, u.username, u.email 
     FROM users u
     JOIN family_members fm1 ON u.id = fm1.user_id
     JOIN family_members fm2 ON fm1.family_id = fm2.family_id
     WHERE fm2.user_id = $1`,
      [req.user.id],
    )

    res.json(result.rows)
  }),
)

// Get family tasks
router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT ft.*, u.username as assigned_username
     FROM family_tasks ft
     JOIN users u ON ft.assigned_to = u.id
     JOIN family_members fm ON ft.family_id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY 
       CASE WHEN ft.status = 'pending' THEN 0 ELSE 1 END, 
       ft.priority DESC, 
       ft.created_at DESC`,
      [req.user.id],
    )

    res.json(result.rows)
  }),
)

// Create family task
router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const { title, description, priority, assigned_to } = req.body

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Task title is required" })
    }

    if (!assigned_to) {
      return res.status(400).json({ error: "Assigned user is required" })
    }

    const familyResult = await query(
      `SELECT f.* FROM families f 
     JOIN family_members fm ON f.id = fm.family_id 
     WHERE fm.user_id = $1`,
      [req.user.id],
    )

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: "You are not part of any family" })
    }

    const family = familyResult.rows[0]

    if (family.created_by !== req.user.id) {
      return res.status(403).json({ error: "Only the family leader can create tasks" })
    }

    const weekStart = getCurrentWeekStart()

    const result = await query(
      `INSERT INTO family_tasks (family_id, created_by, title, description, priority, assigned_to, week_start) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
      [
        family.id,
        req.user.id,
        title.trim(),
        description?.trim() || null,
        priority || 1,
        assigned_to,
        weekStart.toISOString().split("T")[0],
      ],
    )

    const taskWithUsername = await query(
      `SELECT ft.*, u.username as assigned_username
     FROM family_tasks ft
     JOIN users u ON ft.assigned_to = u.id
     WHERE ft.id = $1`,
      [result.rows[0].id],
    )

    if (isDev) {
      console.log("✅ Family task created") // Removed title/id
    }

    res.status(201).json(taskWithUsername.rows[0])
  }),
)

// Update family task
router.put(
  "/tasks/:taskId",
  validateTaskId,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params
    const { title, description, priority, status, assigned_to } = req.body

    const taskResult = await query(
      `SELECT ft.*, f.created_by as family_leader
     FROM family_tasks ft
     JOIN families f ON ft.family_id = f.id
     JOIN family_members fm ON f.id = fm.family_id
     WHERE ft.id = $1 AND fm.user_id = $2`,
      [taskId, req.user.id],
    )

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" })
    }

    const task = taskResult.rows[0]

    if (task.family_leader !== req.user.id && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: "You don't have permission to update this task" })
    }

    const completedAt = status === "completed" ? new Date() : null

    const result = await query(
      `UPDATE family_tasks 
     SET title = $1, description = $2, priority = $3, status = $4, assigned_to = $5, completed_at = $6, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $7 
     RETURNING *`,
      [title, description, priority, status, assigned_to, completedAt, taskId],
    )

    const updatedTaskResult = await query(
      `SELECT ft.*, u.username as assigned_username
     FROM family_tasks ft
     JOIN users u ON ft.assigned_to = u.id
     WHERE ft.id = $1`,
      [taskId],
    )

    if (isDev) {
      console.log("✅ Family task updated") // Removed taskId/status
    }

    res.json(updatedTaskResult.rows[0])
  }),
)

// Delete family task
router.delete(
  "/tasks/:taskId",
  validateTaskId,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params

    const taskResult = await query(
      `SELECT ft.id
     FROM family_tasks ft
     JOIN families f ON ft.family_id = f.id
     WHERE ft.id = $1 AND f.created_by = $2`,
      [taskId, req.user.id],
    )

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found or you don't have permission to delete it" })
    }

    await query("DELETE FROM family_tasks WHERE id = $1", [taskId])

    if (isDev) {
      console.log("✅ Family task deleted") // Removed taskId
    }

    res.json({ message: "Task deleted successfully" })
  }),
)

export default router

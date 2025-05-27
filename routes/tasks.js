// Personal task routes
import express from "express"
import { query } from "../config/database.js"
import { authenticateToken } from "../middleware/auth.js"
import { validateTask, validateTaskId } from "../middleware/validation.js"
import { asyncHandler } from "../middleware/errorHandler.js"
import { getCurrentWeekStart } from "../utils/helpers.js"

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * GET /api/tasks
 * Fetch all active personal tasks
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND archived = FALSE 
       ORDER BY 
         CASE WHEN status = 'pending' THEN 0 ELSE 1 END, 
         priority DESC, 
         created_at DESC`,
      [req.user.id],
    )
    res.json(result.rows)
  }),
)

/**
 * POST /api/tasks
 * Create a new personal task
 */
router.post(
  "/",
  validateTask,
  asyncHandler(async (req, res) => {
    const { title, description, priority, status } = req.body
    const weekStart = getCurrentWeekStart()

    const result = await query(
      `INSERT INTO tasks (user_id, title, description, priority, status, assigned_to, week_start, completed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description?.trim() || null,
        priority || 1,
        status || "pending",
        req.user.id,
        weekStart.toISOString().split("T")[0],
        status === "completed" ? new Date() : null,
      ],
    )

    res.status(201).json(result.rows[0])
  }),
)

/**
 * PUT /api/tasks/:id
 * Update a personal task
 */
router.put(
  "/:id",
  validateTaskId,
  validateTask,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { title, description, priority, status } = req.body

    const taskCheck = await query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    )

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" })
    }

    const completedAt = status === "completed" ? new Date() : null

    const result = await query(
      `UPDATE tasks 
       SET title = $1, description = $2, priority = $3, status = $4, completed_at = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 AND user_id = $7 
       RETURNING *`,
      [
        title.trim(),
        description?.trim(),
        priority,
        status,
        completedAt,
        id,
        req.user.id,
      ],
    )

    res.json(result.rows[0])
  }),
)

/**
 * DELETE /api/tasks/:id
 * Delete a personal task
 */
router.delete(
  "/:id",
  validateTaskId,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const result = await query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" })
    }

    res.json({ message: "Task deleted successfully" })
  }),
)

/**
 * POST /api/tasks/archive
 * Archive old tasks from previous weeks
 */
router.post(
  "/archive",
  asyncHandler(async (req, res) => {
    const weekStart = getCurrentWeekStart()
    const lastWeek = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)

    const result = await query(
      `UPDATE tasks 
       SET archived = TRUE, archived_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND week_start < $2 AND archived = FALSE 
       RETURNING id`,
      [req.user.id, lastWeek.toISOString().split("T")[0]],
    )

    res.json({
      message: "Tasks archived successfully",
      archived_count: result.rows.length,
    })
  }),
)

export default router

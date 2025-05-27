// Dashboard and analytics routes
import express from "express"
import { query } from "../config/database.js"
import { authenticateToken } from "../middleware/auth.js"
import { asyncHandler } from "../middleware/errorHandler.js"

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Get dashboard statistics
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    // Get current week stats
    const currentWeekResult = await query(
      `SELECT 
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks
     FROM tasks 
     WHERE user_id = $1 AND archived = FALSE`,
      [req.user.id],
    )

    const currentWeekStats = currentWeekResult.rows[0]

    // Get weekly data - only weeks where user actually had tasks
    const weeklyResult = await query(
      `SELECT 
      week_start,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks
     FROM tasks 
     WHERE user_id = $1 AND archived = FALSE
     GROUP BY week_start
     ORDER BY week_start DESC
     LIMIT 4`,
      [req.user.id],
    )

    const weeklyData = weeklyResult.rows.map((row) => ({
      week_start: row.week_start,
      total_tasks: Number.parseInt(row.total_tasks),
      completed_tasks: Number.parseInt(row.completed_tasks),
      pending_tasks: Number.parseInt(row.pending_tasks),
    }))

    res.json({
      currentWeek: {
        total_tasks: Number.parseInt(currentWeekStats.total_tasks),
        completed_tasks: Number.parseInt(currentWeekStats.completed_tasks),
        pending_tasks: Number.parseInt(currentWeekStats.pending_tasks),
      },
      weeklyData: weeklyData,
    })
  }),
)

// Get detailed analytics
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const { timeframe = "month" } = req.query

    let dateFilter = ""
    switch (timeframe) {
      case "week":
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case "month":
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'"
        break
      case "year":
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'"
        break
      default:
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'"
    }

    // Task completion trends
    const trendsResult = await query(
      `SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
     FROM tasks 
     WHERE user_id = $1 AND archived = FALSE ${dateFilter}
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
      [req.user.id],
    )

    // Priority distribution
    const priorityResult = await query(
      `SELECT 
      priority,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
     FROM tasks 
     WHERE user_id = $1 AND archived = FALSE ${dateFilter}
     GROUP BY priority
     ORDER BY priority DESC`,
      [req.user.id],
    )

    res.json({
      trends: trendsResult.rows,
      priorityDistribution: priorityResult.rows,
      timeframe,
    })
  }),
)

export default router

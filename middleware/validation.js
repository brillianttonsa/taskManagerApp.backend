// Input validation middleware
export const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body

  const errors = []

  if (!username || username.trim().length < 3) {
    errors.push("Username must be at least 3 characters long")
  }

  if (!email || !isValidEmail(email)) {
    errors.push("Valid email address is required")
  }

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long")
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") })
  }

  next()
}

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  next()
}

export const validateTask = (req, res, next) => {
  const { title } = req.body

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: "Task title is required" })
  }

  if (title.length > 200) {
    return res.status(400).json({ error: "Task title must be less than 200 characters" })
  }

  next()
}

export const validateFamily = (req, res, next) => {
  const { name } = req.body

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Family name is required" })
  }

  if (name.length > 100) {
    return res.status(400).json({ error: "Family name must be less than 100 characters" })
  }

  next()
}

export const validateTaskId = (req, res, next) => {
  const { id, taskId } = req.params
  const paramId = id || taskId

  if (!paramId || isNaN(Number.parseInt(paramId))) {
    return res.status(400).json({ error: "Invalid task ID format" })
  }

  // Convert to integer for consistency
  if (id) req.params.id = Number.parseInt(id)
  if (taskId) req.params.taskId = Number.parseInt(taskId)

  next()
}

// Helper functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default {
  validateRegistration,
  validateLogin,
  validateTask,
  validateFamily,
  validateTaskId,
}

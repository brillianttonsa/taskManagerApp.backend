// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error("❌ Server Error:", err)

  // Database errors
  if (err.code === "23505") {
    return res.status(400).json({
      error: "Resource already exists",
      details: "This email or username is already taken",
    })
  }

  if (err.code === "23503") {
    return res.status(400).json({
      error: "Invalid reference",
      details: "Referenced resource does not exist",
    })
  }

  if (err.code === "23514") {
    return res.status(400).json({
      error: "Invalid data",
      details: "Data does not meet requirements",
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" })
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.message,
    })
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default { errorHandler, asyncHandler }

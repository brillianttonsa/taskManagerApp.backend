// Utility functions
export const getCurrentWeekStart = () => {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day
  const weekStart = new Date(today.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

export const formatDate = (date) => {
  return new Date(date).toISOString().split("T")[0]
}

export const generateInvitationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const validatePriority = (priority) => {
  return [1, 2, 3].includes(priority)
}

export const validateStatus = (status) => {
  return ["pending", "completed"].includes(status)
}

export const calculateCompletionRate = (completed, total) => {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export const getWeekRange = (weekStart) => {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input
  return input.trim().replace(/[<>]/g, "")
}

export const paginate = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit
  return { limit, offset }
}

export default {
  getCurrentWeekStart,
  formatDate,
  generateInvitationCode,
  validatePriority,
  validateStatus,
  calculateCompletionRate,
  getWeekRange,
  isValidEmail,
  sanitizeInput,
  paginate,
}

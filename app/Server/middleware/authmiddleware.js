import jwt from "jsonwebtoken"
import User from "../model/usermodel.js"

// Required authentication
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select("-password")
    if (!user) return res.status(401).json({ error: "Invalid token. User not found." })

    req.user = user
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(401).json({ error: "Invalid token." })
  }
}

// Optional authentication for GUI
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")
      if (user) req.user = user
    }
    next()
  } catch (error) {
    next() // Ignore errors and continue without user
  }
}

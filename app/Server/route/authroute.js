import express from "express"
import User from "../model/usermodel.js"
import jwt from "jsonwebtoken"
import { verifyToken } from "../middleware/authmiddleware.js"

const router = express.Router()

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Password validation: at least 1 letter, 1 number, 1 special character, min 8 chars
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!pwRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include at least one letter, one number, and one special character",
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const newUser = new User({ username, email, password })
    await newUser.save()

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    })
    res
      .status(201)
      .json({ user: { id: newUser._id, username, email }, token })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" })

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: "Invalid credentials" })

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    })
    res
      .status(200)
      .json({ user: { id: user._id, username: user.username, email }, token })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Example Protected Route
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json({ user: req.user })
})

export default router

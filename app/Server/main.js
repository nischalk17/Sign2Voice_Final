import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./route/authroute.js"
import sentenceRoutes from "./route/sentenceRoute.js"
import { spawn } from "child_process"
import path from "path"

dotenv.config()
const app = express()

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/sentences", sentenceRoutes) // Added sentence routes

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Open Sign2Voice GUI
app.post("/api/open-webcam", (req, res) => {
  const guiPath = path.resolve("../gui_main.py") // relative to Server folder

  const pythonProcess = spawn("python", [guiPath])

  let isReady = false
  let hasResponded = false

  const timeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true
      res.status(500).json({ error: "Python script initialization timeout" })
    }
  }, 30000) // 30 second timeout

  pythonProcess.stdout.on("data", (data) => {
    const output = data.toString()
    console.log("Python stdout:", output)

    if (output.includes("SIGN2VOICE_READY") && !hasResponded) {
      isReady = true
      hasResponded = true
      clearTimeout(timeout)
      res.json({ message: "✅ Webcam Translator launched and ready" })
    }
  })

  pythonProcess.stderr.on("data", (data) => {
    console.error("Python stderr:", data.toString())
  })

  pythonProcess.on("error", (error) => {
    console.error("Error launching GUI:", error.message)
    if (!hasResponded) {
      hasResponded = true
      clearTimeout(timeout)
      res.status(500).json({ error: "Failed to launch Python script" })
    }
  })

  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`)
    if (!hasResponded) {
      hasResponded = true
      clearTimeout(timeout)
      res.json({ message: "Python script completed" })
    }
  })
})

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/sign2voice")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
    process.exit(1)
  })

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})

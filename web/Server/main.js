import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./route/authroute.js";
import sentenceRoutes from "./route/sentenceRoute.js";
import adminAuthRoutes from "./route/adminAuth.js";
import adminPanelRoutes from "./route/adminPanel.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "./middleware/authmiddleware.js";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

// Slow down password guessing: 20 attempts per 15 minutes per IP on every login/register endpoint.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again in a few minutes." },
});
app.use(["/api/auth/login", "/api/auth/register", "/api/admin/login"], authLimiter);

// Public / User Routes
app.use("/api/auth", authRoutes);
app.use("/api/sentences", sentenceRoutes);

// Admin Routes
app.use("/api/admin", adminAuthRoutes);       // Admin login/register
app.use("/api/admin-panel", adminPanelRoutes); // Admin panel actions

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Open Sign2Voice GUI
let guiProcess = null; // only one desktop GUI at a time
app.post("/api/open-webcam", verifyToken, (req, res) => {
  if (guiProcess && guiProcess.exitCode === null) {
    return res.json({ message: "Sign2Voice is already running. Look for its window." });
  }
  const guiPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../desktop/gui_main.py");
  // The logged-in user's token goes to the GUI via an environment variable (not argv, which other
  // processes can read), so the user does not have to log in a second time.
  const token = req.header("Authorization").replace("Bearer ", "");
  const pythonProcess = spawn(process.env.PYTHON_BIN || "python", [guiPath], {
    env: { ...process.env, SIGN2VOICE_TOKEN: token },
  });
  guiProcess = pythonProcess;
  let hasResponded = false;

  const timeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      res.status(500).json({ error: "Python script initialization timeout" });
    }
  }, 120000);

  pythonProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("Python stdout:", output);
    if (output.includes("SIGN2VOICE_READY") && !hasResponded) {
      hasResponded = true;
      clearTimeout(timeout);
      res.json({ message: "✅ Webcam Translator launched and ready" });
    }
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error("Python stderr:", data.toString());
  });

  pythonProcess.on("error", (error) => {
    console.error("Error launching GUI:", error.message);
    if (!hasResponded) {
      hasResponded = true;
      clearTimeout(timeout);
      res.status(500).json({ error: "Failed to launch Python script" });
    }
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`);
    if (!hasResponded) {
      hasResponded = true;
      clearTimeout(timeout);
      // GUI exited before signalling ready: report it as an error instead of a fake success.
      res.status(500).json({ error: `Desktop GUI exited before it was ready (code ${code}). Check the server console and PYTHON_BIN.` });
    }
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/sign2voice")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

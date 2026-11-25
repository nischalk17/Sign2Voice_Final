import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../model/Admin.js";

const router = express.Router();
// Read lazily (imports run before dotenv.config()); never fall back to a default.
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id, role: admin.role }, getJwtSecret(),{ expiresIn: "1d" });
    res.json({ token, admin: { id: admin._id, email: admin.email, role: admin.role } });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;

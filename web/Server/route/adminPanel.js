import express from "express";
import User from "../model/usermodel.js";
import Sentence from "../model/sentence.js";
import { verifyAdminToken } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Get all users
router.get("/users", verifyAdminToken, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // exclude passwords
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all user sentence history
router.get("/user-sentences", verifyAdminToken, async (req, res) => {
  try {
    const sentences = await Sentence.find().populate("user", "email username");
    res.json(sentences);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sentence history" });
  }
});

export default router;

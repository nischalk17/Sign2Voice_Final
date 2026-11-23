import express from "express";
import mongoose from "mongoose";
import Sentence from "../model/sentence.js";
import { verifyToken } from "../middleware/authmiddleware.js";

const router = express.Router();

// ---------------- Save a new sentence (authenticated) ----------------
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Sentence cannot be empty" });
    }

    const sentence = new Sentence({
      user: req.user._id, // assign current logged-in user
      text: text.trim(),
      sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
      source: "gui",
    });

    await sentence.save();

    res.status(201).json({
      message: "Sentence saved successfully",
      sentence,
    });
  } catch (err) {
    console.error("Error saving sentence:", err);
    res.status(500).json({ error: "Server error while saving sentence" });
  }
});

// ---------------- Save sentence via web (authenticated) ----------------
router.post("/", verifyToken, async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Sentence cannot be empty" });
    }

    const sentence = new Sentence({
      user: req.user._id,
      text: text.trim(),
      sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
      source: "web",
    });

    await sentence.save();

    res.status(201).json({
      message: "Sentence saved successfully",
      sentence,
    });
  } catch (err) {
    console.error("Error saving sentence:", err);
    res.status(500).json({ error: "Server error while saving sentence" });
  }
});

// ---------------- Get all sentences of logged-in user ----------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, sessionId } = req.query;
    const query = { user: req.user._id };

    if (sessionId) {
      query.sessionId = sessionId;
    }

    const sentences = await Sentence.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Sentence.countDocuments(query);

    res.json({
      sentences,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("Error fetching sentences:", err);
    res.status(500).json({ error: "Server error while fetching sentences" });
  }
});

// ---------------- Delete a sentence (only owner can delete) ----------------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const sentence = await Sentence.findOne({
      _id: req.params.id,
      user: req.user._id, // ensure only owner can delete
    });

    if (!sentence) {
      return res.status(404).json({ error: "Sentence not found" });
    }

    await sentence.deleteOne();
    res.json({ message: "Sentence deleted successfully" });
  } catch (err) {
    console.error("Error deleting sentence:", err);
    res.status(500).json({ error: "Server error while deleting sentence" });
  }
});

// ---------------- Get sentence statistics (user-specific) ----------------
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const sentences = await Sentence.find({ user: req.user._id }).sort({ createdAt: -1 });

    const stats = sentences.map((s) => ({
      _id: s._id,
      text: s.text,
      wordCount: s.wordCount,
      sessionId: s.sessionId,
      source: s.source,
      timestamp: s.timestamp,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: s.user,
    }));

    res.status(200).json({ stats });
  } catch (err) {
    console.error("Error fetching sentence stats:", err);
    res.status(500).json({ error: "Server error while fetching stats" });
  }
});

export default router;

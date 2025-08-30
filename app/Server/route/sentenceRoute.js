import express from "express"
import mongoose from "mongoose" // Declare mongoose variable
import Sentence from "../model/sentence.js"
import { verifyToken } from "../middleware/authmiddleware.js"

const router = express.Router()

// Save a new sentence (from GUI - no auth required)
router.post("/save", async (req, res) => {
  try {
    const { text, sessionId } = req.body

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Sentence cannot be empty" })
    }

    const sentence = new Sentence({
      text: text.trim(),
      sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
      source: "gui",
    })

    await sentence.save()

    res.status(201).json({
      message: "Sentence saved successfully",
      sentence: {
        id: sentence._id,
        text: sentence.text,
        wordCount: sentence.wordCount,
        timestamp: sentence.timestamp,
        sessionId: sentence.sessionId,
      },
    })
  } catch (err) {
    console.error("Error saving sentence:", err)
    res.status(500).json({ error: "Server error while saving sentence" })
  }
})

// Save a new sentence (authenticated route for web users)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { text, sessionId } = req.body

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Sentence cannot be empty" })
    }

    const sentence = new Sentence({
      user: req.user._id,
      text: text.trim(),
      sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
      source: "web",
    })

    await sentence.save()

    res.status(201).json({
      message: "Sentence saved successfully",
      sentence,
    })
  } catch (err) {
    console.error("Error saving sentence:", err)
    res.status(500).json({ error: "Server error while saving sentence" })
  }
})

// Get all sentences of a user
router.get("/", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, sessionId } = req.query
    const query = { user: req.user._id }

    if (sessionId) {
      query.sessionId = sessionId
    }

    const sentences = await Sentence.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()

    const total = await Sentence.countDocuments(query)

    res.json({
      sentences,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (err) {
    console.error("Error fetching sentences:", err)
    res.status(500).json({ error: "Server error while fetching sentences" })
  }
})

// Get sentences by session ID (no auth required for GUI)
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params
    const sentences = await Sentence.find({ sessionId }).sort({ createdAt: -1 }).exec()

    res.json({ sentences })
  } catch (err) {
    console.error("Error fetching session sentences:", err)
    res.status(500).json({ error: "Server error while fetching session sentences" })
  }
})

// Delete a sentence

// Delete a sentence
router.delete("/:id", async (req, res) => {
  try {
    const sentence = await Sentence.findOne({
      _id: req.params.id,
      // user: req.user._id, // ensures only the owner can delete
    })

    if (!sentence) {
      return res.status(404).json({ error: "Sentence not found" })
    }

    await sentence.deleteOne()
    res.json({ message: "Sentence deleted successfully" })
  } catch (err) {
    console.error("Error deleting sentence:", err)
    res.status(500).json({ error: "Server error while deleting sentence" })
  }
})
// Get sentence statistics
// router.get("/stats", verifyToken, async (req, res) => {
//   try {
//     // Aggregate all sentences (no user filter)
//     const stats = await Sentence.aggregate([
//       {
//         $group: {
//           _id: "$sessionId",
//           sessionSentences: { $sum: 1 },
//           sessionWords: { $sum: "$wordCount" },
//           firstSentence: { $min: "$createdAt" },
//           lastSentence: { $max: "$createdAt" },
//         },
//       },
//     ]);

//     // Compute totals across all sessions
//     const totalSentences = stats.reduce((sum, s) => sum + s.sessionSentences, 0);
//     const totalWords = stats.reduce((sum, s) => sum + s.sessionWords, 0);
//     const avgWordsPerSentence = totalSentences ? totalWords / totalSentences : 0;

//     res.json({
//       stats: {
//         totalSentences,
//         totalWords,
//         avgWordsPerSentence,
//         totalSessions: stats.length,
//         sessions: stats, // details per session
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching stats:", err);
//     res.status(500).json({ error: "Server error while fetching statistics" });
//   }
// });
router.get("/stats", async (req, res) => {
  try {
    // Fetch all sentences from DB
    const sentences = await Sentence.find().sort({ createdAt: -1 }); // newest first

    // Format data
    const stats = sentences.map((s) => ({
      _id: s._id,
      text: s.text,
      wordCount: s.wordCount,
      sessionId: s.sessionId,
      source: s.source,
      timestamp: s.timestamp,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: s.user || null,
    }));

    res.status(200).json({ stats });
  } catch (err) {
    console.error("Error fetching sentence stats:", err);
    res.status(500).json({ error: "Server error while fetching stats" });
  }
});
export default router

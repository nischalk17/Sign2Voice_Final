import mongoose from "mongoose"

const sentenceSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow anonymous sentences
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    sessionId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    source: {
      type: String,
      enum: ["gui", "web", "api"],
      default: "gui",
    },
  },
  { timestamps: true },
)

// Calculate word count before saving
sentenceSchema.pre("save", function (next) {
  this.wordCount = this.text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
  next()
})

// Index for better query performance
sentenceSchema.index({ user: 1, createdAt: -1 })
sentenceSchema.index({ sessionId: 1 })

export default mongoose.model("Sentence", sentenceSchema)

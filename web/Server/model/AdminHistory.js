// model/AdminHistory.js
import mongoose from "mongoose";

const AdminHistorySchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  action: { type: String, required: true },  // e.g., "Deleted user X"
  targetUser: { type: String }, // Optional: target username/email
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("AdminHistory", AdminHistorySchema);

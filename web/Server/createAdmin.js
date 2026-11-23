import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./model/Admin.js";

dotenv.config();

// Credentials come from the environment (never hardcode them):
//   ADMIN_EMAIL=...  ADMIN_PASSWORD=...  node createAdmin.js
const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env or the environment.");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    const existingAdmin = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    const admin = new Admin({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // hashed automatically by the model
      role: "admin",
    });

    await admin.save();
    console.log(`Admin created: ${ADMIN_EMAIL}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./model/Admin.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    const existingAdmin = await Admin.findOne({ email: "superadmin@gmail.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    const admin = new Admin({
      email: "superadmin@gmail.com",
      password: "SuperAdmin1$", // will be hashed automatically
      role: "admin",
    });

    await admin.save();
    console.log("Default admin created: email=superadmin@gmail.com, password=SuperAdmin1$");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

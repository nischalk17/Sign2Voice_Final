// middleware/adminAuthMiddleware.js
import jwt from "jsonwebtoken";
import Admin from "../model/Admin.js";  // <--- fixed path

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const verifyAdminToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ message: "Invalid token" });

    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

import express from "express";
import { exec } from "child_process";

const router = express.Router();

router.post("/start-webcam", (req, res) => {
  exec("python -m app.gui_main", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ success: false, message: "Failed to start webcam" });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    console.log(`Stdout: ${stdout}`);
  });

  res.json({ success: true, message: "Webcam started" });
});

export default router;

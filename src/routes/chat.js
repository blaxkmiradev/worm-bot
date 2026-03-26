const express = require("express");
const router = express.Router();
const { chat } = require("../services/gemini");

// POST /api/chat
// Body: { message: string, history: Array }
router.post("/", async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Convert history to Gemini format
  const geminiHistory = history.map((entry) => ({
    role: entry.role,
    parts: [{ text: entry.content }],
  }));

  try {
    const reply = await chat(geminiHistory, message.trim());
    return res.json({ reply });
  } catch (err) {
    console.error("[WormBot Error]", err.message);
    return res.status(500).json({ error: "WormBot hit a wall. Try again." });
  }
});

module.exports = router;

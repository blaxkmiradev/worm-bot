const express = require("express");
const router = express.Router();
const multer = require("multer");
const { chat } = require("../services/gemini");

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/chat
// Body: form-data { message, history, modelId, files }
router.post("/", upload.any(), async (req, res) => {
  let message = req.body.message;
  if (Array.isArray(message)) message = message[0];

  let modelId = req.body.modelId || "gemini-2.5-flash";
  
  // Backend override: If the user's browser has a cached index.html sending an unsupported model, 
  // silently fallback to gemini-2.5-flash to prevent a 404 crash.
  const supported = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.5-flash"];
  if (!supported.includes(modelId)) {
    modelId = "gemini-2.5-flash";
  }

  // If message is missing, provide a strong default to prevent crashes
  const hasFiles = req.files && req.files.length > 0;
  let finalMessage = (message && typeof message === "string" && message.trim()) ? message.trim() : null;
  
  if (!finalMessage && !hasFiles) {
    // If we have literally nothing, fallback to avoid a hard error lock
    finalMessage = "Please analyze my input.";
  } else if (!finalMessage && hasFiles) {
    finalMessage = "Please analyze the attached files.";
  }

  let history = [];
  try {
    if (req.body.history) history = JSON.parse(req.body.history);
  } catch (e) {}

  // Convert history to Gemini format
  const geminiHistory = history.map((entry) => ({
    role: entry.role,
    parts: [{ text: entry.content }],
  }));

  // Map uploaded files to inline data
  let fileParts = [];
  if (req.files && req.files.length > 0) {
    fileParts = req.files.map(file => {
      return {
        inlineData: {
          data: file.buffer.toString("base64"),
          mimeType: file.mimetype
        }
      };
    });
  }

  try {
    const reply = await chat(geminiHistory, finalMessage, modelId, fileParts);
    return res.json({ reply });
  } catch (err) {
    console.error(`[WormBot API Error] Model: ${modelId} | Message:`, err.message);
    return res.status(500).json({ error: `API Error: ${err.message}` });
  }
});

module.exports = router;

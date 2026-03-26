const express = require("express");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "../../generated");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// POST /api/generate-file — save content to disk and return download URL
const generateRouter = express.Router();
generateRouter.post("/", (req, res) => {
  const { filename, content } = req.body;
  if (!filename || content === undefined) {
    return res.status(400).json({ error: "filename and content are required." });
  }
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._\-]/g, "_");
  const filePath = path.join(OUTPUT_DIR, safeName);
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return res.json({ ok: true, filename: safeName, downloadUrl: `/files/${safeName}` });
  } catch (err) {
    console.error("[File Gen Error]", err.message);
    return res.status(500).json({ error: "Failed to write file." });
  }
});

// GET /files/:filename — download a saved file
const filesRouter = express.Router();
filesRouter.get("/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename).replace(/[^a-zA-Z0-9._\-]/g, "_");
  const filePath = path.join(OUTPUT_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }
  res.download(filePath, safeName);
});

module.exports = { generateRouter, filesRouter };

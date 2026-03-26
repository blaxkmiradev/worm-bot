const express = require("express");
const cors = require("cors");
const path = require("path");
const chatRoute = require("./routes/chat");
const { generateRouter, filesRouter } = require("./routes/files");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/chat", chatRoute);
app.use("/api/generate-file", generateRouter);
app.use("/files", filesRouter);

// Catch-all: serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

module.exports = app;

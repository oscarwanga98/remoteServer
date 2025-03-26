const express = require("express");

const cloudApp = express();
const CLOUD_PORT = 4000;
cloudApp.use(express.json());

let buffer = [];

// Endpoint to receive data and maintain a 3-hour buffer
cloudApp.post("/data", (req, res) => {
  try {
    const entry = { ...req.body, timestamp: Date.now() };
    buffer.push(entry);

    // Keep only the last 3 hours of data
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    buffer = buffer.filter((d) => d.timestamp >= threeHoursAgo);

    res.sendStatus(200);
  } catch (err) {
    console.error("Error processing data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to get the full 3-hour buffer
cloudApp.get("/data", (req, res) => {
  res.json(buffer);
});

// Endpoint to get the latest data entry
cloudApp.get("/latest", (req, res) => {
  if (buffer.length === 0) {
    return res.status(404).json({ error: "No data available" });
  }
  res.json(buffer[buffer.length - 1]);
});

cloudApp.listen(CLOUD_PORT, () => {
  console.log(`Cloud server running on port ${CLOUD_PORT}`);
});

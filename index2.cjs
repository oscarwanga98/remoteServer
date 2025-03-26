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

    console.log("Received Data:", entry); // Log received data
    res.sendStatus(200);
  } catch (err) {
    console.error("Error processing data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to get the full 3-hour buffer
cloudApp.get("/data", (req, res) => {
  console.log("Sending Full Buffer:", buffer);
  res.json(buffer);
});

// Endpoint to get the latest data entry
cloudApp.get("/latest", (req, res) => {
  if (buffer.length === 0) {
    console.log("No data available for /latest");
    return res.status(404).json({ error: "No data available" });
  }
  console.log("Sending Latest Data:", buffer[buffer.length - 1]);
  res.json(buffer[buffer.length - 1]);
});

// Simple Home Page to Display Latest Data
cloudApp.get("/", (req, res) => {
  const latestData = buffer.length > 0 ? buffer[buffer.length - 1] : null;
  res.send(`
    <html>
      <head>
        <title>Cloud Data Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Cloud Data Server</h1>
        <h2>Latest Sensor Data</h2>
        <pre>${
          latestData ? JSON.stringify(latestData, null, 2) : "No data available"
        }</pre>
      </body>
    </html>
  `);
});

// 🚀 Cumulative Dashboard (Auto-refreshing)
cloudApp.get("/dashboard", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Data Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #444; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
        <script>
          function refreshData() {
            fetch('/data')
              .then(response => response.json())
              .then(data => {
                document.getElementById('dataDisplay').innerText = JSON.stringify(data, null, 2);
              });

            fetch('/latest')
              .then(response => response.json())
              .then(latest => {
                document.getElementById('latestData').innerText = JSON.stringify(latest, null, 2);
              });
          }

          setInterval(refreshData, 5000);
          window.onload = refreshData;
        </script>
      </head>
      <body>
        <h1>Real-Time Data Dashboard</h1>
        <h2>Latest Sensor Data</h2>
        <pre id="latestData">Loading...</pre>

        <h2>Accumulated Data (Last 3 Hours)</h2>
        <pre id="dataDisplay">Loading...</pre>
      </body>
    </html>
  `);
});

// Start the Cloud Server
cloudApp.listen(CLOUD_PORT, () => {
  console.log(`Cloud server running on port ${CLOUD_PORT}`);
});

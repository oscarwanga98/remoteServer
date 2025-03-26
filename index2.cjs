const express = require("express");

const cloudApp = express();
const CLOUD_PORT = 4000;
cloudApp.use(express.json());

let buffer = [];

// Endpoint to receive data and maintain a 12-hour buffer
cloudApp.post("/data", (req, res) => {
  try {
    const entry = { ...req.body, timestamp: Date.now() };
    buffer.push(entry);

    // Keep only the last 12 hours of data
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    buffer = buffer.filter((d) => d.timestamp >= twelveHoursAgo);

    console.log("Received Data:", entry);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error processing data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to get filtered data based on time window
cloudApp.get("/data", (req, res) => {
  const window = parseInt(req.query.window) || 3; // Default to last 3 hours
  const timeAgo = Date.now() - window * 60 * 60 * 1000;
  const filteredData = buffer.filter((d) => d.timestamp >= timeAgo);
  res.json(filteredData);
});

// 🚀 Updated Graph-First Dashboard
cloudApp.get("/dashboard", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Data Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          h1 { color: #444; }
          label { font-weight: bold; margin-right: 10px; }
          select { padding: 5px; font-size: 14px; }
          canvas { margin-top: 20px; max-width: 100%; height: 400px; }
        </style>
        <script>
          let chart;
          
          function fetchAndUpdateGraph(windowHours) {
            fetch('/data?window=' + windowHours)
              .then(response => response.json())
              .then(data => updateGraph(data));
          }

          function updateGraph(data) {
            const timestamps = data.map(entry => new Date(entry.timestamp).toLocaleTimeString());
            const temperatures = data.map(entry => entry.temperature);
            const humidities = data.map(entry => entry.humidity);

            chart.data.labels = timestamps;
            chart.data.datasets[0].data = temperatures;
            chart.data.datasets[1].data = humidities;
            chart.update();
          }

          function handleWindowChange() {
            const selectedWindow = document.getElementById("timeWindow").value;
            fetchAndUpdateGraph(selectedWindow);
          }

          window.onload = function() {
            const ctx = document.getElementById('sensorChart').getContext('2d');
            chart = new Chart(ctx, {
              type: 'line',
              data: {
                labels: [],
                datasets: [
                  {
                    label: 'Temperature (°C)',
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    data: [],
                    fill: true
                  },
                  {
                    label: 'Humidity (%)',
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.2)',
                    data: [],
                    fill: true
                  }
                ]
              },
              options: {
                responsive: true,
                scales: {
                  x: { title: { display: true, text: 'Time' } },
                  y: { title: { display: true, text: 'Value' }, beginAtZero: true }
                }
              }
            });

            fetchAndUpdateGraph(3); // Default to 3 hours
            setInterval(() => fetchAndUpdateGraph(document.getElementById("timeWindow").value), 5000);
          }
        </script>
      </head>
      <body>
        <h1>Real-Time Sensor Trends</h1>

        <label for="timeWindow">Select Time Window:</label>
        <select id="timeWindow" onchange="handleWindowChange()">
          <option value="1">Last 1 Hour</option>
          <option value="3" selected>Last 3 Hours</option>
          <option value="6">Last 6 Hours</option>
          <option value="12">Last 12 Hours</option>
        </select>

        <canvas id="sensorChart"></canvas>
      </body>
    </html>
  `);
});

// Start the Cloud Server
cloudApp.listen(CLOUD_PORT, () => {
  console.log(`Cloud server running on port ${CLOUD_PORT}`);
});

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

    console.log("Received Data:", entry);
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

// 🚀 Enhanced Dashboard (Table + Graph)
cloudApp.get("/dashboard", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Data Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background: #f4f4f4; }
          canvas { margin-top: 20px; max-width: 100%; }
        </style>
        <script>
          function refreshData() {
            fetch('/data')
              .then(response => response.json())
              .then(data => {
                updateTable(data);
                updateGraph(data);
              });

            fetch('/latest')
              .then(response => response.json())
              .then(latest => {
                document.getElementById('latestData').innerText = JSON.stringify(latest, null, 2);
              });
          }

          function updateTable(data) {
            const tableBody = document.getElementById('dataTableBody');
            tableBody.innerHTML = "";
            data.forEach(entry => {
              let row = "<tr>";
              row += "<td>" + new Date(entry.timestamp).toLocaleTimeString() + "</td>";
              row += "<td>" + (entry.temperature || "-") + "°C</td>";
              row += "<td>" + (entry.humidity || "-") + "%</td>";
              row += "</tr>";
              tableBody.innerHTML += row;
            });
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

          setInterval(refreshData, 5000);
          window.onload = refreshData;
        </script>
      </head>
      <body>
        <h1>Real-Time Data Dashboard</h1>
        
        <h2>Latest Sensor Data</h2>
        <pre id="latestData">Loading...</pre>

        <h2>Data Table (Last 3 Hours)</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Temperature</th>
              <th>Humidity</th>
            </tr>
          </thead>
          <tbody id="dataTableBody">
            <tr><td colspan="3">Loading...</td></tr>
          </tbody>
        </table>

        <h2>Temperature & Humidity Trends</h2>
        <canvas id="sensorChart"></canvas>

        <script>
          const ctx = document.getElementById('sensorChart').getContext('2d');
          const chart = new Chart(ctx, {
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
        </script>
      </body>
    </html>
  `);
});

// Start the Cloud Server
cloudApp.listen(CLOUD_PORT, () => {
  console.log(`Cloud server running on port ${CLOUD_PORT}`);
});

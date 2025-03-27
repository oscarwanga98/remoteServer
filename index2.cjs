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

// 🚀 Real-Time Data Dashboard
cloudApp.get("/dashboard", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Data Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          h1 { color: #444; }
          .live-data { 
            display: flex; 
            flex-wrap: wrap; 
            justify-content: center; 
            gap: 15px; 
            margin: 20px 0;
            font-size: 16px;
          }
          .data-box { 
            padding: 10px 15px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            background: #f9f9f9; 
            box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
          }
          #alarm { 
            font-size: 22px; 
            font-weight: bold; 
            display: none; 
            margin-top: 20px; 
            color: white;
            background: red;
            padding: 10px;
            border-radius: 5px;
            animation: flash 1s infinite alternate;
          }
          @keyframes flash {
            0% { background: red; }
            100% { background: yellow; }
          }
          label { font-weight: bold; margin-right: 10px; }
          select { padding: 5px; font-size: 14px; }
          canvas { margin-top: 20px; max-width: 100%; height: 400px; }
        </style>
        <script>
          let chart;
          let alarmInterval;
          let alarmAudio = new Audio('https://www.soundjay.com/button/beep-07.wav');

          function fetchAndUpdateData(windowHours) {
            fetch('/data?window=' + windowHours)
              .then(response => response.json())
              .then(data => {
                updateLiveData(data);
                updateGraph(data);
                checkForAlarm(data);
              });
          }

          function updateLiveData(data) {
            if (data.length > 0) {
              const latest = data[data.length - 1];

              document.getElementById("temperature").innerText = latest.temperature + "°C";
              document.getElementById("humidity").innerText = latest.humidity + "%";
              document.getElementById("ambientTemp").innerText = latest.ambientTemp + "°C";
              document.getElementById("fanRPM").innerText = latest.fanRPM + " RPM";
              document.getElementById("fanLevel").innerText = latest.fanLevel;
              document.getElementById("fanPWM").innerText = latest.fanPWM;
              document.getElementById("fanState").innerText = latest.fanState;
              document.getElementById("humidifierMode").innerText = latest.humidifierMode;
              document.getElementById("lastUpdated").innerText = new Date(latest.lastUpdated).toLocaleString();
            }
          }

          function updateGraph(data) {
            const timestamps = data.map(entry => new Date(entry.timestamp).toLocaleTimeString());
            const temperatures = data.map(entry => entry.temperature);
            const humidities = data.map(entry => entry.humidity);
            const ambientTemps = data.map(entry => entry.ambientTemp);

            chart.data.labels = timestamps;
            chart.data.datasets[0].data = temperatures;
            chart.data.datasets[1].data = humidities;
            chart.data.datasets[2].data = ambientTemps;
            chart.update();
          }

          function checkForAlarm(data) {
            if (data.length > 0) {
              const latest = data[data.length - 1];
              const temperature = latest.temperature;
              const ambientTemp = latest.ambientTemp;

              if (temperature > 25 || ambientTemp > 26) {
                document.getElementById("alarm").style.display = "block";
                
                if (!alarmInterval) {
                  alarmInterval = setInterval(() => {
                    alarmAudio.play();
                  }, 5000);
                }
              } else {
                document.getElementById("alarm").style.display = "none";
                clearInterval(alarmInterval);
                alarmInterval = null;
              }
            }
          }

          function handleWindowChange() {
            const selectedWindow = document.getElementById("timeWindow").value;
            fetchAndUpdateData(selectedWindow);
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
                  },
                  {
                    label: 'Ambient Temperature (°C)',
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.2)',
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

            fetchAndUpdateData(3);
            setInterval(() => fetchAndUpdateData(document.getElementById("timeWindow").value), 5000);
          }
        </script>
      </head>
      <body>
        <h1>Real-Time Sensor Trends</h1>

        <div class="live-data">
          <div class="data-box"><strong>Temperature:</strong> <span id="temperature">--</span></div>
          <div class="data-box"><strong>Humidity:</strong> <span id="humidity">--</span></div>
          <div class="data-box"><strong>Ambient Temp:</strong> <span id="ambientTemp">--</span></div>
          <div class="data-box"><strong>Fan RPM:</strong> <span id="fanRPM">--</span></div>
          <div class="data-box"><strong>Fan Level:</strong> <span id="fanLevel">--</span></div>
          <div class="data-box"><strong>Fan PWM:</strong> <span id="fanPWM">--</span></div>
          <div class="data-box"><strong>Fan State:</strong> <span id="fanState">--</span></div>
          <div class="data-box"><strong>Humidifier Mode:</strong> <span id="humidifierMode">--</span></div>
          <div class="data-box"><strong>Last Updated:</strong> <span id="lastUpdated">--</span></div>
        </div>

        <div id="alarm">⚠️ WARNING: High Temperature Detected!</div>

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

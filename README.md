# BanRakhshak — Rural Nepal Fire Detection

ESP8266 NodeMCU + DHT11 + MQ Smoke Sensor → Railway server → Dashboard

---

## Files

| File | Purpose |
|------|---------|
| `server.js` | Node.js server — receives POST from ESP8266, serves data to dashboard |
| `package.json` | Node.js project config |
| `BanRakhshak.ino` | Arduino sketch for ESP8266 NodeMCU |
| `dashboard.html` | Web dashboard — open in any browser |
| `.gitignore` | Ignores node_modules |

---

## Setup

### 1. Deploy server to Railway

1. Push this folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects Node.js and runs `npm start`
4. Go to your project → Settings → Networking → Generate Domain
5. Copy your URL: `https://YOUR-APP.up.railway.app`

### 2. Flash ESP8266

1. Open `BanRakhshak.ino` in Arduino IDE
2. Replace `SERVER_URL` with your Railway URL:
   ```cpp
   const char* SERVER_URL = "https://YOUR-APP.up.railway.app/data";
   ```
3. Install required libraries via Library Manager:
   - **DHT sensor library** by Adafruit
   - **ESP8266WiFi** (comes with ESP8266 board package)
   - **ESP8266HTTPClient** (comes with ESP8266 board package)
4. Select board: **NodeMCU 1.0 (ESP-12E Module)**
5. Upload

### 3. Open dashboard

1. Open `dashboard.html` in any browser (double-click the file)
2. Paste your Railway URL into the Server URL field
3. Click Connect — data appears within 2 seconds once ESP8266 is running

---

## Wiring

| Component | Pin |
|-----------|-----|
| DHT11 DATA | D6 |
| MQ Smoke sensor AO | A0 |
| LED | D4 |

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/data` | POST | Receive JSON from ESP8266 |
| `/data` | GET | Return latest sensor reading |
| `/health` | GET | Server uptime check |

### JSON payload from ESP8266
```json
{
  "temp": 27.5,
  "hum": 62.0,
  "smoke": 180,
  "smokeDelta": 5,
  "riskScore": 12.3,
  "riskLevel": "LOW",
  "recommendation": "Safe Condition"
}
```

# Smart RFID Attendance Management System — Phase 1

An enterprise IoT-based attendance system combining an **ESP8266 (NodeMCU)** microcontroller, **MFRC522 RFID reader**, and a **Node.js/Express REST backend with MongoDB**.

This project upgrades a legacy Google Sheets logging sketch into a reliable, database-driven attendance system with offline queuing, duplicate prevention, and automated migration.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |          MongoDB Database          |
                                      |  (Students, Cards, Attendance,     |
                                      |            Devices)                |
                                      +-----------------+------------------+
                                                        |
                                                  Mongoose ORM
                                                        |
+--------------------------+          HTTP / HTTPS      v
|     ESP8266 NodeMCU      | -------------------> +------------------------+
|  + MFRC522 RFID Reader   |    POST /device/scan |  Node.js + Express API |
|  + Flash Offline Queue   |                      | (Asia/Kolkata Timezone)|
+--------------------------+                      +------------------------+
```

---

## 1. Hardware Setup (Preserved Existing Wiring)

The existing pin connections and RFID card data are **100% preserved**.

| ESP8266 NodeMCU Pin | Peripheral | Description |
|---|---|---|
| **D1** (GPIO 5) | MFRC522 `RST` | Reset Pin |
| **D2** (GPIO 4) | MFRC522 `SDA` / `SS` | SPI Slave Select |
| **D5** (GPIO 14) | MFRC522 `SCK` | SPI Serial Clock |
| **D6** (GPIO 12) | MFRC522 `MISO` | SPI Master In Slave Out |
| **D7** (GPIO 13) | MFRC522 `MOSI` | SPI Master Out Slave In |
| **D8** (GPIO 15) | Active Buzzer `+` | Audio Feedback (GND to GND) |
| **3V3** | MFRC522 `3.3V` | Power (Do NOT connect MFRC522 to 5V!) |
| **GND** | MFRC522 / Buzzer `GND` | Common Ground |

> **IMPORTANT:** Existing RFID tags with names written into Sector 0, Block 2 (e.g. "Mani") are **not erased or overwritten**. The new firmware reads both the unique 4-byte Card UID and Block 2 data.

---

## 2. Audio Feedback Signals

The buzzer connected to pin **D8** signals real-time status:

- **2 Short Beeps (200ms):** Attendance successfully recorded or check-out confirmed.
- **1 Short Chirp (80ms):** Duplicate scan within cooldown window (ignored).
- **3 Rapid Beeps (70ms each):** Network offline; scan event safely saved to local flash memory.
- **1 Long Buzz (800ms):** Unregistered card, blocked card, or device authentication error.

---

## 3. Backend Setup & Configuration

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or MongoDB Atlas)

### Installation
```bash
cd backend
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and configure your settings:
```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rfid_attendance
TIMEZONE=Asia/Kolkata
ADMIN_API_KEY=admin_super_secret_key_change_in_production
DEFAULT_DEVICE_ID=ESP8266_001
DEFAULT_DEVICE_KEY=esp8266_device_secret_token_123

ATTENDANCE_COOLDOWN_SECONDS=60
CHECKOUT_MIN_INTERVAL_MINUTES=5
WORK_DAY_START_TIME=09:00
LATE_THRESHOLD_TIME=09:30
ENABLE_CHECKOUT=true
```

### Start Backend Server
```bash
# Production mode:
npm start

# Development mode (auto-reload with nodemon):
npm run dev
```

### Seed Initial Test Data
```bash
npm run seed
```

---

## 4. Running Automated Tests

A comprehensive Jest test suite verifies all 12 Phase 1 requirements using an in-memory MongoDB instance:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
1. Registered card records attendance.
2. Unregistered card rejected (404).
3. Blocked card rejected (403).
4. Duplicate scan within cooldown ignored.
5. Offline sync & network retry idempotency (`eventId`).
6. Preserving legacy Block 2 tag data.
7. Google Sheets CSV migration.
8. Migration idempotency (no duplicate records on repeated runs).
9. Database health and disconnect handling.
10. Device authentication verification.
11. Asia/Kolkata date and late threshold calculations.

---

## 5. Google Sheets Migration

Export your existing Google Sheet as CSV, then run:

```bash
# 1. Preview changes without writing to database:
npm run migrate -- --dry-run --file data/sample_google_sheets_export.csv

# 2. Execute live import:
npm run migrate -- --file data/sample_google_sheets_export.csv
```

Detailed migration documentation: [docs/MIGRATION_GUIDE.md](file:///Users/glenjohn/Desktop/rfid%20project/docs/MIGRATION_GUIDE.md)

---

## 6. Flashing the ESP8266 Firmware

The updated firmware is located in [firmware/esp8266_rfid_node/esp8266_rfid_node.ino](file:///Users/glenjohn/Desktop/rfid%20project/firmware/esp8266_rfid_node/esp8266_rfid_node.ino).

### 1. Update Network Settings
Open `esp8266_rfid_node.ino` and configure:
```cpp
#define WIFI_SSID        "Your_WiFi_SSID"
#define WIFI_PASSWORD    "Your_WiFi_Password"
#define BACKEND_SCAN_URL "http://<YOUR_COMPUTER_IP>:5000/api/v1/device/scan"
```

### 2. Compile Sketch
```bash
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 firmware/esp8266_rfid_node
```

### 3. Upload to NodeMCU
Plug your board via USB and upload:
```bash
# Find connected serial port:
arduino-cli board list

# Flash firmware:
arduino-cli upload -p /dev/cu.usbserial-XXXX --fqbn esp8266:esp8266:nodemcuv2 firmware/esp8266_rfid_node
```

### 4. Serial Monitor
```bash
arduino-cli monitor -p /dev/cu.usbserial-XXXX -c baudrate=9600
```

---

## 7. API Documentation

Detailed REST API specifications, payload schemas, and error codes are documented in:
[docs/API_DOCUMENTATION.md](file:///Users/glenjohn/Desktop/rfid%20project/docs/API_DOCUMENTATION.md)


# Smart RFID Attendance Management System (Phases 1 & 2)

An enterprise IoT-based attendance solution combining an **ESP8266 (NodeMCU)** microcontroller, **MFRC522 RFID reader**, **Node.js/Express REST backend with MongoDB**, and a **React + Tailwind CSS Admin Dashboard** with real-time Socket.IO streaming.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |          MongoDB Database          |
                                      |  (Students, Cards, Attendance,     |
                                      |       Devices, Settings)           |
                                      +-----------------+------------------+
                                                        |
                                                   Mongoose ORM
                                                        |
+--------------------------+          HTTP / HTTPS      v
|     ESP8266 NodeMCU      | -------------------> +------------------------+
|  + MFRC522 RFID Reader   |    POST /device/scan |  Node.js + Express API |
|  + LittleFS Offline Queue|                      |  Port: 5001            |
+--------------------------+                      +-----------+------------+
                                                              |
                                                      Socket.IO Events &
                                                          REST API
                                                              |
                                                              v
                                                  +------------------------+
                                                  |   React 18 Admin App   |
                                                  |  (Tailwind + Recharts) |
                                                  |   Port: 3000           |
                                                  +------------------------+
```

---

## 1. Hardware Pinout (NodeMCU ESP8266 + MFRC522)

The existing wiring and RFID card data are **100% preserved**.

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

> **IMPORTANT:** Existing RFID tags with names written into Sector 0, Block 2 (e.g. "Mani") are **not overwritten or erased**. The firmware reads both the unique 4-byte Card UID and Block 2 data.

---

## 2. Firmware Features (`firmware/esp8266_rfid_node/`)

- **Dual Identifier Acquisition:** Reads UID + Sector 0 Block 2 ASCII payload.
- **NTP Time Synchronization:** Accurate timestamping with fallback.
- **LittleFS Offline Storage:** Queues scans when Wi-Fi is down; flushes automatically when connection recovers.
- **Debounce & Cooldown:** Prevents accidental double scans.
- **Audio Feedback Signals:**
  - 2 Short Beeps (200ms): Scan successfully recorded.
  - 1 Short Chirp (80ms): Duplicate scan within cooldown window (ignored).
  - 3 Rapid Beeps (70ms): Network offline; scan cached safely to flash memory.
  - 1 Long Buzz (800ms): Unregistered card or authentication error.

---

## 3. Quick Start Guide

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas URI)
- Arduino CLI or Arduino IDE (for ESP8266 flashing)

### Installation
From the root directory, install dependencies for both backend and frontend:
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
cd ..
```

### Start Local MongoDB (if running locally)
```bash
mongod --dbpath backend/data/db --port 27017
```

### Start the Applications

#### Option A: Running from Project Root
```bash
# Terminal 1: Start Backend API (runs on http://localhost:5001)
npm run start:backend

# Terminal 2: Start React Admin Dashboard (runs on http://localhost:3000)
npm run start:frontend
```

#### Option B: Running individually
```bash
# Backend:
cd backend
npm start

# Frontend:
cd frontend
npm run dev
```

Open your browser to:
👉 **`http://localhost:3000`**

---

## 4. Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`
- *(Configurable in `backend/.env`)*

---

## 5. Phase 2 Admin Dashboard Highlights

1. **Executive Dashboard (`/`):**
   - 8 live KPI summary cards (Total Students, Present Today, Absent, Late, Percentage, Active Cards, Online Devices).
   - Real-time weekly attendance trend charts (Recharts AreaChart).
   - Status distribution donut chart (Present vs Late vs Absent).
   - Live RFID scan activity stream.
2. **Student Management (`/students` & `/students/:id`):**
   - Paginated searchable student directory with class and status filters.
   - Comprehensive detail modal & page with assigned RFID tags, attendance percentages, and chronological timeline.
   - Student registration modal with real-time validation.
3. **RFID Card Management (`/cards`):**
   - Track and manage RFID tags with student assignments.
   - One-click Block/Unblock toggle to immediately revoke lost cards.
   - Register replacement or new cards.
4. **Attendance Monitoring & Manual Correction (`/attendance`):**
   - Comprehensive filter by preset dates, custom range, student ID, class, and attendance status.
   - **Manual Attendance Correction Modal:** Allows administrators to correct statuses and timestamps with mandatory audit reason logging.
   - Complete audit trail modal showing who modified a record, previous state, and reason.
5. **Hardware Device Management (`/devices`):**
   - Monitor online/offline status of all ESP8266 readers based on heartbeat intervals.
   - Authorize new readers and regenerate secret tokens.
6. **Reports & Exports (`/reports`):**
   - Aggregate daily, weekly, monthly, class-wise, or student-specific metrics.
   - One-click **Export to CSV**.
   - One-click **Export to PDF** with formatted headers, KPI summaries, and styled tables (`jspdf` + `jspdf-autotable`).
7. **System Settings (`/settings`):**
   - Configure institution name, workday start time, late arrival cutoffs, debounce cooldowns, and operational timezone (`Asia/Kolkata`).
   - Dynamic in-memory configuration updates without restarting the server.
8. **Real-Time Streaming (Socket.IO):**
   - Live scan notifications instantly surface toast alerts on the dashboard whenever an RFID card is swiped at any ESP8266 reader.

---

## 6. Running Automated Tests

Run the backend test suite covering device authentication, card validation, attendance cooldown, duplicate prevention, admin CRUD, Google Sheets migration idempotency, and Phase 2 endpoints:
```bash
npm run test
# Or:
cd backend && npm test
```

All 21 integration tests pass.

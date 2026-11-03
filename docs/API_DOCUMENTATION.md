# Smart RFID Attendance Management System — REST API & WebSocket Documentation (v2)

## Overview
The REST & WebSocket API manages students, RFID cards, attendance sessions, IoT scanning devices, analytical reports, and system settings. Built using Node.js and Express with MongoDB (Mongoose) and Socket.IO.

Base URL: `http://<server-ip>:5001/api/v1`  
WebSocket Endpoint: `ws://<server-ip>:5001/socket.io`

---

## Authentication Schemes

### 1. Device Authentication
Used by the ESP8266 scanner on `/api/v1/device/scan`.
- Header: `x-device-id`: Device ID (e.g. `ESP8266_001`)
- Header: `x-device-key`: Device Secret Key (e.g. `esp8266_device_secret_token_123`)

### 2. Administrator Authentication
Used by administrative endpoints (`/students`, `/cards`, `/attendance`, `/devices`, `/dashboard`, `/reports`, `/settings`).
- **JWT Bearer Token:** Header `Authorization: Bearer <JWT_TOKEN>` (obtained via `/api/v1/auth/login`)
- **API Key (CLI/Automation):** Header `x-admin-key: <ADMIN_API_KEY>`

---

## Endpoints

### 1. Authentication
#### `POST /api/v1/auth/login`
Authenticates an administrator with username and password, returning a signed JWT token.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "admin",
      "username": "admin",
      "name": "System Administrator",
      "role": "admin"
    }
  }
  ```

#### `GET /api/v1/auth/me`
Retrieves currently authenticated administrator session profile.
- **Access:** Admin Authenticated

#### `POST /api/v1/auth/logout`
Terminates administrator session.
- **Access:** Public / Authenticated

---

### 2. System Health
#### `GET /api/v1/health`
Checks backend and MongoDB connection status.
- **Access:** Public
- **Response:**
  ```json
  {
    "success": true,
    "status": "healthy",
    "timestamp": "2026-11-03T19:05:00+05:30",
    "timezone": "Asia/Kolkata",
    "database": {
      "status": "connected",
      "name": "rfid_attendance"
    },
    "uptimeSeconds": 142,
    "version": "2.0.0"
  }
  ```

---

### 3. Device Attendance Scan & Real-time WebSocket
#### `POST /api/v1/device/scan`
Receives card scan events from the ESP8266. Validates device, card, and student before recording check-in or check-out. Broadcasts `attendance:scan` over Socket.IO to connected React admin dashboards.

- **Access:** Device Authenticated (`x-device-id`, `x-device-key`)
- **Request Body:**
  ```json
  {
    "deviceId": "ESP8266_001",
    "cardUid": "A1:B2:C3:D4",
    "tagData": "Mani",
    "timestamp": "2026-11-03T09:05:00+05:30",
    "eventId": "ESP8266_001_1762174000_1",
    "firmwareVersion": "2.0.0"
  }
  ```
- **Socket.IO Event Broadcasted:**
  - Event Name: `attendance:scan`
  - Payload:
    ```json
    {
      "success": true,
      "cardUid": "A1:B2:C3:D4",
      "studentId": "STU001",
      "studentName": "Mani",
      "attendanceStatus": "present",
      "action": "check_in",
      "checkInTime": "09:05 AM",
      "deviceId": "ESP8266_001",
      "timestamp": "2026-11-03T09:05:00+05:30"
    }
    ```

---

### 4. Dashboard Analytics
#### `GET /api/v1/dashboard/overview`
Returns live system metrics including registered students, daily attendance breakdown, card statuses, and online/offline IoT devices.
- **Access:** Admin Authenticated
- **Response:**
  ```json
  {
    "success": true,
    "overview": {
      "totalStudents": 450,
      "totalActiveStudents": 450,
      "presentToday": 412,
      "absentToday": 38,
      "lateToday": 15,
      "attendancePercentage": 92,
      "activeCards": 450,
      "totalDevices": 4,
      "onlineDevices": 4,
      "date": "2026-11-03"
    }
  }
  ```

#### `GET /api/v1/dashboard/trends?days=7`
Returns time-series daily attendance counts (Present, Late, Absent, Total) for Recharts Area/Line charts.

#### `GET /api/v1/dashboard/distribution?days=1`
Returns attendance status percentage breakdown for Pie / Donut charts.

#### `GET /api/v1/dashboard/class-comparison`
Returns comparative attendance percentages across departments and class cohorts.

#### `GET /api/v1/dashboard/recent-activity?limit=10`
Returns real-time stream of the latest check-in and check-out events.

---

### 5. Attendance Records & Manual Correction
#### `GET /api/v1/attendance`
Paginated query of historical attendance logs with filtering by date range, studentId, className, status, and deviceId.

#### `PATCH /api/v1/attendance/:id`
Allows administrators to manually rectify attendance status or timestamps with mandatory audit logging.
- **Access:** Admin Authenticated
- **Request Body:**
  ```json
  {
    "status": "present",
    "checkInTime": "2026-11-03T09:00:00+05:30",
    "checkOutTime": "2026-11-03T17:00:00+05:30",
    "reason": "RFID card reader was temporarily offline during morning assembly."
  }
  ```
- **Response:** Returns updated record with `auditTrail` appended.

---

### 6. Student Management
- `GET /api/v1/students` — List students (search, className, status, pagination)
- `POST /api/v1/students` — Register a student
- `GET /api/v1/students/:id` — Get student profile, enrolled RFID cards, and attendance history
- `PUT /api/v1/students/:id` — Update student profile
- `DELETE /api/v1/students/:id` — Delete student

---

### 7. RFID Card Management
- `GET /api/v1/cards` — List registered RFID tags (search, status, pagination)
- `POST /api/v1/cards` — Register a new card UID to a student
- `PUT /api/v1/cards/:id` — Update card status (`active` / `blocked`), reassign student, or update tag data
- `DELETE /api/v1/cards/:id` — Remove card mapping

---

### 8. Device Management
- `GET /api/v1/devices` — List all ESP8266 reader hardware with real-time heartbeat and online/offline status
- `POST /api/v1/devices` — Authorize a new scanner device
- `PUT /api/v1/devices/:id` — Update name, location, status, or regenerate secret key
- `DELETE /api/v1/devices/:id` — Remove device authorization

---

### 9. Analytical Reports
#### `GET /api/v1/reports`
Aggregates attendance metrics across daily, weekly, monthly, or custom periods, with optional filtering by class or individual student.
- **Query Params:** `type` (`daily`|`weekly`|`monthly`|`custom`), `date`, `startDate`, `endDate`, `className`, `studentId`
- **Response:**
  ```json
  {
    "success": true,
    "summary": {
      "reportType": "daily",
      "period": { "startDate": "2026-11-03", "endDate": "2026-11-03" },
      "totalActiveStudents": 450,
      "totalSessions": 412,
      "presentSessions": 397,
      "lateSessions": 15,
      "attendanceRate": 92
    },
    "records": [...]
  }
  ```

---

### 10. System Settings
#### `GET /api/v1/settings`
Retrieves institutional configuration (workday start time, late cutoff threshold, scan cooldown, checkout intervals, timezone).

#### `PUT /api/v1/settings`
Updates and dynamically applies runtime parameters without server restarts.
- **Access:** Admin Authenticated
- **Request Body:**
  ```json
  {
    "institutionName": "Smart IoT Institute of Technology",
    "workDayStartTime": "09:00",
    "lateThresholdTime": "09:30",
    "cooldownSeconds": 60,
    "checkoutMinIntervalMinutes": 30,
    "enableCheckout": true,
    "timezone": "Asia/Kolkata",
    "deviceHeartbeatThresholdSeconds": 90
  }
  ```

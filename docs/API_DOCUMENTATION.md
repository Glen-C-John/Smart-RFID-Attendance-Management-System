# Smart RFID Attendance Management System — REST API Documentation (v1)

## Overview
The REST API manages students, RFID cards, attendance sessions, and IoT scanning devices. It is developed using Node.js and Express with MongoDB (Mongoose).

Base URL: `http://<server-ip>:5000/api/v1`

---

## Authentication Schemes

### 1. Device Authentication
Used by the ESP8266 scanner on `/api/v1/device/scan`.
- Header: `x-device-id`: Device ID (e.g. `ESP8266_001`)
- Header: `x-device-key`: Device Secret Key (e.g. `esp8266_device_secret_token_123`)

### 2. Administrative Authentication
Used by management endpoints (`/students`, `/cards`, `/attendance`, `/devices`).
- Header: `x-admin-key`: Admin API key defined in `.env`
- Or Header: `Authorization: Bearer <ADMIN_API_KEY>`

---

## Endpoints

### 1. System Health
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
    "version": "1.0.0"
  }
  ```

---

### 2. Device Attendance Scan
#### `POST /api/v1/device/scan`
Receives card scan events from the ESP8266. Validates device, card, and student before recording check-in or check-out.

- **Access:** Device Authenticated (`x-device-id`, `x-device-key`)
- **Request Headers:**
  ```http
  Content-Type: application/json
  x-device-id: ESP8266_001
  x-device-key: esp8266_device_secret_token_123
  ```
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
- **Successful Response (Check-in, 200 OK):**
  ```json
  {
    "success": true,
    "studentName": "Mani",
    "message": "Attendance recorded",
    "attendanceStatus": "present",
    "checkInTime": "09:05 AM"
  }
  ```
- **Duplicate Scan Response (Within Cooldown, 200 OK):**
  ```json
  {
    "success": true,
    "studentName": "Mani",
    "message": "Duplicate scan ignored (cooldown active)",
    "attendanceStatus": "present",
    "checkInTime": "09:05 AM",
    "isDuplicate": true
  }
  ```
- **Check-out Response (200 OK):**
  ```json
  {
    "success": true,
    "studentName": "Mani",
    "message": "Check-out recorded successfully",
    "attendanceStatus": "present",
    "action": "check_out",
    "checkInTime": "09:05 AM",
    "checkOutTime": "05:00 PM"
  }
  ```
- **Unregistered Card Response (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "Unregistered RFID card"
  }
  ```
- **Blocked Card Response (403 Forbidden):**
  ```json
  {
    "success": false,
    "message": "RFID card is blocked"
  }
  ```

---

### 3. Student Management
Protected by `x-admin-key`.

#### `POST /api/v1/students`
Create a new student.
- **Request:**
  ```json
  {
    "studentId": "STU105",
    "name": "Kavitha R",
    "email": "kavitha@college.edu",
    "phone": "+919876543220",
    "className": "CSE-3A",
    "department": "Computer Science"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Student created successfully",
    "student": { ... }
  }
  ```

#### `GET /api/v1/students`
List students with optional pagination and filters.
- **Query Params:** `page` (default 1), `limit` (default 50), `className`, `department`, `status`, `search`

#### `GET /api/v1/students/:id`
Get student by ID or MongoDB `_id`, including all assigned RFID cards.

#### `PUT /api/v1/students/:id`
Update student details (name, email, phone, class).

#### `DELETE /api/v1/students/:id`
Deactivates student and blocks their active cards (or hard deletes if `?force=true`).

---

### 4. RFID Card Management
Protected by `x-admin-key`.

#### `POST /api/v1/cards/register`
Register a new card or assign a replacement card to a student.
- **Request:**
  ```json
  {
    "cardUid": "D4:C3:B2:A1",
    "studentId": "STU105",
    "storedTagData": "Kavitha"
  }
  ```

#### `GET /api/v1/cards`
List all cards with filters (`studentId`, `status`).

#### `GET /api/v1/cards/:uid`
Get card information and associated student profile.

#### `PUT /api/v1/cards/:uid/block`
Block a lost or compromised RFID card. Scans from this card will be rejected immediately.

#### `PUT /api/v1/cards/:uid/activate`
Re-activate a blocked card.

---

### 5. Attendance Query Endpoints
Protected by `x-admin-key`.

#### `GET /api/v1/attendance`
Query attendance logs with filters: `studentId`, `attendanceDate`, `status`, `deviceId`.

#### `GET /api/v1/attendance/student/:studentId`
Query attendance history for a specific student.

#### `GET /api/v1/attendance/date/:date`
Get all attendance records for a specific date (e.g. `2026-11-03`).

---

### 6. IoT Device Management
Protected by `x-admin-key`.

#### `POST /api/v1/devices/register`
Register a new ESP8266 or RFID reader node.
- **Request:**
  ```json
  {
    "deviceId": "ESP8266_002",
    "deviceName": "Library Scanner",
    "location": "Central Library",
    "apiKey": "optional_custom_key"
  }
  ```

#### `GET /api/v1/devices`
List all registered devices with their `lastSeen` timestamp and firmware versions.

#### `PUT /api/v1/devices/:deviceId/status`
Update device status (`active`, `inactive`, `revoked`).


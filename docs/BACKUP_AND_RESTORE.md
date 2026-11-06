# Database Backup and Restoration Guide

## 1. Overview
This document specifies the official operational procedures for creating database snapshots, archiving records, restoring collections, and ensuring disaster recovery for the Smart RFID Attendance Management System.

All procedures are designed to guarantee **zero loss of historical attendance records**, **preservation of physical RFID card metadata**, and **consistent audit logging**.

---

## 2. Quick Operations (Built-in Node.js Scripts)

The backend provides integrated, platform-independent snapshot and restore tools that work across both local MongoDB instances and cloud MongoDB Atlas clusters.

### A. Create an Instant Database Backup Snapshot

Run the following command from the repository root:

```bash
npm run backup --prefix backend
```

**What it does:**
- Atomically exports all 5 core collections (`Student`, `RfidCard`, `Attendance`, `Device`, `Setting`).
- Generates a timestamped JSON file in `backend/backups/mongodb_backup_<TIMESTAMP>.json`.
- Prints a detailed summary of exported record counts and verifies completion.

### B. Restore From a Backup Snapshot

To restore or migrate an existing snapshot into the database:

```bash
npm run restore --prefix backend -- backups/mongodb_backup_<TIMESTAMP>.json
```

**Safety Guarantees:**
- Uses idempotent `$set` and upsert operations keyed on unique model identifiers (`studentId`, `cardUid`, `deviceId`, `{studentId, attendanceDate}`).
- Never destroys existing unbacked records.
- Safely recovers corrupted or inadvertently modified attendance sessions and audit trails.

---

## 3. Native MongoDB Binary Operations (`mongodump` & `mongorestore`)

For high-throughput enterprise deployments or production clusters with millions of historical attendance rows, use standard binary MongoDB database tools.

### A. Full Binary Dump (`mongodump`)

#### Local MongoDB:
```bash
mongodump --host 127.0.0.1 --port 27017 --db rfid_attendance --gzip --archive=backups/rfid_dump_$(date +%Y%m%d_%H%M%S).gz
```

#### Production MongoDB Atlas (Encrypted with TLS):
```bash
mongodump --uri="mongodb+srv://<admin_user>:<password>@cluster0.mongodb.net/rfid_attendance?retryWrites=true&w=majority" --gzip --archive=backups/rfid_atlas_backup_$(date +%Y%m%d_%H%M%S).gz
```

---

### B. Binary Database Restore (`mongorestore`)

#### Local MongoDB:
```bash
mongorestore --host 127.0.0.1 --port 27017 --nsInclude="rfid_attendance.*" --gzip --archive=backups/rfid_dump_<TIMESTAMP>.gz
```

#### Production MongoDB Atlas:
```bash
mongorestore --uri="mongodb+srv://<admin_user>:<password>@cluster0.mongodb.net/rfid_attendance?retryWrites=true&w=majority" --nsInclude="rfid_attendance.*" --gzip --archive=backups/rfid_atlas_backup_<TIMESTAMP>.gz
```

---

## 4. Production Cron Automation Schedule

To automate daily database backups at 01:00 AM (local time) with a 30-day retention policy:

```bash
# Open crontab editor
crontab -e
```

Add the following daily job entry:
```cron
# Daily RFID Attendance MongoDB Snapshot at 01:00 AM
0 1 * * * cd /path/to/rfid-project/backend && npm run backup >> /var/log/rfid_backup.log 2>&1

# Prune snapshots older than 30 days
30 1 * * * find /path/to/rfid-project/backend/backups/ -name "mongodb_backup_*.json" -mtime +30 -delete
```

---

## 5. Verification Checklist After Restoration

After restoring from any snapshot:
1. Verify database connectivity: `curl http://localhost:5001/api/v1/health`
2. Verify total active student count: `GET /api/v1/students`
3. Verify physical card bindings: `GET /api/v1/cards`
4. Verify historical attendance records: `GET /api/v1/reports?type=monthly`
5. Verify hardware connectivity: `POST /api/v1/device/ping`

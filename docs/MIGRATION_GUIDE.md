# Google Sheets to MongoDB Migration Guide

## 1. Overview
The migration utility allows importing historical attendance, student records, and RFID card metadata from your existing Google Sheet into MongoDB with zero data loss and full idempotency.

---

## 2. Spreadsheet Structure Mapping
The migration utility flexibly recognizes standard column headers:

| Google Sheet Column | Expected Fields in CSV | MongoDB Model & Target Field |
|---|---|---|
| **Column A** | `Date`, `AttendanceDate`, `DATE` | `Attendance.attendanceDate` (YYYY-MM-DD) & `checkInTime` |
| **Column B** | `Time`, `CheckInTime`, `TIME` | `Attendance.checkInTime` (parsed in Asia/Kolkata timezone) |
| **Column C** | `Name`, `CardHolderName`, `StudentName` | `Student.name` & `RfidCard.storedTagData` |
| **Optional** | `StudentId`, `StudentID`, `ID`, `RollNo` | `Student.studentId` (auto-generated if omitted) |
| **Optional** | `CardUid`, `CardUID`, `UID` | `RfidCard.cardUid` (auto-mapped if omitted) |
| **Optional** | `Class`, `ClassName` | `Student.className` |

---

## 3. Step-by-Step Migration Instructions

### Step 1: Export Your Google Sheet to CSV
1. Open your Google Sheet in your web browser.
2. Click **File** -> **Download** -> **Comma Separated Values (.csv)**.
3. Save the exported CSV file into `backend/data/attendance_export.csv` (or use the included sample at `backend/data/sample_google_sheets_export.csv`).

### Step 2: Run Dry-Run Verification (Preview Only)
Before making any database changes, execute a dry run. The dry run parses all rows, tests validation, checks for duplicates, and outputs a summary **without writing anything to MongoDB**:

```bash
cd backend
npm run migrate -- --dry-run --file data/sample_google_sheets_export.csv
```

**Expected Dry Run Output:**
```text
====================================================
  Google Sheets -> MongoDB Migration Utility
  Target File:  .../data/sample_google_sheets_export.csv
  Mode:         DRY RUN (Preview Only)
====================================================

---------------- MIGRATION SUMMARY -----------------
Total Rows in CSV:       7
Students:                4 created, 0 existing
RFID Cards:              4 created, 0 existing
Attendance Records:      7 created
Duplicates Skipped:      0
Failed / Skipped Rows:   0
----------------------------------------------------
DRY RUN COMPLETE. No data was written to MongoDB.
```

### Step 3: Run Live Migration
Once you have reviewed the preview and confirmed that all rows parse correctly:

```bash
cd backend
npm run migrate -- --file data/sample_google_sheets_export.csv
```

### Step 4: Verify Idempotency (Run Twice)
Run the exact same command a second time:

```bash
npm run migrate -- --file data/sample_google_sheets_export.csv
```

You will see:
```text
Students:                0 created, 4 existing
RFID Cards:              0 created, 4 existing
Attendance Records:      0 created
Duplicates Skipped:      7
```
**Zero duplicate students, cards, or attendance records will ever be created.**

---

## 4. Verifying Imported Records in MongoDB
You can verify the imported records using `mongosh` or via the backend REST API:

### Check Health & Attendance via REST API:
```bash
# Health check
curl http://localhost:5000/api/v1/health

# View all students
curl -H "x-admin-key: admin_super_secret_key_change_in_production" \
     http://localhost:5000/api/v1/students

# View imported attendance records
curl -H "x-admin-key: admin_super_secret_key_change_in_production" \
     http://localhost:5000/api/v1/attendance
```

### Check via MongoDB Shell (`mongosh`):
```javascript
use rfid_attendance;
db.students.find();
db.rfidcards.find();
db.attendances.find();
```


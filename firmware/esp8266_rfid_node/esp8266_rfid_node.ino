/****************************************************************************************************
 * Smart RFID Attendance Management System - Phase 1 Firmware
 * Target Microcontroller: ESP8266 (NodeMCU 1.0 / ESP-12E / Wemos D1 Mini)
 * RFID Reader:            MFRC522 (SPI)
 * Output:                 Piezo Buzzer (D8)
 * Storage:                LittleFS (Local Flash Offline Queue)
 * Time:                   SNTP (Asia/Kolkata UTC+5:30)
 * 
 * NOTE: Preserves existing hardware wiring and existing tag data written on Block 2.
 ****************************************************************************************************/

#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <LittleFS.h>
#include <time.h>
#include <ArduinoJson.h>

// ==========================================
// 1. PIN CONFIGURATION (PRESERVED)
// ==========================================
#define RST_PIN  D1
#define SS_PIN   D2
#define BUZZER   D8

// ==========================================
// 2. NETWORK & BACKEND CONFIGURATION
// ==========================================
#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #include "secrets.example.h"
#endif

#ifndef FIRMWARE_VERSION
  #define FIRMWARE_VERSION "2.0.0"
#endif

// Local Scan Cooldown (milliseconds) to prevent immediate duplicate card reads
#define LOCAL_COOLDOWN_MS 4000

// Offline Queue File path in LittleFS
#define OFFLINE_QUEUE_FILE "/offline_queue.jsonl"
#define MAX_QUEUE_ITEMS    100

// ==========================================
// 3. HARDWARE & STATE INSTANCES
// ==========================================
MFRC522 mfrc522(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key key;

// Sector 0, Block 2 is where student name is written
const int blockNum = 2;
byte readBlockData[18];
byte bufferLen = 18;

// Local debounce tracking
String lastScannedUid = "";
unsigned long lastScanMillis = 0;
unsigned long lastQueueFlushMillis = 0;
const unsigned long QUEUE_FLUSH_INTERVAL = 15000; // Check and flush offline queue every 15s

// Event counter for generating unique event IDs
unsigned long eventCounter = 0;

// ==========================================
// 4. BUZZER AUDIO FEEDBACK PATTERNS
// ==========================================
void beepSuccess() {
  // 2 distinct beeps (Original confirmation pattern)
  digitalWrite(BUZZER, HIGH);
  delay(150);
  digitalWrite(BUZZER, LOW);
  delay(100);
  digitalWrite(BUZZER, HIGH);
  delay(150);
  digitalWrite(BUZZER, LOW);
}

void beepDuplicate() {
  // 1 short chirp
  digitalWrite(BUZZER, HIGH);
  delay(80);
  digitalWrite(BUZZER, LOW);
}

void beepError() {
  // 1 long warning buzz
  digitalWrite(BUZZER, HIGH);
  delay(800);
  digitalWrite(BUZZER, LOW);
}

void beepOfflineQueued() {
  // 3 rapid beeps (saved locally while offline)
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(70);
    digitalWrite(BUZZER, LOW);
    delay(70);
  }
}

// ==========================================
// 5. TIME & ISO 8601 FORMATTING
// ==========================================
void syncNtpTime() {
  Serial.print(F("[NTP] Synchronizing time (Asia/Kolkata UTC+5:30)..."));
  // UTC offset = 5.5 hours * 3600 = 19800 seconds, 0 daylight savings
  configTime(19800, 0, "pool.ntp.org", "time.google.com");

  int retries = 0;
  time_t now = time(nullptr);
  while (now < 100000 && retries < 20) {
    delay(200);
    Serial.print(".");
    now = time(nullptr);
    retries++;
  }
  Serial.println(F("\n[NTP] Time synchronized successfully!"));
}

String getIsoTimestamp() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);

  char buf[35];
  // Format: 2026-11-03T09:05:00+05:30
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+05:30", timeinfo);
  return String(buf);
}

// ==========================================
// 6. OFFLINE STORAGE QUEUE (LittleFS)
// ==========================================
void initLittleFS() {
  if (!LittleFS.begin()) {
    Serial.println(F("[LittleFS] Mounting failed, formatting filesystem..."));
    LittleFS.format();
    LittleFS.begin();
  }
  Serial.println(F("[LittleFS] Filesystem mounted successfully."));
}

void saveToOfflineQueue(const String& payload) {
  Serial.println(F("[Queue] Saving scan event to local offline queue..."));
  File f = LittleFS.open(OFFLINE_QUEUE_FILE, "a");
  if (!f) {
    Serial.println(F("[Queue] Failed to open offline queue file for appending."));
    return;
  }
  f.println(payload);
  f.close();
  Serial.println(F("[Queue] Event safely buffered offline in flash memory."));
  beepOfflineQueued();
}

bool postScanPayload(const String& payload, bool isOfflineRetry = false);

void flushOfflineQueue() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!LittleFS.exists(OFFLINE_QUEUE_FILE)) return;

  File f = LittleFS.open(OFFLINE_QUEUE_FILE, "r");
  if (!f || f.size() == 0) {
    if (f) f.close();
    return;
  }

  Serial.println(F("[Queue] Found pending offline scan events. Synchronizing..."));

  // Buffer lines into temporary memory to flush sequentially
  std::vector<String> failedLines;
  bool stopPosting = false;

  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (!stopPosting) {
      Serial.print(F("[Queue] Synchronizing event: "));
      Serial.println(line);

      bool ok = postScanPayload(line, true);
      if (!ok) {
        failedLines.push_back(line);
        stopPosting = true; // Stop posting further items, but continue buffering remainder of file
      } else {
        delay(200); // Gentle spacing between requests
      }
    } else {
      // Server/network unreachable: retain all remaining unposted events
      failedLines.push_back(line);
    }
  }
  f.close();

  // Rewrite queue with remaining failed items, or remove if empty
  if (failedLines.empty()) {
    LittleFS.remove(OFFLINE_QUEUE_FILE);
    Serial.println(F("[Queue] All offline events successfully synchronized with backend."));
  } else {
    File rewrite = LittleFS.open(OFFLINE_QUEUE_FILE, "w");
    for (const String& item : failedLines) {
      rewrite.println(item);
    }
    rewrite.close();
    Serial.printf("[Queue] %d events still pending in offline queue.\n", (int)failedLines.size());
  }
}

// ==========================================
// 7. BACKEND HTTP POST DISPATCHER
// ==========================================
bool postScanPayload(const String& payload, bool isOfflineRetry) {
  WiFiClient client;
  HTTPClient http;

  Serial.print(F("[HTTP] Sending scan to: "));
  Serial.println(BACKEND_SCAN_URL);

  if (!http.begin(client, BACKEND_SCAN_URL)) {
    Serial.println(F("[HTTP] Failed to initiate connection."));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-id", DEVICE_ID);
  http.addHeader("x-device-key", DEVICE_KEY);
  http.setTimeout(4000);

  int httpCode = http.POST(payload);
  Serial.printf("[HTTP] Response code: %d\n", httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print(F("[HTTP] Response payload: "));
    Serial.println(response);

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      bool success = doc["success"] | false;
      const char* studentName = doc["studentName"] | "Unknown";
      const char* message = doc["message"] | "";
      const char* status = doc["attendanceStatus"] | "";
      bool isDuplicate = doc["isDuplicate"] | false;

      Serial.println(F("--------------------------------------"));
      Serial.printf("  Success: %s\n", success ? "YES" : "NO");
      Serial.printf("  Student: %s\n", studentName);
      Serial.printf("  Message: %s\n", message);
      Serial.printf("  Status:  %s\n", status);
      Serial.println(F("--------------------------------------"));

      if (!isOfflineRetry) {
        if (success) {
          if (isDuplicate) {
            beepDuplicate();
          } else {
            beepSuccess();
          }
        } else {
          beepError();
        }
      }
    } else {
      if (!isOfflineRetry) beepError();
    }

    http.end();
    return (httpCode == 200 || httpCode == 201);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

// ==========================================
// 8. RFID DATA EXTRACTION
// ==========================================
bool readBlockDataFromCard(int blockNumber, byte* outputBuffer) {
  // Prepare factory key (0xFF * 6)
  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF;
  }

  MFRC522::StatusCode status = mfrc522.PCD_Authenticate(
    MFRC522::PICC_CMD_MF_AUTH_KEY_A,
    blockNumber,
    &key,
    &(mfrc522.uid)
  );

  if (status != MFRC522::STATUS_OK) {
    Serial.printf("[RFID] Authentication failed for Block %d: %s\n", blockNumber, mfrc522.GetStatusCodeName(status));
    return false;
  }

  // bufferLen MUST be at least 18 bytes for MIFARE_Read
  byte len = 18;
  status = mfrc522.MIFARE_Read(blockNumber, outputBuffer, &len);
  if (status != MFRC522::STATUS_OK) {
    Serial.printf("[RFID] Read failed for Block %d: %s\n", blockNumber, mfrc522.GetStatusCodeName(status));
    return false;
  }

  return true;
}

// ==========================================
// 9. SETUP & INITIALIZATION
// ==========================================
void setup() {
  Serial.begin(9600);
  delay(300);
  Serial.println();
  Serial.println(F("===================================================="));
  Serial.println(F("  Smart RFID Attendance System - Firmware v2.0     "));
  Serial.println(F("===================================================="));

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  // Startup chirp
  digitalWrite(BUZZER, HIGH);
  delay(100);
  digitalWrite(BUZZER, LOW);

  // Initialize LittleFS local flash queue
  initLittleFS();

  // Initialize SPI & MFRC522 with explicit hardware reset
  SPI.begin();
  SPI.setFrequency(1000000);

  pinMode(RST_PIN, OUTPUT);
  digitalWrite(RST_PIN, LOW);
  delay(50);
  digitalWrite(RST_PIN, HIGH);
  delay(50);

  mfrc522.PCD_Init();
  mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

  Serial.print(F("[MFRC522] RFID Reader Version: "));
  mfrc522.PCD_DumpVersionToSerial();

  // Connect to Wi-Fi
  Serial.print(F("[WiFi] Connecting to: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 40) {
    delay(200);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connected!"));
    Serial.print(F("[WiFi] IP Address: "));
    Serial.println(WiFi.localIP());
    syncNtpTime();
    flushOfflineQueue();
  } else {
    Serial.println(F("\n[WiFi] Connection timeout. Device will buffer scans in Offline Queue mode."));
  }

  Serial.println(F("\nReady. Scan an RFID Tag to record attendance...\n"));
}

// ==========================================
// 10. MAIN EVENT LOOP
// ==========================================
void loop() {
  // Periodically check and flush pending offline scan events
  if (millis() - lastQueueFlushMillis > QUEUE_FLUSH_INTERVAL) {
    lastQueueFlushMillis = millis();
    flushOfflineQueue();
  }

  // Check if a new card is present
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select the card
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // 1. Extract Card UID as formatted hex string (e.g. "A1:B2:C3:D4")
  String cardUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardUid += "0";
    cardUid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) cardUid += ":";
  }
  cardUid.toUpperCase();

  Serial.println(F("\n**************** CARD DETECTED ****************"));
  Serial.printf("Card UID: %s\n", cardUid.c_str());

  // 2. Local Debounce Check
  if (cardUid == lastScannedUid && (millis() - lastScanMillis < LOCAL_COOLDOWN_MS)) {
    Serial.println(F("[Cooldown] Same card scanned immediately. Ignoring to prevent bounce."));
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }
  lastScannedUid = cardUid;
  lastScanMillis = millis();

  // 3. Read Stored Tag Data from Block 2 (Preserving existing tag contents)
  String tagData = "";
  memset(readBlockData, 0, sizeof(readBlockData));
  if (readBlockDataFromCard(blockNum, readBlockData)) {
    for (int j = 0; j < 16; j++) {
      if (readBlockData[j] >= 32 && readBlockData[j] <= 126) {
        tagData += (char)readBlockData[j];
      }
    }
    tagData.trim();
    Serial.printf("Block 2 Stored Data: '%s'\n", tagData.c_str());
  } else {
    Serial.println(F("[RFID] Warning: Could not read Block 2 data (proceeding with UID)."));
  }

  // 4. Construct Scan Event Payload
  eventCounter++;
  String eventId = String(DEVICE_ID) + "_" + String(time(nullptr)) + "_" + String(eventCounter);
  String timestamp = getIsoTimestamp();

  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["cardUid"] = cardUid;
  if (tagData.length() > 0) {
    doc["tagData"] = tagData;
  }
  doc["timestamp"] = timestamp;
  doc["eventId"] = eventId;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // 5. Transmit or Buffer in Offline Queue
  if (WiFi.status() == WL_CONNECTED) {
    bool sent = postScanPayload(jsonPayload, false);
    if (!sent) {
      Serial.println(F("[Network] Backend unreachable. Buffering scan event offline..."));
      saveToOfflineQueue(jsonPayload);
    }
  } else {
    Serial.println(F("[WiFi] Disconnected. Buffering scan event offline..."));
    saveToOfflineQueue(jsonPayload);
  }

  // 6. Halt RFID PICC & Stop Cryptography
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}


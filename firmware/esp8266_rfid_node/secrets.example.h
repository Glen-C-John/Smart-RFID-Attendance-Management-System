#ifndef SECRETS_H
#define SECRETS_H

// Wi-Fi Configuration (ESP8266 requires a 2.4 GHz network)
#define WIFI_SSID        "YOUR_2.4GHZ_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"

// Backend API URL (Replace with your server IP and port)
#define BACKEND_SCAN_URL "http://192.168.1.100:5001/api/v1/device/scan"

// Device Authentication Credentials
#define DEVICE_ID        "ESP8266_001"
#define DEVICE_KEY       "esp8266_device_secret_token_123"

#endif

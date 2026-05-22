<div align="center">

<img src="https://github.com/user-attachments/assets/3d5d1b6f-210c-47b1-850a-e1bab2c7a106" width="60%" style="border-radius: 12px;" />

<br/>
<br/>

# 🤖 Smart Workshop Robot

### _Human-Following · IoT-Connected · Safety-Aware_

<br/>

[![ESP32](https://img.shields.io/badge/ESP32-Microcontroller-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Arduino](https://img.shields.io/badge/Arduino-IDE-00979D?style=for-the-badge&logo=arduino&logoColor=white)](https://www.arduino.cc/)
[![HTML CSS JS](https://img.shields.io/badge/Web-Dashboard-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)

<br/>

> **A smart tool-carrying robot that follows your hand, monitors environmental hazards, and streams live sensor data to a modern web dashboard — all powered by ESP32 and Firebase.**

<br/>

---

</div>

<br/>

## 📌 Table of Contents

- [✨ Features Overview](#-features-overview)
- [🧠 How the Robot Works](#-how-the-robot-works)
- [📡 Firebase Database Structure](#-firebase-realtime-database-structure)
- [🛠 Hardware Components](#-hardware-components)
- [💻 Software & Technologies](#-software--technologies)
- [📊 Web Dashboard](#-web-dashboard)
- [⚙️ Installation](#️-installation)

<br/>

---

<br/>

## ✨ Features Overview

<br/>

<table>
<tr>
<td width="50%">

### 🤖 Human-Following Mode
Uses **IR sensors + Ultrasonic sensor** to detect and follow a hand in real time. The robot intelligently adjusts direction based on which sensor detects the target.

</td>
<td width="50%">

### 📶 RSSI-Based Proximity Control
The robot only follows when the paired mobile device is **physically nearby**, verified via WiFi signal strength:
```
WiFi.RSSI() >= -30 dBm
```

</td>
</tr>
<tr>
<td width="50%">

### 🔥 Flame Detection & Auto-Stop
If a flame is detected by the flame sensor, the robot **immediately halts** all movement and broadcasts a warning to the dashboard.

</td>
<td width="50%">

### ☁️ Air Quality Monitoring
An **MQ-2 gas/smoke sensor** continuously measures air quality and streams the status live to the web dashboard.

</td>
</tr>
<tr>
<td width="50%">

### 🌐 Real-Time IoT Dashboard
A responsive web dashboard built with **HTML, CSS, and JavaScript** connected directly to **Firebase RTDB** for zero-latency sensor visualization.

</td>
<td width="50%">

### 🕹️ Manual Remote Control
Switch between **Auto Follow Mode** and **Manual Control Mode** from the dashboard — with directional buttons for full remote operation.

</td>
</tr>
</table>

<br/>

---

<br/>

## 🧠 How the Robot Works

<br/>

### ✅ Human-Following Conditions

All four conditions must be satisfied simultaneously for the robot to follow:

```
┌─────────────────────────────────────────────────────────┐
│                  FOLLOW MODE ACTIVE WHEN:               │
│                                                         │
│   1️⃣  Hand detected by IR sensors                      │
│   2️⃣  Distance ≤ 20 cm  (Ultrasonic)                   │
│   3️⃣  WiFi RSSI ≥ -30 dBm  (User is nearby)            │
│   4️⃣  No flame detected                                 │
└─────────────────────────────────────────────────────────┘
```

<br/>

### 🔀 Movement Logic Table

<div align="center">

| IR Left | IR Right | 🤖 Action |
|:---:|:---:|:---:|
| ✅ `1` | ✅ `1` | ⬆️ **Move Forward** |
| ✅ `1` | ❌ `0` | ↩️ **Turn Left** |
| ❌ `0` | ✅ `1` | ↪️ **Turn Right** |
| ❌ `0` | ❌ `0` | 🛑 **Stop** |

</div>

<br/>

### 🔄 System Flow Diagram

```
┌──────────┐     WiFi      ┌──────────────────┐     Firebase      ┌──────────────┐
│  ESP32   │ ◄──────────► │  Mobile / Router  │ ◄──────────────► │  Dashboard   │
│  Robot   │              └──────────────────┘                   │  (Browser)   │
└────┬─────┘                                                      └──────────────┘
     │
     ├── IR Sensors ──────► Hand Detection
     ├── Ultrasonic ────── ► Distance Check
     ├── MQ-2 Sensor ─────► Air Quality
     ├── Flame Sensor ─────► Fire Alert
     └── L298N Driver ─────► Motor Control
```

<br/>

---

<br/>

## 📡 Firebase Realtime Database Structure

<br/>

```
📂 robot/
│
├── 🏷️ mode
│        └── "manual" | "follow"
│
├── 🎮 control/
│        ├── command        ← directional command string
│        └── timestamp      ← last command time (ms)
│
├── 📶 status/
│        ├── connected      ← true | false
│        └── rssi           ← WiFi signal strength (dBm)
│
└── 📊 sensors/
         ├── distance       ← cm (Ultrasonic)
         ├── mq2            ← raw analog value
         ├── airQuality     ← "Good" | "Poor"
         └── flame          ← true | false
```

<br/>

> 💡 The ESP32 continuously pushes sensor data to Firebase. The dashboard listens via **real-time event streams** — no polling required.

<br/>

---

<br/>

## 🛠 Hardware Components

<br/>

<div align="center">

| # | Component | Purpose |
|:---:|:---|:---|
| 1 | **ESP32** | Main microcontroller + WiFi/Firebase |
| 2 | **L298N Motor Driver** | Controls left & right DC motors |
| 3 | **Ultrasonic Sensor (HC-SR04)** | Measures distance to hand/obstacle |
| 4 | **IR Sensors (×2)** | Left & right hand detection |
| 5 | **MQ-2 Gas Sensor** | Detects smoke, LPG, CO |
| 6 | **Flame Sensor** | Fire detection & emergency stop |
| 7 | **Servo Motor** | Rotates sensor module for scanning |
| 8 | **DC Motors (×2)** | Drives the robot chassis |
| 9 | **Robot Chassis** | Physical frame & wheel assembly |

</div>

<br/>

---

<br/>

## 💻 Software & Technologies

<br/>

<div align="center">

| Layer | Technology |
|:---|:---|
| 🔧 **Firmware** | Arduino IDE for ESP32 |
| 🔥 **Database** | Firebase Realtime Database |
| 🌐 **Frontend** | HTML5 · CSS3 · Vanilla JavaScript |
| 📦 **Libraries** | `ESP32Servo` · `FirebaseESP32Client` · `WiFi.h` |

</div>

<br/>

---

<br/>

## 📊 Web Dashboard

<br/>

<div align="center">

<img src="https://github.com/user-attachments/assets/0a06db81-a771-4212-80bb-37395974a1d6" width="100%" style="border-radius: 10px;" />

</div>

<br/>

### Dashboard Features

| Feature | Description |
|:---|:---|
| 📏 **Distance Monitor** | Live ultrasonic distance reading in cm |
| 🌬️ **Air Quality Status** | Good / Poor based on MQ-2 readings |
| 🔥 **Flame Alert** | Real-time fire detection status |
| 📶 **RSSI Strength** | Live WiFi signal strength indicator |
| 🔁 **Mode Toggle** | Switch between Manual and Follow mode |
| 🎮 **Manual Controls** | Directional buttons (Forward / Backward / Left / Right / Stop) |
| 📱 **Responsive UI** | Works on desktop and mobile browsers |

<br/>

---

<br/>

## ⚙️ Installation

<br/>

### 1️⃣ Upload ESP32 Firmware

Open the Arduino project file:

```
arduino/human_following_robot.ino
```

Install the required libraries via Arduino Library Manager:

```
✔ FirebaseESP32  (by Mobizt)
✔ ESP32Servo
✔ WiFi (built-in with ESP32 core)
```

<br/>

### 2️⃣ Configure Firebase Credentials

Inside `human_following_robot.ino`, update:

```cpp
#define FIREBASE_HOST   "your-project.firebaseio.com"
#define FIREBASE_AUTH   "your-database-secret"
#define WIFI_SSID       "your-wifi-name"
#define WIFI_PASSWORD   "your-wifi-password"
```

<br/>

### 3️⃣ Deploy the Web Dashboard

Open `dashboard/index.html` in any browser, or host it on:

- **GitHub Pages**
- **Firebase Hosting**
- **Netlify / Vercel**

Update the Firebase config inside the HTML file with your own project credentials.

<br/>

### 4️⃣ Power Up & Test

```
1. Flash ESP32 with the firmware
2. Power on the robot chassis
3. Open the dashboard in a browser
4. Switch to Follow Mode
5. Hold your hand in front of the IR sensors within 20 cm
6. Watch the robot follow! 🤖
```

<br/>

---

<br/>

<div align="center">

### 🚀 Built with passion for Robotics · IoT · Open Source

<br/>

[![ESP32](https://img.shields.io/badge/ESP32-Powered-E7352C?style=flat-square&logo=espressif)](https://www.espressif.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Connected-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Open Source](https://img.shields.io/badge/Open-Source-brightgreen?style=flat-square&logo=github)](https://github.com/)

<br/>

_If this project helped you, give it a ⭐ on GitHub!_

</div>

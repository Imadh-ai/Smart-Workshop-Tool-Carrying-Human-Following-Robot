# 🤖 Smart Workshop Human-Following Robot (IoT + Robotics)


![1](https://github.com/user-attachments/assets/3d5d1b6f-210c-47b1-850a-e1bab2c7a106)

A **Smart Workshop Tool-Carrying and Human-Following Robot** built using **ESP32 and Firebase Realtime Database**.  
This project combines **Robotics, IoT, and Web Technologies** to create a robot that can be controlled remotely and monitor environmental conditions in real time.

The robot can **follow a human hand**, **detect environmental hazards**, and **stream live sensor data to a modern web dashboard**.

---

# 🚀 Features

### 🤖 Human-Following Robot
- Uses **IR sensors + Ultrasonic sensor** to detect and follow a hand.
- Robot follows forward when both IR sensors detect a target.
- Adjusts direction when only one IR sensor detects the target.

### 📶 RSSI-Based Following Control
Robot follows **only when the WiFi signal strength is strong enough**.

Condition:
WiFi.RSSI() >= -30 dBm


This ensures the robot follows the user **only when the mobile device is nearby**.

---

### 🌐 Real-Time IoT Dashboard
A modern web dashboard built using **HTML, CSS, and JavaScript** connected to **Firebase RTDB**.

The dashboard displays:

- Distance from Ultrasonic Sensor
- Air Quality Status
- Flame Detection Status
- WiFi Signal Strength (RSSI)
- Robot Mode (Manual / Follow)

---

### 🛑 Safety Features

#### 🔥 Flame Detection
If a flame is detected:
- Robot **immediately stops**
- Status updates on the dashboard

#### ☁️ Gas / Smoke Detection
Using **MQ-2 sensor**:
- Detects smoke or gas
- Air quality status displayed on dashboard

---

# 🧠 How the Robot Works

### Human Following Logic

Robot follows only when:

1️⃣ Hand detected by IR sensors  
2️⃣ Distance ≤ **20 cm** from ultrasonic sensor  
3️⃣ WiFi signal strength ≥ **-30 dBm**  
4️⃣ No flame detected  

Movement logic:

| IR Left | IR Right | Movement |
|-------|-------|--------|
| 1 | 1 | Move Forward |
| 1 | 0 | Turn Left |
| 0 | 1 | Turn Right |
| 0 | 0 | Stop |

---

# 📡 Firebase Realtime Database Structure


robot
│
├── mode
│ manual / follow
│
├── control
│ command
│ timestamp
│
├── status
│ connected
│ rssi
│
└── sensors
distance
mq2
airQuality
flame


The ESP32 continuously updates sensor data to Firebase and the dashboard listens to changes in real time.

---

# 🛠 Hardware Used

| Component | Purpose |
|--------|--------|
| ESP32 | Main microcontroller |
| L298N Motor Driver | Controls DC motors |
| Ultrasonic Sensor | Distance measurement |
| IR Sensors | Hand detection |
| MQ-2 Gas Sensor | Smoke / gas detection |
| Flame Sensor | Fire detection |
| Servo Motor | Sensor scanning |
| DC Motors | Robot movement |
| Robot Chassis | Physical structure |

---

# 💻 Software & Technologies

- **Arduino (ESP32)**
- **Firebase Realtime Database**
- **HTML / CSS / JavaScript**
- **ESP32Servo Library**
- **Firebase ESP Client Library**

---

# 📊 Web Dashboard

<img width="1872" height="848" alt="WebPage" src="https://github.com/user-attachments/assets/0a06db81-a771-4212-80bb-37395974a1d6" />


The dashboard provides **real-time monitoring and manual control** of the robot.

Features:
- Live sensor monitoring
- WiFi RSSI strength display
- Robot mode switching
- Manual control buttons
- Modern responsive UI

---

# ⚙️ Installation

### 1️⃣ Upload ESP32 Code

Open Arduino project:
arduino/human_following_robot.ino

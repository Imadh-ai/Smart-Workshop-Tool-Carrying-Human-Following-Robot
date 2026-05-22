#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>



//  WIFI code
#define WIFI_SSID       "wifi_name"
#define WIFI_PASSWORD   "password"

// FIREBASE
#define DATABASE_URL    "Your_Database_Url_Here"
#define DATABASE_SECRET "Your_Secret_Code_Here" 

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// pin config
#define ENA 25
#define ENB 26
#define IN1 27
#define IN2 14
#define IN3 12
#define IN4 13

#define TRIG 4
#define ECHO 34

#define IR_LEFT  22
#define IR_RIGHT 23

#define SERVO_PIN 15
#define SERVO_LEFT    20
#define SERVO_CENTER  90
#define SERVO_RIGHT   160

#define FLAME_AO 33
#define FLAME_THRESHOLD 500

#define MQ2_AO 35
#define MQ2_DO 18

// component settings
#define SPEED_FORWARD  180
#define SPEED_TURN     180  
#define TURN_90_MS     600  

#define MIN_DIST        2
#define FOLLOW_MAX      20

#define LOST_WAIT_MS    6000
#define SEARCH_SWEEPS   4
#define SERVO_STEP_MS   350

#define COMMAND_TIMEOUT_MS 800


// RSSI follow gating: follow only when WiFi RSSI is stronger than -30 dBm
#define RSSI_FOLLOW_THRESHOLD_DBM  (-30)
// MQ2
int mq2Baseline = 0;
bool mq2Calibrated = false;
#define MQ2_CALIBRATION_MS  8000
#define MQ2_BAD_DELTA       350

// state of the robot
enum RobotState { FOLLOWING, LOST_WAIT, SEARCHING, CALM };
RobotState followState = FOLLOWING;

String currentMode = "manual";
Servo scanServo;

int sweepCount = 0;
int searchStep = 0;
unsigned long lastServoMoveMs = 0;
unsigned long lostStartMs = 0;

unsigned long lastCmdPollMs = 0;
unsigned long lastModePollMs = 0;
unsigned long lastStatusPushMs = 0;
unsigned long lastSensorPushMs = 0;

String lastCommand = "stop";
unsigned long lastCmdTimestamp = 0;
unsigned long lastCmdSeenMs = 0;
bool turnExecuting = false; 


static inline bool isDetectedLOW(int pin) { return digitalRead(pin) == LOW; }


bool isRssiGoodForFollow() {
  if (WiFi.status() != WL_CONNECTED) return false;
  // WiFi.RSSI() returns negative dBm (e.g., -25 strong, -70 weak)
  return WiFi.RSSI() >= RSSI_FOLLOW_THRESHOLD_DBM;
}

float readUltrasonic() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 25000);
  if (duration == 0) return -1;
  return duration / 58.2f;
}

int readMQ2() { return analogRead(MQ2_AO); }

const char* flameTextFromAO(int flameAO) {
  return (flameAO <= FLAME_THRESHOLD) ? "DETECTED" : "SAFE";
}

void updateMQ2Baseline() {
  static unsigned long startMs = 0;
  static long sum = 0;
  static int count = 0;
  if (mq2Calibrated) return;
  if (startMs == 0) startMs = millis();
  int v = analogRead(MQ2_AO);
  sum += v;
  count++;
  if (millis() - startMs >= MQ2_CALIBRATION_MS) {
    mq2Baseline = (count > 0) ? (int)(sum / count) : v;
    mq2Calibrated = true;
    Firebase.RTDB.setInt(&fbdo, "/robot/sensors/mq2Baseline", mq2Baseline);
  }
}

bool isAirBadFromBaseline(int mq2Val) {
  if (!mq2Calibrated) return false;
  return (mq2Val > (mq2Baseline + MQ2_BAD_DELTA));
}

// motor controls
void stopMotors() {
  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

void moveForward(int s) {
  s = constrain(s, 0, 255);
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
  ledcWrite(ENA, s);
  ledcWrite(ENB, s);
}

void moveBackward(int s) {
  s = constrain(s, 0, 255);
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  ledcWrite(ENA, s);
  ledcWrite(ENB, s);
}

void turnLeft90() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); 
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); 
  ledcWrite(ENA, SPEED_TURN);
  ledcWrite(ENB, SPEED_TURN);
  delay(TURN_90_MS);
  stopMotors();
}

void turnRight90() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH); 
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);  
  ledcWrite(ENA, SPEED_TURN);
  ledcWrite(ENB, SPEED_TURN);
  delay(TURN_90_MS);
  stopMotors();
}

// wifi and firebase
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) { delay(300); }
}

void connectFirebase() {
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void pushStatus() {
  bool wifiOk = (WiFi.status() == WL_CONNECTED);
  Firebase.RTDB.setBool(&fbdo, "/robot/status/connected", true);
  Firebase.RTDB.setInt(&fbdo, "/robot/status/rssi", wifiOk ? WiFi.RSSI() : -100);
}

void pushSensors(float distCm, int mq2Val, bool airBad, int flameAO) {
  FirebaseJson json;
  json.set("distance", (distCm > 0) ? (int)distCm : -1);
  json.set("airQuality", airBad ? "Bad" : "Good");
  json.set("mq2", mq2Val);
  json.set("flame", flameTextFromAO(flameAO));
  Firebase.RTDB.setJSON(&fbdo, "/robot/sensors", &json);
}

void pollMode() {
  if (millis() - lastModePollMs < 300) return;
  lastModePollMs = millis();
  if (Firebase.RTDB.getString(&fbdo, "/robot/mode")) {
    String m = fbdo.stringData();
    m.toLowerCase();
    if (m == "manual" || m == "follow") currentMode = m;
  }
}

void pollCommand() {
  if (millis() - lastCmdPollMs < 120) return;
  lastCmdPollMs = millis();
  if (Firebase.RTDB.getString(&fbdo, "/robot/control/command")) {
    String cmd = fbdo.stringData();
    cmd.toLowerCase();
    if (Firebase.RTDB.getInt(&fbdo, "/robot/control/timestamp")) {
      unsigned long ts = (unsigned long)fbdo.intData();
      if (ts != lastCmdTimestamp) {
        lastCmdTimestamp = ts;
        lastCommand = cmd;
        lastCmdSeenMs = millis();
      }
    }
  }
}

// automated following
void doAutomatedFollowing(float dist, bool leftIR, bool rightIR) {
  
  bool handPresent = (leftIR || rightIR);
  bool inRange = (dist > 0 && dist <= FOLLOW_MAX);

  if (handPresent && inRange) {
    if (leftIR && rightIR) {
      moveForward(180);
    } else if (leftIR) {
   
      digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
      digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
      ledcWrite(ENA, 180); ledcWrite(ENB, 0);
    } else if (rightIR) {
      
      digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
      digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
      ledcWrite(ENA, 0); ledcWrite(ENB, 180);
    }
  } else {
    stopMotors(); 
  }
}


void runManual() {
  if (millis() - lastCmdSeenMs > COMMAND_TIMEOUT_MS || lastCommand == "stop") {
    stopMotors();
    return;
  }

  if (lastCommand == "forward") moveForward(SPEED_FORWARD);
  else if (lastCommand == "backward") moveBackward(SPEED_FORWARD);
  else if (lastCommand == "left") turnLeft90();
  else if (lastCommand == "right") turnRight90();
}


void setup() {
  Serial.begin(115200);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  pinMode(IR_LEFT, INPUT); pinMode(IR_RIGHT, INPUT);
  pinMode(MQ2_DO, INPUT);
  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);
  scanServo.attach(SERVO_PIN);
  scanServo.write(SERVO_CENTER);
  stopMotors();
  connectWiFi();
  connectFirebase();
}


void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  pollMode();
  pollCommand();

  float dist = readUltrasonic();
  bool leftIR = isDetectedLOW(IR_LEFT);
  bool rightIR = isDetectedLOW(IR_RIGHT);
  updateMQ2Baseline();
  int mq2Val = readMQ2();
  bool airBad = isAirBadFromBaseline(mq2Val);
  int flameAO = analogRead(FLAME_AO);
  bool flameDet = (flameAO <= FLAME_THRESHOLD);

  if (flameDet) {
    stopMotors();
  } else {
    if (currentMode == "manual") {
      runManual();
    } else {
      // Mode is Automated Follow
      if (isRssiGoodForFollow()) {
        doAutomatedFollowing(dist, leftIR, rightIR);
      } else {
        stopMotors();
      }
    }
  }

  if (millis() - lastStatusPushMs > 800) {
    lastStatusPushMs = millis();
    pushStatus();
  }
  if (millis() - lastSensorPushMs > 300) {
    lastSensorPushMs = millis();
    pushSensors(dist, mq2Val, airBad, flameAO);
  }
}
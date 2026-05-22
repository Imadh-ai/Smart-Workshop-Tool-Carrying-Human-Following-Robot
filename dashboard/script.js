// Firebase Configuration (UNCHANGED BACK-END LOGIC)
import { initializeApp } from 'firebase_url';
import { getDatabase, ref, set, onValue, update } from 'firebase_url';

const firebaseConfig = {
  YOUR_SECRET_KEY
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ===================== DOM ELEMENTS =====================
const statusBadge = document.getElementById('statusBadge');
const statusText  = document.getElementById('statusText');

const wifiBadge = document.getElementById('wifiBadge');
const wifiText  = document.getElementById('wifiText');

const alertSection = document.getElementById('alertSection');
const alertTitle   = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const dismissAlertBtn = document.getElementById('dismissAlertBtn');

const distanceDisplay   = document.getElementById('distance');
const distanceHint      = document.getElementById('distanceHint');
const airQualityDisplay = document.getElementById('airQuality');
const flameStatusDisplay= document.getElementById('flameStatus');
const modeDisplay       = document.getElementById('mode');

const rssiValueEl       = document.getElementById('rssiValue');
const signalQualityEl   = document.getElementById('signalQuality');
const followAllowedEl   = document.getElementById('followAllowed');
const mq2RawEl          = document.getElementById('mq2Raw');
const mq2BaselineEl     = document.getElementById('mq2Baseline');
const lastUpdatedEl     = document.getElementById('lastUpdated');

const forwardBtn  = document.getElementById('forwardBtn');
const backwardBtn = document.getElementById('backwardBtn');
const leftBtn     = document.getElementById('leftBtn');
const rightBtn    = document.getElementById('rightBtn');
const stopBtn     = document.getElementById('stopBtn');

const manualModeBtn = document.getElementById('manualModeBtn');
const followModeBtn = document.getElementById('followModeBtn');

// ===================== SETTINGS =====================
let currentMode = 'manual';
let lastWifi = { rssi: null, wifiOk: null };

// This matches your Arduino requirement (follow only if RSSI >= -30 dBm)
const RSSI_FOLLOW_THRESHOLD_DBM = -30;

// ===================== INIT =====================
init();

function init() {
  setupControlButtonsContinuous();
  setupModeButtons();
  listenToFirebase();
  if (dismissAlertBtn) dismissAlertBtn.addEventListener('click', hideAlert);
}

// ===================== CONTROL: CONTINUOUS WHILE HOLD =====================
function setupControlButtonsContinuous() {
  const bindHold = (btn, command) => {
    if (!btn) return;

    const start = (e) => {
      e.preventDefault();
      if (currentMode !== 'manual') return;
      sendCommand(command);
      btn.classList.add('holding');
    };

    const end = (e) => {
      e.preventDefault();
      if (currentMode !== 'manual') return;
      sendCommand('stop');
      btn.classList.remove('holding');
    };

    // Mouse
    btn.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);

    // Touch
    btn.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
    window.addEventListener('touchcancel', end, { passive: false });

    // Pointer
    btn.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  bindHold(forwardBtn, 'forward');
  bindHold(backwardBtn, 'backward');
  bindHold(leftBtn, 'left');
  bindHold(rightBtn, 'right');

  if (stopBtn) {
    stopBtn.addEventListener('click', () => sendCommand('stop'));
    stopBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sendCommand('stop');
    }, { passive: false });
  }
}

// ===================== MODE BUTTONS =====================
function setupModeButtons() {
  if (manualModeBtn) manualModeBtn.addEventListener('click', () => setMode('manual'));
  if (followModeBtn) followModeBtn.addEventListener('click', () => setMode('follow'));
  if (manualModeBtn) manualModeBtn.classList.add('active');
}

function setMode(mode) {
  const modeRef = ref(database, 'robot/mode');
  set(modeRef, mode)
    .then(() => {
      currentMode = mode;
      updateModeUI(mode);
      if (modeDisplay) modeDisplay.textContent = capitalize(mode);
    })
    .catch((error) => console.error('Error setting mode:', error));
}

function updateModeUI(mode) {
  if (!manualModeBtn || !followModeBtn) return;

  if (mode === 'manual') {
    manualModeBtn.classList.add('active');
    followModeBtn.classList.remove('active');
  } else {
    followModeBtn.classList.add('active');
    manualModeBtn.classList.remove('active');
  }
}

// ===================== FIREBASE WRITE: COMMAND =====================
function sendCommand(command) {
  const commandRef = ref(database, 'robot/control');

  update(commandRef, {
    command,
    timestamp: Date.now()
  })
    .catch((error) => console.error('Error sending command:', error));
}

// ===================== FIREBASE LISTENERS =====================
function listenToFirebase() {
  // Robot online status
  onValue(ref(database, 'robot/status/connected'), (snapshot) => {
    const connected = snapshot.val();
    updateConnectionStatus(!!connected);
  });

  // RSSI
  onValue(ref(database, 'robot/status/rssi'), (snapshot) => {
    const rssi = snapshot.val();
    updateWifiBadge({ rssi });
    updateRssiWidgets(rssi);
  });

  // (Optional) wifiConnected node if you ever add it
  onValue(ref(database, 'robot/status/wifiConnected'), (snapshot) => {
    const wifiOk = snapshot.val();
    updateWifiBadge({ wifiOk });
  });

  // Sensor data
  onValue(ref(database, 'robot/sensors'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateSensorData(data);
      stampUpdated();
    }
  });

  // Alerts (optional node — if not used, UI hides)
  onValue(ref(database, 'robot/alerts'), (snapshot) => {
    const alerts = snapshot.val();
    if (alerts) handleAlerts(alerts);
    else hideAlert();
  });

  // Mode changes
  onValue(ref(database, 'robot/mode'), (snapshot) => {
    const mode = snapshot.val();
    if (!mode) return;
    currentMode = mode;
    if (modeDisplay) modeDisplay.textContent = capitalize(mode);
    updateModeUI(mode);
  });

  // Baseline (your Arduino writes /robot/sensors/mq2Baseline in calibration)
  onValue(ref(database, 'robot/sensors/mq2Baseline'), (snapshot) => {
    const base = snapshot.val();
    if (mq2BaselineEl && (typeof base === 'number')) mq2BaselineEl.textContent = base;
  });
}

// ===================== UI UPDATE: CONNECTION =====================
function updateConnectionStatus(connected) {
  if (!statusBadge || !statusText) return;

  if (connected) {
    statusBadge.classList.add('connected');
    statusText.textContent = 'Connected';
  } else {
    statusBadge.classList.remove('connected');
    statusText.textContent = 'Disconnected';
  }
}

// ===================== UI UPDATE: WIFI BADGE =====================
function updateWifiBadge({ rssi, wifiOk }) {
  if (rssi !== undefined) lastWifi.rssi = rssi;
  if (wifiOk !== undefined) lastWifi.wifiOk = wifiOk;

  if (!wifiText) return;

  if (typeof lastWifi.rssi === 'number') {
    wifiText.textContent = `WiFi: ${lastWifi.rssi} dBm`;
  } else if (typeof lastWifi.wifiOk === 'boolean') {
    wifiText.textContent = lastWifi.wifiOk ? 'WiFi: Connected' : 'WiFi: Disconnected';
  } else {
    wifiText.textContent = 'WiFi: Unknown';
  }
}

// ===================== UI UPDATE: RSSI Widgets =====================
function updateRssiWidgets(rssi) {
  if (typeof rssi !== 'number') {
    if (rssiValueEl) rssiValueEl.textContent = '-- dBm';
    if (signalQualityEl) signalQualityEl.textContent = '--';
    if (followAllowedEl) followAllowedEl.textContent = '--';
    return;
  }

  if (rssiValueEl) rssiValueEl.textContent = `${rssi} dBm`;

  const quality = rssi >= -30 ? 'Excellent' :
                  rssi >= -50 ? 'Good' :
                  rssi >= -67 ? 'Fair' : 'Weak';

  if (signalQualityEl) signalQualityEl.textContent = quality;

  const allowed = rssi >= RSSI_FOLLOW_THRESHOLD_DBM;
  if (followAllowedEl) followAllowedEl.textContent = allowed ? 'YES ✅' : 'NO ❌';
}

// ===================== UI UPDATE: SENSORS =====================
function updateSensorData(data) {
  // Distance
  if (distanceDisplay && data.distance !== undefined) {
    distanceDisplay.textContent = `${data.distance} cm`;
  }
  if (distanceHint && data.distance !== undefined) {
    // Your code follows when dist > 0 and <= 20 cm
    const d = Number(data.distance);
    if (!Number.isFinite(d) || d < 0) distanceHint.textContent = 'No valid reading';
    else if (d <= 20) distanceHint.textContent = 'In follow range (≤ 20cm) — IR decides direction';
    else distanceHint.textContent = 'Out of follow range (> 20cm) — robot stops';
  }

  // MQ2 raw (you push "mq2" inside /robot/sensors)
  if (mq2RawEl && typeof data.mq2 === 'number') mq2RawEl.textContent = data.mq2;

  // Air Quality (you push "Good"/"Bad")
  if (airQualityDisplay) {
    if (typeof data.airQuality === 'string') {
      airQualityDisplay.textContent = data.airQuality;
      paintByState(airQualityDisplay, data.airQuality.toLowerCase() === 'bad' ? 'bad' : 'good');
    } else {
      airQualityDisplay.textContent = '--';
    }
  }

  // Flame (you push "SAFE"/"DETECTED")
  if (flameStatusDisplay) {
    if (typeof data.flame === 'string') {
      const txt = data.flame.toUpperCase();
      flameStatusDisplay.textContent = txt;
      const detected = (txt === 'DETECTED');
      paintByState(flameStatusDisplay, detected ? 'bad' : 'good');
      document.body.classList.toggle('flame-danger', detected);
    } else {
      flameStatusDisplay.textContent = '--';
      document.body.classList.remove('flame-danger');
    }
  }
}

// color helper (visual only)
function paintByState(el, state) {
  if (!el) return;
  if (state === 'good') el.style.color = 'var(--good)';
  else if (state === 'bad') el.style.color = 'var(--bad)';
  else if (state === 'warn') el.style.color = 'var(--warn)';
  else el.style.color = '';
}

// ===================== ALERTS =====================
function handleAlerts(alerts) {
  if (alerts.flame && alerts.flame.active) {
    showAlert('🔥 Flame Detected!', alerts.flame.message || 'Flame detected. Robot stopped.');
    return;
  }
  if (alerts.airQuality && alerts.airQuality.active) {
    showAlert('☁️ Bad Air Detected!', alerts.airQuality.message || 'Smoke/gas detected by MQ-2.');
    return;
  }
  hideAlert();
}

function showAlert(title, message) {
  if (!alertSection || !alertTitle || !alertMessage) return;
  alertSection.style.display = 'flex';
  alertTitle.textContent = title;
  alertMessage.textContent = message;
}

function hideAlert() {
  if (!alertSection) return;
  alertSection.style.display = 'none';
}

// ===================== Updated timestamp =====================
function stampUpdated() {
  if (!lastUpdatedEl) return;
  const d = new Date();
  lastUpdatedEl.textContent = d.toLocaleString();
}

// ===================== UTIL =====================
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const MAX_HISTORY = 200;
const currentWordEl = document.getElementById("currentWord");
const historyEl = document.getElementById("historyStream");
const connCountEl = document.getElementById("connCount");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const speedSlider = document.getElementById("speedSlider");
const speedValueEl = document.getElementById("speedValue");

/* ---------- State ---------- */
let ws;
let sse;
let paused = false;
let stopped = true;
let autoReconnect = false;
let displayInterval = null;
let latestWord = null;
let displayWpm = 10;

function setButtons() {
  startBtn.disabled = !stopped;
  pauseBtn.disabled = stopped;
  pauseBtn.textContent = paused ? "Continue" : "Pause";
  stopBtn.disabled = stopped;
}
setButtons();

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !stopped && e.target === document.body) {
    e.preventDefault();
    togglePause();
  }
});

/* ---------- WebSocket ---------- */
function connect() {
  const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${wsProto}//${location.host}/ws`);

  ws.addEventListener("open", () => {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected";
    connectSSE();
    startDisplayTimer();
  });

  ws.addEventListener("message", (event) => {
    if (paused) return;
    const data = JSON.parse(event.data);
    latestWord = data.word;
  });

  ws.addEventListener("close", () => {
    statusDot.classList.remove("connected");
    if (autoReconnect) {
      statusText.textContent = "Disconnected — reconnecting...";
      setTimeout(connect, 2000);
    } else {
      statusText.textContent = "Disconnected";
    }
  });

  ws.addEventListener("error", () => {
    ws.close();
  });
}


function toggleHistory() {
  document.querySelector(".history-panel").classList.toggle("expanded");
}

/* ---------- Controls ---------- */
function doStart() {
  stopped = false;
  paused = false;
  autoReconnect = true;
  currentWordEl.textContent = "—";
  historyEl.innerHTML = "";
  connect();
  setButtons();
}

function togglePause() {
  paused = !paused;
  statusText.textContent = paused ? "Paused" : "Connected";
  setButtons();
}

function doStop() {
  stopped = true;
  paused = false;
  autoReconnect = false;
  if (ws) {
    ws.close();
    ws = null;
  }
  if (sse) {
    sse.close();
    sse = null;
  }
  stopDisplayTimer();
  latestWord = null;
  currentWordEl.textContent = "—";
  historyEl.innerHTML = "";
  connCountEl.textContent = "-";
  setButtons();
}

/* ---------- Display Speed Control ---------- */
function startDisplayTimer() {
  stopDisplayTimer();
  const ms = (60 / displayWpm) * 1000;
  displayInterval = setInterval(() => {
    if (latestWord) {
      showWord(latestWord);
      latestWord = null;
    }
  }, ms);
}

function stopDisplayTimer() {
  if (displayInterval) {
    clearInterval(displayInterval);
    displayInterval = null;
  }
}

function showWord(word) {
  currentWordEl.textContent = word;

  const item = document.createElement("div");
  item.className = "history-item";
  const ts = new Date().toLocaleTimeString();
  item.innerHTML = `<span class="ts">${ts}</span>${word}`;
  historyEl.prepend(item);

  while (historyEl.children.length > MAX_HISTORY) {
    historyEl.removeChild(historyEl.lastChild);
  }
}

function onSpeedChange(value) {
  displayWpm = Number(value);
  speedValueEl.textContent = value + " wpm";
  if (displayInterval) {
    startDisplayTimer();
  }
}

/* ---------- Active Connections (SSE) ---------- */
function connectSSE() {
  if (sse) {
    sse.close();
  }
  sse = new EventSource("/api/connections");

  sse.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    connCountEl.textContent = data.active_connections;
  });

  sse.addEventListener("error", () => {
    connCountEl.textContent = "!";
    console.error("SSE connection error");
  });
}

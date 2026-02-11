const MAX_WORDS = 200;
const streamEl = document.getElementById("wordStream");
const connCountEl = document.getElementById("connCount");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const continueBtn = document.getElementById("continueBtn");
const stopBtn = document.getElementById("stopBtn");

/* ---------- State ---------- */
let ws;
let sse;
let paused = false;
let stopped = true;
let autoReconnect = false;

function setButtons() {
  startBtn.disabled = !stopped;
  pauseBtn.disabled = stopped || paused;
  continueBtn.disabled = stopped || !paused;
  stopBtn.disabled = stopped;
}
setButtons();

/* ---------- WebSocket ---------- */
function connect() {
  const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${wsProto}//${location.host}/ws`);

  ws.addEventListener("open", () => {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected";
    connectSSE();
  });

  ws.addEventListener("message", (event) => {
    if (paused) return;
    const data = JSON.parse(event.data);
    addWord(data.word);
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

function addWord(word) {
  const item = document.createElement("div");
  item.className = "word-item";
  const ts = new Date().toLocaleTimeString();
  item.innerHTML = `<span class="ts">${ts}</span>${word}`;
  streamEl.prepend(item);

  while (streamEl.children.length > MAX_WORDS) {
    streamEl.removeChild(streamEl.lastChild);
  }
}

/* ---------- Controls ---------- */
function doStart() {
  stopped = false;
  paused = false;
  autoReconnect = true;
  streamEl.innerHTML = "";
  connect();
  setButtons();
}

function doPause() {
  paused = true;
  statusText.textContent = "Paused";
  setButtons();
}

function doContinue() {
  paused = false;
  statusText.textContent = "Connected";
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
  streamEl.innerHTML = "";
  connCountEl.textContent = "-";
  setButtons();
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

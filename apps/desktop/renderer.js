let cfg = null;
let api = null;
let paired = false;
let sharing = false;

const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Number(n || 0).toFixed(4);

async function init() {
  cfg = await window.desktop.getConfig();
  api = window.GpuShareApi.createApi(cfg.apiUrl);
  $("conn").textContent = cfg.apiUrl;
  window.desktop.onWorkerLog((line) => {
    const log = $("log");
    log.textContent += line;
    log.scrollTop = log.scrollHeight;
  });
  window.desktop.onWorkerState((running) => setSharing(running));
}

$("pair-btn").onclick = async () => {
  $("pair-info").classList.remove("hidden");
  $("pair-status").textContent = "Requesting code…";
  try {
    const res = await api.pair();
    $("pair-code").textContent = res.code || "——";
    // Mock backend auto-approves and returns a device token immediately.
    if (res.status === "approved" && res.device_token) {
      $("pair-status").textContent = "Approved ✓";
      await enterDashboard(res);
    } else {
      $("pair-status").textContent = "Waiting for approval on the website…";
    }
  } catch (e) {
    $("pair-status").textContent = "Pairing failed: " + e.message;
  }
};

$("open-web").onclick = () => {
  // In real mode this opens the website approval page.
  $("pair-status").textContent = "Opening website… (mock auto-approves)";
};

async function enterDashboard() {
  paired = true;
  $("pair-screen").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("worker-id").textContent = cfg.workerId;
  const gpu = await window.desktop.getGpuStatus();
  $("gpu").textContent = gpu.label;
  refreshEarnings();
  setInterval(refreshEarnings, 3000);
}

async function refreshEarnings() {
  try {
    const e = await api.earnings(cfg.workerId);
    $("today").textContent = money(e.earnings_today_usd);
    $("total").textContent = money(e.earnings_total_usd);
    $("wallet").textContent = e.payout_wallet || "—";
    drawChart((e.series || []).map((p) => p.cost_usd));
  } catch (_e) {
    $("conn").textContent = cfg.apiUrl + " (offline?)";
  }
}

function drawChart(values) {
  const max = Math.max(0.0001, ...values);
  $("chart").innerHTML = values
    .map((v) => `<span style="height:${Math.round((v / max) * 100)}%"></span>`)
    .join("");
}

function setSharing(on) {
  sharing = on;
  $("share-state").textContent = on ? "On" : "Off";
  $("toggle").textContent = on ? "Stop sharing" : "Start sharing";
  $("toggle").classList.toggle("danger", on);
}

$("toggle").onclick = async () => {
  if (!sharing) {
    await window.desktop.startWorker(cfg);
    setSharing(true);
  } else {
    await window.desktop.stopWorker();
    setSharing(false);
  }
};

init();

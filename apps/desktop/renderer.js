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

let pairCode = null;
let pollTimer = null;

$("pair-btn").onclick = async () => {
  $("pair-info").classList.remove("hidden");
  $("pair-status").textContent = "Requesting code…";
  try {
    const res = await api.pair();
    pairCode = res.code;
    $("pair-code").textContent = res.code || "——";
    if (res.status === "approved" && res.device_token) {
      onApproved(); // mock fast-path
    } else {
      $("pair-status").textContent = "Waiting for approval on the website…";
      pollTimer = setInterval(pollPairing, 1500);
    }
  } catch (e) {
    $("pair-status").textContent = "Pairing failed: " + e.message;
  }
};

async function pollPairing() {
  if (!pairCode) return;
  try {
    const res = await api.pairStatus(pairCode);
    if (res.status === "approved") onApproved();
    else if (res.status === "expired") {
      clearInterval(pollTimer);
      $("pair-status").textContent = "Code expired — try again.";
    }
  } catch (_e) {
    /* keep polling */
  }
}

function onApproved() {
  if (pollTimer) clearInterval(pollTimer);
  $("pair-status").textContent = "Approved ✓";
  enterDashboard();
}

$("open-web").onclick = () => {
  if (!pairCode) {
    $("pair-status").textContent = "Generate a code first.";
    return;
  }
  const url = new URL("/download", cfg.webUrl || "http://localhost:3000");
  url.searchParams.set("code", pairCode);
  window.desktop.openExternal(url.toString());
  $("pair-status").textContent = "Browser opened. Approve code " + pairCode + " on the website.";
};

// Dev-only: simulate the website approving this device, for standalone testing against P1.
$("dev-approve").onclick = async () => {
  if (!pairCode) return;
  try {
    await api.pairApprove(pairCode, "DevWallet1111111111111111111111111111111111");
    $("pair-status").textContent = "Approved (dev) ✓";
  } catch (e) {
    $("pair-status").textContent = "Dev approve failed: " + e.message;
  }
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

$("pct").oninput = () => {
  $("pct-val").textContent = $("pct").value;
};

$("toggle").onclick = async () => {
  if (!sharing) {
    const withCap = {
      ...cfg,
      gpuPct: Number($("pct").value),
      vramCapMb: $("vram").value ? Number($("vram").value) : null,
    };
    await window.desktop.startWorker(withCap);
    setSharing(true);
  } else {
    await window.desktop.stopWorker();
    setSharing(false);
  }
};

init();

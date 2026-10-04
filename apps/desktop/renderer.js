let cfg = null;
let api = null;
let sharing = false;

const $ = (id) => document.getElementById(id);
const usd = (n) => "$" + Number(n || 0).toFixed(6);
const sol = (n) => Number(n || 0).toFixed(6) + " SOL";
const shortAddr = (a) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a || "—");
const agoMin = (ts) => Math.max(0, Math.round((Date.now() / 1000 - ts) / 60));

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
  await maybeSetup();
}

async function maybeSetup() {
  if (!cfg.isPackaged) return;
  const { docker } = await window.desktop.checkPrereqs();
  if (docker) return;
  $("pair-screen").classList.add("hidden");
  $("setup-screen").classList.remove("hidden");
}

$("setup-btn").onclick = () => {
  const el = $("setup-log");
  el.classList.remove("hidden");
  el.textContent = "Starting setup…\n";
  window.desktop.onSetupLog((l) => {
    el.textContent += l;
    el.scrollTop = el.scrollHeight;
  });
  window.desktop.onSetupDone((c) => {
    el.textContent += `\n[setup finished: ${c}] — restart the app to continue.\n`;
  });
  window.desktop.runSetup();
};

$("setup-skip").onclick = () => {
  $("setup-screen").classList.add("hidden");
  $("pair-screen").classList.remove("hidden");
};

$("setup-recheck").onclick = async () => {
  const { docker } = await window.desktop.checkPrereqs();
  if (docker) {
    $("setup-screen").classList.add("hidden");
    $("pair-screen").classList.remove("hidden");
  } else {
    $("setup-log").classList.remove("hidden");
    $("setup-log").textContent += "\nDocker not ready yet — make sure Docker Desktop is running, then Re-check.\n";
  }
};

/* --- pairing (device code -> approve on web -> poll for token) --- */
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
      onApproved(res);
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
    if (res.status === "approved") onApproved(res);
    else if (res.status === "expired") {
      clearInterval(pollTimer);
      $("pair-status").textContent = "Code expired — try again.";
    }
  } catch (_e) {
    /* keep polling */
  }
}

function onApproved(session) {
  if (pollTimer) clearInterval(pollTimer);
  // Use the account identity the backend assigned at pairing, unless WORKER_ID was pinned.
  if (session && session.worker_id && !cfg.workerIdPinned) cfg.workerId = session.worker_id;
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

$("dev-approve").onclick = async () => {
  if (!pairCode) return;
  try {
    await api.pairApprove(pairCode, "DevWallet1111111111111111111111111111111111");
    $("pair-status").textContent = "Approved (dev) ✓";
  } catch (e) {
    $("pair-status").textContent = "Dev approve failed: " + e.message;
  }
};

/* --- dashboard --- */
async function enterDashboard() {
  $("pair-screen").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("worker-id").textContent = cfg.workerId;
  const gpu = await window.desktop.getGpuStatus();
  $("gpu").textContent = gpu.hasGpu ? "NVIDIA GPU" : "No NVIDIA GPU";
  renderPayouts();
  refreshEarnings();
  setInterval(refreshEarnings, 3000);
}

async function renderPayouts(wallet) {
  if (!wallet) return;
  try {
    const { payouts } = await api.payouts(wallet);
    if (!payouts.length) {
      $("payouts").innerHTML = `<li class="ago">No payouts yet.</li>`;
      return;
    }
    $("payouts").innerHTML = payouts
      .map(
        (p) =>
          `<li><span class="sig">${shortAddr(p.signature)}</span><span class="ago">${agoMin(p.ts)} min ago</span><span class="amt num">+${sol(p.amount_sol)}</span></li>`,
      )
      .join("");
  } catch (_e) {
    /* leave as-is */
  }
}

async function refreshEarnings() {
  try {
    const e = await api.earnings(cfg.workerId);
    const series = (e.series || []).map((p) => p.cost_usd);
    $("today").textContent = usd(e.earnings_today_usd);
    $("total").textContent = usd(e.earnings_total_usd);
    $("permin").textContent = usd(series.at(-1) || 0);
    $("wallet").textContent = shortAddr(e.payout_wallet);
    $("wallet").title = e.payout_wallet || "";
    drawArea(series);
    renderPayouts(e.payout_wallet);
  } catch (_e) {
    $("conn").textContent = cfg.apiUrl + " (offline?)";
  }
}

function drawArea(values) {
  const W = 600, H = 220, pad = 10;
  const empty = values.length === 0 || Math.max(...values) <= 0;
  $("empty").classList.toggle("hidden", !empty);
  $("chart-wrap").classList.toggle("hidden", empty);
  if (empty) return;

  const max = Math.max(...values, 0.0001);
  const n = values.length;
  const x = (i) => (n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const y = (v) => H - pad - (v / max) * (H - 2 * pad);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `M${x(0).toFixed(1)},${H - pad} L${pts.join(" L")} L${x(n - 1).toFixed(1)},${H - pad} Z`;
  const grid = [0.25, 0.5, 0.75]
    .map((f) => `<line x1="0" x2="${W}" y1="${(H * f).toFixed(0)}" y2="${(H * f).toFixed(0)}" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke"/>`)
    .join("");
  $("chart").innerHTML =
    `<defs><linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/>` +
    `<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>` +
    grid +
    `<path d="${area}" fill="url(#earn)"/>` +
    `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
}

function setSharing(on) {
  sharing = on;
  $("share-state").textContent = on ? "Live" : "Offline";
  $("live").classList.toggle("on", on);
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

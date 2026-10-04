// Electron main process: window + spawns the existing python worker.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn, execSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..", "..");
const IS_WIN = process.platform === "win32";
const VENV_PY = IS_WIN
  ? path.join(REPO_ROOT, ".venv", "Scripts", "python.exe")
  : path.join(REPO_ROOT, ".venv", "bin", "python");

let worker = null;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("config:get", () => ({
  apiUrl: process.env.API_URL || "http://localhost:8000",
  workerId: process.env.WORKER_ID || "worker-local",
  inputDir: process.env.INPUT_DIR || "",
}));

ipcMain.handle("gpu:status", () => {
  try {
    execSync(IS_WIN ? "where nvidia-smi" : "which nvidia-smi", { stdio: "ignore" });
    return { hasGpu: true, label: "NVIDIA GPU detected" };
  } catch {
    return { hasGpu: false, label: "No NVIDIA GPU — CPU / fake mode" };
  }
});

ipcMain.handle("worker:start", (_e, cfg) => {
  if (worker) return { running: true };
  const env = { ...process.env, API_URL: cfg.apiUrl, WORKER_ID: cfg.workerId, PYTHONUNBUFFERED: "1" };
  if (cfg.inputDir) env.INPUT_DIR = cfg.inputDir;
  if (cfg.gpuPct) env.GPU_SHARE_PCT = String(cfg.gpuPct);
  if (cfg.vramCapMb) env.VRAM_CAP_MB = String(cfg.vramCapMb);
  worker = spawn(VENV_PY, ["-u", "-m", "services.worker"], { cwd: REPO_ROOT, env });
  const send = (d) => win && win.webContents.send("worker:log", d.toString());
  worker.stdout.on("data", send);
  worker.stderr.on("data", send);
  worker.on("exit", (code) => {
    if (win) win.webContents.send("worker:log", `\n[worker exited: ${code}]\n`);
    worker = null;
    if (win) win.webContents.send("worker:state", false);
  });
  return { running: true };
});

ipcMain.handle("worker:stop", () => {
  if (worker) {
    worker.kill();
    worker = null;
  }
  return { running: false };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (worker) worker.kill();
  app.quit();
});

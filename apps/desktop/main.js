const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { appendFileSync, mkdirSync } = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const PRODUCT_NAME = "CoreWhore Provider";
const REPO_ROOT = path.join(__dirname, "..", "..");
const IS_WIN = process.platform === "win32";
const VENV_PY = IS_WIN
  ? path.join(REPO_ROOT, ".venv", "Scripts", "python.exe")
  : path.join(REPO_ROOT, ".venv", "bin", "python");

// Chromium's GPU helper can fail before a BrowserWindow appears on Windows
// machines without the expected graphics runtime. This UI is lightweight, so
// use software rendering there for predictable startup.
if (IS_WIN) {
  app.disableHardwareAcceleration();
}
app.setName(PRODUCT_NAME);

let worker = null;
let win = null;
let logFile = null;

function log(message, error = null) {
  const detail = error?.stack || error?.message || (error ? String(error) : "");
  const line = `${new Date().toISOString()} ${message}${detail ? `\n${detail}` : ""}\n`;
  try {
    if (!logFile) {
      const logDir = path.join(app.getPath("userData"), "logs");
      mkdirSync(logDir, { recursive: true });
      logFile = path.join(logDir, "startup.log");
    }
    appendFileSync(logFile, line, "utf8");
  } catch {
    // Logging must never prevent the application from opening.
  }
}

function ensurePath() {
  if (IS_WIN) return;
  const extra = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    "/Applications/Docker.app/Contents/Resources/bin",
  ];
  const current = (process.env.PATH || "").split(":");
  process.env.PATH = [...extra, ...current].filter(Boolean).join(":");
}
ensurePath();

function showWindow() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  if (win && !win.isDestroyed()) {
    showWindow();
    return win;
  }

  log(`Creating window (packaged=${app.isPackaged}, platform=${process.platform})`);
  win = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: "#080d09",
    autoHideMenuBar: true,
    title: PRODUCT_NAME,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    log("Window is ready to show");
    showWindow();
  });
  win.webContents.on("did-finish-load", () => {
    log("Renderer finished loading");
    showWindow();
  });
  win.webContents.on("did-fail-load", (_event, code, description) => {
    log(`Renderer failed to load (${code}): ${description}`);
    showWindow();
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    log(`Renderer process exited: ${JSON.stringify(details)}`);
  });
  win.on("unresponsive", () => log("Window became unresponsive"));
  win.on("closed", () => {
    win = null;
  });

  win.loadFile(path.join(__dirname, "index.html")).catch((error) => {
    log("Could not load index.html", error);
    showWindow();
  });
  return win;
}

function workerSpawn(env) {
  const options = {
    env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  };
  if (app.isPackaged) {
    const executable = path.join(
      process.resourcesPath,
      "worker",
      IS_WIN ? "coreshare-worker.exe" : "coreshare-worker",
    );
    return spawn(executable, [], options);
  }
  return spawn(VENV_PY, ["-u", "-m", "services.worker"], {
    ...options,
    cwd: REPO_ROOT,
  });
}

function hasCmd(command) {
  try {
    execSync(IS_WIN ? `where ${command}` : `which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

ipcMain.handle("config:get", () => ({
  apiUrl: process.env.API_URL || "http://localhost:8000",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  workerId: process.env.WORKER_ID || "worker-local",
  inputDir: process.env.INPUT_DIR || "",
  isPackaged: app.isPackaged,
}));

ipcMain.handle("open:external", (_event, url) => shell.openExternal(url));

ipcMain.handle("gpu:status", () => {
  try {
    execSync(IS_WIN ? "where nvidia-smi" : "which nvidia-smi", { stdio: "ignore" });
    return { hasGpu: true, label: "NVIDIA GPU detected" };
  } catch {
    return { hasGpu: false, label: "No NVIDIA GPU - CPU / fake mode" };
  }
});

ipcMain.handle("worker:start", (_event, cfg) => {
  if (worker) return { running: true };
  const env = {
    ...process.env,
    API_URL: cfg.apiUrl,
    WORKER_ID: cfg.workerId,
    PYTHONUNBUFFERED: "1",
  };
  if (cfg.inputDir) env.INPUT_DIR = cfg.inputDir;
  if (cfg.gpuPct) env.GPU_SHARE_PCT = String(cfg.gpuPct);
  if (cfg.vramCapMb) env.VRAM_CAP_MB = String(cfg.vramCapMb);

  worker = workerSpawn(env);
  worker.on("error", (error) => {
    log("Worker failed to start", error);
    if (win) win.webContents.send("worker:log", `Worker failed to start: ${error.message}\n`);
    worker = null;
    if (win) win.webContents.send("worker:state", false);
  });
  const send = (data) => win && win.webContents.send("worker:log", data.toString());
  worker.stdout.on("data", send);
  worker.stderr.on("data", send);
  worker.on("exit", (code) => {
    if (win) win.webContents.send("worker:log", `\n[worker exited: ${code}]\n`);
    worker = null;
    if (win) win.webContents.send("worker:state", false);
  });
  return { running: true };
});

ipcMain.handle("prereq:check", () => ({ docker: hasCmd("docker") }));

ipcMain.handle("setup:run", () => {
  const directory = app.isPackaged
    ? path.join(process.resourcesPath, "setup")
    : path.join(REPO_ROOT, "scripts");
  let command;
  let args;
  if (IS_WIN) {
    const script = app.isPackaged
      ? path.join(directory, "setup.ps1")
      : path.join(REPO_ROOT, "setup.ps1");
    command = "powershell";
    args = [
      "-NoProfile",
      "-Command",
      `Start-Process powershell -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass -File "${script}"'`,
    ];
  } else if (process.platform === "darwin") {
    command = "bash";
    args = [path.join(directory, "setup-mac.sh")];
  } else {
    command = "bash";
    args = [path.join(directory, "setup-wsl.sh")];
  }
  const setup = spawn(command, args, { windowsHide: true });
  const send = (data) => win && win.webContents.send("setup:log", data.toString());
  setup.stdout.on("data", send);
  setup.stderr.on("data", send);
  setup.on("exit", (code) => win && win.webContents.send("setup:done", code));
  return { started: true };
});

ipcMain.handle("worker:stop", () => {
  if (worker) {
    worker.kill();
    worker = null;
  }
  return { running: false };
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", showWindow);
  app.on("child-process-gone", (_event, details) => {
    log(`Electron child process exited: ${JSON.stringify(details)}`);
  });
  app.whenReady().then(() => {
    log("Electron is ready");
    createWindow();
  });
  app.on("activate", createWindow);
}

app.on("window-all-closed", () => {
  if (worker) worker.kill();
  app.quit();
});

process.on("uncaughtException", (error) => log("Uncaught exception", error));
process.on("unhandledRejection", (error) => log("Unhandled rejection", error));

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  openExternal: (url) => ipcRenderer.invoke("open:external", url),
  getGpuStatus: () => ipcRenderer.invoke("gpu:status"),
  startWorker: (cfg) => ipcRenderer.invoke("worker:start", cfg),
  stopWorker: () => ipcRenderer.invoke("worker:stop"),
  onWorkerLog: (cb) => ipcRenderer.on("worker:log", (_e, line) => cb(line)),
  onWorkerState: (cb) => ipcRenderer.on("worker:state", (_e, running) => cb(running)),
});

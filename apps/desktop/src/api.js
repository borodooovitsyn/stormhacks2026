// Backend client for the desktop app. Same contract as the worker.
// Works in Node (require) and in the renderer (<script> -> window.GpuShareApi).

(function (global) {
  function createApi(baseUrl, fetchImpl) {
    const doFetch = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
    async function pair() {
      const r = await doFetch(`${baseUrl}/devices/pair`, { method: "POST" });
      if (!r.ok) throw new Error(`pair failed: ${r.status}`);
      return r.json();
    }
    async function pairStatus(code) {
      const r = await doFetch(`${baseUrl}/devices/pair/${encodeURIComponent(code)}`);
      if (!r.ok) throw new Error(`pairStatus failed: ${r.status}`);
      return r.json();
    }
    async function pairApprove(code, wallet) {
      const r = await doFetch(`${baseUrl}/devices/pair/${encodeURIComponent(code)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      if (!r.ok) throw new Error(`pairApprove failed: ${r.status}`);
      return r.json();
    }
    async function earnings(workerId) {
      const r = await doFetch(`${baseUrl}/earnings/${encodeURIComponent(workerId)}`);
      if (!r.ok) throw new Error(`earnings failed: ${r.status}`);
      return r.json();
    }
    return { pair, pairStatus, pairApprove, earnings };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createApi };
  else global.GpuShareApi = { createApi };
})(typeof window !== "undefined" ? window : globalThis);

const { test } = require("node:test");
const assert = require("node:assert");

function element() {
  const classes = new Set(["hidden"]);
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    title: "",
    scrollHeight: 0,
    scrollTop: 0,
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
  };
}

test("dashboard renders live earnings without demo globals", async () => {
  const ids = [
    "conn", "log", "setup-btn", "setup-log", "setup-skip", "setup-recheck",
    "setup-screen", "pair-screen", "pair-btn", "pair-info", "pair-status", "pair-code",
    "open-web", "dev-approve", "dashboard", "worker-id", "gpu", "payouts", "today",
    "total", "permin", "wallet", "empty", "chart-wrap", "chart", "share-state", "live",
    "toggle", "pct", "pct-val", "vram",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  elements.pct.value = "50";

  const previous = {
    document: global.document,
    window: global.window,
    setInterval: global.setInterval,
  };
  global.document = { getElementById: (id) => elements[id] };
  global.setInterval = () => 1;
  global.window = {
    desktop: {
      getConfig: async () => ({
        apiUrl: "http://localhost:8000",
        webUrl: "http://localhost:3000",
        workerId: "worker-local",
        isPackaged: false,
      }),
      onWorkerLog: () => {},
      onWorkerState: () => {},
      onSetupLog: () => {},
      onSetupDone: () => {},
      getGpuStatus: async () => ({ hasGpu: true }),
      openExternal: () => {},
    },
    GpuShareApi: {
      createApi: () => ({
        pair: async () => ({ status: "approved", device_token: "token" }),
        payouts: async () => ({ payouts: [] }),
        earnings: async () => ({
          payout_wallet: "1234567890abcdefghijklmnop",
          earnings_today_usd: 1.25,
          earnings_total_usd: 2.5,
          series: [{ cost_usd: 0.75 }],
        }),
      }),
    },
  };

  try {
    delete require.cache[require.resolve("../renderer")];
    require("../renderer");
    await new Promise((resolve) => setImmediate(resolve));
    await elements["pair-btn"].onclick();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(elements.today.textContent, "$1.250000");
    assert.equal(elements.total.textContent, "$2.500000");
    assert.equal(elements.permin.textContent, "$0.750000");
    assert.equal(elements.wallet.textContent, "1234…mnop");
    assert.match(elements.payouts.innerHTML, /No payouts yet/);
    assert.equal(elements.dashboard.classList.contains("hidden"), false);
  } finally {
    global.document = previous.document;
    global.window = previous.window;
    global.setInterval = previous.setInterval;
  }
});

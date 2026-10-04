const { test } = require("node:test");
const assert = require("node:assert");
const { createApi } = require("../src/api");

function fakeFetch(responses) {
  const calls = [];
  async function f(url, opts) {
    calls.push({ url, opts });
    const r = responses.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body };
  }
  f.calls = calls;
  return f;
}

test("pair posts to /devices/pair and returns the body", async () => {
  const f = fakeFetch([{ body: { code: "7F3A", device_token: "tok", status: "approved" } }]);
  const api = createApi("http://localhost:8000", f);
  const res = await api.pair();
  assert.equal(f.calls[0].url, "http://localhost:8000/devices/pair");
  assert.equal(f.calls[0].opts.method, "POST");
  assert.equal(res.device_token, "tok");
});

test("earnings gets /earnings/<id> and returns the body", async () => {
  const f = fakeFetch([{ body: { worker_id: "w1", earnings_total_usd: 1.23 } }]);
  const api = createApi("http://localhost:8000", f);
  const res = await api.earnings("w1");
  assert.equal(f.calls[0].url, "http://localhost:8000/earnings/w1");
  assert.equal(res.earnings_total_usd, 1.23);
});

test("earnings url-encodes the worker id", async () => {
  const f = fakeFetch([{ body: {} }]);
  const api = createApi("http://localhost:8000", f);
  await api.earnings("w 1/x");
  assert.equal(f.calls[0].url, "http://localhost:8000/earnings/w%201%2Fx");
});

test("payouts gets /payouts/<wallet> and url-encodes the wallet", async () => {
  const f = fakeFetch([{ body: { wallet: "wallet 1/x", payouts: [] } }]);
  const api = createApi("http://localhost:8000", f);
  const res = await api.payouts("wallet 1/x");
  assert.equal(f.calls[0].url, "http://localhost:8000/payouts/wallet%201%2Fx");
  assert.deepEqual(res.payouts, []);
});

test("throws on a non-ok response", async () => {
  const f = fakeFetch([{ ok: false, status: 500, body: null }]);
  const api = createApi("http://localhost:8000", f);
  await assert.rejects(() => api.pair(), /pair failed: 500/);
});

test("pairStatus gets /devices/pair/<code>", async () => {
  const f = fakeFetch([{ body: { code: "7F3A", status: "approved", device_token: "tok" } }]);
  const api = createApi("http://localhost:8000", f);
  const res = await api.pairStatus("7F3A");
  assert.equal(f.calls[0].url, "http://localhost:8000/devices/pair/7F3A");
  assert.equal(res.status, "approved");
});

test("pairApprove posts the wallet to /devices/pair/<code>/approve", async () => {
  const f = fakeFetch([{ body: { status: "approved" } }]);
  const api = createApi("http://localhost:8000", f);
  await api.pairApprove("7F3A", "Wallet123");
  assert.equal(f.calls[0].url, "http://localhost:8000/devices/pair/7F3A/approve");
  assert.equal(f.calls[0].opts.method, "POST");
  assert.equal(JSON.parse(f.calls[0].opts.body).wallet, "Wallet123");
});

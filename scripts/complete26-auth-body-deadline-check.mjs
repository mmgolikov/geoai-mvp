// Offline tests of the actual browser transport. Never dispatches a request.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
// Optional baseline source arrives only on stdin, never an executable path.
const transport = process.argv.includes('--baseline-stdin')
  ? await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(0, 'utf8'))).toString('base64'))
  : await import('../src/lib/auth/browser-session-transport.ts');
const { readBrowserServerSession, requestConfirmedBrowserSignOut, resolveBrowserSignOutDisposition } = transport;

let checks = 0, networkCalls = 0;
const failures = [];
globalThis.fetch = async () => { networkCalls++; throw Error('NETWORK_FORBIDDEN'); };
const flush = () => new Promise(resolve => setImmediate(resolve));
const user = { id: 'synthetic-A' };
const definitions = [
  { name: 'session', call: readBrowserServerSession, path: '/api/auth/session', method: 'GET', success: { status: 'authenticated', user }, payload: { isAuthenticated: true, user }, timeout: { status: 'unavailable' }, rejected: { status: 'unavailable' }, network: { status: 'unavailable' } },
  { name: 'logout', call: requestConfirmedBrowserSignOut, path: '/api/auth/logout', method: 'POST', success: { ok: true, reason: 'confirmed' }, payload: { ok: true, status: 'signed_out' }, timeout: { ok: false, reason: 'timeout' }, rejected: { ok: false, reason: 'server_rejected' }, network: { ok: false, reason: 'network_failure' } }
];
async function check(name, operation) {
  try { await operation(); checks++; }
  catch (error) { failures.push({ name, assertion: error.code === 'ERR_ASSERTION' ? 'ASSERTION_FAILED' : 'UNEXPECTED_LOCAL_ERROR' }); }
}

// Use a deterministic local clock, exercising the unchanged default 10s.
// Releasing late promises in finally prevents retained synthetic operations.
for (const d of definitions) for (const phase of ['headers', 'body']) for (const honorsAbort of [true, false]) {
  await check(`${d.name} stalled ${phase}, abort ${honorsAbort ? 'honored' : 'ignored'}`, async () => {
    const set = globalThis.setTimeout, clear = globalThis.clearTimeout;
    let fire, cleared = false, calls = 0, signal, release, reject, outcome = null;
    const gate = new Promise((resolve, fail) => { release = resolve; reject = fail; });
    globalThis.setTimeout = (callback, ms) => { assert.equal(ms, 10_000); fire = callback; return 1; };
    globalThis.clearTimeout = () => { cleared = true; };
    const response = () => ({ ok: true, json: () => phase === 'body' ? gate : Promise.resolve(d.payload) });
    const operation = d.call(async (path, init) => {
      calls++; assert.equal(path, d.path); assert.equal(init.method, d.method);
      assert.equal(init.credentials, 'same-origin'); assert.equal(init.cache, 'no-store');
      signal = init.signal;
      if (honorsAbort) signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      return phase === 'headers' ? gate : response();
    }).then(value => { outcome = value; return value; });
    try {
      await flush();
      assert.equal(outcome, null);
      assert.equal(cleared, false, 'deadline must remain armed during body consumption');
      fire(); await flush();
      assert.deepEqual(outcome, d.timeout, 'deadline must settle even an abort-ignoring dependency');
      assert.equal(signal.aborted, true, 'the real fetch/body signal must be aborted');
      assert.equal(calls, 1, 'no request replay');
      assert.equal(cleared, true);
      const terminal = outcome;
      release(phase === 'headers' ? response() : d.payload);
      await operation; await flush();
      assert.equal(outcome, terminal, 'late successful data cannot replace terminal timeout');
      if (d.name === 'logout') assert.deepEqual(resolveBrowserSignOutDisposition(outcome, null), { status: 'unconfirmed' });
    } finally {
      release(phase === 'headers' ? response() : d.payload);
      await operation;
      globalThis.setTimeout = set; globalThis.clearTimeout = clear;
    }
  });
}

for (const d of definitions) {
  await check(`${d.name} actual Response stream abort`, async () => {
    let signal, bodyController, bodyAborted = false, calls = 0, watchdog;
    const operation = d.call(async (_path, init) => {
      calls++; signal = init.signal;
      return new Response(new ReadableStream({ start(controller) {
        bodyController = controller;
        controller.enqueue(new TextEncoder().encode('{"incomplete":'));
        signal.addEventListener('abort', () => { bodyAborted = true; controller.error(signal.reason); }, { once: true });
      } }));
    }, 15);
    try {
      const result = await Promise.race([operation, new Promise(resolve => { watchdog = setTimeout(() => resolve('STILL_PENDING'), 500); })]);
      assert.deepEqual(result, d.timeout); assert.equal(signal.aborted, true);
      assert.equal(bodyAborted, true); assert.equal(calls, 1);
    } finally {
      clearTimeout(watchdog);
      if (!bodyAborted) bodyController.error(new TypeError('synthetic test cleanup'));
      await operation;
    }
  });
  await check(`${d.name} elapsed parse deadline cannot beat a queued timer`, async () => {
    const original = globalThis.performance;
    let now = 0, signal;
    globalThis.performance = { now: () => now };
    try {
      assert.deepEqual(await d.call(async (_path, init) => {
        signal = init.signal;
        return { ok: true, json: async () => { now = 10_001; return d.payload; } };
      }), d.timeout);
      assert.equal(signal.aborted, true);
    } finally { globalThis.performance = original; }
  });
  for (const [name, fetcher, expected] of [
    ['fast success', async () => Response.json(d.payload), d.success],
    ['malformed JSON', async () => new Response('{'), d.rejected],
    ['503', async () => new Response('unavailable', { status: 503 }), d.rejected],
    ['network rejection', async () => { throw new TypeError('synthetic'); }, d.network],
    ['body rejection', async () => ({ ok: true, json: async () => { throw new TypeError('synthetic body'); } }), d.rejected],
    ['external abort', async () => { throw new DOMException('synthetic', 'AbortError'); }, d.timeout]
  ]) await check(`${d.name} ${name}`, async () => {
    let calls = 0;
    assert.deepEqual(await d.call((...args) => { calls++; return fetcher(...args); }), expected);
    assert.equal(calls, 1);
  });
}
await check('session missing alone is anonymous; dependency failure is not', async () => {
  assert.deepEqual(await readBrowserServerSession(async () => Response.json({ isAuthenticated: false, sessionStatus: 'session_missing' })), { status: 'anonymous' });
  for (const sessionStatus of ['dependency_unavailable', 'claims_unverified', 'profile_missing', 'profile_inactive']) {
    assert.deepEqual(await readBrowserServerSession(async () => Response.json({ isAuthenticated: false, sessionStatus })), { status: 'unavailable' });
  }
});
await check('logout requires explicit success status', async () => {
  for (const payload of [{ ok: false, status: 'signed_out' }, { ok: true, status: 'not_confirmed' }, {}]) {
    assert.deepEqual(await requestConfirmedBrowserSignOut(async () => Response.json(payload)), { ok: false, reason: 'server_rejected' });
  }
});
assert.equal(networkCalls, 0);
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks, failures, networkCalls, scope: 'actual client transport; deterministic default deadline; no hosted acceptance' }));
assert.equal(failures.length, 0, 'Complete fetch/body deadline regressions must pass');

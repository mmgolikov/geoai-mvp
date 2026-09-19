import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  externalHttpUrlPattern,
  installLoopbackBrowserHarness,
  isConfiguredLoopbackWebSocketUrl,
  isExternalHttpUrl,
  requireLoopbackTestOrigin
} from "../tests/e2e/helpers/local-webkit-csp.ts";

const HTTPS_ORIGIN = "https://127.0.0.1:3443";
const HTTP_ORIGIN = "http://127.0.0.1:3100";

assert.equal(requireLoopbackTestOrigin(HTTPS_ORIGIN).origin, HTTPS_ORIGIN);
assert.equal(requireLoopbackTestOrigin("http://localhost:3100/").origin, "http://localhost:3100");
assert.equal(requireLoopbackTestOrigin("https://[::1]:3443").origin, "https://[::1]:3443");

for (const invalid of [
  undefined,
  "https://preview.example.com",
  "https://127.0.0.1.evil.example:3443",
  "https://2130706433:3443",
  "https://user@127.0.0.1:3443",
  "https://127.0.0.1:3443/path",
  "https://127.0.0.1:3443/?query=1",
  "https://127.0.0.1:3443/#fragment",
  "ftp://127.0.0.1:3443"
]) {
  assert.throws(() => requireLoopbackTestOrigin(invalid), /loopback/);
}

assert.equal(isExternalHttpUrl(new URL("https://127.0.0.1:3443/app"), HTTPS_ORIGIN), false);
assert.equal(isExternalHttpUrl(new URL("https://127.0.0.1:3444/app"), HTTPS_ORIGIN), true);
assert.equal(isExternalHttpUrl(new URL("http://127.0.0.1:3443/app"), HTTPS_ORIGIN), true);
assert.equal(isExternalHttpUrl(new URL("https://127.0.0.1.evil.example/app"), HTTPS_ORIGIN), true);
assert.equal(isExternalHttpUrl(new URL("https://external.example/redirect-target"), HTTPS_ORIGIN), true);
const externalPattern = externalHttpUrlPattern(HTTPS_ORIGIN);
assert.equal(externalPattern.test(`${HTTPS_ORIGIN}/app`), false);
assert.equal(externalPattern.test("https://127.0.0.1:3444/app"), true);
assert.equal(externalPattern.test("http://127.0.0.1:3443/app"), true);
assert.equal(externalPattern.test("https://127.0.0.1.evil.example/app"), true);
assert.equal(externalPattern.test("https://external.example/redirect-target"), true);
assert.equal(isConfiguredLoopbackWebSocketUrl(new URL("wss://127.0.0.1:3443/socket"), HTTPS_ORIGIN), true);
assert.equal(isConfiguredLoopbackWebSocketUrl(new URL("ws://127.0.0.1:3443/socket"), HTTPS_ORIGIN), false);
assert.equal(isConfiguredLoopbackWebSocketUrl(new URL("wss://127.0.0.1:3444/socket"), HTTPS_ORIGIN), false);

function fakePage() {
  const httpRoutes = [];
  const socketRoutes = [];
  return {
    httpRoutes,
    socketRoutes,
    async route(matcher, handler) { httpRoutes.push({ matcher, handler }); },
    async routeWebSocket(matcher, handler) { socketRoutes.push({ matcher, handler }); }
  };
}

const httpsPage = fakePage();
await installLoopbackBrowserHarness(httpsPage, "webkit", HTTPS_ORIGIN);
assert.equal(httpsPage.httpRoutes.length, 1, "HTTPS must not install the Node-side CSP navigation replay");
assert.equal(httpsPage.socketRoutes.length, 1);
assert.ok(httpsPage.httpRoutes[0].matcher instanceof RegExp, "HTTPS external guard must not use a catch-all callback predicate");
assert.equal(httpsPage.httpRoutes[0].matcher.test(`${HTTPS_ORIGIN}/`), false);
assert.equal(httpsPage.httpRoutes[0].matcher.test("https://external.example/"), true);
let abortCode = null;
await httpsPage.httpRoutes[0].handler({ abort: async (code) => { abortCode = code; } });
assert.equal(abortCode, "blockedbyclient");

let connected = false;
let closed = null;
await httpsPage.socketRoutes[0].handler({
  url: () => "wss://127.0.0.1:3443/socket",
  connectToServer: () => { connected = true; },
  close: async (value) => { closed = value; }
});
assert.equal(connected, true);
assert.equal(closed, null);
connected = false;
await httpsPage.socketRoutes[0].handler({
  url: () => "wss://external.example/socket",
  connectToServer: () => { connected = true; },
  close: async (value) => { closed = value; }
});
assert.equal(connected, false);
assert.deepEqual(closed, { code: 1008, reason: "Blocked by local E2E harness" });

const httpWebKitPage = fakePage();
await installLoopbackBrowserHarness(httpWebKitPage, "webkit", HTTP_ORIGIN);
assert.equal(httpWebKitPage.httpRoutes.length, 2, "HTTP WebKit keeps the existing CSP transport route plus the guard");
const httpChromePage = fakePage();
await installLoopbackBrowserHarness(httpChromePage, "chromium", HTTP_ORIGIN);
assert.equal(httpChromePage.httpRoutes.length, 1, "Chrome HTTP receives only the external network guard");

const config = await readFile(new URL("../playwright.product-https.config.ts", import.meta.url), "utf8");
assert.match(config, /baseURL: "https:\/\/127\.0\.0\.1:3443"/);
assert.match(config, /browserName: "webkit"/);
assert.match(config, /ignoreHTTPSErrors: true/);
assert.match(config, /serviceWorkers: "block"/);
assert.match(config, /retries: 0/);
assert.match(config, /workers: 1/);
assert.doesNotMatch(config, /process\.env|GEOAI_E2E_BASE_URL/);

const productSpecs = [
  "point-to-object-v5-offline-flow.spec.ts",
  "point-to-object-create-reliability.spec.ts",
  "point-to-object-geocontext-v6.spec.ts",
  "sprint06-security-compat.spec.ts",
  "point-to-object-map10.spec.ts",
  "project-hub-unified.spec.ts",
  "sprint07-ux.spec.ts",
  "point-to-object-map-sprint07.spec.ts",
  "sprint10-analysis-state.spec.ts",
  "sprint10-analysis-provenance.spec.ts",
  "sprint10-find-state.spec.ts",
  "sprint10-create-preview.spec.ts"
];
for (const name of productSpecs) {
  const source = await readFile(new URL(`../tests/e2e/${name}`, import.meta.url), "utf8");
  assert.match(source, /installLoopbackBrowserHarness/);
  assert.doesNotMatch(source, /page\.route\(\/\^https:\\?\/\\?\//, `Broad HTTPS abort remains in ${name}`);
}

console.log("Product HTTPS loopback harness check passed.");

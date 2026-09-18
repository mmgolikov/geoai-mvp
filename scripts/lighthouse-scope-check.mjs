import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve("scripts/lighthouse-budget-check.mjs");
const fixture = mkdtempSync(join(tmpdir(), "geoai-lighthouse-scope-"));
const reports = [
  ["lighthouse-mobile.json", "/"],
  ["lighthouse-desktop.json", "/workspace"],
  ["lighthouse-mobile-projects.json", "/projects"],
  ["lighthouse-desktop-workspace-criteria.json", "/workspace"],
  ["lighthouse-desktop-login.json", "/login"],
  ["lighthouse-desktop-request-access.json", "/request-access"],
  ["lighthouse-desktop-profile.json", "/profile"]
];
function report(route, performance = 1) {
  const url = `${route === "/login" ? "https://127.0.0.1:3443" : "http://127.0.0.1:3000"}${route}`;
  return {
    requestedUrl: url, finalDisplayedUrl: url, lighthouseVersion: "synthetic-offline",
    categories: Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map((key) => [key, { score: key === "performance" ? performance : 1 }])),
    audits: {
      ...Object.fromEntries(["largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time", "total-byte-weight"].map((key) => [key, { numericValue: 0 }])),
      "network-requests": { details: { items: [{ resourceType: "Script", url: `${url}/fixture.js`, transferSize: 20, resourceSize: 40 }] } }
    }
  };
}
function put(name, value) { writeFileSync(join(fixture, "artifacts", name), JSON.stringify(value)); }
function run(args, accepted) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: fixture, encoding: "utf8", timeout: 10000, env: {} });
  assert.equal(result.error, undefined);
  assert.equal(result.status, accepted ? 0 : 1, "Scope acceptance differs from expected result");
}
try {
  mkdirSync(join(fixture, "artifacts"));
  mkdirSync(join(fixture, ".next"));
  writeFileSync(join(fixture, ".next", "fixture.js"), "/* fixture */");
  const pages = Object.fromEntries(reports.map(([, route]) => [route === "/" ? "/page" : `${route}/page`, ["fixture.js"]]));
  writeFileSync(join(fixture, ".next", "app-build-manifest.json"), JSON.stringify({ pages }));
  for (const [name, route] of reports) put(name, report(route));
  run([], true);
  run(["--public-demo"], true);
  const publicSummary = JSON.parse(readFileSync(join(fixture, "artifacts", "lighthouse-budget-summary.json"), "utf8"));
  assert.equal(publicSummary.verificationScope, "public-demo");
  assert.equal(publicSummary.profiles.length, 6);
  assert.equal(publicSummary.profiles.some((item) => item.profile === "desktop-login"), false);
  run(["--protected-login"], true);
  const protectedSummary = JSON.parse(readFileSync(join(fixture, "artifacts", "lighthouse-protected-login-budget-summary.json"), "utf8"));
  assert.equal(protectedSummary.profiles.length, 1);
  assert.equal(protectedSummary.profiles[0].profile, "desktop-login");
  assert.equal(protectedSummary.profiles[0].evidenceMode, "protected_optimized_https_fixture");
  assert.equal(protectedSummary.profiles[0].budgets.performance, 0.75);
  assert.equal(protectedSummary.profiles[0].budgets.lcp, 2500);
  assert.equal(protectedSummary.profiles[0].budgets.tbt, 600);
  run(["--unknown"], false);
  run(["--public-demo", "--protected-login"], false);
  run(["--protected-login", "--protected-login"], false);
  run(Array(8).fill("extra.json"), false);
  put("lighthouse-desktop-login.json", { ...report("/login"), finalDisplayedUrl: "https://127.0.0.1:3443/workspace" });
  run(["--protected-login"], false);
  run([], false);
  put("lighthouse-desktop-login.json", report("/login", 0.74));
  run(["--protected-login"], false);
  put("lighthouse-desktop-login.json", { ...report("/login"), requestedUrl: "http://127.0.0.1:3100/login", finalDisplayedUrl: "http://127.0.0.1:3100/login" });
  run(["--protected-login"], false);
  run([], false);
  const missingNetwork = report("/login");
  delete missingNetwork.audits["network-requests"];
  put("lighthouse-desktop-login.json", missingNetwork);
  run(["--protected-login"], false);
  run([], false);
  const invalidBytes = report("/login");
  invalidBytes.audits["network-requests"].details.items[0].transferSize = null;
  put("lighthouse-desktop-login.json", invalidBytes);
  run(["--protected-login"], false);
  rmSync(join(fixture, "artifacts", "lighthouse-desktop-login.json"));
  run(["--protected-login"], false);
  run([], false);
  run(["--public-demo"], true);
  console.log("Lighthouse scope checks PASS: seven default profiles; six public plus exact protected HTTPS login; unchanged budgets; redirects, poor scores, missing evidence and invalid arguments fail closed. Offline synthetic fixtures only.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

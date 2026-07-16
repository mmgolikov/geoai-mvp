import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const helperPath = "src/lib/http/private-no-store.ts";
const manifest = JSON.parse(await readFile(path.resolve(root, "security/api-route-access.json"), "utf8"));
const projectGetRoutes = Object.entries(manifest.routes ?? {})
  .filter(([, methods]) => methods.GET?.access === "project")
  .map(([route]) => ({ route, file: `app${route}/route.ts` }));
const additionalSensitiveGetRoutes = [
  { route: "/api/auth/session", file: "app/api/auth/session/route.ts" }
];
const protectedGetRoutes = [...projectGetRoutes, ...additionalSensitiveGetRoutes];

function getHandler(source) {
  const start = source.search(/export\s+async\s+function\s+GET\b/);
  if (start < 0) return null;
  const nextHandler = source.slice(start + 1).search(/export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);
  return source.slice(start, nextHandler < 0 ? source.length : start + 1 + nextHandler);
}

const failures = [];
const helper = await readFile(path.resolve(root, helperPath), "utf8");

if (!helper.includes('PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0"')) {
  failures.push(`${helperPath}: private/no-store/max-age=0 directive is missing`);
}
for (const header of ["Authorization", "Cookie"]) {
  if (!helper.includes(`"${header}"`)) failures.push(`${helperPath}: Vary ${header} boundary is missing`);
}
if (!helper.includes('headers.set("Cache-Control"') || !helper.includes('headers.set("Vary"')) {
  failures.push(`${helperPath}: response headers are not applied centrally`);
}

for (const { route, file } of protectedGetRoutes) {
  const source = await readFile(path.resolve(root, file), "utf8");
  const handler = getHandler(source);
  if (!handler) {
    failures.push(`${file}: GET handler is missing`);
    continue;
  }
  if (!source.includes('from "@/src/lib/http/private-no-store"')) {
    failures.push(`${file}: shared private cache helper is not imported`);
  }
  if (!handler.includes("privateNoStoreJson(") && !handler.includes("applyPrivateNoStore(")) {
    failures.push(`${file}: GET does not use the private cache helper`);
  }
  const returnExpressions = Array.from(handler.matchAll(/\breturn\s+([A-Za-z_$][\w$]*)\s*\(/g));
  if (returnExpressions.length === 0) {
    failures.push(`${file}: GET has no statically verifiable response return`);
  }
  for (const expression of returnExpressions) {
    if (!["privateNoStoreJson", "applyPrivateNoStore", "publicImmutableSeedJson"].includes(expression[1])) {
      failures.push(`${file}: GET return bypasses the approved cache-boundary helpers (${expression[1]})`);
    }
  }
  if (/return\s+NextResponse\.(?:json|redirect)\s*\(/.test(handler) || /return\s+new\s+Response\s*\(/.test(handler)) {
    failures.push(`${file}: GET has a response path outside the private cache helper`);
  }
  if (handler.includes("publicImmutableSeedJson(")) {
    const explicitSeedAllowlist = route === "/api/report-packages" &&
      /if\s*\(cacheStaticSeedResponse\)\s*\{\s*return\s+publicImmutableSeedJson\(payload\);\s*\}/.test(handler) &&
      /const\s+cacheStaticSeedResponse\s*=\s*staticSeedOnly\s*&&\s*result\.ok\s*&&\s*result\.error\s*===\s*null\s*&&\s*payloadBytes\s*<=\s*publicReportPackageListMaxBytes/.test(handler);
    if (!explicitSeedAllowlist) {
      failures.push(`${file}: public caching is not confined to the explicit immutable report-package seed allowlist`);
    }
  }
}

const reports = await readFile(path.resolve(root, "app/api/reports/route.ts"), "utf8");
const reportsGet = getHandler(reports) ?? "";
if (!reportsGet.includes("getSeededDemoReportRecord(id)") || !reportsGet.includes("if (publicSeed)")) {
  failures.push("app/api/reports/route.ts: immutable public seed allowlist path changed or disappeared");
}
if (!reportsGet.includes("if (id && !publicSeed)") || !reportsGet.includes("status: 404")) {
  failures.push("app/api/reports/route.ts: unknown public report IDs are not fail-closed");
}

if (failures.length > 0) {
  console.error("Private cache-boundary contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Private cache-boundary contract passed: ${projectGetRoutes.length} manifest-classified project GET routes plus ${additionalSensitiveGetRoutes.length} session route are fail-closed; only the explicit immutable report-package seed projection may use public caching.`);

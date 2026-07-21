import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const landing = read("app/page.tsx");
const login = read("app/login/page.tsx");
const requestPage = read("app/request-access/page.tsx");
const requestPanel = read("components/request-access-panel.tsx");
const browserSpec = read("tests/e2e/public-request-flow.spec.ts");
const packageJson = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/geoai-quality-gate.yml");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert((landing.match(/href="\/request-access"/g) ?? []).length === 3, "Landing must route all three commercial request CTAs to /request-access");
assert(!landing.includes("intent=request"), "Landing must not route a commercial request through Login");
assert(landing.includes('href="/login?next=/workspace&intent=demo"'), "Landing demo CTA must preserve the bounded demo Login path");
assert(login.includes('intent === "request"') && login.includes('redirect("/request-access")'), "Legacy Login request intent must redirect deterministically to /request-access");
assert(requestPage.includes("RequestAccessPanel") && !requestPage.includes("AuthenticatedRouteGate"), "Request route must remain public and independent of Auth");

for (const label of ["Organization", "Work email", "Use case / decision to support", "Geography / AOI description", "Optional note"]) {
  assert(requestPanel.includes(label), `Request form is missing bounded field: ${label}`);
}
for (const statement of [
  "Do not include confidential, regulated, sensitive or client-protected information.",
  "No approved request backend or public contact destination is connected yet.",
  "No information has been sent. Copy this brief and share it through an approved contact channel.",
  "Copy request brief",
  "Open demo instead"
]) {
  assert(requestPanel.includes(statement), `Request route is missing required boundary copy: ${statement}`);
}
for (const forbidden of ["fetch(", "localStorage", "sessionStorage", "XMLHttpRequest", "sendBeacon", "action="]) {
  assert(!requestPanel.includes(forbidden), `Request form must not transmit or persist data: found ${forbidden}`);
}
for (const forbidden of ["Request sent", "Request submitted", "Request received", "We will contact you", "Successfully delivered"]) {
  assert(!requestPanel.includes(forbidden), `Request UI contains prohibited delivery claim: ${forbidden}`);
}

for (const marker of [
  'const viewports = [',
  'name: "desktop-1440"',
  'name: "tablet-834"',
  'name: "mobile-390"',
  "AxeBuilder",
  "mutationRequests",
  "localStorage",
  "sessionStorage",
  'page.keyboard.press("Tab")',
  "navigator.clipboard.readText()",
  "expectNoHorizontalOverflow"
]) {
  assert(browserSpec.includes(marker), `Public-request browser contract is missing ${marker}`);
}
assert(packageJson.scripts?.["test:public-request-contract"] === "node scripts/public-request-contract-check.mjs", "Public-request static command is missing");
assert(packageJson.scripts?.["test:e2e:auth-session"]?.includes("tests/e2e/public-request-flow.spec.ts"), "Public-request browser flow is not in focused CI");
assert(workflow.includes("npm run test:public-request-contract"), "Quality Gate does not run the public-request static contract");

if (failures.length > 0) {
  console.error("Public request contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public request contract passed: commercial and demo destinations are separate; the request brief stays in React memory with no request mutation or browser storage path.");

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));
const expect = (condition, message) => { if (!condition) failures.push(message); };

const registry = json("docs/DESIGN_SYSTEM_V3_2_AUTHORITY_REGISTRY.json");
const manifest = json("docs/DESIGN_FOUNDATION_TOKEN_MANIFEST_V3_2.json");
const shell = read("components/top-navigation.tsx");
const navigation = read("components/product-navigation.tsx");
const accessStatus = read("components/auth/access-status-badge.tsx");
const tokenSource = read("src/design-system/tokens.ts");
const tailwind = read("tailwind.config.ts");
const scopedCss = read("app/product-system-v3.css");
const layout = read("app/layout.tsx");

expect(registry.figmaFileKey === "TAzDqOvRCw1mQGMU3Y4S9H", "Wrong Figma file key.");
expect(registry.designSystemVersion === "Product System v3.2 — Founder Approved Design Baseline", "Wrong Product System version.");
expect(registry.identityApproval?.option === 1 && registry.identityApproval?.approvedForImplementation === true, "Founder identity option 1 is missing.");
expect(registry.canonicalNodes?.identityFamily === "468:84" && registry.canonicalNodes?.identityNavigation32 === "468:57", "Identity node traceability is incomplete.");
expect(registry.canonicalNodes?.topNavigation === "219:425", "Top Navigation node traceability is incomplete.");
expect(registry.excludedAuthorities?.every((entry) => entry.implementationAuthority === false), "Page 90/Page 99 must not be implementation authorities.");
expect(registry.excludedAuthorities?.map((entry) => entry.name).join(",") === "Page 90,Page 99", "Page 90/Page 99 exclusion is incomplete.");
expect(registry.bodyScreenMigrationAuthorized === false, "Route-body migration must remain unauthorized.");
expect(registry.figmaWritesAuthorized === false && registry.codeConnectWritesAuthorized === false, "Figma and Code Connect writes must remain unauthorized.");
expect(registry.mergeAuthorized === false && registry.productionAuthorized === false, "Merge and Production must remain unauthorized.");

const expectedTokens = {
  "color.ink": "#06122e",
  "color.muted": "#4d6694",
  "color.line": "#ccdef5",
  "color.surface": "#f4f9ff",
  "color.brand": "#064fcf",
  "color.accent": "#06717a",
  "color.personal": "#5b48d8",
  "color.risk": "#a63f00",
  "dimension.header": "64px",
  "dimension.desktopControlMinimum": "40px",
  "dimension.primaryTouchTarget": "44px",
  "radius.control": "12px",
  "radius.action": "14px",
  "radius.card": "16px",
  "radius.panel": "24px",
  "typography.product": "var(--font-geist), Geist, Arial, sans-serif"
};
const manifestTokens = Object.fromEntries(manifest.tokens.map((entry) => [entry.name, entry.value]));
for (const [name, value] of Object.entries(expectedTokens)) {
  const sourceKey = name.split(".").at(-1);
  expect(tokenSource.includes(`${sourceKey}: "${value}"`), `Canonical token drift: ${name}.`);
  expect(manifestTokens[name] === value, `Token manifest drift: ${name}.`);
  expect(scopedCss.includes(value), `Scoped CSS token is missing ${name}=${value}.`);
}
expect(manifest.canonicalSource === "src/design-system/tokens.ts" && manifest.globalBodyMigration === false, "Token source/scope contract is invalid.");
expect(tailwind.includes('import { productSystemV32Tokens } from "./src/design-system/tokens"') && tailwind.includes("...v32.color"), "Tailwind is not synchronized with the canonical token source.");
expect(layout.includes('import { Geist } from "next/font/google"') && layout.includes('variable: "--font-geist"'), "Scoped Geist loading is missing.");

expect(shell.includes('data-product-shell') && shell.includes('data-figma-node="219:425"') && shell.includes('h-product-header') && shell.includes('shrink-0'), "The non-shrinking 64 px traced Product shell contract is missing.");
expect(shell.includes("IdentitySymbol") && !shell.includes(">\n              G\n"), "The approved identity has not replaced the improvised shell mark.");
for (const href of ["/workspace", "/projects", "/explore"]) expect(navigation.includes(`href: "${href}"`), `Missing ${href} navigation.`);
expect(navigation.includes('aria-current={isCurrent ? "page" : undefined}'), "Active-route semantics are missing.");
expect(navigation.includes("h-10") && navigation.includes("min-h-11"), "Approved navigation target sizes are missing.");
expect(navigation.includes("focus-visible:ring-brand") && shell.includes("focus-visible:ring-brand") && accessStatus.includes("focus-visible:ring-brand"), "Brand focus semantics are incomplete.");
expect(navigation.includes('aria-label="Primary product navigation"') && navigation.includes('aria-label="Mobile product navigation"'), "Navigation landmarks are incomplete.");
expect(navigation.includes("triggerRef.current?.focus()") && navigation.includes('event.key === "Escape"'), "Mobile Escape/focus restoration is missing.");

const componentFiles = fs.readdirSync(path.join(root, "components"), { recursive: true })
  .filter((entry) => String(entry).endsWith(".tsx"))
  .map((entry) => read(path.join("components", String(entry))));
const primaryLandmarks = componentFiles.reduce((count, source) => count + (source.match(/aria-label="Primary product navigation"/g)?.length ?? 0), 0);
expect(primaryLandmarks === 1, `Expected one canonical primary navigation implementation, found ${primaryLandmarks}.`);

for (const [file, node] of [
  ["components/design-system/button.tsx", "202:68"],
  ["components/design-system/status-chip.tsx", "203:24"],
  ["components/design-system/segment-switch.tsx", "204:73"],
  ["components/design-system/validation-caveat.tsx", "205:41"],
  ["components/design-system/identity-symbol.tsx", "468:57"]
]) expect(read(file).includes(`data-figma-node="${node}"`), `${file} is missing Figma node ${node}.`);

const identity = fs.readFileSync(path.join(root, "public/brand/geoai-identity-symbol-32.svg"));
expect(createHash("sha256").update(identity).digest("hex") === "4d4a9d71b2cc14b7367371f16aac18770b96a4ceeb4617301e20ce411bc17dd7", "Identity asset hash does not match the approved Figma export.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Product System v3.2 design foundation contract passed: ${Object.keys(expectedTokens).length} tokens, one canonical navigation, five traced primitives/identity, 64 px shell, and Page 90/Page 99 excluded.`);

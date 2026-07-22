import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));
const expect = (condition, message) => { if (!condition) failures.push(message); };

const registry = json("docs/DESIGN_SYSTEM_V3_2_AUTHORITY_REGISTRY.json");
const manifest = json("docs/DESIGN_FOUNDATION_TOKEN_MANIFEST_V3_2.json");
const componentManifest = json("docs/DESIGN_FOUNDATION_COMPONENT_TOKEN_MANIFEST_V3_2.json");
const shell = read("components/top-navigation.tsx");
const navigation = read("components/product-navigation.tsx");
const accessStatus = read("components/auth/access-status-badge.tsx");
const accessStatusVisual = read("components/auth/access-status-badge-visual.tsx");
const button = read("components/design-system/button.tsx");
const statusChip = read("components/design-system/status-chip.tsx");
const segmentSwitch = read("components/design-system/segment-switch.tsx");
const validationCaveat = read("components/design-system/validation-caveat.tsx");
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

const expectedComponentTokens = {
  button: {
    figmaNode: "202:68",
    color: {
      primaryDefault: "#087f8c",
      primaryHover: "#006c78",
      focusAndSecondary: "#1769e0",
      disabledBackground: "#eef2f6",
      disabledText: "#667587",
      quietHover: "#e8f7fa",
      secondaryBackground: "#ffffff"
    },
    geometry: {
      desktopHeight: "40px",
      touchHeight: "44px",
      width: "140px",
      minimumWidth: "140px",
      radius: "14px",
      loadingIndicator: "14px"
    },
    states: ["primary-default", "primary-hover", "primary-focus", "primary-disabled", "primary-loading", "secondary-default", "secondary-focus", "quiet-default", "quiet-hover"]
  },
  statusChip: {
    figmaNode: "203:24",
    color: {
      neutral: { background: "#eef2f6", border: "#dde3ea", text: "#667587" },
      spatial: { background: "#eaf2ff", border: "#bfd3f4", text: "#1769e0" },
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#a85d00" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "24px", defaultHeight: "28px" },
    states: ["neutral", "spatial", "validation", "critical"]
  },
  segmentSwitch: {
    figmaNode: "204:73",
    color: {
      containerBackground: "#eef2f6",
      containerBorder: "#dde3ea",
      activeOption: "#087f8c",
      focusBoundary: "#1769e0",
      inactiveAndDisabledText: "#667587",
      disabledSelectedFill: "#dde3ea"
    },
    geometry: {
      optionRadius: "10px",
      outerRadius: "14px",
      desktopWidth: "300px",
      desktopHeight: "44px",
      touchWidth: "320px",
      touchHeight: "52px"
    },
    states: ["active", "focus", "disabled-selected"]
  },
  validationCaveat: {
    figmaNode: "205:41",
    color: {
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#7a4600" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "44px", fullMinimumHeight: "88px", radius: "14px" },
    label: { validation: "VALIDATION REQUIRED", critical: "BLOCKING ISSUE" },
    requiredCaveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  },
  authenticatedProfileBadge: {
    figmaNode: "219:425",
    color: { background: "#e8f3f2", borderAndInitials: "#064fcf", focusBoundary: "#1769e0" },
    geometry: { width: "40px", height: "40px" },
    persistentOuterHalo: false,
    focusRingOnlyWhenFocusVisible: true,
    authenticatedIndicator: true
  }
};

expect(componentManifest.schemaVersion === "1.0", "Component-token manifest schema drifted.");
expect(componentManifest.canonicalSource === "src/design-system/tokens.ts#productSystemV32ComponentTokens", "Component-token canonical source drifted.");
expect(componentManifest.semanticBaselineManifest === "docs/DESIGN_FOUNDATION_TOKEN_MANIFEST_V3_2.json" && componentManifest.semanticBaselineUnchanged === true, "Component tokens must preserve the approved semantic baseline.");
expect(componentManifest.globalBodyMigration === false, "Component compatibility tokens must not authorize body migration.");
expect(isDeepStrictEqual(componentManifest.components, expectedComponentTokens), "Structured component-token manifest drifted from the approved Figma adapter contract.");

const componentScalarValues = [...new Set(JSON.stringify(expectedComponentTokens).match(/#[0-9a-f]{6}|\d+px|\d+:\d+/g) ?? [])];
for (const value of componentScalarValues) expect(tokenSource.includes(`"${value}"`), `Canonical component token source is missing ${value}.`);
expect(button.includes("h-[14px] w-[14px]") && button.includes("aria-busy={isLoading || undefined}") && button.includes("disabled={disabled || isLoading}"), "Button loading geometry or native state contract drifted.");
expect(statusChip.includes('size === "default" ? "h-7 px-3" : "h-6"'), "StatusChip exact compact/default geometry drifted.");
expect(segmentSwitch.includes('bg-[#dde3ea] text-[#667587]') && segmentSwitch.includes("h-[52px] w-[320px]") && segmentSwitch.includes("h-11 w-[300px]"), "SegmentSwitch disabled-selected or geometry contract drifted.");
expect(validationCaveat.includes('role="note"') && validationCaveat.includes("VALIDATION REQUIRED") && validationCaveat.includes("BLOCKING ISSUE") && validationCaveat.includes("h-11") && validationCaveat.includes("min-h-[88px]"), "ValidationCaveat semantics or geometry drifted.");
expect(accessStatusVisual.includes('bg-[#e8f3f2]') && accessStatusVisual.includes('focus-visible:ring-[#1769e0]') && !accessStatusVisual.includes("ring-4 ring-brand/10") && accessStatusVisual.includes("data-authenticated-indicator"), "Authenticated profile badge default/focus distinction drifted.");

expect(shell.includes('data-product-shell') && shell.includes('data-figma-node="219:425"') && shell.includes('h-product-header') && shell.includes('shrink-0'), "The non-shrinking 64 px traced Product shell contract is missing.");
expect(shell.includes("IdentitySymbol") && !shell.includes(">\n              G\n"), "The approved identity has not replaced the improvised shell mark.");
for (const href of ["/workspace", "/projects", "/explore"]) expect(navigation.includes(`href: "${href}"`), `Missing ${href} navigation.`);
expect(navigation.includes('aria-current={isCurrent ? "page" : undefined}'), "Active-route semantics are missing.");
expect(navigation.includes("h-10") && navigation.includes("min-h-11"), "Approved navigation target sizes are missing.");
expect(navigation.includes("focus-visible:ring-brand") && shell.includes("focus-visible:ring-brand") && accessStatusVisual.includes("focus-visible:ring-[#1769e0]"), "Approved semantic and component-compatibility focus semantics are incomplete.");
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

console.log(`Product System v3.2 design foundation contract passed: ${Object.keys(expectedTokens).length} unchanged semantic tokens, ${Object.keys(expectedComponentTokens).length} structured component adapters, one canonical navigation, five traced primitives/identity, 64 px shell, and Page 90/Page 99 excluded.`);

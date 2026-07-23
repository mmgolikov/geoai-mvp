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
const accessStatusVisual = read("components/auth/access-status-badge-visual.tsx");
const button = read("components/design-system/button.tsx");
const statusChip = read("components/design-system/status-chip.tsx");
const segmentSwitch = read("components/design-system/segment-switch.tsx");
const validationCaveat = read("components/design-system/validation-caveat.tsx");
const tokenSource = read("src/design-system/tokens.ts");
const primitiveRenderer = read("scripts/render-design-foundation-primitives.cjs");
const primitiveSpec = read("tests/e2e/primitive-state-evidence.spec.tsx");
const tailwind = read("tailwind.config.ts");
const scopedCss = read("app/product-system-v3.css");
const layout = read("app/layout.tsx");

expect(registry.figmaFileKey === "TAzDqOvRCw1mQGMU3Y4S9H", "Wrong Figma file key.");
expect(registry.designSystemVersion === "Product System v3.2.1 — Accessibility Correction", "Wrong Product System version.");
expect(registry.identityApproval?.option === 1 && registry.identityApproval?.approvedForImplementation === true, "Founder identity option 1 is missing.");
expect(registry.canonicalNodes?.identityFamily === "468:84" && registry.canonicalNodes?.identityNavigation32 === "468:57", "Identity node traceability is incomplete.");
expect(registry.canonicalNodes?.topNavigation === "219:425", "Top Navigation node traceability is incomplete.");
expect(registry.canonicalNodes?.accessibilityCorrectionReceipt === "1819:11", "Accessibility correction receipt traceability is incomplete.");
expect(registry.excludedAuthorities?.map((entry) => entry.name).join(",") === "Page 90,Page 99" && registry.excludedAuthorities?.every((entry) => entry.implementationAuthority === false), "Page 90/Page 99 exclusion is incomplete.");
expect(registry.bodyScreenMigrationAuthorized === false && registry.figmaWritesAuthorized === false && registry.codeConnectWritesAuthorized === false, "Route-body, Figma and Code Connect writes must remain unauthorized.");
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
expect(Object.keys(manifestTokens).length === 16, "The approved semantic baseline must remain exactly 16 tokens.");
expect(manifest.canonicalSource === "src/design-system/tokens.ts" && manifest.globalBodyMigration === false, "Token source/scope contract is invalid.");
expect(tailwind.includes('import { productSystemV32Tokens } from "./src/design-system/tokens"') && tailwind.includes("...v32.color"), "Tailwind is not synchronized with the canonical token source.");
expect(layout.includes('import { Geist } from "next/font/google"') && layout.includes('variable: "--font-geist"'), "Scoped Geist loading is missing.");

const typography = {
  button: { fontFamily: "var(--font-geist), Geist, Arial, sans-serif", fontSize: "14px", fontWeight: 600, letterSpacing: "0px", lineHeight: "20px", whiteSpace: "nowrap" },
  statusChip: { fontFamily: "var(--font-geist), Geist, Arial, sans-serif", fontSize: "12px", fontWeight: 500, letterSpacing: "0.2px", lineHeight: "16px", whiteSpace: "nowrap" },
  segmentSwitch: { fontFamily: "var(--font-geist), Geist, Arial, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.2px", lineHeight: "16px", whiteSpace: "nowrap" }
};
const expectedAccessibilityCorrection = {
  figmaNode: "1819:11",
  primitive: { inactiveText: "#606f83", disabledText: "#667587" },
  aliases: {
    "color/text/inactive": "primitive/inactive-text",
    "color/text/disabled": "primitive/disabled-text",
    inactiveText: "color/text/inactive",
    disabledText: "color/text/disabled",
    "chip/text/neutral": "inactiveText",
    "segmented/text/default": "inactiveText",
    "segmented/text/disabled": "disabledText"
  }
};
const expectedComponents = {
  button: {
    figmaNode: "202:68",
    color: { primaryDefault: "#087f8c", primaryHover: "#006c78", focusAndSecondary: "#1769e0", disabledBackground: "#eef2f6", disabledText: "#667587", quietHover: "#e8f7fa", secondaryBackground: "#ffffff" },
    geometry: { desktopHeight: "40px", touchHeight: "44px", width: "140px", minimumWidth: "140px", radius: "14px", loadingIndicator: "14px" },
    typography: typography.button,
    variantAxes: { style: ["primary", "secondary", "quiet"], size: ["desktop", "touch"], state: ["default", "hover", "focus", "disabled", "loading"] },
    expectedStateCount: 30
  },
  statusChip: {
    figmaNode: "203:24",
    color: {
      neutral: { background: "#eef2f6", border: "#dde3ea", text: "#606f83" },
      spatial: { background: "#eaf2ff", border: "#bfd3f4", text: "#1769e0" },
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#a85d00" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "24px", defaultHeight: "28px" },
    typography: typography.statusChip,
    variantAxes: { tone: ["neutral", "spatial", "validation", "critical"], size: ["compact", "default"] },
    expectedStateCount: 8
  },
  segmentSwitch: {
    figmaNode: "204:73",
    color: { containerBackground: "#eef2f6", containerBorder: "#dde3ea", activeOption: "#087f8c", focusBoundary: "#1769e0", inactiveText: "#606f83", disabledText: "#667587", disabledSelectedFill: "#dde3ea" },
    geometry: { optionRadius: "10px", outerRadius: "14px", desktopWidth: "300px", desktopHeight: "44px", touchWidth: "320px", touchHeight: "52px" },
    typography: typography.segmentSwitch,
    variantAxes: { active: ["left", "right"], size: ["desktop", "touch"], state: ["default", "focus", "disabled"] },
    expectedStateCount: 12
  },
  validationCaveat: {
    figmaNode: "205:41",
    color: {
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#7a4600" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "44px", fullMinimumHeight: "88px", marker: "8px", radius: "14px" },
    label: { validation: "VALIDATION REQUIRED", critical: "BLOCKING ISSUE" },
    typography: {
      fontFamily: "var(--font-geist), Geist, Arial, sans-serif",
      compactBody: { fontSize: "12px", fontWeight: 500, letterSpacing: "0px", lineHeight: "18px" },
      fullLabel: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.6px", lineHeight: "14px" },
      fullBody: { fontSize: "14px", fontWeight: 500, letterSpacing: "0px", lineHeight: "22px" }
    },
    requiredCaveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    variantAxes: { tone: ["validation", "critical"], mode: ["compact", "full"] },
    expectedStateCount: 4
  },
  authenticatedProfileBadge: {
    figmaNode: "219:425",
    color: { background: "#e8f3f2", borderAndInitials: "#064fcf", focusBoundary: "#1769e0" },
    geometry: { width: "40px", height: "40px" },
    persistentOuterHalo: false,
    focusRingOnlyWhenFocusVisible: true,
    authenticatedIndicator: true,
    variantAxes: { state: ["default", "focus"] },
    expectedStateCount: 2
  }
};

expect(componentManifest.schemaVersion === "1.1", "Component-token manifest schema drifted.");
expect(componentManifest.designSystemVersion === "Product System v3.2.1 — Accessibility Correction", "Component-token design authority drifted.");
expect(componentManifest.approvalDate === "2026-07-22" && componentManifest.approver === "Maxim Golikov — Founder, GeoAI", "Accessibility correction approval metadata drifted.");
expect(componentManifest.canonicalSource === "src/design-system/tokens.ts#productSystemV32ComponentTokens", "Component-token canonical source drifted.");
expect(componentManifest.semanticBaselineManifest === "docs/DESIGN_FOUNDATION_TOKEN_MANIFEST_V3_2.json" && componentManifest.semanticBaselineUnchanged === true, "Component tokens must preserve the approved semantic baseline.");
expect(componentManifest.globalBodyMigration === false, "Component compatibility tokens must not authorize body migration.");
expect(isDeepStrictEqual(componentManifest.evidenceContract, {
  axeSeriousCriticalMaximum: 0,
  deterministicCapturesPerState: 2,
  expectedStateCount: 56,
  requiresClippingPass: true,
  requiresComputedStyles: true,
  requiresSha256: true
}), "The 56-state evidence contract drifted.");
expect(isDeepStrictEqual(componentManifest.accessibilityCorrection, expectedAccessibilityCorrection), "Accessibility correction token separation drifted.");
expect(isDeepStrictEqual(componentManifest.components, expectedComponents), "Structured component-token manifest drifted from the approved Figma adapter contract.");
expect(tokenSource.includes('version: "Product System v3.2.1 accessibility correction"') && tokenSource.includes('figmaNode: "1819:11"'), "Canonical v3.2.1 accessibility authority is missing.");
expect(scopedCss.includes("--geoai-component-inactive-text: #606f83") && scopedCss.includes("--geoai-component-disabled-text: #667587"), "Enabled inactive and disabled CSS tokens must remain separate.");

const matrixCount = Object.values(expectedComponents).reduce((sum, component) => sum + component.expectedStateCount, 0);
expect(matrixCount === 56, `Expected 56 approved primitive states, found ${matrixCount}.`);
expect(expectedComponents.button.variantAxes.style.length * expectedComponents.button.variantAxes.size.length * expectedComponents.button.variantAxes.state.length === 30, "Button matrix must be 30 states.");
expect(expectedComponents.statusChip.variantAxes.tone.length * expectedComponents.statusChip.variantAxes.size.length === 8, "StatusChip matrix must be 8 states.");
expect(expectedComponents.segmentSwitch.variantAxes.active.length * expectedComponents.segmentSwitch.variantAxes.size.length * expectedComponents.segmentSwitch.variantAxes.state.length === 12, "SegmentSwitch matrix must be 12 states.");

const componentScalarValues = [...new Set(JSON.stringify(expectedComponents).match(/#[0-9a-f]{6}|\d+(?:\.\d+)?px|\d+:\d+/g) ?? [])];
for (const value of componentScalarValues) expect(tokenSource.includes(`"${value}"`), `Canonical component token source is missing ${value}.`);

expect(button.includes("loadingVariantClasses") && button.indexOf("isLoading") < button.indexOf(": disabled"), "Button loading classes must remain authoritative over disabled classes.");
expect(button.includes("h-[14px] w-[14px]") && button.includes("aria-busy={isLoading || undefined}") && button.includes("disabled={disabled || isLoading}"), "Button loading geometry or native state contract drifted.");
expect(button.includes("text-[14px] font-semibold leading-5 tracking-[0px]") && button.includes("whitespace-nowrap"), "Button typography contract drifted.");
expect(!button.includes("disabled:bg-") && !button.includes("disabled:text-"), "Disabled utility precedence must not override loading palettes.");
expect(statusChip.includes("text-[12px] font-medium leading-4 !tracking-[0.2px]") && !statusChip.includes("text-[19px]") && !statusChip.includes("font-bold"), "StatusChip typography contract drifted.");
expect(segmentSwitch.includes("text-[12px] font-semibold leading-4 !tracking-[0.2px]") && !segmentSwitch.includes("text-[19px]") && !segmentSwitch.includes("font-bold"), "SegmentSwitch typography contract drifted.");
expect(statusChip.includes("text-[var(--geoai-component-inactive-text)]"), "StatusChip neutral text must use the enabled inactive token.");
expect(segmentSwitch.includes('bg-[#dde3ea] text-[#667587]') && segmentSwitch.includes("text-[var(--geoai-component-inactive-text)]") && segmentSwitch.includes("disabled:text-[var(--geoai-component-disabled-text)]") && segmentSwitch.includes("h-[52px] w-[320px]") && segmentSwitch.includes("h-11 w-[300px]"), "SegmentSwitch enabled-inactive/disabled separation or geometry contract drifted.");
expect(validationCaveat.includes("data-semantic-marker") && validationCaveat.includes("data-caveat-label") && validationCaveat.includes('mode === "compact"') && validationCaveat.includes('role="note"'), "ValidationCaveat compact/full composition drifted.");
expect(accessStatusVisual.includes('bg-[#e8f3f2]') && accessStatusVisual.includes('focus-visible:ring-[#1769e0]') && !accessStatusVisual.includes("ring-4 ring-brand/10") && accessStatusVisual.includes("data-authenticated-indicator"), "Authenticated profile badge default/focus distinction drifted.");

for (const marker of [
  'for (const variant of ["primary", "secondary", "quiet"])',
  'for (const size of ["desktop", "touch"])',
  'for (const state of ["default", "hover", "focus", "disabled", "loading"])',
  'for (const active of ["left", "right"])'
]) expect(primitiveRenderer.includes(marker), `Primitive renderer is missing complete matrix marker: ${marker}`);
for (const marker of [
  "approvedManifestSha256",
  "computedStyles",
  "variantProperties",
  "expect(records).toHaveLength(56)",
  "seriousCritical",
  "screenshot must be deterministic"
]) expect(primitiveSpec.includes(marker), `Primitive evidence is missing ${marker}.`);
expect(!primitiveSpec.includes("disableRules") && !primitiveSpec.includes("exclude("), "Primitive Axe evidence must not suppress or exclude component findings.");

expect(shell.includes('data-product-shell') && shell.includes('data-figma-node="219:425"') && shell.includes('h-product-header') && shell.includes('shrink-0'), "The non-shrinking 64 px traced Product shell contract is missing.");
expect(shell.includes("IdentitySymbol") && !shell.includes(">\n              G\n"), "The approved identity has not replaced the improvised shell mark.");
for (const href of ["/workspace", "/projects"]) expect(navigation.includes(`href: "${href}"`), `Missing ${href} navigation.`);
expect(!navigation.includes('href: "/explore"') && !navigation.includes('label: "Explore"'), "Explore must not remain a canonical Product navigation destination.");
expect(navigation.includes('aria-current={isCurrent ? "page" : undefined}') && navigation.includes('aria-label="Primary product navigation"') && navigation.includes('aria-label="Mobile product navigation"'), "Navigation semantics are incomplete.");
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

console.log("Product System v3.2.1 design foundation contract passed: 16 unchanged semantic tokens, separated inactive/disabled text, 56 structured primitive states, one canonical navigation, five traced primitives/identity, 64 px shell, and Page 90/Page 99 excluded.");

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

type TypographyContract = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  letterSpacing: string;
  lineHeight: string;
  whiteSpace?: string;
};

type ApprovedManifest = {
  evidenceContract: {
    axeSeriousCriticalMaximum: number;
    deterministicCapturesPerState: number;
    expectedStateCount: number;
  };
  components: {
    authenticatedProfileBadge: {
      color: { background: string; borderAndInitials: string; focusBoundary: string };
      expectedStateCount: number;
      figmaNode: string;
      geometry: { height: string; width: string };
      variantAxes: { state: string[] };
    };
    button: {
      color: Record<string, string>;
      expectedStateCount: number;
      figmaNode: string;
      geometry: Record<string, string>;
      typography: TypographyContract;
      variantAxes: { size: string[]; state: string[]; style: string[] };
    };
    segmentSwitch: {
      color: Record<string, string>;
      expectedStateCount: number;
      figmaNode: string;
      geometry: Record<string, string>;
      typography: TypographyContract;
      variantAxes: { active: string[]; size: string[]; state: string[] };
    };
    statusChip: {
      color: Record<string, { background: string; border: string; text: string }>;
      expectedStateCount: number;
      figmaNode: string;
      geometry: Record<string, string>;
      typography: TypographyContract;
      variantAxes: { size: string[]; tone: string[] };
    };
    validationCaveat: {
      color: Record<string, { background: string; border: string; text: string }>;
      expectedStateCount: number;
      figmaNode: string;
      geometry: Record<string, string>;
      label: Record<string, string>;
      requiredCaveat: string;
      typography: {
        compactBody: Omit<TypographyContract, "fontFamily" | "whiteSpace">;
        fontFamily: string;
        fullBody: Omit<TypographyContract, "fontFamily" | "whiteSpace">;
        fullLabel: Omit<TypographyContract, "fontFamily" | "whiteSpace">;
      };
      variantAxes: { mode: string[]; tone: string[] };
    };
  };
};

type PrimitiveCase = {
  component: "Button" | "StatusChip" | "SegmentSwitch" | "ValidationCaveat" | "AuthenticatedProfileBadge";
  fileName: string;
  focus?: boolean;
  hover?: boolean;
  html: string;
  node: string;
  state: string;
  variantProperties: Record<string, string>;
};

type ComputedStyleEvidence = {
  background: string;
  borderColor: string;
  borderRadius: string;
  borderWidth: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  height: number;
  letterSpacing: string;
  lineHeight: string;
  whiteSpace: string;
  width: number;
};

type EvidenceRecord = {
  axe: { seriousCritical: number };
  clipping: { findings: Array<{ tag: string; text?: string }>; passed: boolean };
  component: PrimitiveCase["component"];
  computedStyles: Record<string, ComputedStyleEvidence>;
  dimensions: { height: number; width: number };
  figmaNode: string;
  file: string;
  screenshotDimensions: { height: number; width: number };
  sha256: string;
  state: string;
  variantProperties: Record<string, string>;
};

const evidenceDirectory = path.join(process.cwd(), "artifacts", "design-foundation-primitive-evidence");
const fixedTime = "2026-07-23T09:00:00.000Z";
const approvedManifestPath = path.join(process.cwd(), "docs", "DESIGN_FOUNDATION_COMPONENT_TOKEN_MANIFEST_V3_2.json");
const approvedManifestSource = fsSync.readFileSync(approvedManifestPath, "utf8");
const approved = JSON.parse(approvedManifestSource) as ApprovedManifest;
const primitiveMarkup = JSON.parse(execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "render-design-foundation-primitives.cjs")], { encoding: "utf8" })) as Record<string, string>;

function markup(key: string) {
  const value = primitiveMarkup[key];
  if (!value) throw new Error(`Missing primitive harness markup: ${key}`);
  return value;
}

function rgb(hex: string) {
  const value = hex.replace("#", "");
  return `rgb(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)})`;
}

function pixels(value: string) {
  return Number.parseFloat(value);
}

const buttonCases: PrimitiveCase[] = approved.components.button.variantAxes.style.flatMap((style) =>
  approved.components.button.variantAxes.size.flatMap((size) =>
    approved.components.button.variantAxes.state.map((state) => ({
      component: "Button",
      fileName: `button-${style}-${size}-${state}.png`,
      focus: state === "focus",
      hover: state === "hover",
      html: markup(`button-${style}-${size}-${state}`),
      node: approved.components.button.figmaNode,
      state: `${style}-${size}-${state}`,
      variantProperties: { size, state, style }
    }))
  )
);

const chipCases: PrimitiveCase[] = approved.components.statusChip.variantAxes.tone.flatMap((tone) =>
  approved.components.statusChip.variantAxes.size.map((size) => ({
    component: "StatusChip",
    fileName: `status-chip-${tone}-${size}.png`,
    html: markup(`status-chip-${tone}-${size}`),
    node: approved.components.statusChip.figmaNode,
    state: `${tone}-${size}`,
    variantProperties: { size, tone }
  }))
);

const segmentCases: PrimitiveCase[] = approved.components.segmentSwitch.variantAxes.size.flatMap((size) =>
  approved.components.segmentSwitch.variantAxes.active.flatMap((active) =>
    approved.components.segmentSwitch.variantAxes.state.map((state) => ({
      component: "SegmentSwitch",
      fileName: `segment-switch-${size}-${active}-${state}.png`,
      focus: state === "focus",
      html: markup(`segment-switch-${size}-${active}-${state}`),
      node: approved.components.segmentSwitch.figmaNode,
      state: `${size}-${active}-${state}`,
      variantProperties: { active, size, state }
    }))
  )
);

const caveatCases: PrimitiveCase[] = approved.components.validationCaveat.variantAxes.tone.flatMap((tone) =>
  approved.components.validationCaveat.variantAxes.mode.map((mode) => ({
    component: "ValidationCaveat",
    fileName: `validation-caveat-${tone}-${mode}.png`,
    html: markup(`validation-caveat-${tone}-${mode}`),
    node: approved.components.validationCaveat.figmaNode,
    state: `${tone}-${mode}`,
    variantProperties: { mode, tone }
  }))
);

const profileCases: PrimitiveCase[] = approved.components.authenticatedProfileBadge.variantAxes.state.map((state) => ({
  component: "AuthenticatedProfileBadge",
  fileName: `authenticated-profile-badge-${state}.png`,
  focus: state === "focus",
  html: markup(`authenticated-profile-badge-${state}`),
  node: approved.components.authenticatedProfileBadge.figmaNode,
  state: `authenticated-${state}`,
  variantProperties: { state }
}));

const allCases = [...buttonCases, ...chipCases, ...segmentCases, ...caveatCases, ...profileCases];

async function installHarness(page: Page, html: string) {
  await page.goto("/request-access");
  await page.clock.setFixedTime(new Date(fixedTime));
  await page.evaluate((content) => { document.body.innerHTML = content; }, html);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}body{margin:0!important;background:#fff!important}nextjs-portal{display:none!important}" });
  await page.mouse.move(1200, 700);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(async () => document.fonts.ready);
}

async function computedStyle(locator: Locator): Promise<ComputedStyleEvidence> {
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      background: computed.backgroundColor,
      borderColor: computed.borderTopColor,
      borderRadius: computed.borderRadius,
      borderWidth: computed.borderTopWidth,
      color: computed.color,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      height: box.height,
      letterSpacing: computed.letterSpacing,
      lineHeight: computed.lineHeight,
      whiteSpace: computed.whiteSpace,
      width: box.width
    };
  });
}

async function clippingFindings(root: Locator) {
  return root.locator("*").evaluateAll((elements) => elements.filter((element) => {
    const html = element as HTMLElement;
    if (html.clientWidth === 0 || html.clientHeight === 0) return false;
    const style = getComputedStyle(html);
    const clippedX = style.overflowX !== "visible" && html.scrollWidth > html.clientWidth + 1;
    const clippedY = style.overflowY !== "visible" && html.scrollHeight > html.clientHeight + 1;
    return clippedX || clippedY;
  }).map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 80) })));
}

function expectTypography(actual: ComputedStyleEvidence, expected: TypographyContract | Omit<TypographyContract, "fontFamily" | "whiteSpace">, fontFamily: string, whiteSpace?: string) {
  expect(actual.fontFamily.toLowerCase()).toContain("geist");
  expect(fontFamily).toContain("Geist");
  expect(actual.fontSize).toBe(expected.fontSize);
  expect(actual.fontWeight).toBe(String(expected.fontWeight));
  expect(actual.lineHeight).toBe(expected.lineHeight);
  expect(actual.letterSpacing).toBe(expected.letterSpacing === "0px" ? "normal" : expected.letterSpacing);
  if (whiteSpace) expect(actual.whiteSpace).toBe(whiteSpace);
}

async function assertButton(page: Page, item: PrimitiveCase) {
  const contract = approved.components.button;
  const { size, state, style } = item.variantProperties;
  const button = page.locator("button");
  const actual = await computedStyle(button);
  const transparent = "rgba(0, 0, 0, 0)";
  const expectedHeight = pixels(size === "touch" ? contract.geometry.touchHeight : contract.geometry.desktopHeight);
  const loading = state === "loading";
  const disabled = state === "disabled";
  const expectedBackground = disabled
    ? rgb(contract.color.disabledBackground)
    : style === "primary"
      ? rgb(state === "hover" ? contract.color.primaryHover : contract.color.primaryDefault)
      : style === "secondary"
        ? rgb(state === "hover" ? approved.components.statusChip.color.spatial.background : contract.color.secondaryBackground)
        : state === "hover" ? rgb(contract.color.quietHover) : transparent;
  const expectedColor = disabled
    ? rgb(contract.color.disabledText)
    : style === "primary" ? "rgb(255, 255, 255)" : rgb(contract.color.focusAndSecondary);
  const expectedBorder = style === "secondary" && !disabled ? rgb(contract.color.focusAndSecondary) : transparent;

  expect(actual.width).toBe(pixels(contract.geometry.width));
  expect(actual.height).toBe(expectedHeight);
  expect(actual.borderRadius).toBe(contract.geometry.radius);
  expect(actual.background).toBe(expectedBackground);
  expect(actual.borderColor).toBe(expectedBorder);
  expect(actual.color).toBe(expectedColor);
  expectTypography(actual, contract.typography, contract.typography.fontFamily, contract.typography.whiteSpace);
  await expect(button.locator("[data-button-label]")).toHaveCSS("white-space", "nowrap");

  if (loading) {
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    const spinner = button.locator("[data-loading-indicator]");
    const spinnerBox = await spinner.boundingBox();
    expect(spinnerBox?.width).toBe(pixels(contract.geometry.loadingIndicator));
    expect(spinnerBox?.height).toBe(pixels(contract.geometry.loadingIndicator));
    await expect(spinner).toHaveCSS("color", expectedColor);
  } else {
    await expect(button).not.toHaveAttribute("aria-busy", "true");
    if (disabled) await expect(button).toBeDisabled();
    else await expect(button).toBeEnabled();
  }
  if (state === "focus") expect(await button.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  return { root: actual };
}

async function assertStatusChip(page: Page, item: PrimitiveCase) {
  const contract = approved.components.statusChip;
  const { size, tone } = item.variantProperties;
  const chip = page.locator("[data-figma-node='203:24']");
  const actual = await computedStyle(chip);
  const palette = contract.color[tone];
  expect(actual.height).toBe(pixels(size === "compact" ? contract.geometry.compactHeight : contract.geometry.defaultHeight));
  expect(Number.parseFloat(actual.borderRadius)).toBeGreaterThanOrEqual(9999);
  expect(actual.background).toBe(rgb(palette.background));
  expect(actual.borderColor).toBe(rgb(palette.border));
  expect(actual.color).toBe(rgb(palette.text));
  expectTypography(actual, contract.typography, contract.typography.fontFamily, contract.typography.whiteSpace);
  return { root: actual };
}

async function assertSegmentSwitch(page: Page, item: PrimitiveCase) {
  const contract = approved.components.segmentSwitch;
  const { size, state } = item.variantProperties;
  const root = page.locator("[data-figma-node='204:73']");
  const selected = root.locator("button[aria-pressed='true']");
  const inactive = root.locator("button[aria-pressed='false']");
  const [rootStyle, selectedStyle, inactiveStyle] = await Promise.all([computedStyle(root), computedStyle(selected), computedStyle(inactive)]);
  expect(rootStyle.width).toBe(pixels(size === "touch" ? contract.geometry.touchWidth : contract.geometry.desktopWidth));
  expect(rootStyle.height).toBe(pixels(size === "touch" ? contract.geometry.touchHeight : contract.geometry.desktopHeight));
  expect(rootStyle.borderRadius).toBe(contract.geometry.outerRadius);
  expect(rootStyle.background).toBe(rgb(contract.color.containerBackground));
  expect(rootStyle.borderColor).toBe(rgb(contract.color.containerBorder));
  expect(selectedStyle.borderRadius).toBe(contract.geometry.optionRadius);
  expect(selectedStyle.background).toBe(rgb(state === "disabled" ? contract.color.disabledSelectedFill : contract.color.activeOption));
  expect(selectedStyle.color).toBe(state === "disabled" ? rgb(contract.color.disabledText) : "rgb(255, 255, 255)");
  expect(inactiveStyle.color).toBe(rgb(state === "disabled" ? contract.color.disabledText : contract.color.inactiveText));
  expectTypography(selectedStyle, contract.typography, contract.typography.fontFamily, contract.typography.whiteSpace);
  expectTypography(inactiveStyle, contract.typography, contract.typography.fontFamily, contract.typography.whiteSpace);
  if (state === "disabled") {
    await expect(root).toHaveAttribute("aria-disabled", "true");
    await expect(selected).toBeDisabled();
    await expect(inactive).toBeDisabled();
  } else {
    await expect(selected).toBeEnabled();
    await expect(inactive).toBeEnabled();
  }
  if (state === "focus") expect(await selected.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  return { inactive: inactiveStyle, root: rootStyle, selected: selectedStyle };
}

async function assertValidationCaveat(page: Page, item: PrimitiveCase) {
  const contract = approved.components.validationCaveat;
  const { mode, tone } = item.variantProperties;
  const root = page.locator("[data-figma-node='205:41']");
  const message = root.locator("[data-caveat-message]");
  const [rootStyle, messageStyle] = await Promise.all([computedStyle(root), computedStyle(message)]);
  const palette = contract.color[tone];
  expect(rootStyle.height).toBeGreaterThanOrEqual(pixels(mode === "compact" ? contract.geometry.compactHeight : contract.geometry.fullMinimumHeight));
  if (mode === "compact") expect(rootStyle.height).toBe(pixels(contract.geometry.compactHeight));
  expect(rootStyle.borderRadius).toBe(contract.geometry.radius);
  expect(rootStyle.background).toBe(rgb(palette.background));
  expect(rootStyle.borderColor).toBe(rgb(palette.border));
  expect(rootStyle.color).toBe(rgb(palette.text));
  await expect(root).toHaveAttribute("role", "note");
  await expect(root).toContainText(contract.requiredCaveat);

  if (mode === "compact") {
    const marker = root.locator("[data-semantic-marker]");
    const markerStyle = await computedStyle(marker);
    expect(markerStyle.width).toBe(pixels(contract.geometry.marker));
    expect(markerStyle.height).toBe(pixels(contract.geometry.marker));
    expect(markerStyle.background).toBe(rgb(palette.text));
    await expect(root.locator("[data-caveat-label]")).toHaveCount(0);
    expectTypography(messageStyle, contract.typography.compactBody, contract.typography.fontFamily, "nowrap");
    return { marker: markerStyle, message: messageStyle, root: rootStyle };
  }

  const label = root.locator("[data-caveat-label]");
  const labelStyle = await computedStyle(label);
  await expect(label).toHaveText(contract.label[tone]);
  await expect(root.locator("[data-semantic-marker]")).toHaveCount(0);
  expectTypography(labelStyle, contract.typography.fullLabel, contract.typography.fontFamily);
  expectTypography(messageStyle, contract.typography.fullBody, contract.typography.fontFamily);
  return { label: labelStyle, message: messageStyle, root: rootStyle };
}

async function assertProfileBadge(page: Page, item: PrimitiveCase) {
  const contract = approved.components.authenticatedProfileBadge;
  const badge = page.locator("a[data-authenticated='true']");
  const actual = await computedStyle(badge);
  expect(actual.width).toBe(pixels(contract.geometry.width));
  expect(actual.height).toBe(pixels(contract.geometry.height));
  expect(Number.parseFloat(actual.borderRadius)).toBeGreaterThanOrEqual(9999);
  expect(actual.background).toBe(rgb(contract.color.background));
  expect(actual.borderColor).toBe(rgb(contract.color.borderAndInitials));
  expect(actual.color).toBe(rgb(contract.color.borderAndInitials));
  await expect(badge.locator("[data-authenticated-indicator]")).toBeVisible();
  const shadow = await badge.evaluate((element) => getComputedStyle(element).boxShadow);
  if (item.focus) expect(shadow).not.toBe("none");
  else expect(shadow).toBe("none");
  return { root: actual };
}

async function captureState(page: Page, item: PrimitiveCase): Promise<EvidenceRecord> {
  await installHarness(page, item.html);
  const root = page.locator("[data-primitive-harness]");
  const interactionTarget = item.component === "AuthenticatedProfileBadge"
    ? page.locator("a[data-authenticated='true']")
    : item.component === "SegmentSwitch"
      ? page.locator("button[aria-pressed='true']")
      : item.component === "Button" ? page.locator("button") : root;
  if (item.hover) await interactionTarget.hover();
  if (item.focus) await interactionTarget.focus();

  const computedStyles = item.component === "Button" ? await assertButton(page, item)
    : item.component === "StatusChip" ? await assertStatusChip(page, item)
      : item.component === "SegmentSwitch" ? await assertSegmentSwitch(page, item)
        : item.component === "ValidationCaveat" ? await assertValidationCaveat(page, item)
          : await assertProfileBadge(page, item);

  const clipping = await clippingFindings(root);
  expect(clipping, `${item.component} ${item.state} must not clip or overflow`).toEqual([]);
  const axe = await new AxeBuilder({ page }).include("[data-primitive-harness]").analyze();
  const seriousCritical = axe.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(seriousCritical, `${item.component} ${item.state} Axe findings`).toEqual([]);

  const first = await root.screenshot({ animations: "disabled", caret: "hide" });
  const second = await root.screenshot({ animations: "disabled", caret: "hide" });
  const firstHash = createHash("sha256").update(first).digest("hex");
  expect(createHash("sha256").update(second).digest("hex"), `${item.component} ${item.state} screenshot must be deterministic`).toBe(firstHash);
  const filePath = path.join(evidenceDirectory, item.fileName);
  await fs.writeFile(filePath, first);
  const [componentBox, screenshotBox] = await Promise.all([
    page.locator(`[data-figma-node='${item.node}']`).boundingBox(),
    root.boundingBox()
  ]);
  return {
    axe: { seriousCritical: 0 },
    clipping: { findings: clipping, passed: true },
    component: item.component,
    computedStyles,
    dimensions: { height: Math.round(componentBox?.height ?? 0), width: Math.round(componentBox?.width ?? 0) },
    figmaNode: item.node,
    file: path.relative(process.cwd(), filePath),
    screenshotDimensions: { height: Math.round(screenshotBox?.height ?? 0), width: Math.round(screenshotBox?.width ?? 0) },
    sha256: firstHash,
    state: item.state,
    variantProperties: item.variantProperties
  };
}

test("renders the complete permanent Product System v3.2.1 primitive state matrix", async ({ page }) => {
  expect(buttonCases).toHaveLength(approved.components.button.expectedStateCount);
  expect(chipCases).toHaveLength(approved.components.statusChip.expectedStateCount);
  expect(segmentCases).toHaveLength(approved.components.segmentSwitch.expectedStateCount);
  expect(caveatCases).toHaveLength(approved.components.validationCaveat.expectedStateCount);
  expect(profileCases).toHaveLength(approved.components.authenticatedProfileBadge.expectedStateCount);
  expect(allCases).toHaveLength(approved.evidenceContract.expectedStateCount);

  await fs.rm(evidenceDirectory, { force: true, recursive: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const records: EvidenceRecord[] = [];
  for (const item of allCases) records.push(await captureState(page, item));

  const testedCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const componentCounts = Object.fromEntries([...new Set(records.map((record) => record.component))].map((component) => [
    component,
    records.filter((record) => record.component === component).length
  ]));
  await fs.writeFile(path.join(evidenceDirectory, "manifest.json"), `${JSON.stringify({
    approvedManifest: path.relative(process.cwd(), approvedManifestPath),
    approvedManifestSha256: createHash("sha256").update(approvedManifestSource).digest("hex"),
    axeSeriousCritical: 0,
    componentCounts,
    deterministicCapturesPerState: approved.evidenceContract.deterministicCapturesPerState,
    evidence: records,
    generatedAt: fixedTime,
    stateCount: records.length,
    testedCommit
  }, null, 2)}\n`);
  expect(records).toHaveLength(56);
  expect(componentCounts).toEqual({
    AuthenticatedProfileBadge: 2,
    Button: 30,
    SegmentSwitch: 12,
    StatusChip: 8,
    ValidationCaveat: 4
  });
});

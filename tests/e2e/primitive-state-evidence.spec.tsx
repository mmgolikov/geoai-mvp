import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

type ExpectedStyle = {
  background?: string;
  border?: string;
  color?: string;
  height: number;
  radius?: number;
  width?: number;
};

type PrimitiveCase = {
  component: string;
  expected: ExpectedStyle;
  fileName: string;
  focus?: boolean;
  hover?: boolean;
  html: string;
  node: string;
  state: string;
  target: string;
};

type EvidenceRecord = {
  axeSeriousCritical: number;
  component: string;
  componentBounds: { height: number; width: number };
  figmaNode: string;
  file: string;
  screenshotDimensions: { height: number; width: number };
  sha256: string;
  state: string;
};

const evidenceDirectory = path.join(process.cwd(), "artifacts", "design-foundation-primitive-evidence");
const fixedTime = "2026-07-22T12:00:00.000Z";
const defaultValidationCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const primitiveMarkup = JSON.parse(execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "render-design-foundation-primitives.cjs")], { encoding: "utf8" })) as Record<string, string>;

const rgb = {
  teal: "rgb(8, 127, 140)",
  tealHover: "rgb(0, 108, 120)",
  blue: "rgb(23, 105, 224)",
  disabled: "rgb(238, 242, 246)",
  disabledText: "rgb(102, 117, 135)",
  quietHover: "rgb(232, 247, 250)",
  white: "rgb(255, 255, 255)"
} as const;

function markup(key: string) {
  const value = primitiveMarkup[key];
  if (!value) throw new Error(`Missing primitive harness markup: ${key}`);
  return value;
}

function buttonCase(state: string, expected: ExpectedStyle, interaction: Pick<PrimitiveCase, "focus" | "hover"> = {}) {
  return {
    component: "Button",
    expected,
    fileName: `button-${state}.png`,
    html: markup(`button-${state}`),
    node: "202:68",
    state,
    target: "button",
    ...interaction
  } satisfies PrimitiveCase;
}

const buttonCases: PrimitiveCase[] = [
  buttonCase("primary-default", { background: rgb.teal, color: rgb.white, height: 40, radius: 14, width: 140 }),
  buttonCase("primary-hover", { background: rgb.tealHover, color: rgb.white, height: 40, radius: 14, width: 140 }, { hover: true }),
  buttonCase("primary-focus", { background: rgb.teal, color: rgb.white, height: 40, radius: 14, width: 140 }, { focus: true }),
  buttonCase("primary-disabled", { background: rgb.disabled, color: rgb.disabledText, height: 40, radius: 14, width: 140 }),
  buttonCase("primary-loading", { background: rgb.disabled, color: rgb.disabledText, height: 40, radius: 14, width: 140 }),
  buttonCase("primary-touch", { background: rgb.teal, color: rgb.white, height: 44, radius: 14, width: 140 }),
  buttonCase("primary-touch-loading", { background: rgb.disabled, color: rgb.disabledText, height: 44, radius: 14, width: 140 }),
  buttonCase("secondary-default", { background: rgb.white, border: rgb.blue, color: rgb.blue, height: 40, radius: 14, width: 140 }),
  buttonCase("secondary-focus", { background: rgb.white, border: rgb.blue, color: rgb.blue, height: 40, radius: 14, width: 140 }, { focus: true }),
  buttonCase("quiet-default", { background: "rgba(0, 0, 0, 0)", color: rgb.blue, height: 40, radius: 14, width: 140 }),
  buttonCase("quiet-hover", { background: rgb.quietHover, color: rgb.blue, height: 40, radius: 14, width: 140 }, { hover: true })
];

const chipPalettes = {
  neutral: ["rgb(238, 242, 246)", "rgb(221, 227, 234)", "rgb(102, 117, 135)"],
  spatial: ["rgb(234, 242, 255)", "rgb(191, 211, 244)", "rgb(23, 105, 224)"],
  validation: ["rgb(255, 245, 224)", "rgb(232, 199, 123)", "rgb(168, 93, 0)"],
  critical: ["rgb(255, 240, 240)", "rgb(223, 166, 154)", "rgb(159, 52, 18)"]
} as const;

const chipCases = (Object.keys(chipPalettes) as Array<keyof typeof chipPalettes>).flatMap((tone) =>
  (["compact", "default"] as const).map((size) => {
    const [background, border, color] = chipPalettes[tone];
    return {
      component: "StatusChip",
      expected: { background, border, color, height: size === "compact" ? 24 : 28 },
      fileName: `status-chip-${tone}-${size}.png`,
      html: markup(`status-chip-${tone}-${size}`),
      node: "203:24",
      state: `${tone}-${size}`,
      target: "[data-figma-node='203:24']"
    } satisfies PrimitiveCase;
  })
);

const segmentCases: PrimitiveCase[] = [
  {
    component: "SegmentSwitch",
    expected: { background: rgb.disabled, border: "rgb(221, 227, 234)", height: 44, radius: 14, width: 300 },
    fileName: "segment-switch-desktop-active.png",
    html: markup("segment-switch-desktop-active"),
    node: "204:73",
    state: "desktop-active",
    target: "[data-figma-node='204:73']"
  },
  {
    component: "SegmentSwitch",
    expected: { background: rgb.disabled, border: "rgb(221, 227, 234)", height: 44, radius: 14, width: 300 },
    fileName: "segment-switch-desktop-focus.png",
    focus: true,
    html: markup("segment-switch-desktop-focus"),
    node: "204:73",
    state: "desktop-focus",
    target: "button[aria-pressed='true']"
  },
  {
    component: "SegmentSwitch",
    expected: { background: rgb.disabled, border: "rgb(221, 227, 234)", height: 44, radius: 14, width: 300 },
    fileName: "segment-switch-desktop-disabled-selected.png",
    html: markup("segment-switch-desktop-disabled-selected"),
    node: "204:73",
    state: "desktop-disabled-selected",
    target: "[data-figma-node='204:73']"
  },
  {
    component: "SegmentSwitch",
    expected: { background: rgb.disabled, border: "rgb(221, 227, 234)", height: 52, radius: 14, width: 320 },
    fileName: "segment-switch-touch-active.png",
    html: markup("segment-switch-touch-active"),
    node: "204:73",
    state: "touch-active",
    target: "[data-figma-node='204:73']"
  }
];

const caveatCases: PrimitiveCase[] = (["validation", "critical"] as const).flatMap((tone) =>
  (["compact", "full"] as const).map((mode) => ({
    component: "ValidationCaveat",
    expected: {
      background: tone === "validation" ? "rgb(255, 245, 224)" : "rgb(255, 240, 240)",
      border: tone === "validation" ? "rgb(232, 199, 123)" : "rgb(223, 166, 154)",
      color: tone === "validation" ? "rgb(122, 70, 0)" : "rgb(159, 52, 18)",
      height: mode === "compact" ? 44 : 88,
      radius: 14
    },
    fileName: `validation-caveat-${tone}-${mode}.png`,
    html: markup(`validation-caveat-${tone}-${mode}`),
    node: "205:41",
    state: `${tone}-${mode}`,
    target: "[data-figma-node='205:41']"
  }))
);

const profileCases: PrimitiveCase[] = [
  {
    component: "AuthenticatedProfileBadge",
    expected: { background: "rgb(232, 243, 242)", border: "rgb(6, 79, 207)", color: "rgb(6, 79, 207)", height: 40, radius: 9999, width: 40 },
    fileName: "authenticated-profile-badge-default.png",
    html: markup("authenticated-profile-badge-default"),
    node: "219:425",
    state: "authenticated-default",
    target: "a[data-authenticated='true']"
  },
  {
    component: "AuthenticatedProfileBadge",
    expected: { background: "rgb(232, 243, 242)", border: "rgb(6, 79, 207)", color: "rgb(6, 79, 207)", height: 40, radius: 9999, width: 40 },
    fileName: "authenticated-profile-badge-focus.png",
    focus: true,
    html: markup("authenticated-profile-badge-focus"),
    node: "219:425",
    state: "authenticated-focus",
    target: "a[data-authenticated='true']"
  }
];

async function installHarness(page: Page, html: string) {
  await page.goto("/request-access");
  await page.clock.setFixedTime(new Date(fixedTime));
  await page.evaluate((markup) => { document.body.innerHTML = markup; }, html);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}body{margin:0!important;background:#fff!important}nextjs-portal{display:none!important}" });
  await page.mouse.move(1200, 700);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(async () => document.fonts.ready);
}

async function assertNoClipping(root: Locator) {
  const clipped = await root.locator("*").evaluateAll((elements) => elements.filter((element) => {
    const html = element as HTMLElement;
    if (html.clientWidth === 0 || html.clientHeight === 0) return false;
    const style = getComputedStyle(html);
    const clippedX = style.overflowX !== "visible" && html.scrollWidth > html.clientWidth + 1;
    const clippedY = style.overflowY !== "visible" && html.scrollHeight > html.clientHeight + 1;
    return clippedX || clippedY;
  }).map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 80) })));
  expect(clipped, "Primitive text and controls must not clip or overflow").toEqual([]);
}

async function captureState(page: Page, item: PrimitiveCase): Promise<EvidenceRecord> {
  await installHarness(page, item.html);
  const root = page.locator("[data-primitive-harness]");
  const component = page.locator(item.target);
  if (item.hover) await component.hover();
  if (item.focus) await component.focus();

  const visualTarget = item.component === "SegmentSwitch" && item.state === "desktop-focus"
    ? page.locator("[data-figma-node='204:73']")
    : component;
  const style = await visualTarget.evaluate((element) => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      background: computed.backgroundColor,
      border: computed.borderTopColor,
      color: computed.color,
      height: box.height,
      radius: Number.parseFloat(computed.borderRadius),
      width: box.width
    };
  });
  if (item.component === "ValidationCaveat" && item.state.endsWith("-full")) expect(style.height).toBeGreaterThanOrEqual(item.expected.height);
  else expect(style.height).toBe(item.expected.height);
  if (item.expected.width !== undefined) expect(style.width).toBe(item.expected.width);
  if (item.expected.radius !== undefined) {
    if (item.expected.radius === 9999) expect(style.radius).toBeGreaterThanOrEqual(9999);
    else expect(style.radius).toBe(item.expected.radius);
  }
  if (item.expected.background) expect(style.background).toBe(item.expected.background);
  if (item.expected.border) expect(style.border).toBe(item.expected.border);
  if (item.expected.color) expect(style.color).toBe(item.expected.color);

  if (item.component === "Button") {
    const button = page.locator("button");
    if (item.state.includes("loading")) {
      await expect(button).toHaveAttribute("aria-busy", "true");
      await expect(button).toBeDisabled();
      const spinner = await button.locator("[data-loading-indicator]").boundingBox();
      expect(spinner?.width).toBe(14);
      expect(spinner?.height).toBe(14);
    }
  }
  if (item.component === "SegmentSwitch") {
    const selected = page.locator("button[aria-pressed='true']");
    await expect(selected).toHaveCSS("border-radius", "10px");
    await expect(selected).toHaveCSS("background-color", item.state.includes("disabled") ? "rgb(221, 227, 234)" : rgb.teal);
  }
  if (item.component === "ValidationCaveat") {
    await expect(component).toHaveAttribute("role", "note");
    await expect(component).toContainText(item.state.startsWith("critical") ? "BLOCKING ISSUE" : "VALIDATION REQUIRED");
    await expect(component).toContainText(defaultValidationCaveat);
  }
  if (item.component === "AuthenticatedProfileBadge") {
    await expect(component.locator("[data-authenticated-indicator]")).toBeVisible();
    const shadow = await component.evaluate((element) => getComputedStyle(element).boxShadow);
    if (item.focus) expect(shadow).not.toBe("none");
    else expect(shadow).toBe("none");
  }

  await assertNoClipping(root);
  const axe = await new AxeBuilder({ page }).include("[data-primitive-harness]").analyze();
  const seriousCritical = axe.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(seriousCritical, `${item.component} ${item.state} Axe findings`).toEqual([]);

  const first = await root.screenshot({ animations: "disabled", caret: "hide" });
  const second = await root.screenshot({ animations: "disabled", caret: "hide" });
  const firstHash = createHash("sha256").update(first).digest("hex");
  expect(createHash("sha256").update(second).digest("hex"), `${item.component} ${item.state} screenshot must be deterministic`).toBe(firstHash);
  const filePath = path.join(evidenceDirectory, item.fileName);
  await fs.writeFile(filePath, first);
  const [componentBox, screenshotBox] = await Promise.all([visualTarget.boundingBox(), root.boundingBox()]);
  return {
    axeSeriousCritical: 0,
    component: item.component,
    componentBounds: { height: Math.round(componentBox?.height ?? 0), width: Math.round(componentBox?.width ?? 0) },
    figmaNode: item.node,
    file: path.relative(process.cwd(), filePath),
    screenshotDimensions: { height: Math.round(screenshotBox?.height ?? 0), width: Math.round(screenshotBox?.width ?? 0) },
    sha256: firstHash,
    state: item.state
  };
}

test("renders the permanent Product System v3.2 primitive state matrix", async ({ page }) => {
  await fs.rm(evidenceDirectory, { force: true, recursive: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const records: EvidenceRecord[] = [];
  for (const item of [...buttonCases, ...chipCases, ...segmentCases, ...caveatCases, ...profileCases]) records.push(await captureState(page, item));

  const testedCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await fs.writeFile(path.join(evidenceDirectory, "manifest.json"), `${JSON.stringify({
    axeSeriousCritical: 0,
    componentTokenManifest: "docs/DESIGN_FOUNDATION_COMPONENT_TOKEN_MANIFEST_V3_2.json",
    deterministicCapturesPerState: 2,
    evidence: records,
    generatedAt: fixedTime,
    stateCount: records.length,
    testedCommit
  }, null, 2)}\n`);
  expect(records).toHaveLength(29);
});

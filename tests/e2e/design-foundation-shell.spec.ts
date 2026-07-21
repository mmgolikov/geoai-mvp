import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

type EvidenceRecord = {
  axeSeriousCritical: number;
  height: number;
  label: string;
  path: string;
  route: string;
  sha256: string;
  width: number;
};

const evidenceDirectory = path.join(process.cwd(), "artifacts", "design-foundation-visual-evidence");
const evidence: EvidenceRecord[] = [];
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
] as const;

async function stabilize(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}nextjs-portal{display:none!important}" });
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(100);
}

async function signInDemo(page: Page) {
  await page.goto("/login?next=/workspace&intent=demo");
  const redirected = await page.waitForURL((url) => url.pathname === "/workspace", { timeout: 3000 }).then(() => true, () => false);
  if (!redirected) {
    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await page.getByRole("button", { name: "Open demo" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  }
  await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
}

async function expectMinimumTarget(locator: Locator, label: string, minimum: number) {
  await expect(locator, `${label} must be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} must have bounds`).not.toBeNull();
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(minimum);
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(minimum);
}

async function seriousCriticalAxe(page: Page) {
  const scan = await new AxeBuilder({ page }).include("[data-product-shell]").analyze();
  return scan.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").length;
}

async function captureDeterministic(page: Page, locator: Locator, label: string, fileName: string) {
  await stabilize(page);
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const first = await locator.screenshot({ animations: "disabled", caret: "hide" });
  const second = await locator.screenshot({ animations: "disabled", caret: "hide" });
  const firstHash = createHash("sha256").update(first).digest("hex");
  const secondHash = createHash("sha256").update(second).digest("hex");
  expect(secondHash, `${label} must have one deterministic screenshot`).toBe(firstHash);
  const filePath = path.join(evidenceDirectory, fileName);
  await fs.writeFile(filePath, first);
  const box = await locator.boundingBox();
  const axeCount = await seriousCriticalAxe(page);
  expect(axeCount, `${label} serious/critical Axe findings`).toBe(0);
  evidence.push({
    axeSeriousCritical: axeCount,
    height: Math.round(box?.height ?? 0),
    label,
    path: path.relative(process.cwd(), filePath),
    route: new URL(page.url()).pathname,
    sha256: firstHash,
    width: Math.round(box?.width ?? 0)
  });
}

async function expectShell(page: Page, viewportWidth: number, activeLabel?: "Workspace" | "Projects" | "Explore") {
  const shell = page.locator("[data-product-shell]");
  await expect(shell).toBeVisible();
  const shellBox = await shell.boundingBox();
  expect(shellBox?.height).toBe(64);
  expect(shellBox?.width).toBe(viewportWidth);
  const identity = shell.locator('[data-figma-node="468:57"]');
  await expect(identity).toHaveAttribute("aria-hidden", "true");
  const identityBox = await identity.boundingBox();
  expect(identityBox?.width).toBe(32);
  expect(identityBox?.height).toBe(32);

  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);

  const brand = shell.getByRole("link", { name: "GeoAI home" });
  const actions = shell.locator("[data-product-shell-actions]");
  const [brandBox, actionsBox] = await Promise.all([brand.boundingBox(), actions.boundingBox()]);
  expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0) - (actionsBox?.x ?? 0), "Brand and shell actions must not overlap").toBeLessThanOrEqual(0);
  await expectMinimumTarget(shell.getByRole("link", { name: /profile|Sign in to GeoAI/ }), "Profile/access entry", 40);

  if (viewportWidth >= 768) {
    const navigation = shell.getByRole("navigation", { name: "Primary product navigation" });
    await expect(navigation).toBeVisible();
    await expect(shell.getByRole("button", { name: "Open product navigation" })).toBeHidden();
    for (const label of ["Workspace", "Projects", "Explore"]) {
      await expectMinimumTarget(navigation.getByRole("link", { name: label, exact: true }), `${label} navigation`, 40);
    }
    if (activeLabel) await expect(navigation.getByRole("link", { name: activeLabel, exact: true })).toHaveAttribute("aria-current", "page");
    await navigation.getByRole("link", { name: activeLabel ?? "Workspace", exact: true }).focus();
    const focus = await navigation.getByRole("link", { name: activeLabel ?? "Workspace", exact: true }).evaluate((element) => getComputedStyle(element).boxShadow);
    expect(focus).not.toBe("none");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(await shell.getByRole("navigation").count()).toBe(1);
  } else {
    const trigger = shell.getByRole("button", { name: "Open product navigation" });
    await expectMinimumTarget(trigger, "Mobile navigation trigger", 40);
    await trigger.focus();
    const focus = await trigger.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(focus).not.toBe("none");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(await shell.getByRole("navigation").count()).toBe(0);
  }
}

test.describe.configure({ mode: "serial" });

test("proves the responsive Product System v3.2 shell without migrating route bodies", async ({ browser }) => {
  evidence.length = 0;
  await fs.rm(evidenceDirectory, { force: true, recursive: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({ colorScheme: "light", reducedMotion: "reduce", viewport });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2026-07-21T12:00:00.000Z"));

    await page.goto("/request-access");
    await stabilize(page);
    const publicShell = page.locator("[data-product-shell]");
    await expect(publicShell).toHaveCSS("height", "64px");
    await captureDeterministic(page, publicShell, `${viewport.name} Request Access shell`, `${viewport.name}-request-access.png`);

    await signInDemo(page);
    for (const route of [
      { href: "/workspace", label: "Workspace" as const },
      { href: "/projects", label: "Projects" as const },
      { href: "/explore", label: "Explore" as const },
      { href: "/profile", label: undefined }
    ]) {
      await page.goto(route.href);
      await stabilize(page);
      await expectShell(page, viewport.width, route.label);
      await captureDeterministic(page, page.locator("[data-product-shell]"), `${viewport.name} ${route.label ?? "Profile"} shell`, `${viewport.name}-${route.href.slice(1)}.png`);
    }

    if (viewport.width === 390) {
      await page.goto("/workspace");
      await stabilize(page);
      const trigger = page.getByRole("button", { name: "Open product navigation" });
      await trigger.click();
      const menu = page.getByRole("navigation", { name: "Mobile product navigation" });
      await expect(menu).toBeVisible();
      for (const label of ["Workspace", "Projects", "Explore"]) await expectMinimumTarget(menu.getByRole("link", { name: new RegExp(label) }), `${label} mobile navigation`, 44);
      const menuBox = await menu.boundingBox();
      expect(menuBox?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((menuBox?.x ?? 0) + (menuBox?.width ?? viewport.width + 1)).toBeLessThanOrEqual(viewport.width);
      await captureDeterministic(page, menu, "mobile-390 menu open", "mobile-390-menu-open.png");

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.locator("main").click({ position: { x: 8, y: 120 } });
      await expect(menu).toBeHidden();
      await trigger.click();
      await menu.getByRole("link", { name: /Projects/ }).click();
      await expect(page).toHaveURL((url) => url.pathname === "/projects");
      await expect(page.getByRole("navigation", { name: "Mobile product navigation" })).toBeHidden();
    }

    await context.close();
  }

  expect(evidence).toHaveLength(21);
  await fs.writeFile(path.join(evidenceDirectory, "manifest.json"), `${JSON.stringify({ testedAt: "2026-07-21T12:00:00.000Z", evidence }, null, 2)}\n`);
});

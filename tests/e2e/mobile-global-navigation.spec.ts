import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const visualDirectory = path.join(process.cwd(), "artifacts", "mobile-visual-evidence");

async function signInDemo(page: Page, nextPath: "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  const redirected = await page.waitForURL((url) => url.pathname === nextPath, { timeout: 3000 }).then(
    () => true,
    () => false
  );
  if (redirected) {
    return;
  }
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
  await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    return {
      clientWidth: scrollingElement.clientWidth,
      scrollWidth: scrollingElement.scrollWidth
    };
  });
  expect(metrics.scrollWidth, `Page ${page.url()} must not overflow horizontally`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function expectMinimumTargetSize(label: string, locator: Locator, minimum = 40) {
  await expect(locator, `${label} must be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(minimum);
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(minimum);
}

async function captureAcceptedNavigationEvidence(page: Page) {
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
  await page.evaluate(async () => document.fonts.ready);
  await fs.mkdir(visualDirectory, { recursive: true });
  const fileName = "mobile-product-navigation.png";
  const filePath = path.join(visualDirectory, fileName);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Mobile navigation evidence requires a fixed viewport.");

  // Capture only the stable shared-shell/menu state. The map body below the menu
  // may repaint asynchronously and is covered by separate Workspace visual evidence.
  const clip = {
    x: 0,
    y: 0,
    width: viewport.width,
    height: Math.min(viewport.height, 260)
  };
  const image = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    clip,
    path: filePath
  });
  const repeatImage = await page.screenshot({ animations: "disabled", caret: "hide", clip });
  const sha256 = createHash("sha256").update(image).digest("hex");
  const repeatSha256 = createHash("sha256").update(repeatImage).digest("hex");
  expect(repeatSha256, "Mobile product navigation must have one deterministic screenshot per state").toBe(sha256);
  await expect(page).toHaveScreenshot(fileName, {
    animations: "disabled",
    caret: "hide",
    clip,
    maxDiffPixelRatio: 0.01
  });
  console.log(`[visual] Mobile product navigation: ${fileName} sha256:${sha256}`);
}

async function openMobileNavigation(page: Page) {
  const trigger = page.locator('button[aria-controls="mobile-product-navigation-menu"]');
  await expectMinimumTargetSize("Mobile navigation trigger", trigger);
  await expect(trigger).toHaveAccessibleName("Open product navigation");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close product navigation");
  const navigation = page.getByRole("navigation", { name: "Mobile product navigation" });
  await expect(navigation).toBeVisible();
  return navigation;
}

test.describe("global product navigation", () => {
  test("opens every product route from an iPhone Pro Max width", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.clock.setFixedTime(new Date("2026-07-17T20:15:00.000Z"));
    await signInDemo(page, "/workspace");
    await expect(page.getByRole("heading", { level: 1, name: "Workspace location screening" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    let navigation = await openMobileNavigation(page);
    const workspaceLink = navigation.getByRole("link", { name: /Workspace/ });
    const projectsLink = navigation.getByRole("link", { name: /Projects/ });
    const exploreLink = navigation.getByRole("link", { name: /Explore/ });
    for (const [label, locator] of [
      ["Workspace navigation link", workspaceLink],
      ["Projects navigation link", projectsLink],
      ["Explore navigation link", exploreLink]
    ] as Array<[string, Locator]>) await expectMinimumTargetSize(label, locator);
    await expect(workspaceLink).toHaveAttribute("aria-current", "page");

    await captureAcceptedNavigationEvidence(page);

    await projectsLink.click();
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    navigation = await openMobileNavigation(page);
    await expect(navigation.getByRole("link", { name: /Projects/ })).toHaveAttribute("aria-current", "page");
    await navigation.getByRole("link", { name: /Explore/ }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/explore");
    await expect(page.getByRole("heading", { level: 1, name: "Explore candidate locations" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    navigation = await openMobileNavigation(page);
    await expect(navigation.getByRole("link", { name: /Explore/ })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    const trigger = page.getByRole("button", { name: "Open product navigation" });
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps direct product navigation visible at iPad width", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await signInDemo(page, "/workspace");
    const navigation = page.getByRole("navigation", { name: "Primary product navigation" });
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("button", { name: "Open product navigation" })).toBeHidden();

    for (const route of [
      { href: "/workspace", label: "Workspace", heading: "Workspace location screening" },
      { href: "/projects", label: "Projects", heading: "Project Hub" },
      { href: "/explore", label: "Explore", heading: "Explore candidate locations" }
    ]) {
      const link = navigation.getByRole("link", { name: route.label, exact: true });
      await expectMinimumTargetSize(`${route.label} tablet navigation`, link);
      await link.click();
      await expect(page).toHaveURL((url) => url.pathname === route.href);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(link).toHaveAttribute("aria-current", "page");
      await expectNoHorizontalOverflow(page);
    }
  });
});

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

const visualDirectory = path.join(process.cwd(), "artifacts", "mobile-visual-evidence");

test.beforeEach(async ({ page }, testInfo) => {
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  await page.route(/^https:\/\//, async route => {
    const url = new URL(route.request().url());
    // Only external requests are fixtures; HTTPS loopback must exercise the
    // real application and its CSP just like an HTTP/remote baseURL does.
    if (testInfo.project.use.baseURL && url.origin === new URL(testInfo.project.use.baseURL).origin) return route.fallback();
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "offline-background", type: "background", paint: { "background-color": "#eef3f2" } }] } });
    } else await route.abort();
  });
});

async function signInDemo(page: Page, nextPath: "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  const redirected = await page.waitForURL((url) => url.pathname === nextPath, { timeout: 3000 }).then(
    () => true,
    () => false
  );
  if (redirected) {
    return;
  }
  await page.getByRole("button", { name: "Open demo access" }).click();
  const origin = new URL(page.url()).origin;
  let destinationDocumentRequests = 0;
  const countDestinationNavigation = (request: Request) => {
    const url = new URL(request.url());
    if (request.isNavigationRequest() && request.frame() === page.mainFrame() && url.origin === origin && url.pathname === nextPath) {
      destinationDocumentRequests += 1;
    }
  };
  page.on("request", countDestinationNavigation);
  try {
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === nextPath);
    await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
    expect(destinationDocumentRequests, "Successful sign-in must issue one destination document navigation, without assign/replace racing").toBe(1);
  } finally {
    page.off("request", countDestinationNavigation);
    await test.info().attach("signin-document-navigation-count", {
      contentType: "application/json",
      body: JSON.stringify({ destinationPath: nextPath, destinationDocumentRequests })
    });
  }
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
  // Hydration can replace the dynamic fallback header between visibility and
  // geometry reads. Retry the complete sample; never relax the size/null checks.
  await expect(async () => {
    await expect(locator, `${label} must be visible`).toBeVisible();
    const box = await locator.boundingBox();
    expect(box, `${label} must have a rendered box`).not.toBeNull();
    expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(minimum);
    expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(minimum);
  }).toPass({ timeout: 5_000 });
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
  expect(repeatSha256, "Mobile Product navigation must have one deterministic screenshot per state").toBe(sha256);
  await fs.writeFile(
    path.join(visualDirectory, "mobile-product-navigation-manifest.json"),
    `${JSON.stringify({ fileName, sha256, viewport, clip, destinations: ["Workspace", "Projects"] }, null, 2)}\n`,
    "utf8"
  );
  console.log(`[visual] Mobile Product navigation candidate: ${fileName} sha256:${sha256}`);
}

async function openMobileNavigation(page: Page) {
  const trigger = page.locator('button[aria-controls="mobile-product-navigation-menu"]');
  await expectMinimumTargetSize("Mobile navigation trigger", trigger, 44);
  await expect(trigger).toHaveAccessibleName("Open product navigation");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close product navigation");
  const navigation = page.getByRole("navigation", { name: "Mobile product navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Explore/ })).toHaveCount(0);
  return navigation;
}

async function expectCanonicalWorkspace(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === "/prototype/point-to-object");
  await expect(page.getByTestId("mobile-workspace-shell")).toBeVisible();
  // The canonical map has its own header, not the legacy Product menu.
  await expect(page.locator('button[aria-controls="mobile-product-navigation-menu"]')).toHaveCount(0);
  const projects = page.locator("[data-point-object-header]").getByRole("link", { name: "Projects", exact: true });
  await expectMinimumTargetSize("Canonical map Projects link", projects, 44);
  await expect(projects).toHaveAttribute("href", "/projects");
  await expectNoHorizontalOverflow(page);
  return projects;
}

test.describe("global product navigation", () => {
  test("Projects retains keyboard focus while project controls finish loading", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    let releaseControls!: () => void;
    const controlsReady = new Promise<void>((resolve) => { releaseControls = resolve; });
    await page.route(/\/_next\/static\/chunks\/.*project-control/, async (route) => {
      await controlsReady;
      await route.continue();
    });
    try {
      await page.goto("/prototype/point-to-object", { waitUntil: "domcontentloaded" });
      const projects = page.locator("[data-point-object-header]").getByRole("link", { name: "Projects", exact: true });
      await expect(projects).toHaveAttribute("href", "/projects");
      await projects.focus();
      await expect(projects).toBeFocused();
      releaseControls();
      await expect(page.getByTestId("point-object-project-control")).toBeVisible();
      await expect(projects, "Loading project controls must preserve the keyboard navigation target").toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL((url) => url.pathname === "/projects");
      await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
    } finally {
      releaseControls();
    }
  });

  test("opens every canonical Product route from an iPhone Pro Max width", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    // This header contains no date/time content. Keep the real browser clock
    // through Auth/navigation; the two exact screenshot hashes below still
    // enforce deterministic navigation evidence without instrumenting Date.
    await signInDemo(page, "/workspace");
    await expect(page.getByRole("heading", { level: 1, name: "Workspace location screening" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    let navigation = await openMobileNavigation(page);
    const workspaceLink = navigation.getByRole("link", { name: /Workspace/ });
    const projectsLink = navigation.getByRole("link", { name: /Projects/ });
    for (const [label, locator] of [
      ["Workspace navigation link", workspaceLink],
      ["Projects navigation link", projectsLink]
    ] as Array<[string, Locator]>) await expectMinimumTargetSize(label, locator);
    await expect(workspaceLink).toHaveAttribute("aria-current", "page");
    await expect(workspaceLink).toHaveAttribute("href", "/prototype/point-to-object");

    await captureAcceptedNavigationEvidence(page);

    // Keyboard and outside-dismissal belong to the directly visited legacy
    // shell; the destination map intentionally uses a different header.
    await page.keyboard.press("Escape");
    const trigger = page.getByRole("button", { name: "Open product navigation" });
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("button", { name: "Close product navigation" })).toHaveAttribute("aria-expanded", "true");
    // Header gutter is outside the popup and does not activate a destination.
    await page.mouse.click(4, 4);
    await expect(navigation).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    navigation = await openMobileNavigation(page);

    await navigation.getByRole("link", { name: /Projects/ }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    navigation = await openMobileNavigation(page);
    await expect(navigation.getByRole("link", { name: /Projects/ })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: /Workspace/ })).toHaveAttribute("href", "/prototype/point-to-object");
    await navigation.getByRole("link", { name: /Workspace/ }).click();
    const mapProjects = await expectCanonicalWorkspace(page);
    await mapProjects.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    navigation = await openMobileNavigation(page);
    await expect(navigation.getByRole("link", { name: /Projects/ })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps direct Product navigation visible at iPad width", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await signInDemo(page, "/workspace");
    const navigation = page.getByRole("navigation", { name: "Primary product navigation" });
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("button", { name: "Open product navigation" })).toBeHidden();
    await expect(navigation.getByRole("link", { name: "Explore", exact: true })).toHaveCount(0);

    const workspace = navigation.getByRole("link", { name: "Workspace", exact: true });
    const projects = navigation.getByRole("link", { name: "Projects", exact: true });
    await expectMinimumTargetSize("Workspace tablet navigation", workspace);
    await expectMinimumTargetSize("Projects tablet navigation", projects);
    await expect(workspace).toHaveAttribute("aria-current", "page");
    await expect(workspace).toHaveAttribute("href", "/prototype/point-to-object");
    await projects.click();
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expect(projects).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalOverflow(page);
    await workspace.click();
    const mapProjects = await expectCanonicalWorkspace(page);
    await mapProjects.click();
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
    await expect(projects).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalOverflow(page);
  });
});

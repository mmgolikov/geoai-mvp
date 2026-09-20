import { expect, test } from "@playwright/test";
import { conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram, validatePointObjectCreateAoiVertices } from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { parsePointObjectCreateSessionState } from "../../src/lib/prototype/point-to-object-create-session";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test("saved synthetic large concave concept shows basemap, local model, A/B and unchanged KPIs without AI", async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
  const vertices: [number, number][] = [[55.28, 25.2], [55.2909, 25.2], [55.2909, 25.20335], [55.28436, 25.20335], [55.28436, 25.20985], [55.28, 25.20985]];
  const validated = validatePointObjectCreateAoiVertices(vertices);
  if (!validated.ok) throw new Error(validated.message);
  const aoi = { id: "create-aoi-quality20-synthetic-large-L", coordinates: [[...vertices, vertices[0]]], areaSqM: validated.measurements.areaSqM, perimeterM: validated.measurements.perimeterM, vertexCount: vertices.length };
  const v = validateRedevelopmentProgram({ ...conceptTemplate("residential_mixed_use", "en"), blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 });
  if (!v.ok) throw new Error(v.errors.join(";"));
  const alternatives = generateConceptMassingAlternatives(aoi.coordinates, v.value, "quality20-browser");
  const generated = { mode: "openai_concept", generatedAt: "2026-09-20T10:00:00Z", promptVersion: "POINT_OBJECT_CREATE_SYNTHETIC_OFFLINE_GEOMETRY", program: v.value, massing: alternatives[0].massing, alternatives, telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 0, attempts: 1, estimatedCostUsd: 0, stored: false, toolCalls: 0 }, caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT };
  const session = { schemaVersion: 1, marketKey: "dubai", locale: "en", aoi, editorSnapshot: null, generated, generatedLocale: "en", activeAlternativeId: "A", areaContext: null, dashboardOpen: true, updatedAt: "2026-09-20T10:00:00Z" };
  expect(parsePointObjectCreateSessionState(session)).not.toBeNull();
  const paidRequests: string[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/create")) {
      paidRequests.push(route.request().method());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(route.request().method() === "GET" ? { mode: "ready", challenge: "Q".repeat(43) } : generated) });
      return;
    }
    await route.fulfill({ status: path === "/api/auth/session" ? 200 : 503, contentType: "application/json", body: JSON.stringify(path === "/api/auth/session" ? { isAuthenticated: false, sessionStatus: "session_missing", user: null } : { mode: "unavailable" }) });
  });
  // Only the existing free basemap provider is allowed; no paid/source/AI endpoint can escape.
  await page.route(/^https:\/\//, route => new URL(route.request().url()).hostname.endsWith("openfreemap.org") ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/prototype/point-to-object?mode=create");
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "synthetic-large-L.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: aoi.coordinates })) });
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: /^Blocks/ }).focus();
  await page.keyboard.press("Home");
  for (let i = 0;i < 8;i++) await page.keyboard.press("ArrowRight");
  await page.getByRole("slider", { name: /^Maximum levels/ }).focus();
  await page.keyboard.press("End");
  for (let i = 0;i < 27;i++) await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
  await page.getByTestId("create-generate-action").click();
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  const preview = page.getByTestId("create-result-preview-3d");
  await expect(preview).toHaveAttribute("data-preview-status", "ready");
  await expect(preview).toHaveAttribute("data-preview-scene", "map");
  await expect(preview).toHaveAttribute("data-preview-basemap", "rendered");
  expect(Number(await preview.getAttribute("data-preview-basemap-feature-count"))).toBeGreaterThan(0);
  await page.getByTestId("create-preview-mode-3d").click();
  await expect(preview).toHaveAttribute("data-preview-camera-pitch", "50");
  await expect.poll(async () => Number(await preview.getAttribute("data-preview-rendered-massing-count"))).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("synthetic-large-L-real-basemap-A.png"), fullPage: true });
  const key = await preview.getAttribute("data-preview-geometry-key");
  await page.getByTestId("create-dashboard-alternative-b").click();
  await expect(preview).not.toHaveAttribute("data-preview-geometry-key", key!);
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", String(alternatives[1].massing.estimatedFloorAreaSqM));
  await page.getByTestId("create-scene-model").click();
  await expect(preview).toHaveAttribute("data-preview-status", "ready");
  await expect(preview).toHaveAttribute("data-preview-basemap", "none");
  await expect(preview).toHaveAttribute("data-preview-rendered-scene", "model");
  await expect.poll(async () => Number(await preview.getAttribute("data-preview-rendered-massing-count"))).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("synthetic-large-L-local-model-B.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("create-preview-mode-2d").click();
  await expect(preview).toHaveAttribute("data-preview-camera-pitch", "0");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("synthetic-large-L-mobile-model-B.png"), fullPage: true });
  expect(paidRequests).toEqual(["GET", "POST"]); // One entirely mocked generation, zero calls on view/A/B changes.
});

test("local preflight blocks an overfilled programme before any generation request", async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
  const createRequests: string[] = [];
  await page.route("**/api/**", async route => {
    if (new URL(route.request().url()).pathname.endsWith("/create")) createRequests.push(route.request().method());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ isAuthenticated: false, sessionStatus: "session_missing", user: null, mode: "unavailable" }) });
  });
  await page.goto("/prototype/point-to-object?mode=create");
  await page.getByLabel("Upload GeoJSON").setInputFiles({ name: "synthetic-square.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: [[[55.27, 25.2], [55.274, 25.2], [55.274, 25.204], [55.27, 25.204], [55.27, 25.2]]] })) });
  await page.getByText("Concept parameters", { exact: true }).click();
  const coverage = page.getByRole("slider", { name: /^Site coverage/ });
  await coverage.focus(); await page.keyboard.press("End");
  const openSpace = page.getByRole("slider", { name: /^Open space/ });
  await openSpace.focus(); await page.keyboard.press("End");
  await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "failed");
  await expect(page.getByTestId("create-generate-action")).toBeDisabled();
  await expect(coverage).toHaveValue("60");
  await expect(openSpace).toHaveValue("75");
  expect(createRequests).toEqual([]);
});

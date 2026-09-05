import { expect, test, type Page, type Route } from "@playwright/test";

const createPosts: Array<Record<string, unknown>> = [];
let challengeGets = 0;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function massing(variantId: "A" | "B", generation: number, controls: Record<string, number>, templateId: string) {
  const count = controls.blockCount;
  const features = Array.from({ length: count }, (_, index) => {
    const orderedIndex = variantId === "A" ? index : count - index - 1;
    const longitude = 55.27019 + (orderedIndex % 3) * 0.00012 + generation * 0.000002;
    const latitude = 25.20519 + Math.floor(orderedIndex / 3) * 0.00012 + (variantId === "B" ? 0.000035 : 0);
    const levels = controls.levelsMin + index % Math.max(1, controls.levelsMax - controls.levelsMin + 1);
    const id = `concept-${variantId.toLowerCase()}-${generation}-${index + 1}`;
    return {
      type: "Feature" as const,
      id,
      properties: {
        id,
        kind: "concept_massing",
        templateId,
        massingStyle: "campus",
        variantId,
        volumeRole: "campus_block",
        primaryBlock: true,
        use: "civic",
        levels,
        heightM: levels * 3.4,
        baseM: 0,
        label: `Generation ${generation} ${variantId} block ${index + 1}`
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [longitude, latitude],
          [longitude + 0.00005, latitude],
          [longitude + 0.00005, latitude + 0.00005],
          [longitude, latitude + 0.00005],
          [longitude, latitude]
        ]]
      }
    };
  });
  return {
    featureCollection: { type: "FeatureCollection" as const, features },
    variantId,
    massingStyle: "campus",
    requestedBlockCount: controls.blockCount,
    generatedBlockCount: controls.blockCount,
    generatedFeatureCount: features.length,
    aoiAreaSqM: 2_500,
    generatedFootprintAreaSqM: controls.targetSiteCoveragePct * 25,
    achievedSiteCoveragePct: controls.targetSiteCoveragePct,
    estimatedFloorAreaSqM: generation * 1_000 + (variantId === "B" ? 500 : 0),
    minGeneratedLevels: controls.levelsMin,
    maxGeneratedLevels: controls.levelsMax,
    seed: `offline-${generation}-${variantId}`
  };
}

function conceptResponse(request: Record<string, unknown>, generation: number) {
  const controls = request.controls as Record<string, number>;
  const templateId = String(request.templateId);
  const a = massing("A", generation, controls, templateId);
  const b = massing("B", generation, controls, templateId);
  return {
    mode: "openai_concept",
    generatedAt: "2026-09-05T12:00:00.000Z",
    promptVersion: "POINT_OBJECT_CREATE_PROMPT_V1",
    program: {
      schemaVersion: 1,
      templateId,
      title: `Generation ${generation}`,
      summary: `Generation ${generation} committed result.`,
      massingStyle: "campus",
      ...controls,
      useMix: [
        { use: "civic", sharePct: 100 - controls.openSpacePct },
        { use: "open_space", sharePct: controls.openSpacePct }
      ],
      rationale: ["Bounded offline reliability fixture."]
    },
    massing: a,
    alternatives: [
      { id: "A", label: "Alternative A", massing: a },
      { id: "B", label: "Alternative B", massing: b }
    ],
    telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
}

async function installRoutes(page: Page) {
  await page.route(/^https:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await json(route, {
        version: 8,
        name: "Create reliability offline map",
        sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/create-e2e/{z}/{x}/{y}.pbf"] } },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#e8edf0" } },
          { id: "building-fill", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#d6dcdf" } }
        ]
      });
      return;
    }
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/create-e2e/")) {
      await route.fulfill({ status: 200, contentType: "application/x-protobuf", body: Buffer.alloc(0) });
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, user: null }));
  await page.route("**/api/prototype/point-to-object/area-context", (route) =>
    json(route, { mode: "unavailable", error: "Offline context failure." }, 503));
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") {
      challengeGets += 1;
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
    const request = route.request().postDataJSON() as Record<string, unknown>;
    createPosts.push(request);
    if (request.customPrompt === "force failure") {
      await json(route, { mode: "unavailable", error: "Intentional offline failure." }, 503);
      return;
    }
    if (request.customPrompt === "late response") {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    await json(route, conceptResponse(request, createPosts.length)).catch(() => undefined);
  });
}

test("Create separates draft from committed geometry and never spends on local-only actions", async ({ page }, testInfo) => {
  createPosts.length = 0;
  challengeGets = 0;
  await installRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "create-reliability.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.27015, 25.20515],
        [55.27065, 25.20515],
        [55.27065, 25.20565],
        [55.27015, 25.20565],
        [55.27015, 25.20515]
      ]]
    }))
  });
  await expect(page.getByText("Area context is temporarily unavailable.")).toBeVisible();
  await page.getByRole("button", { name: "Public campus" }).click();
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: "Blocks" }).press("ArrowRight");
  expect(createPosts).toHaveLength(0);
  expect(challengeGets).toBe(0);

  const generate = page.getByTestId("create-generate-action");
  await expect(generate).toHaveText("Generate concept");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await expect(generate).toHaveText("Already generated");
  await expect(generate).toBeDisabled();
  expect(createPosts).toHaveLength(1);
  expect(challengeGets).toBe(1);
  expect(createPosts[0].lockedControlKeys).toEqual(["blockCount"]);

  await page.getByTestId("create-alternative-b").click();
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,500");
  await page.getByTestId("create-alternative-a").click();
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("1,000");
  expect(createPosts).toHaveLength(1);
  expect(challengeGets).toBe(1);

  await page.getByTestId("reset-edited-create-controls").click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 1 committed result.");
  await expect(page.getByTestId("create-draft-status")).toBeVisible();
  await expect(generate).toHaveText("Update concept");
  await generate.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(2);
  expect(challengeGets).toBe(2);
  expect(createPosts[1].lockedControlKeys).toEqual([]);

  const prompt = page.getByLabel("Custom direction");
  await prompt.fill("force failure");
  await generate.click();
  await expect(page.getByTestId("create-generation-error")).toContainText("previous valid result remains available");
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  expect(createPosts).toHaveLength(3);

  await prompt.fill("late response");
  await generate.click();
  await expect.poll(() => createPosts.length).toBe(4);
  await prompt.fill("newer draft");
  await page.waitForTimeout(450);
  await expect(page.getByTestId("generated-concept-summary")).toContainText("Generation 2 committed result.");
  await expect(generate).toHaveText("Update concept");
  expect(createPosts).toHaveLength(4);

  await page.screenshot({ path: testInfo.outputPath("draft-generated-separation.png") });
  await page.getByTestId("create-clear-generated").click();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await expect(generate).toHaveText("Generate concept");
});

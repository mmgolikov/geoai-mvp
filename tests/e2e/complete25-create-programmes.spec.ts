import { expect, test } from "@playwright/test";
import { conceptTemplate, CONCEPT_TEMPLATE_IDS, generateConceptMassingAlternatives, validateRedevelopmentProgram, type ConceptTemplateId } from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { sessionMissingFixture } from "./helpers/auth-persona";

const coordinates: [number, number][][] = [[[55.278, 25.216], [55.281, 25.216], [55.281, 25.219], [55.278, 25.219], [55.278, 25.216]]];

for (const { locale, width } of [{ locale: "en", width: 1440 }, { locale: "ru", width: 390 }] as const) {
  test(`COMPLETE25 five Create programmes, preserved result and saved B: ${locale}/${width}`, async ({ page, browserName }, testInfo) => {
    await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
    await page.setViewportSize({ width, height: 1000 });
    const unexpected: string[] = [];
    await page.route(externalHttpUrlPattern(testInfo.project.use.baseURL), async route => {
      const url = new URL(route.request().url());
      if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
        await route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }] } });
        return;
      }
      unexpected.push(url.href);
      await route.abort("blockedbyclient");
    });
    await page.route("**/api/auth/session", route => route.fulfill({ json: sessionMissingFixture }));
    await page.route("**/api/prototype/point-to-object/area-context", route => route.fulfill({ status: 503, json: { mode: "unavailable", error: "Offline source fixture" } }));
    const requests: Array<{ templateId: ConceptTemplateId; locale: "en" | "ru" }> = [];
    await page.route("**/api/prototype/point-to-object/create", async route => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { mode: "ready", challenge: "P".repeat(43) } });
        return;
      }
      const body = route.request().postDataJSON();
      requests.push({ templateId: body.templateId, locale: body.locale });
      const parsed = validateRedevelopmentProgram({ ...conceptTemplate(body.templateId, body.locale), ...body.controls });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) throw new Error(parsed.errors.join(";"));
      const alternatives = generateConceptMassingAlternatives(body.aoiCoordinates, parsed.value, "complete25-offline-browser", body.locale);
      await route.fulfill({ json: { mode: "openai_concept", generatedAt: "2026-09-25T12:00:00.000Z",
        promptVersion: "POINT_OBJECT_CREATE_COMPLETE25_BROWSER", program: parsed.value, massing: alternatives[0].massing, alternatives,
        telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
        caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT } });
    });
    await page.addInitScript(() => localStorage.setItem("geoai-mock-demo-session-v1", "active"));
    await page.goto("/prototype/point-to-object?mode=create");
    await expect(page.locator("main[data-project-restoration]")).toHaveAttribute("data-project-restoration", "ready");
    if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    await page.getByLabel(locale === "ru" ? "Загрузить GeoJSON" : "Upload GeoJSON").setInputFiles({ name: "complete25.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates })) });
    const programme = (id: ConceptTemplateId) => page.getByTestId(`create-programme-${id}`);
    for (const id of CONCEPT_TEMPLATE_IDS) {
      await programme(id).click();
      await expect(programme(id)).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    }
    expect(requests).toHaveLength(0);
    await programme("residential_quarter").click();
    await expect(programme("residential_quarter")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    await page.getByTestId("create-generate-action").click();
    const summary = page.getByTestId("generated-concept-summary");
    await expect(summary).toContainText(conceptTemplate("residential_quarter", locale).summary);
    expect(requests).toEqual([{ templateId: "residential_quarter", locale }]);
    await programme("hospitality_recreation").click();
    await expect(page.getByTestId("create-draft-status")).toBeVisible();
    await expect(summary).toContainText(conceptTemplate("residential_quarter", locale).summary);
    expect(requests).toHaveLength(1);
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready");
    await page.getByTestId("create-generate-action").click();
    await expect(summary).toContainText(conceptTemplate("hospitality_recreation", locale).summary);
    await expect(page.getByTestId("create-generate-action")).toBeDisabled();
    await page.getByTestId("create-alternative-b").click();
    await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
    expect(requests).toEqual([{ templateId: "residential_quarter", locale }, { templateId: "hospitality_recreation", locale }]);
    await expect.poll(() => page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith("geoai:point-to-object:projects:v1:"));
      return key ? localStorage.getItem(key) : "";
    })).toContain('"activeAlternativeId":"B"');
    await page.getByTestId("create-open-result-dashboard").click();
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    const preview = page.getByTestId("create-result-preview-3d");
    await expect(preview).toHaveAttribute("data-preview-status", "ready");
    await expect(preview).toHaveAttribute("data-preview-feature-count", "7");
    await page.getByTestId("create-preview-mode-3d").click();
    await expect(preview).toHaveAttribute("data-preview-status", "ready");
    await page.screenshot({ path: testInfo.outputPath(`hospitality-${locale}-${width}.png`) });
    await page.goto("/projects?view=spatial");
    await page.getByRole("button", { name: locale === "ru" ? "Показать на карте" : "Show on map", exact: true }).first().click();
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
    expect(requests).toHaveLength(2);
    expect(unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

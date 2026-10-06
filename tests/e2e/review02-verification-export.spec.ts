import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { POINT_OBJECT_SESSION_KEYS } from "../../components/point-to-object/live-session";
import { sprint10Selection, sprint10PublicEvidenceReceipt, sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

// Local fixtures only: this is owner browser evidence, not hosted AI/source QA.
for (const { locale, width } of [{ locale: "en" as const, width: 1440 }, { locale: "ru" as const, width: 390 }]) {
  test(`explicit verification export preserves intent/telemetry with no extra dispatch ${locale} ${width}`, async ({ page }, info) => {
    const baseURL = info.project.use.baseURL!;
    await installLoopbackBrowserHarness(page, info.project.use.browserName, baseURL);
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
    const selection = { ...sprint10Selection, resolvedObject: { ...sprint10Selection.resolvedObject, evidenceReceipt: sprint10PublicEvidenceReceipt("way/91010", locale) } };
    await page.addInitScript(({ key, value }) => { if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value)); }, { key: POINT_OBJECT_SESSION_KEYS.selection, value: selection });
    let posts = 0; let challenges = 0; let submitted: Record<string, unknown> = {}; let response: unknown;
    const unexpected: string[] = []; const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
    await page.route("**/api/prototype/point-to-object/**", route => { unexpected.push(new URL(route.request().url()).pathname); return route.abort("blockedbyclient"); });
    await page.route("**/api/prototype/point-to-object/ai", route => {
      if (route.request().method() === "GET") { challenges++; return route.fulfill({ json: { mode: "ready", challenge: "A".repeat(43) } }); }
      const body = route.request().postDataJSON(); posts++;
      const { challenge: _challenge, ...intent } = body; submitted = intent;
      const { role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale } = body;
      response = sprint10AnalysisResponse({ role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale }, posts, body.evidenceReceipt.evidencePackHash);
      return route.fulfill({ json: response });
    });
    await page.goto("/prototype/point-to-object/analysis");
    expect(await page.evaluate(() => ({ secure: window.isSecureContext, sha256: Boolean(globalThis.crypto?.subtle) }))).toEqual({ secure: true, sha256: true });
    const widget = page.getByTestId("verification-export");
    await widget.locator("summary").click();
    await widget.getByTestId("verification-prepare").click();
    await expect(widget.getByTestId("verification-json")).toBeVisible();
    const before = JSON.parse(await widget.getByTestId("verification-json").inputValue());
    expect(before.records).toHaveLength(0);
    expect(before.preSubmit.status).toBe("current_ui_intent_not_yet_submitted");
    expect(before.preSubmit.sourceSnapshot.context.evidenceReceipt).toEqual(selection.resolvedObject.evidenceReceipt);
    expect(posts).toBe(0); expect(challenges).toBe(0);
    await page.getByRole("button", { name: locale === "en" ? "Run focused analysis" : "Запустить целевой анализ", exact: true }).click();
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await widget.getByTestId("verification-prepare").click();
    await expect.poll(async () => JSON.parse(await widget.getByTestId("verification-json").inputValue()).records.length).toBe(1);
    const bytes = await widget.getByTestId("verification-json").inputValue(); const bundle = JSON.parse(bytes);
    expect(bundle.preSubmit.intent).toEqual(submitted);
    expect(bundle.records[0].originalSubmissionIntent).toEqual(submitted);
    expect(bundle.records[0].response).toEqual(response);
    expect(bundle.records[0].response.telemetry.estimatedCostUsd).toBeNull();
    const sort = (value: unknown): unknown => Array.isArray(value) ? value.map(sort) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sort(v)])) : value;
    expect(bundle.records[0].payloadSha256).toBe(createHash("sha256").update(JSON.stringify(sort(submitted))).digest("hex"));
    expect(bytes).not.toContain('"challenge"'); expect(bytes).not.toContain('"cookie"'); expect(bytes).not.toContain('"headers"');
    const downloaded = page.waitForEvent("download"); await widget.getByTestId("verification-download").click();
    const file = await downloaded; expect(file.suggestedFilename()).toBe("geoai-preview-verification.json");
    expect(await readFile((await file.path())!, "utf8")).toBe(bytes);
    expect(posts).toBe(1); expect(challenges).toBe(1); expect(unexpected).toEqual([]); expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    for (const control of [widget.locator("summary"), widget.getByTestId("verification-prepare"), widget.getByTestId("verification-download")]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(widget.getByTestId("verification-json")).toHaveAttribute("readonly", "");
    await widget.getByTestId("verification-download").focus();
    await expect(widget.getByTestId("verification-download")).toBeFocused();
    const accessibility = await new AxeBuilder({ page }).include('[data-testid="verification-export"]').analyze();
    expect(accessibility.violations.filter(item => item.impact === "serious" || item.impact === "critical")).toEqual([]);
    await widget.screenshot({ path: info.outputPath(`verification-export-${locale}-${width}.png`) });
    await page.reload(); await page.getByTestId("verification-export").locator("summary").click();
    await page.getByTestId("verification-prepare").click();
    await expect(page.getByTestId("verification-json")).toBeVisible();
    const reopened = JSON.parse(await page.getByTestId("verification-json").inputValue());
    expect(reopened.records).toHaveLength(0); expect(posts).toBe(1); // No invented saved-request history.
  });
}

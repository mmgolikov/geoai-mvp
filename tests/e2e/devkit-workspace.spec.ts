import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { DevkitProject } from "../../src/lib/devkit/contracts";

// Controller/viewport checks only. These do not accept a complete P1, scene math,
// finance, kit or owner-switch race. Control owns the single integrated browser pass.
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

async function downloadSaved(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("devkit-project-export-json").click()
  ]);
  const path = await download.path();
  expect(path).not.toBeNull();
  return JSON.parse(await readFile(path!, "utf8")) as { format: string; schemaVersion: number; project: DevkitProject };
}

async function assertNoHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.viewport + 1);
}

async function openExamples(page: Page, locale: "en" | "ru") {
  if (!await page.getByTestId("devkit-example-positive").isVisible()) {
    await page.locator("summary").filter({ hasText: locale === "ru" ? "Явные синтетические примеры" : "Explicit synthetic examples" }).click();
  }
  await expect(page.getByTestId("devkit-example-positive")).toBeEnabled();
}

for (const locale of ["en", "ru"] as const) {
  for (const width of [1440, 390]) {
    test.describe(`E1 S1/N1/L1 controller ${locale} ${width}`, () => {
      test.use({ viewport: { width, height: 1000 } });
      test("explicit example, save/reopen/JSON transfer, failure and viewport boundaries", async ({ page, context, browser }, testInfo: TestInfo) => {
        const base = new URL(String(testInfo.project.use.baseURL));
        expect(LOOPBACK.has(base.hostname), "This spec is bounded to Control's local integrated runtime").toBe(true);
        await context.addCookies([{ name: "geoai_locale", value: locale, url: base.origin, sameSite: "Lax" }]);
        const externalOrigins = new Set<string>(), prohibitedEndpoints = new Set<string>(), pageErrors: string[] = [];
        const durations: Record<string, number> = {};
        page.on("pageerror", error => pageErrors.push(error.message));
        const installGuard = async (target: BrowserContext) => target.route("**/*", async route => {
          const url = new URL(route.request().url());
          if (["http:", "https:"].includes(url.protocol) && url.origin !== base.origin) {
            externalOrigins.add(url.origin); await route.abort("blockedbyclient"); return;
          }
          if (/^\/api\/prototype\/point-to-object\/(?:ai|create|resolve|source|context|area-context)(?:\/|$)/.test(url.pathname)) {
            prohibitedEndpoints.add(url.pathname);
            await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"QA_OFFLINE_BOUNDARY"}' }); return;
          }
          await route.continue();
        });
        await installGuard(context);
        let started = Date.now();
        await page.goto("/projects/development-kit", { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("devkit-workspace-client")).toBeVisible();
        await expect(page.getByTestId("devkit-workflow")).toHaveCount(0);
        durations.openWorkspaceMs = Date.now() - started;
        await openExamples(page, locale);
        await page.getByTestId("devkit-example-positive").click();
        const workflow = page.getByTestId("devkit-workflow");
        await expect(workflow).toBeVisible(); await expect(workflow).toHaveAttribute("lang", locale);
        await expect(workflow.getByText(locale === "ru" ? "Синтетический пример" : "Synthetic example", { exact: true })).toBeVisible();
        await expect(workflow.getByText(CAVEAT, { exact: true })).toBeVisible();
        const title = `QA ${locale} ${width} · ` + (locale === "ru" ? "Проверка сохранения и неизвестных данных " : "Preserved snapshot and unknown evidence ").repeat(3);
        const titleInput = workflow.getByLabel(locale === "ru" ? /^Название проекта/ : /^Project title/);
        const budget = workflow.getByLabel(locale === "ru" ? /^Бюджет проекта, если известен/ : /^Project budget, if known/);
        await expect(budget).toHaveValue("");
        started = Date.now(); await titleInput.fill(title);
        const save = workflow.getByRole("button", { name: locale === "ru" ? "Сохранить на устройстве" : "Save on device", exact: true });
        await expect(save).toBeDisabled(); await expect(page.getByTestId("devkit-project-select")).toBeDisabled();
        await workflow.getByTestId("devkit-brief-apply").click();
        await expect(workflow.getByRole("heading", { name: title, exact: true })).toBeVisible();
        durations.applyBriefMs = Date.now() - started;
        await assertNoHorizontalOverflow(page);
        for (const stage of ["evidence", "concepts", "finance", "kit", "brief"] as const) {
          await workflow.getByTestId(`devkit-stage-${stage}`).click();
          await expect(workflow.getByTestId(`devkit-stage-${stage}`)).toHaveAttribute("aria-current", "step");
          await assertNoHorizontalOverflow(page);
        }
        started = Date.now(); await save.click();
        await expect(page.getByTestId("devkit-project-export-json")).toBeEnabled();
        durations.saveOnDeviceMs = Date.now() - started;
        started = Date.now(); const exported = await downloadSaved(page);
        durations.exportSnapshotMs = Date.now() - started;
        expect(exported.format).toBe("GEOAI_DEVKIT_PROJECT"); expect(exported.schemaVersion).toBe(1);
        expect(exported.project.brief.title).toBe(title); expect(exported.project.brief.budget.amount).toBeNull();
        expect(exported.project.dataClass).toBe("synthetic_demo"); expect(exported.project.caveat).toBe(CAVEAT);
        expect(exported.project.storageMode).toBe("browser_local_on_this_device");
        expect(exported.project.designVersions.length).toBeGreaterThanOrEqual(2);
        const selectedId = exported.project.id;
        await page.getByTestId("devkit-project-import").setInputFiles({ name: "qa-malformed.json", mimeType: "application/json", buffer: Buffer.from("{malformed") });
        await expect(page.getByRole("alert").filter({ hasText: locale === "ru" ? "Некорректный файл проекта" : "Invalid project file" })).toBeVisible();
        await expect(page.getByTestId("devkit-project-select")).toHaveValue(selectedId);
        expect((await downloadSaved(page)).project).toEqual(exported.project);
        started = Date.now(); await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("devkit-project-select")).toBeEnabled();
        await page.getByTestId("devkit-project-select").selectOption(selectedId);
        await expect(page.getByTestId("devkit-workflow").getByRole("heading", { name: title, exact: true })).toBeVisible();
        durations.reloadAndReopenMs = Date.now() - started;
        expect((await downloadSaved(page)).project).toEqual(exported.project);
        const restoredContext = await browser.newContext({ baseURL: base.href, viewport: { width, height: 1000 }, ignoreHTTPSErrors: base.protocol === "https:", serviceWorkers: "block" });
        try {
          await restoredContext.addCookies([{ name: "geoai_locale", value: locale, url: base.origin, sameSite: "Lax" }]);
          await installGuard(restoredContext);
          const restoredPage = await restoredContext.newPage();
          restoredPage.on("pageerror", error => pageErrors.push(error.message));
          started = Date.now();
          await restoredPage.goto("/projects/development-kit", { waitUntil: "domcontentloaded" });
          await expect(restoredPage.getByTestId("devkit-project-import")).toBeEnabled();
          await expect(restoredPage.getByTestId("devkit-workflow")).toHaveCount(0);
          await restoredPage.getByTestId("devkit-project-import").setInputFiles({ name: "qa-public-snapshot.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
          await expect(restoredPage.getByTestId("devkit-project-select")).toHaveValue(selectedId);
          await expect(restoredPage.getByTestId("devkit-workflow").getByRole("heading", { name: title, exact: true })).toBeVisible();
          durations.importIntoFreshBrowserContextMs = Date.now() - started;
          expect((await downloadSaved(restoredPage)).project).toEqual(exported.project);
          await assertNoHorizontalOverflow(restoredPage);
          await testInfo.attach(`e1-restored-${locale}-${width}`, { body: await restoredPage.screenshot({ fullPage: true }), contentType: "image/png" });
        } finally { await restoredContext.close(); }
        await openExamples(page, locale); await page.getByTestId("devkit-example-critical").click();
        await page.getByTestId("devkit-stage-evidence").click();
        await expect(page.getByTestId("devkit-workflow").getByText("Critical site evidence unavailable", { exact: true })).toBeVisible();
        await expect(page.getByTestId("devkit-workflow").getByText(/unknown|unavailable|неизвестно|недоступно/i).first()).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await testInfo.attach(`e1-critical-${locale}-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
        await testInfo.attach("e1-controller-observations", { body: Buffer.from(JSON.stringify({
          locale, width, height: 1000, scope: "controller synthetic snapshot transfer only", projectId: selectedId,
          harnessDurationsMs: durations, exportBytes: Buffer.byteLength(JSON.stringify(exported)),
          externalOrigins: [...externalOrigins], prohibitedEndpoints: [...prohibitedEndpoints], pageErrors,
          limitations: "No P1 completion, source/live/paid/hosted/owner-race, scene/finance mathematics or reviewed kit acceptance; durations include automation waits, not p95/SLA."
        }, null, 2)), contentType: "application/json" });
        expect([...externalOrigins]).toEqual([]); expect([...prohibitedEndpoints]).toEqual([]); expect(pageErrors).toEqual([]);
      });
    });
  }
}

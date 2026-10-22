import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { DevelopmentKitBundle } from "../../src/lib/devkit/export";
import type { MonthlyFinanceResult } from "../../src/lib/devkit/finance";
import type { AreaScheduleResult } from "../../src/lib/devkit/areas";
import type { DevkitProject } from "../../src/lib/devkit/contracts";

// Controller/viewport checks only. These do not accept a complete P1, scene math,
// finance, kit or owner-switch race. Control owns the single integrated browser pass.
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const RU_CAVEAT = "Сценарная гипотеза. Требуется официальная проверка; не является правовым, кадастровым, градостроительным или оценочным заключением.";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

async function offlineGuard(target: BrowserContext, origin: string, external: Set<string>, prohibited: Set<string>) {
  await target.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      external.add(url.origin); await route.abort("blockedbyclient"); return;
    }
    if (/^\/api\/prototype\/point-to-object\/(?:ai|create|resolve|source|context|area-context)(?:\/|$)/.test(url.pathname)) {
      prohibited.add(url.pathname);
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"QA_OFFLINE_BOUNDARY"}' }); return;
    }
    await route.continue();
  });
}
function canonicalSnapshot(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSnapshot).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalSnapshot((value as Record<string, unknown>)[key])}`).join(",")}}`;
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") throw new Error("Non-JSON snapshot value");
  return encoded;
}
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

// Line/JUnit reporters retain attachment paths, while body-only success attachments are transient.
async function attachDurable(testInfo: TestInfo, name: string, body: Uint8Array, contentType: "image/png" | "application/json") {
  const fileName = `${name}.${contentType === "image/png" ? "png" : "json"}`;
  const path = testInfo.outputPath(fileName);
  await writeFile(path, body);
  await testInfo.attach(name, { path, contentType });
  const receiptPath = testInfo.outputPath(`${name}.sha256.json`);
  await writeFile(receiptPath, JSON.stringify({
    file: fileName, contentType, bytes: body.byteLength,
    sha256: createHash("sha256").update(body).digest("hex")
  }, null, 2) + "\n");
  await testInfo.attach(`${name}-sha256`, { path: receiptPath, contentType: "application/json" });
}
const latestScenario = (project: DevkitProject, scenarioId: string) => {
  const design = project.designVersions.filter(item => item.scenarioId === scenarioId).at(-1);
  expect(design).toBeDefined(); return design!;
};

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
        const installGuard = (target: BrowserContext) => offlineGuard(target, base.origin, externalOrigins, prohibitedEndpoints);
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
        const uiCaveat = workflow.locator(".dk-caveat");
        await expect(uiCaveat).toBeVisible();
        await expect(uiCaveat).toHaveText(locale === "ru" ? `${RU_CAVEAT} ${CAVEAT}` : CAVEAT);
        const rawTitle = `QA ${locale} ${width} · ` + (locale === "ru" ? "Проверка сохранения и неизвестных данных " : "Preserved snapshot and unknown evidence ").repeat(3);
        // Applying a brief explicitly trims outer whitespace; persisted content must match that normalized value.
        const title = rawTitle.trim();
        const titleInput = workflow.getByLabel(locale === "ru" ? /^Название проекта/ : /^Project title/);
        const budget = workflow.getByLabel(locale === "ru" ? /^Бюджет проекта, если известен/ : /^Project budget, if known/);
        await expect(budget).toHaveValue("");
        started = Date.now(); await titleInput.fill(rawTitle);
        await expect(titleInput).toHaveValue(rawTitle);
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
          await attachDurable(testInfo, `e1-restored-${locale}-${width}`, await restoredPage.screenshot({ fullPage: true }), "image/png");
        } finally { await restoredContext.close(); }
        await openExamples(page, locale); await page.getByTestId("devkit-example-critical").click();
        await page.getByTestId("devkit-stage-evidence").click();
        await expect(page.getByTestId("devkit-workflow").getByText("Critical site evidence unavailable", { exact: true })).toBeVisible();
        await expect(page.getByTestId("devkit-workflow").getByText(/unknown|unavailable|неизвестно|недоступно/i).first()).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await attachDurable(testInfo, `e1-critical-${locale}-${width}`, await page.screenshot({ fullPage: true }), "image/png");
        await attachDurable(testInfo, "e1-controller-observations", Buffer.from(JSON.stringify({
          locale, width, height: 1000, scope: "controller synthetic snapshot transfer only", projectId: selectedId,
          harnessDurationsMs: durations, exportBytes: Buffer.byteLength(JSON.stringify(exported)),
          externalOrigins: [...externalOrigins], prohibitedEndpoints: [...prohibitedEndpoints], pageErrors,
          limitations: "No P1 completion, source/live/paid/hosted/owner-race, scene/finance mathematics or reviewed kit acceptance; durations include automation waits, not p95/SLA."
        }, null, 2)), "application/json");
        expect([...externalOrigins]).toEqual([]); expect([...prohibitedEndpoints]).toEqual([]); expect(pageErrors).toEqual([]);
      });
    });
  }
}

// One connected first-slice P1. Partial draft is expected while planning/review/B-finance gaps remain.
test.describe("E1 connected P1 EN desktop", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });
  test("generated A/B to edited A, areas, monthly finance, saved kit and dirty refusal", async ({ page, context }, testInfo) => {
    const base = new URL(String(testInfo.project.use.baseURL));
    expect(LOOPBACK.has(base.hostname)).toBe(true);
    await context.addCookies([{ name: "geoai_locale", value: "en", url: base.origin, sameSite: "Lax" }]);
    const external = new Set<string>(), prohibited = new Set<string>(), pageErrors: string[] = [];
    await offlineGuard(context, base.origin, external, prohibited);
    page.on("pageerror", error => pageErrors.push(error.message));
    const elapsed: Record<string, number> = {};
    await page.goto("/projects/development-kit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("devkit-workspace-client")).toBeVisible();
    await openExamples(page, "en"); await page.getByTestId("devkit-example-positive").click();
    const workflow = page.getByTestId("devkit-workflow");
    await workflow.getByTestId("devkit-stage-concepts").click();
    // If a later fixture adds a critical gap, the test grants draft-only consent explicitly.
    const consent = workflow.locator('input[name="allowUnverifiedDraft"]');
    if (await consent.isVisible()) await consent.check();
    let started = Date.now();
    await workflow.getByRole("button", { name: "Generate A/B geometry", exact: true }).click();
    await expect(workflow.getByRole("combobox", { name: "Selected building", exact: true })).toBeVisible();
    elapsed.generatePairMs = Date.now() - started;
    const save = workflow.getByRole("button", { name: "Save on device", exact: true });
    await save.click(); await expect(page.getByTestId("devkit-project-export-json")).toBeEnabled();
    const baseline = (await downloadSaved(page)).project;
    const scenarioA = baseline.scenarios[0].id, scenarioB = baseline.scenarios[1].id;
    const baselineA = latestScenario(baseline, scenarioA), baselineB = latestScenario(baseline, scenarioB);
    expect(baselineA.buildings.length).toBeGreaterThan(0); expect(baselineB.buildings.length).toBeGreaterThan(0);
    expect(baselineA.scene).toBeDefined(); expect(baselineB.scene).toBeDefined();
    await workflow.getByRole("group", { name: "Concept variant", exact: true }).getByRole("button", { name: baseline.scenarios[0].label, exact: true }).click();
    const buildingId = await workflow.getByRole("combobox", { name: "Selected building", exact: true }).inputValue();
    const oldBuilding = baselineA.buildings.find(building => building.id === buildingId); expect(oldBuilding).toBeDefined();
    const oldFloors = oldBuilding!.levels; expect(oldFloors).not.toBeNull();
    await workflow.getByLabel("Total floors", { exact: true }).fill(String(oldFloors! + 1));
    await workflow.getByLabel("Top-floor terrace, %", { exact: true }).fill("20");
    started = Date.now(); await workflow.getByRole("button", { name: "Apply to building", exact: true }).click();
    await expect(workflow.getByLabel("Total floors", { exact: true })).toHaveValue(String(oldFloors! + 1));
    elapsed.editSelectedBuildingMs = Date.now() - started;
    await save.click(); const edited = (await downloadSaved(page)).project;
    const editedA = latestScenario(edited, scenarioA);
    expect(latestScenario(edited, scenarioB)).toEqual(baselineB);
    expect(edited.designVersions.find(d => d.id === baselineA.id && d.revision === baselineA.revision)).toEqual(baselineA);
    expect(editedA.id).not.toBe(baselineA.id); expect(editedA.revision).toBe(baselineA.revision + 1);
    expect(editedA.buildings.find(building => building.id === buildingId)?.levels).toBe(oldFloors! + 1);
    expect(editedA.buildings.filter(building => building.id !== buildingId)).toEqual(baselineA.buildings.filter(building => building.id !== buildingId));
    await workflow.getByTestId("devkit-stage-finance").click();
    await workflow.getByRole("button", { name: "Prepare area schedule", exact: true }).click();
    await expect(workflow.getByText("Added to the current project. Use workflow Save to persist on this device.", { exact: true })).toBeVisible();
    started = Date.now();
    await workflow.getByRole("button", { name: "Apply these synthetic assumptions and create 3 months", exact: true }).click();
    await expect(workflow.getByRole("heading", { name: "Monthly scenario finance", exact: true })).toBeVisible();
    elapsed.explicitSyntheticFinanceMs = Date.now() - started;
    await save.click(); const saved = (await downloadSaved(page)).project;
    const areas = saved.derivedArtifacts.filter(item => item.kind === "areas" && item.inputs.some(ref => ref.kind === "design" && ref.id === editedA.id && ref.revision === editedA.revision)).at(-1);
    expect(areas).toBeDefined();
    const finance = saved.derivedArtifacts.filter(item => item.kind === "finance" && item.inputs.some(ref => ref.kind === "areas" && ref.id === areas!.id && ref.revision === areas!.revision)).at(-1);
    expect(finance).toBeDefined();
    const areaData = areas!.data as unknown as AreaScheduleResult;
    const financeData = finance!.data as unknown as MonthlyFinanceResult;
    expect(areaData.input.design).toEqual({ kind: "design", id: editedA.id, revision: editedA.revision });
    expect(areaData.totals.registeredM2).toBeNull(); expect(areaData.totals.permittedGfaM2).toBeNull();
    expect(areaData.totals.terraceM2).toBeGreaterThan(0);
    expect(financeData.input.areaRef).toEqual({ kind: "areas", id: areas!.id, revision: areas!.revision });
    expect(financeData.areaCalculationVersion).toBe(areaData.version); expect(financeData.input.projectId).toBe(saved.id);
    expect(financeData.input.assumptions.provenance).toBe("synthetic"); expect(financeData.usableForDecision).toBe(false);
    expect(financeData.rows.map(row => row.projectCashFlow)).toEqual([-100, -100, 260]);
    expect(financeData.rows.map(row => row.equityCashFlow)).toEqual([-100, -50, 205]);
    expect(financeData.metrics.projectNpv).toBe(60); expect(financeData.metrics.equityNpv).toBe(55);
    expect(financeData.metrics.closingCash).toBe(0); expect(financeData.metrics.closingDebt).toBe(0);
    // Official area inputs are missing, while the saved calculation versions still match.
    const financeNavigationState = workflow.getByTestId("devkit-stage-finance").locator(".dk-stage-status");
    const financeSnapshotState = workflow.locator('.dk-definitions > dt:text-is("Finance") + dd');
    await expect(financeNavigationState).toHaveText("Needs inputs");
    await expect(financeSnapshotState).toHaveText("Needs inputs");
    await expect(workflow.locator('.dk-definitions > dt:text-is("Areas") + dd')).toHaveText("Needs inputs");
    await expect(workflow.getByText("Out of date", { exact: true })).toHaveCount(0);
    await workflow.getByTestId("devkit-stage-kit").click();
    await expect(page.getByTestId("devkit-export-prepare")).toBeEnabled();
    started = Date.now(); await page.getByTestId("devkit-export-prepare").click();
    const downloadLink = page.getByRole("link", { name: "Download entire kit · JSON", exact: true });
    await expect(downloadLink).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), downloadLink.click()]);
    const path = await download.path(); expect(path).not.toBeNull();
    const bytes = await readFile(path!, "utf8");
    const bundle = JSON.parse(bytes) as DevelopmentKitBundle;
    elapsed.prepareAndDownloadKitMs = Date.now() - started;
    expect(bundle.format).toBe("GEOAI_DEVKIT_BUNDLE"); expect(bundle.manifest.projectId).toBe(saved.id);
    expect(bundle.manifest.projectRevision).toBe(saved.revision); expect(bundle.manifest.inputRevision).toBe(saved.inputRevision);
    expect(bundle.manifest.snapshotHash).toBe(sha256(canonicalSnapshot(saved)));
    expect(bundle.manifest.review).toBe("not_performed"); expect(bundle.manifest.submission).toBe("not_submitted");
    expect(bundle.manifest.status).toBe("partial_draft"); expect(bundle.manifest.issues.length).toBeGreaterThan(0);
    expect(bundle.manifest.versions.designs).toContainEqual({ kind: "design", id: editedA.id, revision: editedA.revision });
    expect(bundle.manifest.versions.designs).toContainEqual({ kind: "design", id: baselineB.id, revision: baselineB.revision });
    for (const file of bundle.files) {
      expect(file.bytes, file.path).toBe(Buffer.byteLength(file.content, "utf8")); expect(file.sha256, file.path).toBe(sha256(file.content));
    }
    const reimportFile = bundle.files.find(file => file.path === "project.json"); expect(reimportFile).toBeDefined();
    expect(JSON.parse(reimportFile!.content).project).toEqual(saved);
    const oldKitHash = sha256(bytes);
    await attachDurable(testInfo, "connected-p1-saved-kit", Buffer.from(bytes), "application/json");
    await attachDurable(testInfo, "connected-p1-kit-screen", await page.screenshot({ fullPage: true }), "image/png");
    await workflow.getByTestId("devkit-stage-brief").click();
    await workflow.getByLabel(/^Project title/).fill("QA unapplied then unsaved edit after kit");
    await workflow.getByTestId("devkit-stage-kit").click();
    await expect(page.getByTestId("devkit-kit-save-gate")).toBeVisible();
    await expect(page.getByTestId("devkit-export-prepare")).toHaveCount(0); await expect(downloadLink).toHaveCount(0);
    await workflow.getByTestId("devkit-stage-brief").click(); await workflow.getByTestId("devkit-brief-apply").click();
    await workflow.getByTestId("devkit-stage-kit").click();
    await expect(page.getByTestId("devkit-kit-save-gate")).toBeVisible();
    await expect(page.getByTestId("devkit-export-prepare")).toHaveCount(0);
    // Applying the changed brief advances inputRevision; this is genuine stale derivation, not only an unsaved form.
    await expect(financeNavigationState).toHaveText("Out of date");
    await expect(financeSnapshotState).toHaveText("Out of date");
    expect(sha256(await readFile(path!, "utf8"))).toBe(oldKitHash);
    await attachDurable(testInfo, "connected-p1-observations", Buffer.from(JSON.stringify({
      projectId: saved.id, projectRevision: saved.revision, inputRevision: saved.inputRevision, designA: editedA.id,
      unchangedDesignB: baselineB.id, areaRef: areas!.id, financeRef: finance!.id, snapshotHash: bundle.manifest.snapshotHash,
      harnessDurationsMs: elapsed, external: [...external], prohibited: [...prohibited], pageErrors,
      boundary: "Synthetic connected technical slice; partial draft and official-validation gaps retained. No real-site, paid-model, professional, hosted or Production acceptance."
    }, null, 2)), "application/json");
    expect([...external]).toEqual([]); expect([...prohibited]).toEqual([]); expect(pageErrors).toEqual([]);
  });
});

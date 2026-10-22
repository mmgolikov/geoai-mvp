import { buildAreaSchedule } from "../../src/lib/devkit/areas";
import { runMonthlyFinance } from "../../src/lib/devkit/finance";
import type { DevkitExport, DerivedArtifact } from "../../src/lib/devkit/contracts";
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


// Additive FLOW V3 delta. Uses real UI files and independent contexts, never private storage/React.
// The existing config supplies branded Chrome and WebKit; all prior cases/timeouts/retries remain.
async function ruDownloadedJson<T = DevkitExport>(page: Page, trigger: () => Promise<unknown>, info: TestInfo, name: string) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  const path = await download.path();
  if (!path) throw new Error(`No real downloaded file for ${name}`);
  const bytes = await readFile(path);
  await attachDurable(info, name, bytes, "application/json");
  return { path, bytes, document: JSON.parse(bytes.toString("utf8")) as T };
}
async function ruSavedProject(page: Page, info: TestInfo, name: string) {
  // This is parent acceptance, not the child component's optimistic "added" notice.
  await expect(page.getByTestId("devkit-project-export-json")).toBeDisabled();
  await page.getByTestId("devkit-workflow").getByRole("button", { name: "Сохранить на устройстве", exact: true }).click();
  await expect(page.getByTestId("devkit-project-export-json")).toBeEnabled();
  const file = await ruDownloadedJson(page, () => page.getByTestId("devkit-project-export-json").click(), info, name);
  expect(file.document.format).toBe("GEOAI_DEVKIT_PROJECT");
  expect(file.document.project.storageMode).toBe("browser_local_on_this_device");
  expect(file.document.project.dataClass).toBe("synthetic_demo");
  expect(file.document.project.caveat).toBe(CAVEAT);
  expect(file.document.project.brief.budget.amount).toBeNull();
  return file;
}
async function ruReopenProject(page: Page, saved: DevkitExport, info: TestInfo, name: string) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("devkit-project-select")).toBeEnabled();
  await page.getByTestId("devkit-project-select").selectOption(saved.project.id);
  await page.getByTestId("devkit-workflow").getByRole("button", { name: "Открыть сохранённое", exact: true }).click();
  await expect(page.getByTestId("devkit-project-export-json")).toBeEnabled();
  const reopened = await ruDownloadedJson(page, () => page.getByTestId("devkit-project-export-json").click(), info, name);
  expect(canonicalSnapshot(reopened.document.project)).toBe(canonicalSnapshot(saved.project));
  await assertNoHorizontalOverflow(page);
}
function ruAreaFor(project: DevkitProject, designId: string) {
  const area = project.derivedArtifacts.filter(a => a.kind === "areas" && a.inputs.some(r => r.kind === "design" && r.id === designId)).at(-1);
  if (!area) throw new Error("Missing exact selected A area wrapper");
  return area;
}
function ruFinanceFor(project: DevkitProject, area: DerivedArtifact) {
  const finance = project.derivedArtifacts.filter(a => a.kind === "finance" && a.inputs.some(r => r.kind === "areas" && r.id === area.id && r.revision === area.revision)).at(-1);
  if (!finance) throw new Error("Missing exact selected A finance wrapper");
  return finance;
}
function ruAssertChain(project: DevkitProject, designId: string) {
  const design = project.designVersions.find(d => d.id === designId);
  if (!design) throw new Error("No selected canonical design");
  const area = ruAreaFor(project, designId), finance = ruFinanceFor(project, area);
  const areaData = area.data as unknown as AreaScheduleResult, financeData = finance.data as unknown as MonthlyFinanceResult;
  expect(area.status).toBe("current"); expect(finance.status).toBe("current");
  expect(area.inputs).toEqual([{ kind: "design", id: design.id, revision: design.revision }]);
  expect(areaData.input.design).toEqual(area.inputs[0]);
  expect(areaData.input.projectId).toBe(project.id); expect(areaData.input.inputRevision).toBe(project.inputRevision);
  expect(areaData.input.geometryVersion).toBe(design.scene?.geometryRevision);
  expect(areaData.totals.registeredM2).toBeNull(); expect(areaData.totals.permittedGfaM2).toBeNull();
  expect(finance.inputs).toEqual([{ kind: "areas", id: area.id, revision: area.revision }]);
  expect(financeData.input.areaRef).toEqual(finance.inputs[0]);
  expect(financeData.input.areaCalculationVersion).toBe(areaData.version);
  expect(financeData.input.projectId).toBe(project.id); expect(financeData.input.inputRevision).toBe(project.inputRevision);
  expect(financeData.geometryVersion).toBe(areaData.input.geometryVersion);
  expect(financeData.status).toBe("calculated"); expect(financeData.usableForDecision).toBe(false);
  return { area, finance, areaData, financeData };
}
function ruAssertHistory(before: DevkitProject, after: DevkitProject, scenarioB: string) {
  for (const design of before.designVersions) expect(after.designVersions.find(d => d.id === design.id && d.revision === design.revision)).toEqual(design);
  for (const artifact of before.derivedArtifacts) {
    const retained = after.derivedArtifacts.find(a => a.kind === artifact.kind && a.id === artifact.id && a.revision === artifact.revision);
    expect(retained).toBeDefined();
    // Wrapper status may become stale; original payload/inputs/method/history may not be rewritten.
    expect({ ...retained!, status: artifact.status }).toEqual(artifact);
  }
  expect(latestScenario(after, scenarioB)).toEqual(latestScenario(before, scenarioB));
}
async function ruNeedsInputs(page: Page) {
  const workflow = page.getByTestId("devkit-workflow");
  await expect(workflow.getByTestId("devkit-stage-finance").locator(".dk-stage-status")).toHaveText("Нужны данные");
  await expect(workflow.locator('.dk-definitions > dt:text-is("Площади") + dd')).toHaveText("Нужны данные");
  await expect(workflow.locator('.dk-definitions > dt:text-is("Экономика") + dd')).toHaveText("Нужны данные");
}
async function ruKit(page: Page, project: DevkitProject, info: TestInfo, name: string) {
  await page.getByTestId("devkit-stage-kit").click();
  await expect(page.getByTestId("devkit-export-prepare")).toBeEnabled();
  await page.getByTestId("devkit-export-prepare").click();
  const captured = await ruDownloadedJson<DevelopmentKitBundle>(page, () => page.getByRole("link", { name: "Скачать весь комплект · JSON", exact: true }).click(), info, `${name}-kit`);
  const bundle = captured.document;
  expect(bundle.format).toBe("GEOAI_DEVKIT_BUNDLE"); expect(bundle.manifest.snapshotHash).toBe(sha256(canonicalSnapshot(project)));
  expect(bundle.manifest.projectRevision).toBe(project.revision); expect(bundle.manifest.status).toBe("partial_draft");
  expect(bundle.manifest.review).toBe("not_performed"); expect(bundle.manifest.submission).toBe("not_submitted");
  for (const file of bundle.files) {
    expect(file.bytes, file.path).toBe(Buffer.byteLength(file.content)); expect(file.sha256, file.path).toBe(sha256(file.content));
  }
  const file = await ruDownloadedJson(page, () => page.getByRole("link", { name: "Проект для повторного импорта · JSON", exact: true }).click(), info, `${name}-project`);
  expect(file.document.format).toBe("GEOAI_DEVKIT_PROJECT"); expect(file.document.project).toEqual(project);
  expect(file.bytes.toString("utf8")).toBe(bundle.files.find(f => f.path === "project.json")?.content);
  await assertNoHorizontalOverflow(page);
  await attachDurable(info, `${name}-screen`, await page.screenshot({ fullPage: true }), "image/png");
  return { ...captured, bundle, projectFile: file };
}
async function ruOpenDetail(page: Page, summary: string, firstControl: ReturnType<Page["getByLabel"]>) {
  if (!await firstControl.isVisible()) await page.locator("summary").filter({ hasText: summary }).click();
  await expect(firstControl).toBeVisible();
}

test.describe("E1 RU390 generated revision/reimport delta", () => {
  test.use({ viewport: { width: 390, height: 1000 } });
  test("second finance/area saves, post-finance geometry and real-file import diagnostics", async ({ page, context, browser }, testInfo) => {
    const base = new URL(String(testInfo.project.use.baseURL));
    expect(LOOPBACK.has(base.hostname), "Keep this delta inside Control's existing loopback boundary").toBe(true);
    const external = new Set<string>(), prohibited = new Set<string>(), errors: string[] = [], checkpoints: string[] = [];
    const importOutcomes: { kind: string; disposition: string }[] = [];
    const install = async (target: BrowserContext) => {
      await target.addCookies([{ name: "geoai_locale", value: "ru", url: base.origin, sameSite: "Lax" }]);
      await offlineGuard(target, base.origin, external, prohibited);
      await target.route("**/api/prototype/point-to-object/**", async route => {
        prohibited.add(new URL(route.request().url()).pathname);
        await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"QA_OFFLINE_BOUNDARY"}' });
      });
      target.on("page", p => p.on("pageerror", error => errors.push(error.message)));
    };
    const fresh = async () => {
      const target = await browser.newContext({ baseURL: base.href, viewport: { width: 390, height: 1000 }, ignoreHTTPSErrors: base.protocol === "https:", serviceWorkers: "block" });
      try {
        await install(target); const p = await target.newPage();
        await p.goto("/projects/development-kit", { waitUntil: "domcontentloaded" });
        await expect(p.getByTestId("devkit-project-import")).toBeEnabled();
        await expect(p.getByTestId("devkit-workflow")).toHaveCount(0);
        return { target, page: p };
      } catch (error) { await target.close(); throw error; }
    };
    await install(context); page.on("pageerror", error => errors.push(error.message));
    let restored: BrowserContext | undefined;
    testInfo.annotations.push({ type: "coverage", description: "B economics NOT_TESTED; synthetic fixed units; no live/model/hosted/legal/professional/full E1 acceptance" });
    try {
      await page.goto("/projects/development-kit", { waitUntil: "domcontentloaded" });
      await openExamples(page, "ru"); await page.getByTestId("devkit-example-positive").click();
      const original = page.getByTestId("devkit-workflow");
      await expect(original).toHaveAttribute("lang", "ru");
      await expect(original.locator(".dk-caveat")).toHaveText(`${RU_CAVEAT} ${CAVEAT}`);
      await original.getByTestId("devkit-stage-concepts").click();
      const consent = original.locator('input[name="allowUnverifiedDraft"]');
      if (await consent.isVisible()) await consent.check();
      await original.getByRole("button", { name: "Создать геометрию A/B", exact: true }).click();
      await expect(original.getByRole("combobox", { name: "Выбранный корпус", exact: true })).toBeVisible();
      const generated = await ruSavedProject(page, testInfo, "ru-delta-generated");
      const scenarioA = generated.document.project.scenarios[0].id, scenarioB = generated.document.project.scenarios[1].id;
      const a0 = latestScenario(generated.document.project, scenarioA), b0 = latestScenario(generated.document.project, scenarioB);
      expect(a0.scene).toBeDefined(); expect(b0.scene).toBeDefined();
      expect(a0.buildings.length).toBeGreaterThan(0); expect(b0.buildings.length).toBeGreaterThan(0);
      await original.getByRole("group", { name: "Вариант концепции", exact: true }).getByRole("button", { name: generated.document.project.scenarios[0].label, exact: true }).click();
      await original.getByTestId("devkit-stage-finance").click();
      await original.getByRole("button", { name: "Подготовить ведомость площадей", exact: true }).click();
      await original.getByRole("button", { name: "Применить эти синтетические допущения и создать 3 месяца", exact: true }).click();
      const s0 = await ruSavedProject(page, testInfo, "ru-delta-S0");
      const chain0 = ruAssertChain(s0.document.project, a0.id); await ruNeedsInputs(page);
      await assertNoHorizontalOverflow(page);
      await attachDurable(testInfo, "ru-delta-S0-finance-screen", await page.screenshot({ fullPage: true }), "image/png");
      const k0 = await ruKit(page, s0.document.project, testInfo, "ru-delta-K0");
      const originalKitHash = sha256(k0.bytes.toString("utf8")); checkpoints.push("FR01-generated-RU390-S0-K0");

      const transferred = await fresh(); restored = transferred.target;
      const p = transferred.page, workflow = p.getByTestId("devkit-workflow");
      // Import actual downloaded project.json from K0, never the bundle or recreated fixture.
      await p.getByTestId("devkit-project-import").setInputFiles(k0.projectFile.path);
      await expect(p.getByTestId("devkit-project-select")).toHaveValue(s0.document.project.id);
      expect((await downloadSaved(p)).project).toEqual(s0.document.project);
      await ruReopenProject(p, s0.document, testInfo, "ru-delta-S0-reopened");
      await p.getByTestId("devkit-project-import").setInputFiles(k0.projectFile.path);
      await expect(p.getByRole("alert").filter({ hasText: "Конфликт сохранённой версии или ID" })).toBeVisible();
      expect((await downloadSaved(p)).project).toEqual(s0.document.project);
      checkpoints.push("FR02-FR03-real-file-reimport-reopen-same-ID-refusal");

      await workflow.getByTestId("devkit-stage-finance").click();
      const month = chain0.financeData.rows[2].month;
      const monthFields = workflow.getByRole("group", { name: month, exact: true });
      const receipts = monthFields.getByLabel("Свободные поступления покупателей", { exact: true });
      await ruOpenDetail(p, "Изменить ручные месячные входы", receipts);
      await receipts.fill(String(chain0.financeData.input.rows[2].unrestrictedIncome! + 1));
      await monthFields.getByLabel("Выплата equity", { exact: true }).fill(String(chain0.financeData.input.rows[2].equityDistribution! + 1));
      await workflow.getByRole("button", { name: "Сохранить изменённые месячные значения", exact: true }).click();
      const f2 = await ruSavedProject(p, testInfo, "ru-delta-second-finance");
      const chainF2 = ruAssertChain(f2.document.project, a0.id);
      expect(chainF2.finance.revision).toBe(chain0.finance.revision + 1);
      expect(f2.document.project.derivedArtifacts.find(a => a.id === chain0.finance.id && a.revision === chain0.finance.revision)?.status).toBe("stale");
      expect(chainF2.financeData.input.rows[2].unrestrictedIncome).toBe(chain0.financeData.input.rows[2].unrestrictedIncome! + 1);
      expect(chainF2.financeData.input.rows[2].equityDistribution).toBe(chain0.financeData.input.rows[2].equityDistribution! + 1);
      ruAssertHistory(s0.document.project, f2.document.project, scenarioB); await ruNeedsInputs(p);
      await assertNoHorizontalOverflow(p);
      await attachDurable(testInfo, "ru-delta-second-finance-screen", await p.screenshot({ fullPage: true }), "image/png");
      await ruReopenProject(p, f2.document, testInfo, "ru-delta-second-finance-reopened");
      await workflow.getByTestId("devkit-stage-finance").click();
      const firstBuilding = chainF2.areaData.buildings[0];
      const common = workflow.getByRole("group", { name: `${firstBuilding.id} · ${a0.buildings.find(b => b.id === firstBuilding.id)!.use}`, exact: true }).getByLabel("Общие зоны, м²", { exact: true });
      await ruOpenDetail(p, "1. Ручные распределения площадей", common);
      await common.fill(String(firstBuilding.commonM2! + 0.125));
      await workflow.getByRole("button", { name: "Подготовить ведомость площадей", exact: true }).click();
      const a2 = await ruSavedProject(p, testInfo, "ru-delta-second-area");
      const newArea = ruAreaFor(a2.document.project, a0.id);
      expect(newArea.revision).toBe(chainF2.area.revision + 1);
      expect(a2.document.project.derivedArtifacts.find(a => a.id === chainF2.area.id && a.revision === chainF2.area.revision)?.status).toBe("stale");
      expect(a2.document.project.derivedArtifacts.find(a => a.id === chainF2.finance.id && a.revision === chainF2.finance.revision)?.status).toBe("stale");
      expect((newArea.data as unknown as AreaScheduleResult).buildings[0].commonM2).toBe(firstBuilding.commonM2! + 0.125);
      ruAssertHistory(f2.document.project, a2.document.project, scenarioB);
      await expect(workflow.getByTestId("devkit-stage-finance").locator(".dk-stage-status")).toHaveText("Устарело");
      await assertNoHorizontalOverflow(p);
      await attachDurable(testInfo, "ru-delta-second-area-stale-screen", await p.screenshot({ fullPage: true }), "image/png");
      await ruReopenProject(p, a2.document, testInfo, "ru-delta-second-area-reopened");
      checkpoints.push("L05-L06-parent-acceptance-UI-save-reload-reopen");

      await workflow.getByTestId("devkit-stage-finance").click();
      // This explicit button deliberately reapplies the displayed fixed synthetic template.
      // The edited previous cash rows remain history; no silent area-based repricing is asserted.
      await workflow.getByRole("button", { name: "Применить эти синтетические допущения и создать 3 месяца", exact: true }).click();
      const beforeEdit = await ruSavedProject(p, testInfo, "ru-delta-current-before-geometry");
      const beforeChain = ruAssertChain(beforeEdit.document.project, a0.id); await ruNeedsInputs(p);
      await workflow.getByTestId("devkit-stage-concepts").click();
      const selected = workflow.getByRole("combobox", { name: "Выбранный корпус", exact: true });
      const buildingId = await selected.inputValue(), building = a0.buildings.find(b => b.id === buildingId);
      expect(building).toBeDefined(); expect(building!.retained).toBe(false); expect(building!.levels).not.toBeNull();
      await workflow.getByLabel("Всего этажей", { exact: true }).fill(String(building!.levels! + 1));
      await workflow.getByRole("button", { name: "Применить к корпусу", exact: true }).click();
      await expect(workflow.getByLabel("Всего этажей", { exact: true })).toHaveValue(String(building!.levels! + 1));
      await workflow.getByTestId("devkit-stage-kit").click();
      await expect(p.getByTestId("devkit-kit-save-gate")).toBeVisible();
      await expect(p.getByTestId("devkit-export-prepare")).toHaveCount(0);
      const s1 = await ruSavedProject(p, testInfo, "ru-delta-S1-post-finance-geometry");
      const changedA = latestScenario(s1.document.project, scenarioA);
      expect(changedA.id).not.toBe(a0.id); expect(changedA.scene?.parent).toEqual({ kind: "design", id: a0.id, revision: a0.revision });
      expect(changedA.buildings.find(b => b.id === buildingId)?.levels).toBe(building!.levels! + 1);
      expect(changedA.buildings.filter(b => b.id !== buildingId)).toEqual(a0.buildings.filter(b => b.id !== buildingId));
      ruAssertHistory(beforeEdit.document.project, s1.document.project, scenarioB);
      expect(s1.document.project.derivedArtifacts.filter(a => a.status === "current" && a.inputs.some(r => r.kind === "design" && r.id === changedA.id))).toEqual([]);
      expect(s1.document.project.derivedArtifacts.find(a => a.id === beforeChain.finance.id && a.revision === beforeChain.finance.revision)?.status).toBe("stale");
      await workflow.getByTestId("devkit-stage-finance").click();
      await expect(workflow.getByTestId("devkit-stage-finance").locator(".dk-stage-status")).not.toHaveText("Рассчитано");
      await expect(workflow.locator("p").filter({ hasText: /^Статус расчёта:\s*calculated/ })).toHaveCount(0);
      await attachDurable(testInfo, "ru-delta-S1-no-current-finance-screen", await p.screenshot({ fullPage: true }), "image/png");
      const k1 = await ruKit(p, s1.document.project, testInfo, "ru-delta-K1-diagnostic");
      expect(k1.bundle.manifest.issues.some(i => /STALE|MISSING|NOT_CURRENT|MISMATCH/.test(i.code))).toBe(true);
      checkpoints.push("FR04-FR05-post-finance-edit-dirty-refusal-saved-diagnostic");

      await workflow.getByTestId("devkit-stage-finance").click();
      await workflow.getByRole("button", { name: "Применить эти синтетические допущения и создать 3 месяца", exact: true }).click();
      const s2 = await ruSavedProject(p, testInfo, "ru-delta-S2-rebuilt");
      const rebuilt = ruAssertChain(s2.document.project, changedA.id); ruAssertHistory(s1.document.project, s2.document.project, scenarioB);
      expect(rebuilt.areaData.totals.aboveGroundGrossM2!).toBeGreaterThan(beforeChain.areaData.totals.aboveGroundGrossM2!);
      expect(rebuilt.financeData.input.rows).toEqual(beforeChain.financeData.input.rows);
      await ruNeedsInputs(p); const k2 = await ruKit(p, s2.document.project, testInfo, "ru-delta-K2-rebuilt");
      await ruReopenProject(p, s2.document, testInfo, "ru-delta-S2-reopened");
      expect(sha256(await readFile(k0.path, "utf8"))).toBe(originalKitHash);
      checkpoints.push("FR06-rebuilt-exact-chain-old-kit-unchanged-final-reopen");
      const finalTransfer = await fresh();
      try {
        const q = finalTransfer.page;
        // Repeat the real-file transfer after both ordinary revisions and the geometry rebuild:
        // S0's initial transfer alone would not prove persistence of the new artifact history.
        await q.getByTestId("devkit-project-import").setInputFiles(k2.projectFile.path);
        await expect(q.getByTestId("devkit-project-select")).toHaveValue(s2.document.project.id);
        expect((await downloadSaved(q)).project).toEqual(s2.document.project);
        await ruReopenProject(q, s2.document, testInfo, "ru-delta-S2-final-transfer-reopened");
        await q.getByTestId("devkit-stage-finance").click(); await ruNeedsInputs(q);
        await expect(q.getByTestId("devkit-workflow").locator("p").filter({ hasText: /^Статус расчёта:\s*calculated/ })).toBeVisible();
        await assertNoHorizontalOverflow(q);
        await attachDurable(testInfo, "ru-delta-S2-final-transfer-screen", await q.screenshot({ fullPage: true }), "image/png");
      } finally { await finalTransfer.target.close(); }
      checkpoints.push("post-revision-real-S2-project-file-fresh-import-reopen");

      // Deliberately inconsistent *test import files*. Recompute payloads in the test process
      // so a context-free math parser alone cannot stand in for the consuming UI guard.
      for (const kind of ["area-design", "finance-area"] as const) {
        const invalid = structuredClone(k2.projectFile.document), brokenArea = ruAreaFor(invalid.project, changedA.id), brokenFinance = ruFinanceFor(invalid.project, brokenArea);
        const areaData = brokenArea.data as unknown as AreaScheduleResult;
        const financeData = brokenFinance.data as unknown as MonthlyFinanceResult;
        if (kind === "area-design") {
          expect(areaData.input.design.revision).not.toBe(999);
          const nextAreas = buildAreaSchedule({ ...areaData.input, design: { ...areaData.input.design, revision: 999 } });
          brokenArea.data = JSON.parse(JSON.stringify(nextAreas));
          brokenFinance.data = JSON.parse(JSON.stringify(runMonthlyFinance({ ...financeData.input, areaCalculationVersion: nextAreas.version }, nextAreas)));
        } else {
          expect(financeData.input.areaRef.revision).not.toBe(999);
          brokenFinance.data = JSON.parse(JSON.stringify(runMonthlyFinance({ ...financeData.input, areaRef: { ...financeData.input.areaRef, revision: 999 } }, areaData)));
        }
        const invalidBytes = Buffer.from(JSON.stringify(invalid));
        await attachDurable(testInfo, `ru-delta-${kind}-explicit-test-import`, invalidBytes, "application/json");
        const isolated = await fresh();
        try {
          const q = isolated.page;
          await q.getByTestId("devkit-project-import").setInputFiles({ name: `qa-deliberate-${kind}-ref-conflict.json`, mimeType: "application/json", buffer: invalidBytes });
          const refusal = q.getByRole("alert").filter({ hasText: /Некорректный файл проекта|Снимок не прошёл проверку/ });
          await expect.poll(async () => await refusal.isVisible() || await q.getByTestId("devkit-project-select").inputValue() === invalid.project.id).toBe(true);
          if (await refusal.isVisible()) {
            await expect(q.getByTestId("devkit-workflow")).toHaveCount(0);
            importOutcomes.push({ kind, disposition: "refused-by-current-contract" });
          } else {
            const imported = await ruDownloadedJson(q, () => q.getByTestId("devkit-project-export-json").click(), testInfo, `ru-delta-${kind}-retained-diagnostic`);
            expect(imported.document.project).toEqual(invalid.project);
            await ruReopenProject(q, imported.document, testInfo, `ru-delta-${kind}-diagnostic-reopened`);
            const f = q.getByTestId("devkit-workflow"); await f.getByTestId("devkit-stage-finance").click();
            await expect(f.locator("p").filter({ hasText: /^Статус расчёта:\s*calculated/ })).toHaveCount(0);
            await expect(f.getByText("NPV проекта", { exact: true })).toHaveCount(0);
            if (kind === "area-design") await expect(f.getByRole("button", { name: "2. Создать месячный сценарий с неизвестными входами", exact: true })).toBeDisabled();
            const diagnostic = await ruKit(q, invalid.project, testInfo, `ru-delta-${kind}-diagnostic-export`);
            expect(diagnostic.bundle.manifest.issues.some(i => i.code === (kind === "area-design" ? "AREA_DESIGN_REFERENCE_MISMATCH" : "FINANCE_AREA_REFERENCE_MISMATCH"))).toBe(true);
            importOutcomes.push({ kind, disposition: "retained-diagnostic-partial-current-numbers-withheld" });
          }
          await assertNoHorizontalOverflow(q);
          await attachDurable(testInfo, `ru-delta-${kind}-import-screen`, await q.screenshot({ fullPage: true }), "image/png");
        } finally { await isolated.target.close(); }
      }
      checkpoints.push("L03-L04-explicit-file-import-current-number-withholding");
      expect([...external]).toEqual([]); expect([...prohibited]).toEqual([]); expect(errors).toEqual([]);
    } finally {
      await attachDurable(testInfo, "ru-delta-observations", Buffer.from(JSON.stringify({
        locale: "ru", width: 390, height: 1000, engineProject: testInfo.project.name, checkpoints, importOutcomes,
        external: [...external], prohibited: [...prohibited], pageErrors: errors, B_economics: "NOT_TESTED",
        boundary: "Connected synthetic UI delta; only listed checkpoints reached; current/source/official gaps retained. No live source, paid model, private storage/React, race, hosted, professional, legal or full E1/usefulness acceptance."
      }, null, 2)), "application/json");
      if (restored) await restored.close();
    }
  });
});

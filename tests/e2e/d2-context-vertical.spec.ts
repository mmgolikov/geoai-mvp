import { createHash } from "node:crypto";
import { expect, test, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  chooseD2ThroughSearch, expectD2TransportQuiet, installD2Transport, loadD2FixtureBundle,
  openD2Analysis, openD2Projects, publicD2Snapshot, type D2Bundle, type D2Case, type D2Locale, type D2Signals
} from "./helpers/d2-context-fixture";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

// Source-only authoring. Root alone executes this finite offline suite.
// No private storage seed/extraction, React/Map state injection, live provider,
// paid response, real U1-U4 usefulness or generated Create acceptance.
let bundles: Record<D2Locale, D2Bundle>;
test.beforeAll(() => {
  const deadline = Date.now() + 30_000;
  bundles = { en: loadD2FixtureBundle("en", deadline - Date.now()), ru: loadD2FixtureBundle("ru", deadline - Date.now()) };
  expect(bundles.ru.sourceHash).toBe(bundles.en.sourceHash);
  for (const en of bundles.en.cases) {
    const ru = bundles.ru.cases.find(item => item.key === en.key);
    expect(ru).toBeDefined();
    expect(ru!.sourceFeatureId).toBe(en.sourceFeatureId);
    expect(ru!.anchor).toEqual(en.anchor);
    expect(ru!.expectedIndependentStatus).toBe(en.expectedIndependentStatus);
    const enSource = en.envelope.subject.normalizedContext!.independentContext!;
    const ruSource = ru!.envelope.subject.normalizedContext!.independentContext!;
    expect(ruSource.status).toBe(enSource.status);
    expect(ruSource.snapshotHash).toBe(enSource.snapshotHash);
    expect(ruSource.places).toEqual(enSource.places);
    expect(ruSource.sampleSize).toBe(enSource.sampleSize);
    expect(ruSource.interiorSampleSize).toBe(enSource.interiorSampleSize);
  }
});
test.beforeEach(async ({ page, browserName }, info) => {
  requireLoopbackTestOrigin(info.project.use.baseURL);
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});
function fixture(key: D2Case["key"], locale: D2Locale = "en") {
  const item = bundles[locale].cases.find(value => value.key === key);
  if (!item) throw new Error("Missing bounded D2 fixture");
  return item;
}
async function intake(page: Page, baseURL: string, locale: "en" | "ru", width: number, key: D2Case["key"] = "u2", legacy = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  const item = fixture(key, locale);
  const signals = await installD2Transport(page, baseURL, item, legacy);
  await chooseD2ThroughSearch(page, item, locale);
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  // Completion is witnessed on ordinary rendered context, not private state.
  await openD2Analysis(page, locale);
  await expect(page.getByTestId("normalized-context-dashboard")).toBeVisible();
  return { item, signals };
}
async function runOfflineAnalysis(page: Page, locale: "en" | "ru") {
  await page.getByRole("button", { name: locale === "ru" ? "Запустить целевой анализ" : "Run focused analysis", exact: true }).click();
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
}
function publicObject(value: unknown, label: string): Record<string, unknown> {
  expect(value, label + " must exist as a public object").toBeTruthy();
  expect(typeof value, label + " object type").toBe("object");
  expect(Array.isArray(value), label + " must not be an array").toBe(false);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing public " + label);
  return value as Record<string, unknown>;
}
async function visibleSourceSnapshot(page: Page, item: D2Case, legacy = false) {
  const bundle = bundles[item.locale];
  const value = await publicD2Snapshot(page);
  expect(value.protocol).toBe("GEOAI_PREVIEW_VERIFICATION_V1");
  const current = publicObject(value.currentSelection, "current selection");
  expect(current).toMatchObject({ mode: "analyse", marketKey: "dubai", sourceFeatureId: item.sourceFeatureId,
    longitude: item.anchor[0], latitude: item.anchor[1] });
  const pre = publicObject(value.preSubmit, "pre-submit");
  expect(pre.operation).toBe("analyse");
  expect(["en", "ru"]).toContain(current.locale);
  expect(publicObject(pre.intent, "current intent").locale).toBe(current.locale);
  expect(publicObject(pre.intent, "current intent")).toMatchObject({ expectedSourceFeatureId: item.sourceFeatureId,
    longitude: item.anchor[0], latitude: item.anchor[1] });
  const context = publicObject(publicObject(pre.sourceSnapshot, "source snapshot").context, "source context");
  const expected = (legacy ? item.legacyEnvelope : item.envelope).subject;
  expect(context).toMatchObject({ name: expected.name, sourceFeatureId: item.sourceFeatureId,
    coordinateAssociation: "trusted_open_map_identity", evidenceReceipt: expected.evidenceReceipt });
  expect(publicObject(context.evidenceReceipt, "evidence receipt").lookupSourceFeatureId).toBe(item.sourceFeatureId);
  // Locale-only display swaps keep the original source lease; they do not
  // reinterpret an existing EN receipt as RU or trigger hidden refresh.
  expect(publicObject(context.evidenceReceipt, "evidence receipt").sourceLocale).toBe(item.sourceLocale);
  const normalized = publicObject(context.normalizedContext, "normalized context");
  expect(normalized).toMatchObject({ version: "POINT_OBJECT_NORMALIZED_CONTEXT_V1", subjectId: item.sourceFeatureId,
    scope: { kind: "point_radius", anchor: item.anchor.map(number => Number(number.toFixed(6))) } });
  if (legacy) {
    // V1 optional-field absence remains V1; export cannot fill D2 facts.
    expect(normalized.details).toBeUndefined();
    expect(normalized.independentContext).toBeUndefined();
  } else {
    const details = publicObject(normalized.details, "D2 context details");
    expect(details).toMatchObject({ version: "POINT_OBJECT_CONTEXT_DETAILS_V2", subjectId: item.sourceFeatureId,
      association: "selected_record", anchor: expected.normalizedContext!.scope.anchor });
    const independent = publicObject(normalized.independentContext, "independent context");
    expect(bundle.sourceHash).toBe("f55ad27098707b5a6efd1ee6d5bd7d8373cff9bd1eddd656207cf70cb15fe67d");
    expect(independent).toMatchObject({ version: "POINT_OBJECT_INDEPENDENT_CONTEXT_V1", subjectId: item.sourceFeatureId,
      snapshotHash: bundle.sourceHash, status: item.expectedIndependentStatus,
      anchor: expected.normalizedContext!.scope.anchor, sourceMode: "admitted_bundled_snapshot_not_live" });
    if (item.expectedIndependentStatus === "available") {
      const admitted = expected.normalizedContext!.independentContext!;
      expect(admitted.places.length).toBeGreaterThan(0);
      expect(admitted.places.some(place => place.sources.some(source => !!source.record_id))).toBe(true);
      // Full admitted records include GERS/provider record IDs and schema fields;
      // a stripped whitelist cannot satisfy source continuity.
      expect(independent.places).toEqual(admitted.places);
      expect(independent.sampleSize).toBe(admitted.sampleSize);
    } else {
      expect(independent.sampleSize).toBeNull();
      expect(independent.interiorSampleSize).toBeNull();
      expect(independent.places).toEqual([]);
      const coverage = publicObject(independent.spatialCoverage, "unknown-source spatial coverage");
      if (item.expectedIndependentStatus === "unsupported_scope") {
        expect(independent.caseId).toBeNull();
        expect(coverage.state).toBe("unsupported_scope");
      } else {
        expect(independent.caseId).toBe("U2");
        expect(coverage.state).toBe("full_circle_within_acquisition_extent");
        expect(details.independentEnrichment).toBe("not_admitted");
      }
    }
  }
  expect(normalized).toEqual(expected.normalizedContext);
  return context;
}
async function releaseHeldTransport(route: Route, json: unknown, info: TestInfo, kind: "ai" | "context") {
  let transportOutcome: "fulfilled" | "aborted_or_closed" = "fulfilled";
  try { await route.fulfill({ json }); }
  catch (error) {
    if (!/closed|cancel|abort|disposed|invalid interception id/i.test(String(error))) throw error;
    transportOutcome = "aborted_or_closed";
  }
  await info.attach("d2-" + kind + "-late-transport-outcome", { body: JSON.stringify({ transportOutcome,
    outcomeScope: "Playwright interception only; browser delivery not independently confirmed",
    deliveredLateResponseOwnership: transportOutcome === "aborted_or_closed" ? "BLOCKED_ABORTED_TRANSPORT" : "NOT_PROVEN_BY_FULFILL_ALONE",
    preservationCoverage: "Requires following last-valid/source/reopen assertions; separate from delivered late ownership" }),
    contentType: "application/json" });
}

type D2Place = NonNullable<NonNullable<D2Case["envelope"]["subject"]["normalizedContext"]>["independentContext"]>["places"][number];
async function nativeTarget44(control: Locator) {
  await expect(control).toBeVisible();
  expect(await control.evaluate(el => el.tagName)).toBe("BUTTON");
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  return box!;
}
function exactRecord(scope: Locator, testId: string, id: string) {
  return scope.locator('[data-testid="' + testId + '"][data-overture-id="' + id + '"]');
}
async function selectedSourceEvidence(independent: Locator, place: D2Place, index: number, locale: D2Locale, dates: Record<string, string>) {
  const plot = independent.getByTestId("independent-point-plot");
  const brief = exactRecord(independent, "independent-service-brief", place.id);
  const detail = exactRecord(independent, "independent-place-detail", place.id);
  await expect(brief).toHaveCount(1);
  await expect(brief).toHaveAttribute("data-record-index", String(index));
  await expect(brief).toContainText(place.name);
  await expect(brief).toContainText(place.address ?? (locale === "ru" ? "Адрес неизвестен" : "Address unknown"));
  await expect(brief).toContainText(place.distanceM.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 1 }));
  await expect(brief.getByTestId("independent-service-next-action")).toHaveCount(1);
  await expect(detail).toHaveCount(1);
  await expect(detail).toContainText(locale === "ru" ? "Доказательства записи #" + index : "Evidence for record #" + index);
  await expect(detail).toContainText(dates[String(place.providerUpdatedAt)]);
  await expect(plot).toHaveAttribute("data-map-view", "selected");
  const marker = exactRecord(plot, "independent-point-marker", place.id);
  await expect(plot.getByTestId("independent-point-marker")).toHaveCount(1);
  await expect(plot.getByTestId("independent-marker-cluster")).toHaveCount(0);
  await expect(marker).toHaveAttribute("data-record-index", String(index));
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await nativeTarget44(marker);
  await expect(plot.getByTestId("independent-origin")).toHaveCount(1);
  await expect(plot.getByTestId("independent-origin")).toBeVisible();
  await expect(independent.getByTestId("independent-map-legend")).toContainText(locale === "ru" ? "Исходная точка" : "Selected-object origin");
  await expect(independent.getByTestId("independent-map-legend")).toContainText("#" + index);
  const lineage = detail.getByTestId("independent-record-lineage");
  if (!await lineage.evaluate(el => el.hasAttribute("open"))) await lineage.locator(":scope > summary").click();
  await expect(lineage).toHaveAttribute("open", "");
  await expect(lineage).toContainText("GERS " + place.id + " · " + place.evidenceRef);
  await expect(lineage).toContainText("WGS84 [" + place.coordinates.join(", ") + "]");
  if (place.taxonomy.hierarchy.length) await expect(lineage).toContainText(place.taxonomy.hierarchy.join(" → "));
  await expect(lineage).toContainText(place.basic_category);
  await expect(lineage.locator("p").filter({ hasText: locale === "ru" ? "Confidence источника" : "Source confidence" })).toContainText(String(place.confidence));
  await expect(lineage.locator(":scope > p").first()).toContainText(locale === "ru" ? "неизвестны" : "unknown");
  for (const source of place.sources) {
    const provider = lineage.locator("p").filter({ hasText: source.provider }).filter({ hasText: source.record_id ?? source.resource });
    await expect(provider).toHaveCount(1);
    await expect(provider).toContainText(dates[String(source.update_time)]);
    await expect(provider).toContainText(source.license);
    if (source.property === "/properties/confidence") await expect(provider).toContainText(locale === "ru" ? "не физический источник" : "not physical source");
  }
}
async function exerciseSourceMarkers(page: Page, independent: Locator, item: D2Case, info: TestInfo) {
  const source = item.envelope.subject.normalizedContext!.independentContext!;
  expect(source.places.length).toBeGreaterThan(0);
  expect(source.places.length).toBeLessThanOrEqual(20);
  // Format pinned public timestamps with this browser's Intl implementation.
  // This pure calculation reads no application state and changes no DOM/storage.
  const dates = await page.evaluate(({ locale, values }) => Object.fromEntries(values.map(value => [String(value),
    value ? new Date(value).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
    }) : locale === "ru" ? "неизвестна" : "unknown"
  ])), { locale: item.locale, values: [...new Set(source.places.flatMap(place => [place.providerUpdatedAt, ...place.sources.map(record => record.update_time)]))] });
  const indexes = new Map(source.places.map((place, index) => [place.id, index + 1]));
  const plot = independent.getByTestId("independent-point-plot");
  const list = independent.getByTestId("independent-place-list");
  const rows = list.getByTestId("independent-place-select");
  const all = independent.getByRole("button", { name: item.locale === "ru" ? "Все" : "All", exact: true });
  const overview = independent.getByTestId("independent-map-overview");
  await all.click();
  await expect(plot).toHaveAttribute("data-map-view", "overview");
  await expect.poll(() => plot.evaluate(el => {
    const svg = el.querySelector("svg");
    return !!svg && Math.abs(svg.viewBox.baseVal.width - el.getBoundingClientRect().width) < 1;
  })).toBe(true); // Public SVG/box agreement after the bounded resize observer.
  await expect(rows).toHaveCount(source.places.length);
  const listState = () => rows.evaluateAll(elements => elements.map(el => ({ id: el.getAttribute("data-overture-id"), index: el.getAttribute("data-record-index") })));
  const expectedRows = source.places.map(place => ({ id: place.id, index: String(indexes.get(place.id)) }));
  expect(await listState()).toEqual(expectedRows);
  const controls = plot.locator('button[data-testid="independent-marker-cluster"], button[data-testid="independent-point-marker"]');
  const groups = await controls.evaluateAll(elements => elements.map(el => ({ kind: el.getAttribute("data-testid"),
    members: (el.getAttribute("data-member-ids") ?? "").split(","),
    indexes: (el.getAttribute("data-record-indexes") ?? "").split(","), size: el.getAttribute("data-cluster-size") })));
  expect(groups.length).toBeGreaterThan(0);
  expect(groups.some(group => group.members.length > 1)).toBe(true); // No vacuous cluster coverage.
  expect(groups.flatMap(group => group.members).sort()).toEqual(source.places.map(place => place.id).sort());
  const boxes = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    expect(group.size).toBe(String(group.members.length));
    expect(group.indexes).toEqual(group.members.map(id => String(indexes.get(id))));
    expect(group.members.map(id => indexes.get(id))).toEqual(group.members.map(id => indexes.get(id)).sort((a, b) => a! - b!));
    boxes.push(await nativeTarget44(controls.nth(i)));
  }
  // Public hit rectangles must not overlap. This observes rendered controls,
  // without copying the component's clustering implementation or moving points.
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
  }
  const pointerIds: string[] = [], keyboardIds: string[] = [];
  for (const group of groups) {
    await overview.click();
    await expect(plot).toHaveAttribute("data-map-view", "overview");
    if (group.members.length > 1) {
      const cluster = plot.locator('button[data-testid="independent-marker-cluster"][data-member-ids="' + group.members.join(",") + '"]');
      for (const action of ["pointer", "Enter", " "]) {
        await expect(cluster).toHaveAttribute("aria-expanded", "false");
        if (action === "pointer") await cluster.click();
        else { await cluster.focus(); await page.keyboard.press(action); await expect(cluster).toBeFocused(); }
        await expect(cluster).toHaveAttribute("aria-expanded", "true");
        await expect(cluster).toHaveAttribute("aria-pressed", "true");
        expect(await listState()).toEqual(group.members.map(id => ({ id, index: String(indexes.get(id)) })));
        await independent.getByTestId("independent-cluster-clear").click();
        expect(await listState()).toEqual(expectedRows);
      }
      await cluster.click();
    }
    for (const id of group.members) {
      const place = source.places.find(value => value.id === id)!;
      const row = exactRecord(list, "independent-place-select", id);
      await expect(row).toHaveAttribute("data-record-index", String(indexes.get(id)));
      await nativeTarget44(row);
      await row.click(); pointerIds.push(id);
      await expect(row).toHaveAttribute("aria-pressed", "true");
      await selectedSourceEvidence(independent, place, indexes.get(id)!, item.locale, dates);
      // Move to another actual listed source record first. Otherwise a broken
      // keyboard handler could pass by leaving the already-selected ID intact.
      const otherId = (group.members.length > 1 ? group.members : source.places.map(value => value.id)).find(value => value !== id);
      expect(otherId).toBeDefined();
      await exactRecord(list, "independent-place-select", otherId!).click();
      await expect(independent.getByTestId("independent-service-brief")).toHaveAttribute("data-overture-id", otherId!);
      await expect(row).toHaveAttribute("aria-pressed", "false");
      await row.focus(); await page.keyboard.press(indexes.get(id)! % 2 ? "Enter" : " ");
      await expect(row).toBeFocused(); keyboardIds.push(id);
      await selectedSourceEvidence(independent, place, indexes.get(id)!, item.locale, dates);
      await expect(exactRecord(plot, "independent-point-marker", id)).toHaveAttribute("data-selected-member-index", String(indexes.get(id)));
    }
    if (group.members.length > 1) {
      await overview.click();
      const cluster = plot.locator('button[data-testid="independent-marker-cluster"][data-member-ids="' + group.members.join(",") + '"]');
      await expect(cluster).toHaveAttribute("data-selected-member-index", String(indexes.get(group.members.at(-1)!)));
      await independent.getByTestId("independent-cluster-clear").click();
    }
  }
  await all.click();
  expect(await listState()).toEqual(expectedRows);
  expect([...pointerIds].sort()).toEqual(source.places.map(place => place.id).sort());
  expect([...keyboardIds].sort()).toEqual(source.places.map(place => place.id).sort());
  const categoryLabels: Record<D2Locale, Record<D2Place["group"], string>> = {
    en: { healthcare: "Healthcare records", education: "Education records", daily_services: "Daily services", transport: "Transport records", hospitality: "Hospitality", business: "Business services", civic_culture: "Civic & culture", other_service: "Other services" },
    ru: { healthcare: "Медицинские записи", education: "Образовательные записи", daily_services: "Повседневные сервисы", transport: "Транспортные записи", hospitality: "Гостиницы", business: "Деловые услуги", civic_culture: "Общественные и культурные", other_service: "Другие услуги" }
  };
  const categoryClearCoverage = [];
  for (const category of new Set(source.places.map(place => place.group))) {
    const categoryButton = independent.getByRole("button", { name: categoryLabels[item.locale][category], exact: true });
    await categoryButton.click();
    await expect(categoryButton).toHaveAttribute("aria-pressed", "true");
    const expectedCategory = expectedRows.filter(row => source.places.find(place => place.id === row.id)!.group === category);
    await expect.poll(listState).toEqual(expectedCategory);
    const categoryIds = await controls.evaluateAll(elements => elements.flatMap(el => (el.getAttribute("data-member-ids") ?? "").split(",")));
    expect(categoryIds.sort()).toEqual(expectedCategory.map(row => row.id).sort());
    const categoryClusters = plot.getByTestId("independent-marker-cluster");
    let coverage = "BLOCKED_NO_RENDERED_CATEGORY_CLUSTER";
    if (await categoryClusters.count()) {
      const categoryCluster = categoryClusters.first();
      await categoryCluster.click();
      await expect(categoryCluster).toHaveAttribute("aria-expanded", "true");
      await independent.getByTestId("independent-cluster-clear").click();
      await expect.poll(listState).toEqual(expectedCategory);
      await expect(categoryButton).toHaveAttribute("aria-pressed", "true");
      coverage = "REVEAL_AND_CLEAR_CURRENT_CATEGORY_ASSERTED";
    }
    categoryClearCoverage.push({ category, coverage });
  }
  await all.click();
  expect(await listState()).toEqual(expectedRows);
  await info.attach("d2-source-marker-access", { body: JSON.stringify({ sourceHash: bundles[item.locale].sourceHash,
    groups, hitRectangles: boxes, pointerIds, keyboardIds, indexesPreserved: expectedRows, categoryClearCoverage,
    scope: "Shown admitted source records only; visual distinction and origin pixels still need Root review" }), contentType: "application/json" });
  return dates;
}

async function analysisSetupNavigation(page: Page, item: D2Case, signals: D2Signals, width: number, info: TestInfo) {
  await page.locator("[data-point-object-header]").scrollIntoViewIfNeeded();
  const header = page.getByTestId("analysis-selected-header");
  const trigger = header.getByTestId("analysis-mobile-controls-trigger");
  const form = page.getByTestId("analysis-controls-form");
  const widget = page.getByTestId("verification-export");
  const summary = widget.locator(":scope > summary");
  await expect(header).toHaveCount(1); await expect(trigger).toHaveCount(1); await expect(form).toHaveCount(1);
  await expect(form).toHaveAttribute("tabindex", "-1");
  const formId = await form.getAttribute("id");
  expect(formId).toBeTruthy();
  await expect(trigger).toHaveAttribute("aria-controls", formId!);
  const labelledBy = await form.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();
  const label = form.locator('label[id="' + labelledBy + '"]');
  await expect(label).toBeVisible();
  const formName = (await label.innerText()).trim();
  expect(formName.length).toBeGreaterThan(0);
  const namedForm = page.getByRole("form", { name: formName, exact: true });
  await expect(namedForm).toHaveCount(1); await expect(namedForm).toHaveAttribute("id", formId!);
  await expect(widget).toHaveAttribute("data-mobile-layout", "compact");
  await expect(widget).toHaveJSProperty("open", false);
  expect(await summary.evaluate(el => el.tagName)).toBe("SUMMARY");
  const summaryBox = await summary.boundingBox();
  expect(summaryBox).not.toBeNull(); expect(summaryBox!.height).toBeGreaterThanOrEqual(44);
  if (width >= 640) {
    await expect(trigger).toBeHidden();
    await info.attach("d2-analysis-setup-navigation", { body: JSON.stringify({ locale: item.locale, width,
      layout: "desktop", mobileTrigger: "hidden", formId, compactAnalyseVerification: true }), contentType: "application/json" });
    return;
  }
  const box = await nativeTarget44(trigger);
  expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const requestState = form.getByTestId("analysis-request-state");
  const draftDepth = await requestState.getAttribute("data-draft-depth");
  expect(["quick", "standard", "deep"]).toContain(draftDepth);
  await expect(trigger).toHaveAttribute("data-draft-depth", draftDepth!);
  const activeDepth = form.locator("fieldset").getByRole("button", { pressed: true });
  await expect(activeDepth).toHaveCount(1);
  await expect(trigger).toContainText((item.locale === "ru" ? "Черновик" : "Draft") + " · " + (await activeDepth.innerText()).trim());
  const publicSetup = (value: Record<string, unknown>) => {
    const pre = publicObject(value.preSubmit, "setup pre-submit");
    publicObject(pre.intent, "setup current intent");
    publicObject(publicObject(pre.sourceSnapshot, "setup source snapshot").context, "setup source context");
    publicObject(value.currentSelection, "setup current selection");
    expect(Array.isArray(value.records)).toBe(true);
    return { preSubmit: pre, currentSelection: value.currentSelection, records: value.records };
  };
  const draftUi = () => form.evaluate(el => ({
    question: el.querySelector<HTMLTextAreaElement>("#analysis-follow-up")!.value,
    state: Object.fromEntries([...el.querySelector('[data-testid="analysis-request-state"]')!.attributes]
      .filter(attribute => attribute.name.startsWith("data-")).map(attribute => [attribute.name, attribute.value])),
    choices: [...el.querySelectorAll("button[aria-pressed]")].map(button => ({ text: button.textContent, pressed: button.getAttribute("aria-pressed") }))
  }));
  const sourceBefore = await visibleSourceSnapshot(page, item);
  const before = publicSetup(JSON.parse(await widget.getByTestId("verification-json").inputValue()) as Record<string, unknown>);
  const draftBefore = await draftUi();
  const resultBefore = await page.getByTestId("ai-success").allTextContents();
  const counts = { context: signals.contextPosts.length, ai: signals.aiPosts.length, challenges: signals.challenges };
  for (const activation of ["pointer", "Enter"]) {
    if (await widget.evaluate(el => el.hasAttribute("open"))) await summary.click();
    await page.locator("[data-point-object-header]").scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible();
    if (activation === "pointer") await trigger.click();
    else { await trigger.focus(); await page.keyboard.press("Enter"); }
    await expect(namedForm).toBeFocused(); await expect(form).toHaveAttribute("id", formId!);
    const labelBox = await label.boundingBox();
    expect(labelBox).not.toBeNull(); expect(labelBox!.y).toBeGreaterThanOrEqual(0);
    expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(await draftUi()).toEqual(draftBefore);
    expect(await page.getByTestId("ai-success").allTextContents()).toEqual(resultBefore);
    expect(publicSetup(await publicD2Snapshot(page))).toEqual(before);
    await expect(widget.getByTestId("verification-prepare")).toBeVisible();
    await expect(widget.getByTestId("verification-download")).toBeVisible();
    expect(signals.contextPosts).toHaveLength(counts.context); expect(signals.aiPosts).toHaveLength(counts.ai);
    expect(signals.challenges).toBe(counts.challenges);
  }
  expect(await visibleSourceSnapshot(page, item)).toEqual(sourceBefore);
  await summary.click(); await expect(widget).toHaveJSProperty("open", false);
  await page.locator("[data-point-object-header]").scrollIntoViewIfNeeded();
  await info.attach("d2-analysis-setup-navigation", { body: JSON.stringify({ locale: item.locale, width,
    layout: "mobile", formId, draftDepth, firstViewportTarget: box, pointerAndKeyboardSameForm: true,
    unchangedCounts: counts, draftResultSourceAndPublicRecordsPreserved: true,
    scope: "Public DOM + ordinary Verification export only; download control visible, no download acceptance claimed" }), contentType: "application/json" });
}

for (const locale of ["en", "ru"] as const) for (const width of [1440, 390]) {
  test("D2 ordinary intake→actual envelope→linked evidence→save/reopen " + locale + " " + width, async ({ page }, info) => {
    const { item, signals } = await intake(page, info.project.use.baseURL!, locale, width);
    const bundle = bundles[locale];
    const dashboard = page.getByTestId("normalized-context-dashboard");
    await analysisSetupNavigation(page, item, signals, width, info);
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "true");
    const breakdown = dashboard.getByTestId("context-sample-breakdown");
    await expect(breakdown).toHaveJSProperty("open", false);
    await expect(breakdown.locator('article[data-testid^="context-"]')).toHaveCount(5);
    await expect(dashboard.getByText("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.", { exact: true })).toHaveCount(1);
    await page.locator("[data-point-object-header]").scrollIntoViewIfNeeded();
    const firstViewportScreenshot = "d2-first-viewport-" + locale + "-" + width + ".png";
    await page.screenshot({ path: info.outputPath(firstViewportScreenshot), fullPage: false });
    const height = dashboard.getByTestId("context-physical-height");
    await height.focus(); await page.keyboard.press("Enter");
    await expect(height).toHaveAttribute("aria-pressed", "true");
    await expect(dashboard.getByTestId("context-linked-map")).toHaveAttribute("open", "");
    await expect(dashboard.getByTestId("context-source-boundary")).toBeVisible();
    await expect(dashboard.getByTestId("context-selected-detail")).toBeVisible();
    const independent = dashboard.getByTestId("independent-source-context");
    await expect(independent).toHaveAttribute("data-source-status", "available");
    const source = item.envelope.subject.normalizedContext!.independentContext!;
    const binsina = source.places.find(p => p.name === "BinSina Pharmacy");
    if (!binsina) throw new Error("Actual admitted BinSina source row required");
    const dates = await exerciseSourceMarkers(page, independent, item, info);
    const listButton = exactRecord(independent.getByTestId("independent-place-list"), "independent-place-select", binsina.id);
    await listButton.click();
    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await selectedSourceEvidence(independent, binsina, source.places.indexOf(binsina) + 1, locale, dates);
    const overview = independent.getByTestId("independent-map-overview");
    const focus = independent.getByTestId("independent-map-focus");
    await nativeTarget44(overview); await nativeTarget44(focus);
    for (const activation of ["pointer", "Enter"]) {
      await overview.click();
      await expect(independent.getByTestId("independent-point-plot")).toHaveAttribute("data-map-view", "overview");
      await expect(focus).toHaveAttribute("aria-pressed", "false");
      if (activation === "pointer") await focus.click();
      else { await focus.focus(); await page.keyboard.press("Enter"); await expect(focus).toBeFocused(); }
      await expect(focus).toHaveAttribute("aria-pressed", "true");
      await selectedSourceEvidence(independent, binsina, source.places.indexOf(binsina) + 1, locale, dates);
      await expect(independent.getByTestId("independent-place-list").getByTestId("independent-place-select")).toHaveCount(source.places.length);
    }
    const mapPoint = exactRecord(independent.getByTestId("independent-point-plot"), "independent-point-marker", binsina.id);
    await mapPoint.click();
    await mapPoint.focus(); await page.keyboard.press(" ");
    await expect(mapPoint).toBeFocused();
    await expect(mapPoint).toHaveAttribute("aria-pressed", "true");
    await selectedSourceEvidence(independent, binsina, source.places.indexOf(binsina) + 1, locale, dates);
    const focusedScreenshot = "d2-focus-selected-binsina-" + locale + "-" + width + ".png";
    await independent.screenshot({ path: info.outputPath(focusedScreenshot) });
    expect(signals.aiPosts).toHaveLength(0); // All drilldown is free.
    expect(signals.contextPosts).toHaveLength(1);
    const before = await visibleSourceSnapshot(page, item);
    await runOfflineAnalysis(page, locale);
    const posts = signals.aiPosts.length;
    const contextPosts = signals.contextPosts.length;
    // Save is automatic after completed Analyse; verify it through Projects UI.
    await openD2Projects(page, locale);
    await expect(page.getByTestId("hub-count-analyse").getByTestId("hub-count-value")).toHaveText("1");
    const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
    await expect(saved).toHaveCount(1);
    await saved.getByRole("button", { name: locale === "ru" ? "Открыть результат" : "Open result", exact: true }).click();
    await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
    await expect(page.getByTestId("ai-success")).toBeVisible();
    expect(await visibleSourceSnapshot(page, item)).toEqual(before);
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "true");
    const originalScreenshot = "d2-linked-context-" + locale + "-" + width + ".png";
    await dashboard.screenshot({ path: info.outputPath(originalScreenshot) });
    const switchedLocale = locale === "ru" ? "en" : "ru";
    const switchedButton = page.getByRole("button", { name: switchedLocale, exact: true });
    await switchedButton.click();
    await expect(switchedButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(dashboard.getByTestId("independent-source-context")).toContainText("BinSina Pharmacy");
    expect(await visibleSourceSnapshot(page, item)).toEqual(before);
    expect(signals.aiPosts).toHaveLength(posts);
    expect(signals.contextPosts).toHaveLength(contextPosts);
    const bounds = await dashboard.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth,
      page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    expect(bounds.page).toBeLessThanOrEqual(bounds.viewport + 1);
    for (const control of [height, listButton]) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const switchedScreenshot = "d2-linked-context-switched-" + switchedLocale + "-" + width + ".png";
    await dashboard.screenshot({ path: info.outputPath(switchedScreenshot) });
    await info.attach("d2-fixture-boundary", { body: JSON.stringify({ classification: bundle.classification, sourceHash: bundle.sourceHash,
      sourceFeatureId: item.sourceFeatureId, anchor: item.anchor, fixtureLocale: item.locale, sourceLocale: item.sourceLocale,
      contextPosts, aiPosts: posts, bounds,
      captures: [{ kind: "whole_first_viewport", locale, path: firstViewportScreenshot },
        { kind: "independent_focus_selected", locale, path: focusedScreenshot, overtureId: binsina.id,
          recordIndex: source.places.indexOf(binsina) + 1, mapView: "selected", captureScope: "independent-source-context" },
        { kind: "reopened_widget", locale, path: originalScreenshot }, { kind: "reopened_widget", locale: switchedLocale, path: switchedScreenshot }],
      realCaseUsefulness: "NOT_SCORED", noPrivateStorageIntake: true }), contentType: "application/json" });
    expectD2TransportQuiet(signals);
  });
}

test("D2 ordinary U1 intake uses its own exact anchor/source, not U2 POI substitution", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "u1");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
  expect(signals.contextPosts[0].expectedSourceFeatureId).toBe(item.sourceFeatureId);
  await visibleSourceSnapshot(page, item);
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

test("D2 ordinary coordinate drift >1m stays unsupported and unknown", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "outside_u2");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "unsupported_scope");
  await expect(page.getByTestId("independent-source-unknown")).toBeVisible();
  await expect(page.getByTestId("independent-service-brief")).toHaveCount(0);
  await expect(page.getByTestId("independent-source-context")).not.toContainText("BinSina Pharmacy");
  await visibleSourceSnapshot(page, item);
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

test("D2 valid OSM with actual unreadable independent snapshot remains unknown without AI", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "unavailable_u2");
  const independent = page.getByTestId("independent-source-context");
  await expect(independent).toHaveAttribute("data-source-status", "source_unavailable");
  await expect(independent.getByTestId("independent-source-unknown")).toContainText("Data is unknown, not zero");
  await expect(independent.getByTestId("independent-service-brief")).toHaveCount(0);
  await expect(independent.getByTestId("independent-place-select")).toHaveCount(0);
  await expect(independent).not.toContainText("BinSina Pharmacy");
  const context = await visibleSourceSnapshot(page, item);
  expect(publicObject(context.normalizedContext, "available OSM context").coverage).toBe("available");
  await expect(page.getByTestId("context-physical-height")).toBeVisible();
  expect(signals.aiPosts).toHaveLength(0);
  expect(signals.contextPosts).toHaveLength(1);
  await info.attach("d2-missing-independent-source-boundary", { body: JSON.stringify({
    producer: "Actual local source reader missing literal snapshot in fresh temporary cwd before cache fill",
    wholeHttpContextFailure: false, publicSourceStatus: "source_unavailable", sampleSize: null, interiorSampleSize: null,
    independentPlaces: [], realCaseUsefulness: "NOT_SCORED", paidCalls: 0, sourceNetworkCalls: 0 }), contentType: "application/json" });
  expectD2TransportQuiet(signals);
});

test("D2 V1 absence through normal context intake/save/reopen never gains current facts", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "u2", true);
  await expect(page.getByTestId("context-legacy-measurements")).toContainText("Saved V1");
  await expect(page.getByTestId("independent-source-context")).toHaveCount(0);
  const before = await visibleSourceSnapshot(page, item, true);
  await runOfflineAnalysis(page, "en");
  await openD2Projects(page, "en");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByTestId("context-legacy-measurements")).toBeVisible();
  expect(await visibleSourceSnapshot(page, item, true)).toEqual(before);
  expect(signals.contextPosts).toHaveLength(1); expect(signals.aiPosts).toHaveLength(1);
  expectD2TransportQuiet(signals);
});

test("D2 malformed source HTTP response rejects forged facts and supports explicit Retry", async ({ page }, info) => {
  const item = fixture("u2");
  const signals = await installD2Transport(page, info.project.use.baseURL!, item);
  signals.contextMode = "tamper_name";
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  const task = page.locator("#workspace-task");
  await expect(task.getByRole("alert")).toBeVisible();
  await expect(task).not.toContainText("FORGED SOURCE NAME");
  expect(signals.aiPosts).toHaveLength(0);
  signals.contextMode = "ok";
  await task.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => signals.contextPosts.length).toBe(2);
  await openD2Analysis(page, "en");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

for (const failure of ["transient_404", "source_error"] as const) {
  test("D2 ordinary context " + failure + " stays unknown until explicit Retry", async ({ page }, info) => {
    const item = fixture("u2");
    const signals = await installD2Transport(page, info.project.use.baseURL!, item);
    signals.contextMode = failure;
    await chooseD2ThroughSearch(page, item, "en");
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    const task = page.locator("#workspace-task");
    await expect(task.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("independent-source-context")).toHaveCount(0);
    expect(signals.aiPosts).toHaveLength(0);
    signals.contextMode = "ok";
    await task.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => signals.contextPosts.length).toBe(2);
    await openD2Analysis(page, "en");
    await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
    expect(signals.aiPosts).toHaveLength(0);
    expectD2TransportQuiet(signals);
  });
}

test("D2 last valid analysis survives failed refresh/cancel and late completion without implicit paid reopen", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440);
  await runOfflineAnalysis(page, "en");
  const before = await visibleSourceSnapshot(page, item);
  signals.aiMode = "error";
  await page.getByRole("button", { name: "Refresh analysis", exact: true }).click();
  const refreshError = page.getByRole("alert").filter({ hasText: "D2 offline refresh failure" });
  await expect(refreshError).toHaveCount(1);
  await expect(refreshError).toBeVisible();
  await expect(refreshError).toContainText("D2 offline refresh failure");
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  signals.aiMode = "hold";
  await page.getByRole("button", { name: "Refresh analysis", exact: true }).click();
  await expect.poll(() => signals.pendingAi !== null).toBe(true);
  await page.getByRole("button", { name: "Cancel analysis", exact: true }).click();
  const late = signals.pendingAi!;
  // An aborted transport qualifies cancellation preservation only. Fulfill
  // acceptance alone does not prove a delivered late-response ownership test.
  await releaseHeldTransport(late.route, late.response, info, "ai");
  signals.pendingAi = null;
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  await expect(page.getByText("D2 offline result 3", { exact: true })).toHaveCount(0);
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  const posts = signals.aiPosts.length;
  await openD2Projects(page, "en");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  expect(signals.aiPosts).toHaveLength(posts);
  expect(signals.contextPosts).toHaveLength(1);
  expectD2TransportQuiet(signals);
});

test("D2 leaving an in-flight context request preserves the saved source and does not pay on reopen", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440);
  await runOfflineAnalysis(page, "en");
  const before = await visibleSourceSnapshot(page, item);
  signals.contextMode = "hold";
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.pendingContext !== null).toBe(true);
  const late = signals.pendingContext!;
  // Distinct synthetic transport-lease metadata makes a late state write
  // observable. Actual route shape and admitted facts stay intact; this is
  // not a signed/new server lease or fresh physical observation claim.
  late.envelope.evidenceReceipt.evidencePackHash = "d".repeat(64);
  late.envelope.subject.evidenceReceipt!.evidencePackHash = "d".repeat(64);
  late.envelope.subject.normalizedContext!.independentContext!.cacheServedAt = new Date().toISOString();
  await openD2Projects(page, "en");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  await releaseHeldTransport(late.route, late.envelope, info, "context");
  signals.pendingContext = null;
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  expect(signals.aiPosts).toHaveLength(1);
  expect(signals.contextPosts).toHaveLength(2); // Both were explicit object selections.
  expectD2TransportQuiet(signals);
});

test("D2 licence is served by actual local HTTP with full admitted text, no mocked delivery", async ({ request }, info) => {
  const origin = requireLoopbackTestOrigin(info.project.use.baseURL).origin;
  const response = await request.get(origin + "/data/d2-overture/LICENSES.json", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const bytes = await response.body();
  expect(bytes.length).toBe(5013);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("19a262096d9bf69bd27a1aca479f317719e17f98ae71e3f736923c7e96ce7640");
  const licence = JSON.parse(bytes.toString("utf8"));
  expect(licence.subsetSha256).toBe(bundles.en.sourceHash);
  expect(licence.subsetSha256).toBe(bundles.ru.sourceHash);
  expect(createHash("sha256").update(licence.licenseText).digest("hex")).toBe("4531a67d443284d93ffed0803df5b10634aff21c3d77e381f2d48af01d875868");
  expect(licence.licenseText).toContain("2. Conditions for Sharing Data");
});

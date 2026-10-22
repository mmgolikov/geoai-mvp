import assert from "node:assert/strict";

/** Reuse the synthetic A/B project already constructed by the existing finance check.
 * No generation, bank/source/provider call, new B economics or market assumptions. */
export function runFinanceRevisionRegressions({ project, load, require, check: countCheck }) {
  const areas = load("src/lib/devkit/areas.ts");
  const finance = load("src/lib/devkit/finance.ts");
  const controller = load("components/devkit/finance-panel.tsx");
  const storeModule = load("src/lib/devkit/project-store.ts");
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const copy = structuredClone, equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let assertions = 0;
  const groups = [];
  const expect = (condition, name) => { assert.ok(condition, name); assertions++; countCheck?.(true, name); };
  const group = (id, body) => { const before = assertions; body(); groups.push({ id, status: "PASS", assertions: assertions - before }); };
  const now = () => new Date().toISOString();
  const original = JSON.stringify(project);
  const bId = project.scenarios[1].id;
  const bDesigns = p => p.designVersions.filter(d => d.scenarioId === bId);
  const sourceB = JSON.stringify(bDesigns(project));
  const bAreaCount = p => {
    const ids = new Set(bDesigns(p).map(d => d.id));
    return p.derivedArtifacts.filter(a => a.kind === "areas" && a.inputs.some(r => r.kind === "design" && ids.has(r.id))).length;
  };
  const bAreasBefore = bAreaCount(project);
  const current = p => {
    const design = p.designVersions.find(d => d.id === p.activeDesignVersionId);
    const area = p.derivedArtifacts.filter(a => a.kind === "areas" && a.inputs.some(r => r.kind === "design" && r.id === design.id && r.revision === design.revision)).at(-1);
    const run = p.derivedArtifacts.filter(a => a.kind === "finance" && a.inputs.some(r => r.kind === "areas" && r.id === area.id && r.revision === area.revision)).at(-1);
    return { design, area, run };
  };
  const source = current(project);
  expect(storeModule.parseDevkitProject(project) !== null, "Revision regression input is a valid synthetic saved project");
  const fixtureMemory = p => {
    const memory = new Map();
    const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
    const scope = "finance-revision-regression";
    const store = storeModule.createDevkitProjectStore(storage, scope);
    const first = store.save(copy(p), null);
    expect(first.ok, "Regression memory store accepts the initial project");
    return { store, first: first.value, reopen: () => storeModule.createDevkitProjectStore(storage, scope) };
  };
  const persist = (context, next) => {
    expect(storeModule.parseDevkitProject(next) !== null, "Second revision passes the real common parser");
    const saved = context.store.save(next, context.first.revision);
    expect(saved.ok, "Second revision passes real local store.save");
    const reopened = context.reopen().get(saved.value.id);
    expect(reopened.ok && equal(reopened.value, saved.value), "Fresh store instance reopens the saved project exactly");
    return saved.value;
  };
  const preserved = (before, after) => {
    expect(equal(before.designVersions, after.designVersions), "Finance/area action preserves complete canonical design history");
    expect(JSON.stringify(bDesigns(after)) === sourceB && bAreaCount(after) === bAreasBefore, "Unchanged B and its missing economics are preserved");
    for (const old of before.derivedArtifacts) {
      const kept = after.derivedArtifacts.find(a => a.kind === old.kind && a.id === old.id && a.revision === old.revision);
      expect(!!kept && equal({ ...kept, status: old.status }, old), "Historical artifact inputs/data are preserved; only freshness may change");
      if (old.status === "blocked" || old.status === "stale") expect(kept.status === old.status, "Old blocked/stale artifact is never promoted current");
    }
  };
  const renderedStatus = p => {
    const html = renderToStaticMarkup(React.createElement(controller.DevkitFinanceProjectPanel, { project: p, locale: "en" }));
    return html.match(/Calculation status:\s*<strong>([^<]+)<\/strong>/)?.[1] ?? "absent";
  };

  group("finance-second-save-reopen", () => {
    const context = fixtureMemory(project), { run } = current(context.first), input = copy(run.data.input);
    input.rows.at(-1).unrestrictedIncome += 1;
    input.rows.at(-1).equityDistribution += 1; // retained L05: arithmetic delta, not a new price assumption.
    const edited = controller.saveProjectMonthlyFinance(context.first, input, now());
    expect(edited.ok, "Ordinary monthly edit returns a candidate revision");
    const saved = persist(context, edited.project), latest = current(saved).run;
    expect(latest.revision === run.revision + 1 && latest.status === "current", "New finance revision is current and advances once");
    expect(saved.derivedArtifacts.find(a => a.id === run.id && a.revision === run.revision).status === "stale", "Previous finance revision becomes stale before persistence");
    preserved(context.first, saved);
  });
  group("area-second-save-reopen", () => {
    const context = fixtureMemory(project), { area, run } = current(context.first);
    const fields = ["belowGroundGrossM2", "commonM2", "technicalM2", "parkingM2", "otherNonSaleableM2", "residualUse", "terraceSaleableFactor", "registeredM2", "permittedGfaM2"];
    const allocations = Object.fromEntries(area.data.buildings.map(b => [b.id, Object.fromEntries(fields.map(k => [k, b[k]]))]));
    allocations[area.data.buildings[0].id].commonM2 += 0.125; // retained L06.
    const edited = controller.prepareProjectAreaSchedule(context.first, allocations, { createdAt: now() });
    expect(edited.ok, "Ordinary area reallocation returns a candidate revision");
    const saved = persist(context, edited.project), latest = current(saved).area;
    expect(latest.revision === area.revision + 1 && latest.status === "current", "New area revision advances once and stays current");
    expect(saved.derivedArtifacts.find(a => a.id === area.id && a.revision === area.revision).status === "stale", "Previous area revision is stale");
    expect(saved.derivedArtifacts.find(a => a.id === run.id && a.revision === run.revision).status === "stale", "Area edit invalidates the dependent finance revision");
    expect(latest.data.totals.registeredM2 === null && latest.data.totals.permittedGfaM2 === null, "Unknown registered/permitted totals stay null after save/reopen");
    preserved(context.first, saved);
  });
  group("inner-design-ref-conflict", () => {
    const bad = copy(project), target = current(bad).area, input = copy(target.data.input);
    input.design.revision = 999; // retained L03; outer ref is left unchanged.
    target.data = JSON.parse(JSON.stringify(areas.buildAreaSchedule(input)));
    const before = JSON.stringify(bad), funding = copy(source.run.data.input);
    funding.areaCalculationVersion = target.data.version;
    const edited = controller.saveProjectMonthlyFinance(bad, funding, now());
    expect(!edited.ok, "Finance action refuses conflicting inner/outer design revisions");
    expect(JSON.stringify(bad) === before, "Refused lineage update does not mutate input/history");
  });
  group("inner-area-ref-conflict", () => {
    const bad = copy(project), { area, run } = current(bad), input = copy(run.data.input);
    input.areaRef.revision = 999; // retained L04; wrapper still references the actual area.
    run.data = JSON.parse(JSON.stringify(finance.runMonthlyFinance(input, area.data)));
    const accepted = storeModule.parseDevkitProject(bad);
    expect(!accepted || renderedStatus(accepted) !== "calculated", "Conflicting finance/area refs are refused or never shown calculated");
  });
  group("unknown-store-roundtrip", () => {
    const context = fixtureMemory(project);
    const edited = controller.createProjectMonthlyScenario(context.first, { currency: "AED", startMonth: "2026-11", periods: 3, createdAt: now() });
    expect(edited.ok, "Manual unknown scenario can be created explicitly");
    const saved = persist(context, edited.project), run = current(saved).run;
    expect(run.status === "draft" && run.data.status === "partial", "Unknown scenario remains a draft/partial calculation");
    expect(run.data.input.rows.every(row => Object.values(row).every(value => value === null)), "All unknown monthly amounts survive store/reopen as null");
    expect(run.data.input.assumptions.openingDebt === null && run.data.input.assumptions.projectAnnualDiscountRate === null && run.data.metrics.projectNpv === null, "Unknown opening debt/rate/NPV are not invented0");
    preserved(context.first, saved);
  });
  for (const status of ["blocked", "stale"]) group(`${status}-never-promoted`, () => {
    const seeded = copy(project), { area, run } = current(seeded);
    if (status === "blocked") {
      const input = copy(run.data.input); input.rows[1].construction = -0.01; // retained invalid-input boundary.
      run.data = JSON.parse(JSON.stringify(finance.runMonthlyFinance(input, area.data)));
    } else { run.data.status = "stale"; run.data.financialMaturity = "F0"; }
    run.status = status;
    const context = fixtureMemory(seeded), read = context.reopen().get(context.first.id);
    expect(read.ok && current(read.value).run.status === status, "Store/reopen preserves blocked/stale metadata");
    expect(renderedStatus(read.value) !== "calculated", "Blocked/stale payload is not rendered as a current calculated result");
    const edited = controller.saveProjectMonthlyFinance(context.first, copy(source.run.data.input), now());
    expect(edited.ok, "Explicit new valid revision can follow historical blocked/stale data");
    const saved = persist(context, edited.project);
    expect(saved.derivedArtifacts.find(a => a.id === run.id && a.revision === run.revision).status === status, "Appending a valid revision does not promote the old blocked/stale artifact");
    preserved(context.first, saved);
  });
  expect(JSON.stringify(project) === original, "All regression groups leave their retained source project unchanged");
  return { groups, assertions, fixture: "retained synthetic A; B unchanged and no new B economics" };
}

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("Workflow checks are offline"); };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith(".css")) return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(specifier.slice(2) + ".ts", root).href, context);
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      for (const extension of [".ts", ".tsx"]) {
        const url = new URL(specifier + extension, context.parentURL);
        if (existsSync(fileURLToPath(url))) return next(url.href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(root.href) && url.endsWith(".tsx")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
      }).outputText };
    if (url.startsWith(root.href) && url.endsWith(".ts")) return { format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform" }) };
    return next(url, context);
  }
});
const groups = [];
function group(name, run) { run(); groups.push({ name, status: "PASS" }); }
try {
  const model = await import(new URL("components/devkit/workflow-model.tsx", root));
  const fixtures = await import(new URL("src/lib/devkit/fixtures.ts", root));
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { DevkitWorkflow } = await import(new URL("components/devkit/workflow.tsx", root));
  const make = fixtures.createDevkitDemoProject;
  const { createDevkitProjectStore } = await import(new URL("src/lib/devkit/project-store.ts", root));
  const now = "2026-10-22T15:00:00.000Z";
  const artifact = (kind, id, inputs) => ({ id, kind, revision: 1, inputRevision: 1, inputs,
    createdAt: now, status: "current", methodVersion: "synthetic-test-only-v1", assumptions: [], missingInputs: [], data: {} });
  function withOutputs() {
    const p = make();
    p.derivedArtifacts = [artifact("areas", "areas-a", [{ kind: "design", id: "design-a", revision: 1 }]),
      artifact("finance", "finance-a", [{ kind: "areas", id: "areas-a", revision: 1 }]),
      artifact("kit", "kit-a", [{ kind: "design", id: "design-a", revision: 1 }, { kind: "areas", id: "areas-a", revision: 1 }, { kind: "finance", id: "finance-a", revision: 1 }])];
    return p;
  }
  group("explicit synthetic fixture; AOI does not fabricate parcel", () => {
    const p = make();
    assert.equal(p.dataClass, "synthetic_demo");
    assert(p.aoi);
    assert.equal(p.objects.filter((o) => o.kind === "land_parcel").length, 0);
    assert.equal(model.activeWorkflowDesign(p).id, "design-a");
    assert.equal(model.latestWorkflowDesigns(p).length, 2);
  });
  group("critical source failure remains unknown / hold", () => {
    const p = fixtures.createDevkitCriticalGapProject();
    assert.equal(model.workflowCriticalGaps(p).length, 1);
    assert.equal(p.claims[0].value, null);
    assert.equal(p.evidence[0].status, "unavailable");
    assert.equal(p.evidence[0].validAt, null);
  });
  group("brief edit invalidates derivations and preserves old snapshot", () => {
    const p = withOutputs(), before = JSON.stringify(p);
    const result = model.applyWorkflowBrief(p, model.workflowScope(p), { ...p.brief, objective: "A changed decision" }, now);
    assert(result.ok);
    assert.equal(result.project.inputRevision, 2);
    assert.equal(result.project.revision, p.revision, "Save revision belongs to the store");
    assert(result.project.derivedArtifacts.every((a) => a.status === "stale"));
    assert(!model.isWorkflowDesignCurrent(result.project, result.project.designVersions[0]));
    assert.equal(JSON.stringify(p), before);
    assert.deepEqual(result.project.designVersions, p.designVersions, "Historical designs remain intact");
  });
  group("unknown budget stays null; explicit zero remains a value", () => {
    const p = make();
    const unchanged = model.applyWorkflowBrief(p, model.workflowScope(p), p.brief, now);
    assert(unchanged.ok);
    assert.equal(unchanged.project, p);
    const r = model.applyWorkflowBrief(p, model.workflowScope(p), { ...p.brief, budget: { ...p.brief.budget, amount: 0 } }, now);
    assert(r.ok);
    assert.equal(r.project.brief.budget.amount, 0);
    assert.equal(p.brief.budget.amount, null);
  });
  group("invalid brief / NaN / negative inputs refused", () => {
    const p = make();
    for (const amount of [NaN, Infinity, -1]) assert.equal(model.applyWorkflowBrief(p, model.workflowScope(p), { ...p.brief, budget: { ...p.brief.budget, amount } }, now).ok, false);
    assert.equal(model.applyWorkflowBrief(p, model.workflowScope(p), { ...p.brief, title: " " }, now).ok, false);
  });
  group("selected option changes without mutating either design", () => {
    const p = withOutputs(), before = JSON.stringify(p.designVersions);
    const r = model.selectWorkflowDesign(p, model.workflowScope(p), "design-b", now);
    assert(r.ok);
    assert.equal(r.project.activeDesignVersionId, "design-b");
    assert.equal(r.project.inputRevision, p.inputRevision);
    assert.equal(JSON.stringify(r.project.designVersions), before);
    assert.equal(p.activeDesignVersionId, "design-a");
    assert.equal(model.workflowArtifactForDesign(r.project, "finance"), null, "Never show A's finance for B");
  });
  group("cross-project, old revision and stale selection fail closed", () => {
    const p = make();
    for (const expected of [{ ...model.workflowScope(p), id: "another-project" }, { ...model.workflowScope(p), revision: 999 }, { ...model.workflowScope(p), inputRevision: 999 }]) {
      assert.equal(model.selectWorkflowDesign(p, expected, "design-a", now).ok, false);
      assert.equal(model.applyWorkflowBrief(p, expected, p.brief, now).ok, false);
    }
    assert.equal(model.selectWorkflowDesign(p, model.workflowScope(p), "foreign-design", now).ok, false);
    p.inputRevision++;
    assert.equal(model.selectWorkflowDesign(p, model.workflowScope(p), "design-a", now).ok, false);
  });
  group("exact transitive input versions; stale / missing / blocked retained", () => {
    const p = withOutputs();
    for (const a of p.derivedArtifacts) assert.equal(model.workflowArtifactState(p, a), "current");
    p.derivedArtifacts[0].inputs[0].revision = 9;
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "blocked", "Missing exact dependency is unavailable, not evidence of staleness");
    p.derivedArtifacts[0].inputs = [];
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "blocked");
    p.derivedArtifacts[0].status = "blocked";
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "blocked");
    assert.equal(model.workflowArtifactState(p, null), "missing");
  });
  group("matrix04 legal area gaps propagate needs-inputs, not stale finance", () => {
    const p = withOutputs();
    const areas = p.derivedArtifacts[0], finance = p.derivedArtifacts[1];
    areas.revision = 2;
    finance.inputs[0].revision = 2;
    p.derivedArtifacts[2].inputs.find((ref) => ref.kind === "areas").revision = 2;
    areas.missingInputs = [1, 2, 3, 4].flatMap((i) => [`building-${i}.registeredM2`, `building-${i}.permittedGfaM2`]);
    const before = JSON.stringify(p);
    assert.equal(areas.status, "current"); assert.equal(finance.status, "current");
    assert.equal(model.workflowArtifactForDesign(p, "areas"), areas);
    assert.equal(model.workflowArtifactForDesign(p, "finance"), finance);
    assert.equal(model.workflowArtifactState(p, areas), "blocked");
    assert.equal(model.workflowArtifactState(p, finance), "blocked");
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "blocked");
    for (const locale of ["en", "ru"]) {
      const html = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale, initialStage: "finance", onProjectChange() {} }));
      assert(html.includes(locale === "ru" ? "Нужны данные" : "Needs inputs"));
      assert(!html.includes(locale === "ru" ? "Устарело" : "Out of date"));
    }
    assert.equal(JSON.stringify(p), before, "All eight gaps and producer statuses remain unchanged");
  });
  group("missing, rejected and draft dependencies never become stale or current by propagation", () => {
    for (const dependency of ["missing", "blocked", "draft"]) {
      const p = withOutputs();
      if (dependency === "missing") p.derivedArtifacts[1].inputs[0].id = "area-ref-not-found";
      else p.derivedArtifacts[0].status = dependency;
      assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[1]), "blocked");
      assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "blocked");
    }
  });
  group("real input revisions and superseded parents remain stale despite gaps", () => {
    const inputChanged = withOutputs(); inputChanged.inputRevision++;
    assert.equal(model.workflowArtifactState(inputChanged, inputChanged.derivedArtifacts[1]), "stale");
    const p = withOutputs();
    p.derivedArtifacts[0].status = "blocked";
    p.derivedArtifacts[0].missingInputs = ["building-1.registeredM2"];
    p.derivedArtifacts.push({ ...structuredClone(p.derivedArtifacts[0]), revision: 2, status: "current" });
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "stale");
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[1]), "stale");
    const q = withOutputs();
    q.designVersions.push({ ...structuredClone(q.designVersions[0]), revision: 2 });
    assert.equal(model.workflowArtifactState(q, q.derivedArtifacts[1]), "stale");
  });
  group("cyclic dependency rejection stays blocked after state-preserving propagation", () => {
    const p = withOutputs();
    p.derivedArtifacts[0].inputs.push({ kind: "finance", id: p.derivedArtifacts[1].id, revision: 1 });
    for (const artifact of p.derivedArtifacts) assert.equal(model.workflowArtifactState(p, artifact), "blocked");
  });
  group("mixed option lineage cannot become a coherent current kit", () => {
    const p = withOutputs();
    p.derivedArtifacts[2].inputs[0] = { kind: "design", id: "design-b", revision: 1 };
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "blocked");
    p.derivedArtifacts[1].inputs.push({ kind: "design", id: "design-b", revision: 1 });
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[1]), "blocked");
  });
  group("superseded design and artifact revisions stay stale", () => {
    const p = withOutputs();
    p.designVersions.push({ ...structuredClone(p.designVersions[0]), revision: 2, createdAt: now });
    assert.equal(model.isWorkflowDesignCurrent(p, p.designVersions[0]), false);
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "stale");
    const q = withOutputs();
    q.derivedArtifacts.push({ ...structuredClone(q.derivedArtifacts[0]), revision: 2 });
    assert.equal(model.workflowArtifactState(q, q.derivedArtifacts[0]), "stale");
  });
  group("canonical appended scenario design supersedes seed or higher-numbered older ID", () => {
    const p = make();
    p.designVersions[0].revision = 8;
    const next = { ...structuredClone(p.designVersions[0]), id: "generated-a-first", revision: 1 };
    p.designVersions.push(next);
    assert.equal(model.latestWorkflowDesigns(p).find((d) => d.scenarioId === "A").id, next.id);
    assert.equal(model.isWorkflowDesignCurrent(p, p.designVersions[0]), false);
    assert.equal(model.isWorkflowDesignCurrent(p, next), true);
    const chosen = model.selectWorkflowDesign(p, model.workflowScope(p), next.id, now);
    assert(chosen.ok); assert.equal(model.activeWorkflowDesign(chosen.project).id, next.id);
  });
  group("external saved snapshot replaces clean cache; dirty or unapplied stays unchanged", () => {
    const p1 = make("workflow-cross-tab"); p1.revision = 1;
    const p2 = structuredClone(p1); p2.revision = 2; p2.inputRevision = 2; p2.brief.objective = "Externally saved decision";
    const before1 = JSON.stringify(p1), before2 = JSON.stringify(p2);
    const clean = model.reconcileWorkflowSnapshot(p1, p2, false, false);
    assert.equal(clean.status, "updated"); assert.equal(clean.project, p2); assert.equal(clean.project.revision, 2);
    for (const [dirty, pending] of [[true, false], [false, true]]) {
      const held = model.reconcileWorkflowSnapshot(p1, p2, dirty, pending);
      assert.equal(held.status, "conflict"); assert.equal(held.project, p1); assert.equal(held.project.revision, 1);
    }
    assert.equal(model.reconcileWorkflowSnapshot(p1, null, false, false).status, "conflict");
    assert.equal(JSON.stringify(p1), before1); assert.equal(JSON.stringify(p2), before2);
  });
  group("retained context requires its separate explicit consent", () => {
    assert.deepEqual(model.workflowTransferConsent(true, false), { publicInputConfirmed: true });
    assert.deepEqual(model.workflowTransferConsent(false, true), { publicInputConfirmed: false });
    assert.deepEqual(model.workflowTransferConsent(true, true), { publicInputConfirmed: true, includeRetainedContext: true });
  });
  group("claim scope keeps 400m separate from 800m", () => {
    const p = make();
    p.claims[0].scope = { kind: "radius", radiusM: 800, completeInventory: false };
    p.claims.push({ ...structuredClone(p.claims[0]), id: "claim-400", value: 0, status: "source_backed", evidenceIds: [p.evidence[0].id], unit: "source records", scope: { kind: "radius", radiusM: 400, completeInventory: false } });
    for (const locale of ["en", "ru"]) {
      const html = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale, initialStage: "evidence", onProjectChange() {} }));
      assert(html.includes("800 m")); assert(html.includes("400 m"));
      assert(html.includes(locale === "ru" ? "Неизвестно" : "Unknown"));
      assert(html.includes(locale === "ru" ? "не полный перечень" : "not a complete inventory"));
    }
  });
  group("missing inputs and reference cycles cannot become current", () => {
    const p = withOutputs();
    p.derivedArtifacts[0].missingInputs = ["method unknown"];
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "blocked");
    p.derivedArtifacts[0].missingInputs = [];
    p.derivedArtifacts[0].inputs.push({ kind: "kit", id: "kit-a", revision: 1 });
    assert.notEqual(model.workflowArtifactState(p, p.derivedArtifacts[0]), "current");
  });
  group("finite EN/RU commands reject arbitrary / prototype actions", () => {
    assert.deepEqual(model.parseWorkflowCommand("/open evidence"), { type: "open", stage: "evidence" });
    assert.deepEqual(model.parseWorkflowCommand("/открыть экономика"), { type: "open", stage: "finance" });
    assert.deepEqual(model.parseWorkflowCommand("/выбрать design-b"), { type: "select", designId: "design-b" });
    for (const text of ["DROP TABLE projects", "/pay 100", "/open constructor", "/open __proto__", "/open toString", "/open kit; fetch", "x".repeat(241)]) assert.equal(model.parseWorkflowCommand(text), null);
  });
  group("all five stages render EN/RU; critical unknown and caveat survive", () => {
    for (const locale of ["en", "ru"]) for (const initialStage of model.WORKFLOW_STAGES) {
      const p = fixtures.createDevkitCriticalGapProject();
      const html = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale, initialStage, onProjectChange() {} }));
      assert(html.includes(p.caveat));
      assert(html.includes(`lang="${locale}"`));
      assert(html.includes('data-testid="devkit-stage-kit"'));
      assert(html.includes('aria-current="step"'));
      assert(!html.includes("NaN"));
      if (initialStage === "evidence") assert(html.includes(locale === "ru" ? "Затронутое решение на hold" : "The affected decision is on hold"));
    }
  });
  group("kit requires matching store readback; revision alone cannot qualify a dirty draft", () => {
    const p = make(); p.revision = 3;
    const readback = structuredClone(p);
    assert.equal(model.matchWorkflowSavedSnapshot(p, readback, false, false), readback);
    assert.equal(model.matchWorkflowSavedSnapshot(p, readback, true, false), null);
    assert.equal(model.matchWorkflowSavedSnapshot(p, readback, false, true), null);
    const changed = structuredClone(p); changed.brief.title = "Unsaved change at saved revision 3";
    assert.equal(model.matchWorkflowSavedSnapshot(changed, readback, false, false), null);
    assert.equal(model.matchWorkflowSavedSnapshot(p, null, false, false), null);
    const gated = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: changed, locale: "en", initialStage: "kit", saveState: "saved", savedSnapshot: readback, onProjectChange() {}, slots: { kit: () => React.createElement("p", null, "MUST_NOT_RENDER") } }));
    assert(gated.includes("devkit-kit-save-gate")); assert(!gated.includes("MUST_NOT_RENDER"));
    const allowed = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale: "en", initialStage: "kit", saveState: "saved", savedSnapshot: readback, onProjectChange() {}, slots: { kit: (context) => React.createElement("p", null, context.savedSnapshot === readback ? "MATCHED_READBACK" : "WRONG") } }));
    assert(allowed.includes("MATCHED_READBACK"));
  });
  group("render escapes source/user content and disables unwired persistence", () => {
    const p = make();
    p.brief.title = '<script>alert("test")</script>';
    const html = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale: "en", onProjectChange() {} }));
    assert(html.includes("&lt;script&gt;"));
    assert(!html.includes('<script>alert("test")</script>'));
    assert(html.includes("disabled=\"\">Save on device"));
  });
  {
    const a = await model.workflowLocalScopeId("demo:synthetic-a"), b = await model.workflowLocalScopeId("demo:synthetic-b");
    assert.equal(a, await model.workflowLocalScopeId("demo:synthetic-a"));
    assert.notEqual(a, b);
    assert(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(a));
    assert(!a.includes("synthetic-a"));
    groups.push({ name: "stable local identity namespace without raw identity in key", status: "PASS" });
  }
  {
    const guard = model.createWorkflowOperationGuard();
    let release;
    const file = new Promise((resolve) => { release = resolve; });
    const token = guard.begin(); let writes = 0;
    const pending = file.then(() => { if (guard.isCurrent(token)) writes++; });
    guard.invalidate(); release("synthetic file"); await pending;
    assert.equal(writes, 0, "Late file result cannot write after context switch");
    const next = guard.begin(); assert(guard.isCurrent(next));
    assert(!guard.isCurrent(token)); guard.close(); assert(!guard.isCurrent(next));
    groups.push({ name: "late import guarded before writer; close invalidates identity work", status: "PASS" });
  }
  {
    let identity = "synthetic-owner-a", release;
    const guard = model.createWorkflowOperationGuard(() => identity === "synthetic-owner-a");
    const token = guard.begin(); let writes = 0;
    const pending = new Promise((resolve) => { release = resolve; }).then(() => { if (guard.isCurrent(token)) writes++; });
    identity = "synthetic-owner-b";
    release(); await pending;
    assert.equal(writes, 0, "Identity guard denies late write before passive unmount cleanup");
    assert(!guard.isCurrent(token));
    groups.push({ name: "identity switch denies late writer before React cleanup", status: "PASS" });
  }
  group("workflow brief-save-reopen uses store revision guard", () => {
    const raw = new Map();
    const storage = { getItem: (key) => raw.get(key) ?? null, setItem: (key, value) => raw.set(key, value) };
    const store = createDevkitProjectStore(storage, "workflow-test-save");
    const draft = make("workflow-test-project");
    assert.equal(draft.revision, 0);
    const first = store.save(draft, null);
    assert(first.ok); assert.equal(first.value.revision, 1);
    const edit = model.applyWorkflowBrief(first.value, model.workflowScope(first.value), { ...first.value.brief, objective: "New decision for the same project" }, now);
    assert(edit.ok);
    const second = store.save(edit.project, first.value.revision);
    assert(second.ok); assert.equal(second.value.revision, 2);
    const before = JSON.stringify([...raw]);
    const older = store.save(first.value, first.value.revision);
    assert.equal(older.ok, false); assert.equal(older.code, "conflict");
    assert.equal(JSON.stringify([...raw]), before);
    const reopened = store.get(draft.id); assert(reopened.ok);
    assert.equal(reopened.value.brief.objective, edit.project.brief.objective);
    assert.equal(reopened.value.brief.budget.amount, null);
  });
  group("local JSON roundtrip preserves scope and refuses old/invalid/colliding import", () => {
    const raw = new Map();
    const storage = { getItem: (key) => raw.get(key) ?? null, setItem: (key, value) => raw.set(key, value) };
    const source = createDevkitProjectStore(storage, "workflow-test-source"), target = createDevkitProjectStore(storage, "workflow-test-target");
    const p = make("workflow-test-roundtrip");
    p.claims[0].scope = { kind: "radius", radiusM: 800, completeInventory: false };
    p.evidence[0].provenance = { observedAt: null, fetchedAt: null, mode: "synthetic" };
    const saved = source.save(p, null); assert(saved.ok);
    const exported = source.exportProject(p.id); assert(exported.ok);
    const imported = target.importProject(exported.value); assert(imported.ok);
    assert.deepEqual(imported.value, saved.value);
    const before = JSON.stringify([...raw]);
    const old = JSON.parse(exported.value); old.schemaVersion = 0;
    for (const invalid of ["{", JSON.stringify(old), exported.value]) assert.equal(target.importProject(invalid).ok, false);
    assert.equal(JSON.stringify([...raw]), before);
    const empty = createDevkitProjectStore(storage, "workflow-test-third").list();
    assert(empty.ok); assert.equal(empty.value.length, 0);
  });
  assert.equal(networkCalls, 0);
  process.stdout.write(JSON.stringify({ check: "devkit-workflow", status: "PASS", groups, networkCalls,
    scope: "local contracts and server rendering only; browser/route/hosted acceptance separate" }, null, 2) + "\n");
} finally {
  hooks.deregister();
  globalThis.fetch = originalFetch;
}

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
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "stale");
    p.derivedArtifacts[0].inputs = [];
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "blocked");
    p.derivedArtifacts[0].status = "blocked";
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[0]), "blocked");
    assert.equal(model.workflowArtifactState(p, null), "missing");
  });
  group("mixed option lineage cannot become a coherent current kit", () => {
    const p = withOutputs();
    p.derivedArtifacts[2].inputs[0] = { kind: "design", id: "design-b", revision: 1 };
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[2]), "blocked");
    p.derivedArtifacts[1].inputs.push({ kind: "design", id: "design-b", revision: 1 });
    assert.equal(model.workflowArtifactState(p, p.derivedArtifacts[1]), "blocked");
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
  group("render escapes source/user content and disables unwired persistence", () => {
    const p = make();
    p.brief.title = '<script>alert("test")</script>';
    const html = renderToStaticMarkup(React.createElement(DevkitWorkflow, { project: p, locale: "en", onProjectChange() {} }));
    assert(html.includes("&lt;script&gt;"));
    assert(!html.includes('<script>alert("test")</script>'));
    assert(html.includes("disabled=\"\">Save on device"));
  });
  assert.equal(networkCalls, 0);
  process.stdout.write(JSON.stringify({ check: "devkit-workflow", status: "PASS", groups, networkCalls,
    scope: "local contracts and server rendering only; browser/route/hosted acceptance separate" }, null, 2) + "\n");
} finally {
  hooks.deregister();
  globalThis.fetch = originalFetch;
}

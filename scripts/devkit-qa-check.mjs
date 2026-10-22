// Independent E1 envelope/regression checks. No network, app build or browser.
// Passing these bounded checks is not complete E1, scene/finance or hosted acceptance.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("E1 QA forbids network requests"); };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(root.href) && url.endsWith(".ts")) return {
      format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url })
    };
    return next(url, context);
  }
});

const sourcePaths = [
  "src/lib/devkit/contracts.ts", "src/lib/devkit/fixtures.ts", "src/lib/devkit/project-store.ts",
  "src/lib/prototype/point-to-object-normalized-context.ts"
];
const missing = sourcePaths.filter(path => !existsSync(new URL(path, root)));
if (missing.length) {
  process.stdout.write(JSON.stringify({ result: "BLOCKED", scope: "offline_contract_checks_only", missing,
    acceptance: "NOT_ASSESSED", message: "Control must integrate the owned dependencies; QA does not copy or replace them." }) + "\n");
  process.exitCode = 1;
} else {
  const { DEVKIT_CAVEAT } = await import("../src/lib/devkit/contracts.ts");
  const { createDevkitDemoProject, createDevkitCriticalGapProject } = await import("../src/lib/devkit/fixtures.ts");
  const { parseDevkitProject, createDevkitProjectStore, devkitRefFreshness, reviseDevkitInputs } = await import("../src/lib/devkit/project-store.ts");
  const { normalizedResolvedContext, parseNormalizedPointObjectContext } = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
  const cases = [];
  const check = (id, run) => {
    try { run(); cases.push({ id, result: "PASS" }); }
    catch (error) { cases.push({ id, result: "FAIL", message: error instanceof Error ? error.message : String(error) }); }
  };
  const value = (result, message = "Expected a successful bounded local operation") => {
    assert.equal(result.ok, true, result.ok ? message : `${message}: ${result.code}`);
    return result.value;
  };
  const failure = (result, code) => { assert.equal(result.ok, false); if (code) assert.equal(result.code, code); };
  const memory = () => {
    const records = new Map();
    return { records, getItem: key => records.get(key) ?? null, setItem: (key, raw) => { records.set(key, raw); } };
  };
  const raw = storage => JSON.stringify([...storage.records]);
  const withChain = () => {
    const p = createDevkitDemoProject("qa-chain");
    const artifact = (kind, inputs) => ({ id: `qa-${kind}`, kind, revision: 1, inputRevision: 1,
      inputs, createdAt: p.createdAt, status: "current", methodVersion: "qa-reference-envelope-only-v1",
      assumptions: ["Reference-envelope sentinel, not accepted module mathematics"], missingInputs: [], data: { envelopeSentinel: true } });
    p.derivedArtifacts = [
      artifact("areas", [{ kind: "design", id: "design-a", revision: 1 }]),
      artifact("finance", [{ kind: "areas", id: "qa-areas", revision: 1 }]),
      artifact("kit", [{ kind: "design", id: "design-a", revision: 1 }, { kind: "areas", id: "qa-areas", revision: 1 }, { kind: "finance", id: "qa-finance", revision: 1 }])
    ];
    return p;
  };

  check("P1-seed-boundary-not-complete-positive-path", () => {
    const p = value({ ok: true, value: parseDevkitProject(createDevkitDemoProject("qa-seed")) });
    assert.ok(p); assert.equal(p.dataClass, "synthetic_demo"); assert.equal(p.aoi.provenance, "synthetic");
    assert.equal(p.brief.budget.amount, null); assert.equal(p.brief.budget.includesLand, null);
    assert.equal(p.claims.find(c => c.field === "permitted_development").status, "unknown");
    assert.equal(p.claims.find(c => c.field === "permitted_development").value, null);
    assert.equal(p.caveat, DEVKIT_CAVEAT); assert.equal(p.derivedArtifacts.length, 0);
    assert.equal(p.designVersions.length, 2); assert.ok(p.designVersions.every(d => d.buildings.length === 0 && d.status === "draft"));
    assert.notDeepEqual(p.designVersions[0].program, p.designVersions[1].program);
  });
  check("N1-critical-gap-survives-parse-without-synthetic-success", () => {
    const p = parseDevkitProject(createDevkitCriticalGapProject()); assert.ok(p);
    assert.equal(p.evidence[0].status, "unavailable"); assert.equal(p.evidence[0].trust, "unavailable");
    assert.equal(p.evidence[0].excerpt, null); assert.equal(p.evidence[0].acquiredAt, null);
    assert.equal(p.evidence[0].rights.permittedUse, "unknown"); assert.equal(p.constraints[0].severity, "critical");
    assert.equal(p.constraints[0].status, "unknown"); assert.equal(p.claims[0].value, null);
  });
  check("S1-clone-isolation-A-B-and-two-projects", () => {
    const first = createDevkitDemoProject("qa-first"), second = createDevkitDemoProject("qa-second");
    const parsed = parseDevkitProject(first); assert.ok(parsed);
    const b = structuredClone(parsed.designVersions[1]);
    parsed.designVersions[0].program.title = "QA edit A"; parsed.aoi.coordinates[0][0][0] += .00001;
    assert.deepEqual(parsed.designVersions[1], b);
    assert.notEqual(first.designVersions[0].program.title, "QA edit A");
    assert.notEqual(second.designVersions[0].program.title, "QA edit A");
    assert.notEqual(parsed.aoi.coordinates[0][0][0], first.aoi.coordinates[0][0][0]);
  });
  check("S1-preservation-delta-envelope-roundtrip-only", () => {
    const p = createDevkitDemoProject("qa-preservation");
    // These sentinels test lossless bounded JSON only. Create/evidence modules must validate their semantics.
    p.designVersions[0].scene = { format: "QA_ENVELOPE_SENTINEL", geometryRevision: 7, baseM: 12, terraces: [{ areaM2: 11, factor: null }], exclusions: ["qa-no-build"] };
    p.evidence[0].provenance = { observedAt: null, acquiredAt: p.createdAt, providerProducedAt: null, cacheReturnedAt: null, geometryScope: "aoi_interior" };
    p.claims[0].scope = { kind: "point_radius", radiusM: 400, comparisonRadiusM: 800, officialValidation: "required" };
    const storage = memory(), store = createDevkitProjectStore(storage, "qa-preserve");
    const saved = value(store.save(p, null));
    const reopened = value(createDevkitProjectStore(storage, "qa-preserve").get(p.id)); assert.deepEqual(reopened, saved);
    const exported = value(store.exportProject(p.id));
    const restored = value(createDevkitProjectStore(memory(), "qa-restored").importProject(exported));
    assert.deepEqual(restored, saved); assert.deepEqual(restored.designVersions[0].scene, p.designVersions[0].scene);
    assert.deepEqual(restored.evidence[0].provenance, p.evidence[0].provenance); assert.deepEqual(restored.claims[0].scope, p.claims[0].scope);
  });
  check("S1-optional-delta-malformed-values-rejected-without-getter-execution", () => {
    for (const field of ["scene", "provenance", "scope"]) {
      for (const bad of [null, [], undefined, { amount: Infinity }, { token: "SYNTHETIC_REJECT_SENTINEL" }]) {
        const p = createDevkitDemoProject();
        const row = field === "scene" ? p.designVersions[0] : field === "provenance" ? p.evidence[0] : p.claims[0];
        row[field] = bad; assert.equal(parseDevkitProject(p), null, `${field} must reject non-JSON/secret-shaped values`);
      }
    }
    let reads = 0; const p = createDevkitDemoProject();
    Object.defineProperty(p.designVersions[0], "scene", { enumerable: true, get() { reads++; return {}; } });
    assert.equal(parseDevkitProject(p), null); assert.equal(reads, 0);
  });
  check("S1-malformed-foreign-old-and-duplicate-import-preserve-existing-bytes", () => {
    const storage = memory(), store = createDevkitProjectStore(storage, "qa-import");
    const saved = value(store.save(createDevkitDemoProject("qa-existing"), null));
    const exported = value(store.exportProject(saved.id)); const before = raw(storage);
    const foreign = JSON.parse(exported); foreign.format = "FOREIGN_FORMAT";
    const old = JSON.parse(exported); old.schemaVersion = 0;
    for (const bad of ["{broken", JSON.stringify(foreign), JSON.stringify(old), exported]) {
      failure(store.importProject(bad)); assert.equal(raw(storage), before);
    }
    assert.deepEqual(value(store.get(saved.id)), saved);
  });
  check("S1-local-scope-and-unavailable-storage-never-cloud", () => {
    const storage = memory(); value(createDevkitProjectStore(storage, "qa-owner-one").save(createDevkitDemoProject("qa-private-synthetic"), null));
    assert.deepEqual(value(createDevkitProjectStore(storage, "qa-owner-two").list()), []);
    const before = raw(storage); failure(createDevkitProjectStore(null, "qa-owner-one").save(createDevkitDemoProject(), null), "storage_unavailable");
    assert.equal(raw(storage), before); assert.equal(createDevkitProjectStore(storage, "qa-owner-one").persistence, "browser_local_only");
  });
  check("S1-optimistic-conflict-and-in-place-history-edit-preserve-bytes", () => {
    const storage = memory(), store = createDevkitProjectStore(storage, "qa-conflict");
    const saved = value(store.save(createDevkitDemoProject("qa-conflict-project"), null)); const before = raw(storage);
    failure(store.save(structuredClone(saved), 0), "conflict"); assert.equal(raw(storage), before);
    const mutated = structuredClone(saved); mutated.designVersions[0].program.title = "In-place forbidden rewrite";
    failure(store.save(mutated, saved.revision), "conflict"); assert.equal(raw(storage), before);
  });
  check("S1-storage-write-failure-retains-last-valid-project", () => {
    const storage = memory(), store = createDevkitProjectStore(storage, "qa-quota");
    const saved = value(store.save(createDevkitDemoProject("qa-quota-project"), null)); const before = raw(storage);
    const quota = { getItem: storage.getItem, setItem() { throw new Error("Synthetic quota denial"); } };
    const revised = reviseDevkitInputs(saved, { brief: { ...saved.brief, title: "Changed brief" } });
    failure(createDevkitProjectStore(quota, "qa-quota").save(revised, saved.revision), "storage_unavailable");
    assert.equal(raw(storage), before); assert.deepEqual(value(store.get(saved.id)), saved);
  });
  check("K1-freshness-is-version-consistency-not-professional-acceptance", () => {
    const p = withChain(); assert.ok(parseDevkitProject(p));
    for (const kind of ["areas", "finance", "kit"]) assert.equal(devkitRefFreshness(p, { kind, id: `qa-${kind}`, revision: 1 }), "current");
    assert.equal(p.designVersions[0].status, "draft");
    assert.equal(devkitRefFreshness(p, { kind: "design", id: "absent", revision: 1 }), "missing");
    p.derivedArtifacts[0].status = "blocked";
    assert.equal(devkitRefFreshness(p, { kind: "kit", id: "qa-kit", revision: 1 }), "blocked");
  });
  check("K1-revised-input-invalidates-chain-retains-prior-snapshot", () => {
    const p = withChain(), before = structuredClone(p);
    const revised = reviseDevkitInputs(p, { brief: { ...p.brief, title: "Changed input assumption" } });
    assert.deepEqual(p, before); assert.equal(revised.inputRevision, p.inputRevision + 1);
    assert.deepEqual(revised.designVersions, p.designVersions);
    for (const kind of ["design", "areas", "finance", "kit"]) assert.equal(devkitRefFreshness(revised, { kind, id: kind === "design" ? "design-a" : `qa-${kind}`, revision: 1 }), "stale");
    assert.ok(revised.derivedArtifacts.every(a => a.status === "stale"));
  });
  check("V1-new-A-revision-keeps-B-current-and-old-A-readable", () => {
    const p = createDevkitDemoProject("qa-revisions"), oldA = structuredClone(p.designVersions[0]), oldB = structuredClone(p.designVersions[1]);
    p.designVersions.push({ ...structuredClone(oldA), revision: 2, label: "A revised", program: { ...structuredClone(oldA.program), blockCount: 2 } });
    assert.ok(parseDevkitProject(p)); assert.deepEqual(p.designVersions[0], oldA); assert.deepEqual(p.designVersions[1], oldB);
    assert.equal(devkitRefFreshness(p, { kind: "design", id: oldA.id, revision: 1 }), "stale");
    assert.equal(devkitRefFreshness(p, { kind: "design", id: oldA.id, revision: 2 }), "current");
    assert.equal(devkitRefFreshness(p, { kind: "design", id: oldB.id, revision: 1 }), "current");
  });
  check("V1-new-ID-same-scenario-revision-one-retires-seed-and-chain", () => {
    // Actual Create uses a content-derived new ID even when seed and first scene are revision1.
    // This checks envelope freshness only; generated geometry is checked separately.
    const p = withChain(), seed = structuredClone(p.designVersions[0]), b = structuredClone(p.designVersions[1]);
    const successor = { ...structuredClone(seed), id: "qa-generated-a-new-identity", label: "Generated A successor envelope",
      createdAt: new Date(Date.parse(seed.createdAt) + 1000).toISOString() };
    p.designVersions.push(successor); p.activeDesignVersionId = successor.id;
    assert.equal(devkitRefFreshness(p, { kind: "design", id: seed.id, revision: 1 }), "stale", "A different ID must not leave the old same-scenario seed current");
    assert.equal(devkitRefFreshness(p, { kind: "design", id: successor.id, revision: 1 }), "current");
    assert.equal(devkitRefFreshness(p, { kind: "design", id: b.id, revision: 1 }), "current");
    assert.equal(devkitRefFreshness(p, { kind: "kit", id: "qa-kit", revision: 1 }), "stale");
    assert.equal(parseDevkitProject(p), null, "Old-chain artifacts cannot continue declaring current");
    for (const artifact of p.derivedArtifacts) artifact.status = "stale";
    assert.ok(parseDevkitProject(p)); assert.deepEqual(p.designVersions[1], b); assert.deepEqual(p.designVersions[0], seed);
  });
  check("N1-orphan-and-unproven-source-backed-claim-reject", () => {
    const p = createDevkitDemoProject(); p.claims[0].subjectId = "nonexistent-subject";
    assert.equal(parseDevkitProject(p), null);
    const unsupported = createDevkitDemoProject(); unsupported.claims[0].status = "source_backed";
    unsupported.claims[0].value = "Unsupported permission"; unsupported.claims[0].evidenceIds = [];
    assert.equal(parseDevkitProject(unsupported), null, "A source-backed claim needs available/partial evidence, not an empty reference list");
  });
  check("R1-nullable-surrounding-lineage-regression-only", () => {
    const context = normalizedResolvedContext({ sourceFeatureId: "way/123", geoContext: {
      radiusM: 400, coverage: "unavailable", sampleSize: 0, capReached: false, groups: []
    } }, [55.27, 25.2]);
    assert.ok(parseNormalizedPointObjectContext(context)); assert.equal(context.source.observedAt, null);
    const omitted = structuredClone(context); delete omitted.source.observedAt;
    assert.equal(parseNormalizedPointObjectContext(omitted), null);
    for (const bad of [undefined, "not-a-date", 0]) {
      const candidate = structuredClone(context); candidate.source.observedAt = bad;
      assert.equal(parseNormalizedPointObjectContext(candidate), null);
    }
  });
  check("network-boundary", () => assert.equal(networkCalls, 0));
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fileURLToPath(root), encoding: "utf8" }).trim();
  const failed = cases.filter(c => c.result === "FAIL").length;
  process.stdout.write(JSON.stringify({ result: failed ? "FAIL" : "PASS", scope: "offline_contract_checks_only",
    acceptance: "NOT_ASSESSED", commit, node: process.version, cases, networkCalls,
    sources: sourcePaths.map(path => ({ path, sha256: createHash("sha256").update(readFileSync(new URL(path, root))).digest("hex") })),
    limits: ["No full P1, generated-scene, areas/finance mathematics, kit semantics, caller owner-race, browser, hosted or live-source acceptance.",
      "Opaque optional JSON sentinels test envelope preservation only; module semantic validation remains required."] }, null, 2) + "\n");
  if (failed) process.exitCode = 1;
}

// Offline, portable, closed-loader E1 foundation checks. No browser or provider.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = new URL("../", import.meta.url);
// Optional explicit read-only dependency root for an unintegrated worker patch.
// Exactly two authored dependency files are admitted, never a directory wildcard.
const dependencyArg = process.argv.find(arg => arg.startsWith("--design-root="));
const designRoot = dependencyArg ? pathToFileURL(`${resolve(dependencyArg.slice(14))}/`) : root;
const designUrl = new URL("src/lib/devkit/design.ts", designRoot).href;
const geometryUrl = new URL("src/lib/devkit/geometry.ts", designRoot).href;
const allowed = new Set([
  "src/lib/devkit/contracts.ts", "src/lib/devkit/project-store.ts", "src/lib/devkit/fixtures.ts",
  "src/lib/prototype/point-to-object-create.ts", "src/lib/prototype/point-to-object-markets.ts",
  "src/lib/polygon-aoi.ts", "src/types/aoi.ts"
].map(path => new URL(path, root).href));
allowed.add(designUrl); allowed.add(geometryUrl);
registerHooks({
  resolve(specifier, context, next) {
    let target = specifier;
    if (specifier === "./design" && context.parentURL === new URL("src/lib/devkit/project-store.ts", root).href) target = designUrl;
    else if (specifier === "./geometry" && context.parentURL === designUrl) target = geometryUrl;
    else if (specifier === "../prototype/point-to-object-create" && context.parentURL === designUrl) target = new URL("src/lib/prototype/point-to-object-create.ts", root).href;
    else if (specifier.startsWith("@/")) target = new URL(`${specifier.slice(2)}.ts`, root).href;
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]s$/.test(specifier)) target = `${specifier}.ts`;
    const resolved = next(target, context);
    if (resolved.url.endsWith(".ts") && !allowed.has(resolved.url)) throw new Error(`Unapproved foundation dependency: ${resolved.url}`);
    return resolved;
  },
  load(url, context, next) {
    if (!allowed.has(url)) return next(url, context);
    return {format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), {mode: "transform"})};
  }
});
let networkCalls = 0, checks = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("Network forbidden in foundation checks"); };
const { createDevkitDemoProject: demo, createDevkitCriticalGapProject: negative } = await import("../src/lib/devkit/fixtures.ts");
const {validateRedevelopmentProgram} = await import("../src/lib/prototype/point-to-object-create.ts");
const {createDesignAlternatives, applyDesignVersions, editDesignBuilding, restoreDesignRevision, validateDesignScene, validateDesignProjectLineage} = await import(designUrl);
const { parseDevkitProject: parse, createDevkitProjectStore: store, reviseDevkitInputs: revise, devkitRefFreshness: freshness, DEVKIT_MAX_PROJECT_BYTES } = await import("../src/lib/devkit/project-store.ts");
const copy = value => structuredClone(value);
const check = callback => { callback(); checks++; };
const unwrap = result => { assert.equal(result.ok, true, result.message); return result.value; };
function memory() {
  const data = new Map();
  return {data, denyRead: false, failWrite: null, writes: 0,
    getItem(key) { if (this.denyRead) throw Error("synthetic read failure"); return data.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite?.(key)) throw Error("synthetic write failure"); this.writes++; data.set(key, value); }};
}
const fixture = demo();
for (const design of fixture.designVersions) check(() => {const result = validateRedevelopmentProgram(design.program); assert.equal(result.ok, true, result.errors?.join("; ")); assert.equal(design.program.useMix.reduce((total, entry) => total + entry.sharePct, 0), 100); assert.ok(design.program.useMix.some(entry => entry.use === "open_space"));});
check(() => assert.deepEqual(parse(fixture), fixture));
check(() => assert.deepEqual(parse(negative()), negative()));
check(() => assert.equal(fixture.brief.budget.amount, null));
const exampleArg = process.argv.find(arg => arg.startsWith("--example="));
if (exampleArg) check(() => assert.deepEqual(JSON.parse(readFileSync(exampleArg.slice(10), "utf8")), fixture, "Published example matches actual factory"));

const invalid = [
  p => {p.schemaVersion = 0;}, p => {p.extra = true;}, p => {p.storageMode = "cloud";}, p => {p.dataClass = "client_confidential";},
  p => {p.brief.budget.amount = NaN;}, p => {p.brief.budget.amount = -1;}, p => {p.brief.budget.includesLand = "unknown";},
  p => {p.claims[0].value = 0;}, p => {p.claims[0].evidenceIds = ["foreign-evidence"];}, p => {p.claims[0].subjectId = "foreign-project";},
  p => {p.evidence[0].subjectId = "foreign-object";}, p => {p.evidence[0].sourceUrl = "javascript:synthetic";},
  p => {p.evidence[0].sourceUrl = "https://name:synthetic@example.test";}, p => {p.evidence[0].sourceUrl = "https://example.test/?api_key=synthetic";},
  p => {p.evidence[0].acquiredAt = "not-a-date";}, p => {p.evidence[0].responseHash = "not-a-hash";},
  p => {p.evidence[0].rights.permittedUse = "official_live";}, p => {p.evidence[0].trust = "unavailable";},
  p => {p.aoi.crs = "EPSG:3857";}, p => {p.aoi.areaSqM += 1;}, p => {p.aoi.coordinates[0][0][0] = 181;},
  p => {p.aoi.coordinates[0][4] = [0, 0];}, p => {p.aoi.vertexCount = 3;},
  p => {p.activeDesignVersionId = "foreign-design";}, p => {p.designVersions[0].scenarioId = "foreign-scenario";},
  p => {p.designVersions[0].inputRevision = 2;}, p => {p.designVersions[0].program.levelsMax = "8";},
  p => {p.designVersions[0].retainedObjectIds = ["foreign-building"];}, p => {p.designVersions[0].exclusionConstraintIds = ["foreign-constraint"];},
  p => {p.evidence.push(copy(p.evidence[0]));}, p => {p.designVersions.push(copy(p.designVersions[0]));},
  p => {p.caveat = "Screening";}, p => {p.evidence = new Array(1);},
  p => {p.objects = [{id: p.aoi.id, kind: "poi", label: "Not the AOI", sourceFeatureId: "node/1", geometry: null, crs: "EPSG:4326", trust: "synthetic", evidenceIds: []}];}
];
for (const mutate of invalid) check(() => {const p = copy(fixture); mutate(p); assert.equal(parse(p), null);});
check(() => {const p = negative(); p.claims[0].status = "source_backed"; p.claims[0].evidenceIds = [p.evidence[0].id]; assert.equal(parse(p), null);});
check(() => {const p = copy(fixture); let reads = 0; Object.defineProperty(p.brief, "title", {get() {reads++; return "synthetic";}, enumerable: true}); assert.equal(parse(p), null); assert.equal(reads, 0);});
check(() => {const p = copy(fixture); p.brief.loop = p; assert.equal(parse(p), null);});
check(() => {const p = copy(fixture); p.brief[Symbol("hidden")] = "synthetic"; assert.equal(parse(p), null);});

let rich = demo("devkit-rich");
rich.evidence[0].provenance = {fetchedAt: "2026-10-22T14:30:00.000Z", observedAt: null, providerUpdatedAt: null, cacheServedAt: null, geometryScope: "synthetic_aoi", rights: {allowedOperations: ["local_demo"]}};
rich.claims[0].scope = {radiusM: 400, extraCitationRadiusM: 800, kind: "aoi_interior", inputRefs: []};
const richPair = createDesignAlternatives(rich, {allowUnverifiedDraft: true, createdAt: fixture.createdAt, seed: "foundation-rich"});
assert.equal(richPair.ok, true, richPair.errors?.join("; "));
rich = applyDesignVersions(rich, richPair.designs);
const firstScene = project => project.designVersions.find(design => design.scene);
check(() => assert.deepEqual(parse(rich), rich, "Optional scene/provenance/scope survive parser losslessly"));
const carriers = [p => [firstScene(p), "scene"], p => [p.evidence[0], "provenance"], p => [p.claims[0], "scope"]];
check(() => {const p = copy(rich); p.evidence[0].provenance.opaqueSentinel = {version: "synthetic-opaque-json", sourceFragment: null}; p.inputRevision++; assert.deepEqual(parse(p), p, "Opaque bounded provenance stays lossless without being promoted to a canonical scene");});
for (const carrier of carriers) {
  for (const value of [null, [], "synthetic", 1, undefined, new Date(), {apiKey: "synthetic-sentinel"}, {nested: {accessToken: "synthetic-sentinel"}}, {value: Infinity}]) check(() => {
    const p = copy(rich), [row, key] = carrier(p); row[key] = value; assert.equal(parse(p), null);
  });
  for (const value of [null, [], "synthetic", {cookie: "synthetic-sentinel"}]) check(() => {
    const p = copy(rich), [row, key] = carrier(p); row[key] = value;
    const adapter = memory(), isolated = store(adapter, "invalid-optional-import");
    assert.equal(isolated.importProject(JSON.stringify({format: "GEOAI_DEVKIT_PROJECT", schemaVersion: 1, exportedAt: fixture.createdAt, project: p})).code, "invalid_import");
    assert.equal(adapter.writes, 0, "Malformed optional metadata is not silently stripped/imported");
  });
  check(() => {const p = copy(rich), [row, key] = carrier(p); row[key] = {method: () => 1}; assert.equal(parse(p), null);});
  for (const sensitive of ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "DATABASE_URL", "AWS_SECRET_ACCESS_KEY", "VERCEL_TOKEN", "operatorToken", "user_id", "account_id"]) check(() => {
    const p = copy(rich), [row, key] = carrier(p); row[key] = {[sensitive]: "SYNTHETIC_SENTINEL_NOT_A_CREDENTIAL"}; assert.equal(parse(p), null);
  });
}

const backing = memory(), primary = store(backing, "browser-demo-a");
check(() => assert.deepEqual(unwrap(primary.list()), []));
const saved = unwrap(primary.save(rich, null));
check(() => {assert.equal(saved.revision, 1); assert.equal(saved.storageMode, "browser_local_on_this_device");});
check(() => assert.deepEqual(unwrap(store(backing, "browser-demo-a").get(rich.id)), saved, "Fresh instance reopens exact snapshot"));
check(() => assert.deepEqual(unwrap(store(backing, "browser-demo-b").list()), [], "Different namespace has no project list"));
check(() => assert.equal(unwrap(store(backing, "browser-demo-b").get(saved.id)), null));
check(() => {const read = unwrap(primary.get(saved.id)); read.brief.title = "mutated return"; assert.deepEqual(unwrap(primary.get(saved.id)), saved);});
check(() => {firstScene(rich).scene.buildings[0].heightM = 999; assert.deepEqual(unwrap(primary.get(saved.id)), saved);});
const exported = unwrap(primary.exportProject(saved.id));
check(() => {assert.equal(JSON.parse(exported).format, "GEOAI_DEVKIT_PROJECT"); assert.equal(Object.hasOwn(JSON.parse(exported), "scopeId"), false);});
const imported = unwrap(store(backing, "browser-demo-b").importProject(exported));
check(() => assert.deepEqual(imported, saved, "Export/import preserves optional metadata and all versions"));
const other = store(backing, "browser-demo-b");
check(() => {const before = copy([...backing.data]); assert.equal(other.importProject(exported).code, "conflict"); assert.deepEqual([...backing.data], before);});
for (const raw of ["broken", "null", "[]", JSON.stringify({schemaVersion: 0}), JSON.stringify({...JSON.parse(exported), schemaVersion: 2}), JSON.stringify({...JSON.parse(exported), password: "synthetic"}), "x".repeat(DEVKIT_MAX_PROJECT_BYTES + 2_049)]) check(() => {
  const before = copy([...backing.data]); assert.equal(other.importProject(raw).ok, false); assert.deepEqual([...backing.data], before);
});
check(() => assert.equal(store(null, "demo").list().code, "storage_unavailable"));
check(() => assert.equal(store(backing, "../unsafe").list().code, "scope_mismatch"));
check(() => {backing.denyRead = true; assert.equal(primary.list().code, "storage_unavailable"); backing.denyRead = false;});
check(() => {const before = copy([...backing.data]); assert.equal(primary.save(saved, null).code, "conflict"); assert.equal(primary.save(saved, 99).code, "conflict"); assert.deepEqual([...backing.data], before);});
check(() => {const p = copy(saved), before = copy([...backing.data]); p.brief.title = "Unversioned input"; assert.equal(primary.save(p, 1).code, "invalid_project", "Canonical scene rejects changed source identity before the local revision gate"); assert.deepEqual([...backing.data], before);});
check(() => {const isolated = store(memory(), "legacy-input-conflict"), p = unwrap(isolated.save(demo("legacy-input-conflict"), null)); p.brief.title = "Unversioned input"; assert.equal(isolated.save(p, 1).code, "conflict", "Legacy scene-less input revision guard remains intact");});
check(() => {const p = copy(saved); p.designVersions[0].program.levelsMax = 9; assert.equal(primary.save(p, 1).code, "conflict");});
check(() => {const p = copy(saved); p.designVersions.pop(); p.activeDesignVersionId = "design-a"; assert.equal(primary.save(p, 1).code, "conflict");});
check(() => assert.throws(() => revise(saved, {id: "foreign-project"})));
check(() => {const original = copy(saved); const next = revise(saved, {brief: {...saved.brief, title: "Versioned brief"}}); assert.equal(next.inputRevision, 2); assert.equal(next.revision, 1); assert.deepEqual(saved, original); assert.deepEqual(next.designVersions, saved.designVersions);});
const updated = unwrap(primary.save(revise(saved, {brief: {...saved.brief, title: "Versioned brief"}}), 1));
check(() => {assert.equal(updated.revision, 2); assert.equal(freshness(updated, {kind: "design", id: "design-a", revision: 1}), "stale");});

const derived = demo("devkit-derived");
const ref = (kind, id, revision = 1) => ({kind, id, revision});
const artifact = (kind, id, inputs) => ({id, kind, revision: 1, inputRevision: 1, inputs, createdAt: fixture.createdAt, status: "current", methodVersion: "synthetic-method-v1", assumptions: ["Synthetic fixture only"], missingInputs: [], data: {value: null, unit: "not_computed"}});
derived.derivedArtifacts = [artifact("areas", "areas-a", [ref("design", "design-a")]), artifact("finance", "finance-a", [ref("areas", "areas-a")]), artifact("kit", "kit-a", [ref("design", "design-a"), ref("areas", "areas-a"), ref("finance", "finance-a")])];
check(() => assert.deepEqual(parse(derived), derived));
for (const a of derived.derivedArtifacts) check(() => assert.equal(freshness(derived, ref(a.kind, a.id)), "current"));
check(() => {const next = revise(derived, {brief: {...derived.brief, objective: "Changed source inputs"}}); assert.equal(next.derivedArtifacts.every(a => a.status === "stale"), true); assert.equal(freshness(next, ref("kit", "kit-a")), "stale");});
check(() => {const p = copy(derived); p.derivedArtifacts[0].inputs[0].id = "missing-design"; assert.equal(parse(p), null); p.derivedArtifacts.forEach(a => {a.status = "blocked"; a.missingInputs = ["Synthetic missing design"]}); assert.ok(parse(p));});
check(() => {const p = copy(derived); p.derivedArtifacts[1].inputs = [ref("finance", "finance-a")]; assert.equal(parse(p), null); assert.equal(freshness(p, ref("finance", "finance-a")), "blocked");});
check(() => {const p = copy(derived); p.designVersions.push({...copy(p.designVersions[0]), id: "design-a-v2", revision: 2}); p.activeDesignVersionId = "design-a-v2"; p.derivedArtifacts.forEach(a => {a.status = "stale"}); assert.ok(parse(p)); assert.equal(freshness(p, ref("design", "design-a")), "stale"); assert.equal(freshness(p, ref("design", "design-a-v2", 2)), "current"); assert.equal(freshness(p, ref("design", "design-b")), "current");});
check(() => {const p = copy(derived); p.designVersions.push({...copy(p.designVersions[0]), id: "new-programme-envelope-a"}); p.derivedArtifacts.forEach(a => {a.status = "stale"}); assert.ok(parse(p)); assert.equal(freshness(p, ref("design", "design-a")), "stale"); assert.equal(freshness(p, ref("design", "new-programme-envelope-a")), "current"); assert.equal(freshness(p, ref("design", "design-b")), "current");});
check(() => {const isolated = store(memory(), "history-order"), before = unwrap(isolated.save(demo("history-prefix"), null)); const reordered = copy(before); reordered.designVersions.reverse(); assert.equal(isolated.save(reordered, 1).code, "conflict", "Canonical history cannot be reordered to change the latest scene silently");});
check(() => {
  const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])])) : value;
  const isolated = store(memory(), "stable-json-order"), before = unwrap(isolated.save(demo("order-independent"), null));
  const after = unwrap(isolated.save(reverseKeys(before), before.revision));
  assert.equal(after.revision, 2); assert.equal(after.inputRevision, 1, "Key-order changes do not invent a source revision conflict");
});
check(() => {
  const p = demo("bounded-large-json"), large = artifact("areas", "areas-large", [ref("design", "design-a")]);
  large.data = {chunks: Array.from({length: 10}, () => "s".repeat(64_000))}; p.derivedArtifacts = [large];
  const firstStore = store(memory(), "large-roundtrip"), savedLarge = unwrap(firstStore.save(p, null));
  const raw = unwrap(firstStore.exportProject(p.id));
  assert.deepEqual(unwrap(store(memory(), "large-import").importProject(raw)), savedLarge, "Own bounded export must remain importable");
  large.data.chunks.push(...Array.from({length: 3}, () => "s".repeat(64_000)));
  assert.equal(parse(p), null, "Project byte cap rejects oversized payload, independent of store capacity");
});

const mainKey = [...backing.data.keys()].find(key => key.endsWith("browser-demo-a"));
for (const failBackup of [true, false]) check(() => {
  const before = backing.data.get(mainKey);
  backing.failWrite = key => failBackup ? key === `${mainKey}:previous` : key === mainKey;
  const result = primary.save(updated, 2); assert.equal(result.code, "storage_unavailable"); assert.equal(backing.data.get(mainKey), before);
  backing.failWrite = null; assert.deepEqual(unwrap(primary.get(updated.id)), updated);
});
check(() => {const current = backing.data.get(mainKey); backing.data.set(mainKey, "synthetic-corruption"); assert.equal(primary.list().code, "store_damaged"); assert.equal(primary.save(updated, 2).code, "store_damaged"); assert.equal(backing.data.get(mainKey), "synthetic-corruption"); const recovered = unwrap(primary.recover()); assert.ok(recovered.length > 0); assert.ok(unwrap(primary.get(updated.id))); assert.notEqual(backing.data.get(mainKey), "synthetic-corruption"); backing.data.set(mainKey, current);});
check(() => {const bKey = [...backing.data.keys()].find(key => key.endsWith("browser-demo-b")); const original = backing.data.get(bKey); backing.data.set(bKey, backing.data.get(mainKey)); assert.equal(other.list().code, "scope_mismatch"); backing.data.set(bKey, original);});
check(() => {const before = backing.data.get(mainKey), backup = backing.data.get(`${mainKey}:previous`); backing.data.set(`${mainKey}:previous`, "synthetic-corrupt-backup"); assert.equal(primary.recover().code, "store_damaged"); assert.equal(backing.data.get(mainKey), before); backing.data.set(`${mainKey}:previous`, backup);});
const limited = store(memory(), "capacity-demo");
for (let index = 0; index < 12; index++) unwrap(limited.save(demo(`capacity-${index}`), null));
check(() => assert.equal(limited.save(demo("capacity-overflow"), null).code, "capacity"));

// Independent shared-boundary checks, not the design author's own test suite.
// Parent is intentionally not a geometry-content hash input: these mutations
// remain valid individual scenes and exercise the NEW project lineage gate.
const lineageStart = copy(saved);
const originalA = lineageStart.designVersions.find(d => d.scene && d.scenarioId === "A");
const originalB = lineageStart.designVersions.find(d => d.scene && d.scenarioId === "B");
const edit = editDesignBuilding(originalA, originalA.buildings[0].id, {levels: originalA.buildings[0].levels + 1}, originalA.revision, fixture.createdAt);
assert.equal(edit.ok, true, edit.errors?.join("; "));
const afterEdit = applyDesignVersions(lineageStart, [edit.design]);
const restoration = restoreDesignRevision(afterEdit, edit.design, originalA, edit.design.revision, fixture.createdAt);
assert.equal(restoration.ok, true, restoration.errors?.join("; "));
const goodHistory = applyDesignVersions(afterEdit, [restoration.design]);
const latestA = project => project.designVersions.filter(d => d.scene && d.scenarioId === "A").at(-1);
check(() => {assert.deepEqual(validateDesignProjectLineage(goodHistory), []); assert.deepEqual(parse(goodHistory), goodHistory);});
check(() => {const s = store(memory(), "lineage-positive"), written = unwrap(s.save(goodHistory, null)); assert.deepEqual(unwrap(s.get(written.id)), written); const transferred = unwrap(store(memory(), "lineage-positive-import").importProject(unwrap(s.exportProject(written.id)))); assert.deepEqual(transferred, written);});
check(() => {
  const historical = revise(goodHistory, {brief: {...goodHistory.brief, title: "New source-input revision; old scenes remain history"}});
  assert.equal(historical.inputRevision, 2); assert.ok(historical.designVersions.filter(d => d.scene).every(d => d.inputRevision === 1));
  assert.deepEqual(parse(historical), historical, "Historical scenes are not required to equal current inputRevision");
  const s = store(memory(), "historical-positive"), written = unwrap(s.save(historical, null));
  assert.deepEqual(unwrap(store(memory(), "historical-reimport").importProject(unwrap(s.exportProject(written.id)))), written);
});
check(() => {assert.equal(freshness(goodHistory, ref("design", "design-a")), "stale"); assert.equal(freshness(goodHistory, ref("design", restoration.design.id, restoration.design.revision)), "current"); assert.equal(freshness(goodHistory, ref("design", originalB.id, originalB.revision)), "current");});
const lineageNegatives = [
  ["missing-parent", p => {latestA(p).scene.parent = ref("design", "missing-parent");}],
  ["self-parent", p => {const d = latestA(p); d.scene.parent = ref("design", d.id, d.revision);}],
  ["forward-parent", p => {const d = p.designVersions.find(d => d.id === originalA.id); d.scene.parent = ref("design", restoration.design.id, restoration.design.revision);}],
  ["cyclic-parent", p => {const first = p.designVersions.find(d => d.id === originalA.id), second = p.designVersions.find(d => d.id === edit.design.id); first.scene.parent = ref("design", second.id, second.revision); second.scene.parent = ref("design", first.id, first.revision);}],
  ["cross-scenario-parent", p => {latestA(p).scene.parent = ref("design", originalB.id, originalB.revision);}],
  ["restored-from-wrong-input", p => {
    const next = revise(p, {brief: {...p.brief, title: "Different source input for a restoration-negative"}});
    const pair = createDesignAlternatives(next, {previous: [], allowUnverifiedDraft: true, createdAt: fixture.createdAt, seed: "foundation-other-input"});
    assert.equal(pair.ok, true, pair.errors?.join("; "));
    // A separate valid generated scene has different input identity. Bind its
    // envelope to the referenced old ID, without copying the hash algorithm.
    // All scenes still pass individual geometry validation; relational history
    // must reject both a future-input parent and the wrong restoration source.
    const replacement = {...copy(pair.designs[0]), id: originalA.id, revision: originalA.revision};
    next.designVersions = next.designVersions.map(d => d.id === originalA.id && d.revision === originalA.revision ? replacement : d);
    Object.assign(p, next);
  }]
];
for (const [name, forge] of lineageNegatives) check(() => {
  const bad = copy(goodHistory); forge(bad);
  assert.ok(bad.designVersions.filter(d => d.scene).every(d => validateDesignScene(d).length === 0), `${name}: rejection must not rely on malformed individual geometry`);
  const errors = validateDesignProjectLineage(bad);
  assert.ok(errors.length > 0, name);
  if (name === "restored-from-wrong-input") assert.ok(errors.some(error => error.includes("restoration source must be an earlier same-project/scenario/input revision")));
  assert.equal(parse(bad), null, `${name}: common parser gate`);
  const adapter = memory(), s = store(adapter, `lineage-${name}`), qualified = unwrap(s.save(goodHistory, null));
  bad.revision = qualified.revision;
  const before = copy([...adapter.data]);
  assert.equal(s.save(bad, qualified.revision).code, "invalid_project", `${name}: save gate`);
  assert.deepEqual([...adapter.data], before, `${name}: failed save preserves previous bytes`);
  assert.equal(s.importProject(JSON.stringify({format: "GEOAI_DEVKIT_PROJECT", schemaVersion: 1, exportedAt: fixture.createdAt, project: bad})).code, "invalid_import", `${name}: import gate before duplicate-ID handling`);
  assert.deepEqual([...adapter.data], before);
  const key = [...adapter.data.keys()].find(key => !key.endsWith(":previous"));
  const raw = JSON.parse(adapter.data.get(key)); raw.projects[0] = bad;
  const tampered = JSON.stringify(raw); adapter.data.set(key, tampered);
  assert.equal(s.exportProject(bad.id).code, "store_damaged", `${name}: fresh readback/export gate`);
  assert.equal(adapter.data.get(key), tampered, `${name}: corrupted source bytes are preserved, not sanitized`);
});
check(() => {assert.equal(networkCalls, 0); assert.equal(primary.persistence, "browser_local_only");});
console.log(JSON.stringify({status: "PASS", checks, networkCalls, persistence: "browser_local_only", lineageNegatives: lineageNegatives.map(([name]) => name), dependencyMode: dependencyArg ? "explicit_readonly_checkout" : "integrated_root", scope: "Synthetic contract/save/reopen/import/recovery/namespace/freshness/canonical-lineage checks; not hosted Auth, tenant security, source rights or finance validation"}));

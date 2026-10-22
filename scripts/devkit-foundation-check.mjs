// Offline, portable, closed-loader E1 foundation checks. No browser or provider.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const allowed = new Set([
  "src/lib/devkit/contracts.ts", "src/lib/devkit/project-store.ts", "src/lib/devkit/fixtures.ts",
  "src/lib/prototype/point-to-object-create.ts", "src/lib/prototype/point-to-object-markets.ts",
  "src/lib/polygon-aoi.ts", "src/types/aoi.ts"
].map(path => new URL(path, root).href));
registerHooks({
  resolve(specifier, context, next) {
    let target = specifier;
    if (specifier.startsWith("@/")) target = new URL(`${specifier.slice(2)}.ts`, root).href;
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

const rich = demo("devkit-rich");
rich.designVersions[0].scene = {version: "synthetic-scene-v1", parent: null, terraces: [{areaSqM: null}], frame: {crs: "EPSG:4326"}};
rich.evidence[0].provenance = {fetchedAt: "2026-10-22T14:30:00.000Z", observedAt: null, providerUpdatedAt: null, cacheServedAt: null, geometryScope: "synthetic_aoi", rights: {allowedOperations: ["local_demo"]}};
rich.claims[0].scope = {radiusM: 400, extraCitationRadiusM: 800, kind: "aoi_interior", inputRefs: []};
check(() => assert.deepEqual(parse(rich), rich, "Optional scene/provenance/scope survive parser losslessly"));
const carriers = [p => [p.designVersions[0], "scene"], p => [p.evidence[0], "provenance"], p => [p.claims[0], "scope"]];
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
check(() => {rich.designVersions[0].scene.terraces[0].areaSqM = 999; assert.deepEqual(unwrap(primary.get(saved.id)), saved);});
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
check(() => {const p = copy(saved); p.brief.title = "Unversioned input"; assert.equal(primary.save(p, 1).code, "conflict");});
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
check(() => {const p = copy(derived); p.designVersions.push({...copy(p.designVersions[0]), id: "first-generated-a", scene: {parent: {id: "design-a", revision: 1}}}); p.derivedArtifacts.forEach(a => {a.status = "stale"}); assert.ok(parse(p)); assert.equal(freshness(p, ref("design", "design-a")), "stale"); assert.equal(freshness(p, ref("design", "first-generated-a")), "current"); assert.equal(freshness(p, ref("design", "design-b")), "current");});
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
check(() => {assert.equal(networkCalls, 0); assert.equal(primary.persistence, "browser_local_only");});
console.log(JSON.stringify({status: "PASS", checks, networkCalls, persistence: "browser_local_only", scope: "Synthetic contract/save/reopen/import/recovery/namespace/freshness checks; not hosted Auth, tenant security, source rights or finance validation"}));

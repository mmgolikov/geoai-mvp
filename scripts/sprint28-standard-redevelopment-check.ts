// S2 offline regression for A01 and A05; source fields only, not a live lease replay.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("S2 regression forbids network access"); };
// This established fixture exports the real core through an offline Node loader.
// @ts-expect-error The Node transform-types runner requires the explicit TypeScript extension.
const { core: currentCore, evidencePack } = await import("./point-to-object-semantic-v6-check.ts");
const mode = process.argv[2];

// `--record-before` always loads the immutable starting tree, even if the
// bounded correction is already present in the working tree. No checkout or
// ref is changed. The default/after path uses the actual working-tree core.
async function baselineCore(): Promise<typeof currentCore> {
  const baseline = "05b4c3aeb0b1cde55b45b59e0e82b673beabe36d";
  let source = execFileSync("git", ["show", `${baseline}:src/lib/prototype/point-to-object-ai-core.ts`], { encoding: "utf8" });
  source = source.replace(/from "\.\/point-to-object-climate-contract"/,
    `from ${JSON.stringify(pathToFileURL(join(process.cwd(), "src/lib/prototype/point-to-object-climate-contract.ts")).href)}`);
  source = source.replace(/import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
    `const LIVE_POINT_CAVEAT = ${JSON.stringify(CAVEAT)};\n`);
  source = source.replace(/import \{ semanticHash \} from "@\/src\/lib\/point-to-object\/hash";\n/,
    `import { createHash } from "node:crypto";\nconst semanticHash = (value) => { const canonicalize = (entry) => Array.isArray(entry) ? entry.map(canonicalize) : entry && typeof entry === "object" ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])) : entry; return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex"); };\n`);
  source = source.replace(/import \{\n  POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION,[\s\S]*?\} from "\.\/point-to-object-analysis-depth-contract";\n/,
    `const POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION = "POINT_OBJECT_DEPTH_CONTRACT_V1_2026_09_12";\nconst pointObjectAnalysisDepthContract = (depth) => ({ quick: { depth: "quick", purpose: "identity_evidence", selectionCounts: { decisionReasons: 2, signals: 3, opportunities: 1, risks: 2 }, reviewCounts: { criteria: 2, alternatives: 0, counterEvidence: 1, decisionTriggers: 1 }, instruction: "quick" }, standard: { depth: "standard", purpose: "decision_criteria", selectionCounts: { decisionReasons: 3, signals: 4, opportunities: 2, risks: 3 }, reviewCounts: { criteria: 3, alternatives: 1, counterEvidence: 2, decisionTriggers: 2 }, instruction: "standard" }, deep: { depth: "deep", purpose: "decision_challenge", selectionCounts: { decisionReasons: 4, signals: 5, opportunities: 3, risks: 3 }, reviewCounts: { criteria: 4, alternatives: 2, counterEvidence: 3, decisionTriggers: 3 }, instruction: "deep" } }[depth]);\n`);
  const javascript = stripTypeScriptTypes(source, { mode: "transform" });
  return await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as typeof currentCore;
}

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const questions = {
  en: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object. Do not assume development rights, condition, demand or financial feasibility.",
  ru: "Оцени, стоит ли проверять гипотезу редевелопмента или репозиционирования этого объекта. Не предполагай наличие прав на строительство, состояние, спрос или финансовую реализуемость."
} as const;
// Public fields transcribed from the historical 01/05 acquisition receipts.
// No Auth material, full source pack, context counts or live lease is replayed.
const cases = [
  { caseId: "S2-H", id: "way/125848292", name: "Shangri La", acquiredAt: "2026-09-26T02:48:50.741Z", packHash: "e13b39ba20b2393f9206f2b7f338dd41f725bac84a894572828e2d95bb1fefc3", geometryHash: "cedcead864bc3c13ffc4241c80f7403d234c292eee5ec4c2488f6d1c22da5a89", point: [55.2719792, 25.2081439], metrics: { footprintAreaSqM: 2029, footprintPerimeterM: 223 }, tags: { "tag.building": "yes", "tag.building:levels": "43", "tag.height": "200", "tag.start_date": "2003", "tag.tourism": "hotel" } },
  { caseId: "S2-U", id: "relation/14604314", name: "25hours Hotel Dubai One Central", acquiredAt: "2026-09-26T03:45:26.966Z", packHash: "7db3aa8797c92b8a67204bedbfdb28689ab0a9206d8e4fc19ecdeb5a4d3e0291", geometryHash: "0824ece6fd1625b35ef36d4e17b1b5089b815d45d9280a1099904f5c61d5538b", point: [55.2839807, 25.2194839], metrics: { footprintAreaSqM: 5827, footprintPerimeterM: 676 }, tags: { "tag.building": "yes", "tag.building:levels": "9", "tag.start_date": "2021", "tag.tourism": "hotel" } }
] as const;
type Case = typeof cases[number];
type Locale = keyof typeof questions;
type Depth = "quick" | "standard" | "deep";
type Goal = "redevelopment" | "due_diligence" | "object_profile";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const core = mode === "--record-before" ? await baselineCore() : currentCore;

type Change = "none" | "unbound" | "part" | "nonbuilding" | "height_zero" | "height_malformed" | "partial_context";
function sourceFieldPack(item: Case, change: Change = "none") {
  const pack = evidencePack(true);
  const tags: Record<string, string> = { ...item.tags };
  if (change === "part") tags["tag.building:part"] = "yes";
  if (change === "nonbuilding") { delete tags["tag.building"]; tags["tag.landuse"] = "commercial"; }
  if (change === "height_zero") tags["tag.height"] = "0";
  if (change === "height_malformed") tags["tag.height"] = "not recorded";
  const featureClass = change === "nonbuilding" ? "landuse:commercial" : "building:yes";
  pack.selectedObject.sourceFeatureId = item.id;
  pack.selectedObject.name = item.name;
  pack.selectedObject.featureClass = featureClass;
  pack.selectedObject.tags = tags;
  pack.selectedObject.geometryHash = item.geometryHash;
  pack.selectedObject.metrics = { ...item.metrics, method: "local_equirectangular_wgs84_approximation", geometryGeneralized: true };
  pack.coordinates = { longitude: item.point[0], latitude: item.point[1], crs: "EPSG:4326" };
  pack.selectedObject.displayAddress = null;
  pack.selectedObject.addressParts = {};
  pack.geoContext = null;
  pack.nearbyContext = [];
  pack.evidence = pack.evidence.filter((entry: { id: string }) => ![
    "EVD-ADDRESS", "EVD-CONTEXT-SUMMARY", "EVD-DISTRICT-PROFILE", "EVD-CONTEXT-1", "EVD-CONTEXT-2"
  ].includes(entry.id));
  pack.evidence = pack.evidence.filter((entry: { id: string }) => !entry.id.startsWith("EVD-EXTRA-"));
  if (change === "partial_context") pack.evidence = pack.evidence.filter((entry: { id: string }) =>
    entry.id !== "EVD-OBJECT-METRICS");
  for (const entry of pack.evidence as Array<{ id: string; sourceId: string; value: string }>) {
    if (entry.sourceId === "way/101") entry.sourceId = item.id;
    if (entry.id === "EVD-OSM-OBJECT") entry.value = JSON.stringify({ sourceFeatureId: item.id, name: item.name });
    if (entry.id === "EVD-COORDINATES") entry.value = JSON.stringify(pack.coordinates);
    if (entry.id === "EVD-CLASSIFICATION") entry.value = JSON.stringify({ sourceFeatureId: item.id, featureClass });
    if (entry.id === "EVD-ALLOWED-FIELDS") {
      entry.value = JSON.stringify({ sourceFeatureId: item.id, tags });
      if (change === "unbound") entry.sourceId = "way/999";
    }
    if (entry.id === "EVD-GEOMETRY") entry.value = JSON.stringify({ sourceFeatureId: item.id, geometryType: "Polygon", geometryHash: pack.selectedObject.geometryHash });
    if (entry.id === "EVD-OBJECT-METRICS") entry.value = JSON.stringify({ sourceFeatureId: item.id, geometryHash: pack.selectedObject.geometryHash, metrics: pack.selectedObject.metrics });
  }
  return pack;
}

function plan() {
  return { decision: { path: "existing_asset_screen", disposition: "hold", confidence: "low", reasonCodes: ["object_identity_available", "use_classification_available", "source_is_non_official"] },
    signalCodes: ["object_identity", "use_classification", "building_form", "source_limit"],
    opportunityCodes: ["existing_asset_repositioning", "technical_reuse_test"],
    risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity: "high", confidence: "low" })),
    answerCode: "source_evidence_only", focusedAnswer: null, caveat: CAVEAT };
}

function request(locale: Locale, goal: Goal, depth: Depth) {
  const question = goal === "redevelopment" ? questions[locale] : goal === "object_profile"
    ? locale === "en" ? "Build a concise decision-oriented profile of this object." : "Составь краткий профиль объекта для принятия решения."
    : locale === "en" ? "Build a due diligence plan for this object." : "Составь план due diligence для этого объекта.";
  return { role: "developer", scenario: "unspecified", locale, goal, depth, perspective: "developer", horizon: "current", question };
}

function output(item: Case, locale: Locale, goal: Goal, depth: Depth, change: Change = "none") {
  const result = core.recoverPointObjectAiFocusedContentDetailed(plan(), sourceFieldPack(item, change), request(locale, goal, depth));
  assert.equal(result.ok, true, result.detail);
  assert.equal(result.content.caveat, CAVEAT);
  const answer = result.content.answerToQuestion;
  assert.ok(answer);
  assert.equal(answer.status, "partial");
  assert.ok(answer.statement.length <= 900);
  return { answer, disposition: result.content.decisionBrief.disposition, contentHash: hash(result.content) };
}

const matrix = cases.flatMap(item => (["en", "ru"] as const).flatMap(locale =>
  (["redevelopment", "due_diligence", "object_profile"] as const).flatMap(goal =>
    (["quick", "standard", "deep"] as const).map(depth => ({ key: `${item.caseId}/${locale}/${goal}/${depth}`, ...output(item, locale, goal, depth) }))
  )
));
const evidenceDir = process.argv[3] ?? join(process.cwd(), "artifacts", "sprint28-standard-redevelopment");
if (mode === "--record-before") {
  for (const entry of matrix.filter(item => item.key.endsWith("/redevelopment/standard"))) {
    assert.doesNotMatch(entry.answer.statement, /Shangri La|25hours|\b200\b|\b43\b|\b9\b/);
  }
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, "before.json"), JSON.stringify({ fixtureScope: "public_source_fields_not_full_pack", cases: cases.map(({ caseId, id, acquiredAt, packHash }) => ({ caseId, id, acquiredAt, historicalPackHash: packHash })), matrix }, null, 2) + "\n");
  console.log(JSON.stringify({ result: "BEFORE_REPRODUCED", cases: cases.map(item => item.caseId), checks: matrix.length, networkCalls, evidence: join(evidenceDir, "before.json") }));
} else if (mode === "--verify-after" || mode === "--check") {
  if (mode === "--verify-after") {
    const before = JSON.parse(readFileSync(join(evidenceDir, "before.json"), "utf8")) as { matrix: typeof matrix };
    assert.equal(before.matrix.length, matrix.length);
    for (const [index, entry] of matrix.entries()) {
      const old = before.matrix[index];
      assert.equal(entry.key, old.key);
      if (entry.key.endsWith("/redevelopment/standard")) {
        assert.notEqual(entry.answer.statement, old.answer.statement);
        assert.equal(entry.disposition, old.disposition);
        assert.deepEqual(entry.answer.missingEvidence, old.answer.missingEvidence);
      } else assert.deepEqual(entry, old, `${entry.key} changed outside Standard redevelopment recovery`);
    }
  }
  for (const item of cases) for (const locale of ["en", "ru"] as const) {
    const normal = output(item, locale, "redevelopment", "standard").answer;
    assert.match(normal.statement, new RegExp(item.name));
    assert.ok(normal.evidenceRefs.includes("EVD-ALLOWED-FIELDS"));
    assert.match(normal.statement, item.caseId === "S2-H" ? /\b200\b/ : /\b9\b/);
    if (item.caseId === "S2-U") assert.match(normal.statement, locale === "en" ? /height.*(?:unknown|not mapped)/i : /высот.*(?:неизвест|не указан)/i);
    const unbound = output(item, locale, "redevelopment", "standard", "unbound").answer;
    assert.doesNotMatch(unbound.statement, item.caseId === "S2-H" ? /\b200\b|\b43\b/ : /\b9\b/);
    const part = output(item, locale, "redevelopment", "standard", "part").answer;
    assert.match(part.statement, locale === "en" ? /building part/ : /част[ьи] здания/);
    const nonbuilding = output(item, locale, "redevelopment", "standard", "nonbuilding").answer;
    assert.doesNotMatch(nonbuilding.statement, locale === "en" ? /hotel reuse/i : /адаптац.*отел/i);
    const partial = output(item, locale, "redevelopment", "standard", "partial_context").answer;
    assert.match(partial.statement, new RegExp(item.name));
    assert.ok(partial.evidenceRefs.includes("EVD-ALLOWED-FIELDS"));
    assert.ok(!partial.evidenceRefs.includes("EVD-OBJECT-METRICS"));
  }
  for (const locale of ["en", "ru"] as const) for (const change of ["height_zero", "height_malformed"] as const) {
    const answer = output(cases[0], locale, "redevelopment", "standard", change).answer;
    assert.match(answer.statement, locale === "en" ? /height.*(?:unusable|unknown)/i : /высот.*(?:непригод|неизвест)/i);
    assert.doesNotMatch(answer.statement, locale === "en" ? /mapped vertical form makes/ : /Картированные вертикальные параметры делают/);
    assert.ok(answer.evidenceRefs.includes("EVD-ALLOWED-FIELDS"));
  }
  if (mode === "--verify-after") writeFileSync(join(evidenceDir, "after.json"), JSON.stringify({ fixtureScope: "public_source_fields_not_full_pack", matrix }, null, 2) + "\n");
  console.log(JSON.stringify({ result: "PASS", checks: matrix.length + 32, networkCalls, evidence: mode === "--verify-after" ? join(evidenceDir, "after.json") : null }));
} else throw new Error("Use --record-before, --verify-after or --check");
assert.equal(networkCalls, 0);

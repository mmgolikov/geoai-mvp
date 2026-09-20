import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { chmodSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(pathToFileURL(path.join(process.cwd(), `${specifier.slice(2)}.ts`)).href, context);
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
// @ts-expect-error Node offline runner requires explicit extension.
const helper = await import("../tests/e2e/helpers/quality20-real-artifact.ts");
// @ts-expect-error Node offline runner requires explicit extension.
const { sprint10Selection, sprint10AnalysisResponse } = await import("../tests/e2e/helpers/sprint10-analysis-fixture.ts");
const { parseSavedPointObjectArtifact } = await import("../src/lib/prototype/point-object-projects-contract");
const { hashPointObjectOperation } = await import("../src/lib/prototype/point-object-projects");
// @ts-expect-error Node offline runner requires explicit extension.
const { SPRINT10_PUBLIC_ANALYSIS_QUESTION } = await import("../tests/e2e/helpers/sprint10-analysis-result-evidence.ts");
// @ts-expect-error Node offline runner requires explicit extension.
const { SPRINT10_ANALYSIS_PROMPT_VERSION } = await import("../tests/e2e/helpers/sprint10-live-budget.ts");
const response = sprint10AnalysisResponse({ role: "developer", scenario: "unspecified", depth: "standard", goal: "custom", perspective: "developer", horizon: "current", question: SPRINT10_PUBLIC_ANALYSIS_QUESTION, locale: "en" });
response.evidencePackId = `p2o_live_evidence_${response.evidencePackHash.slice(0, 24)}`;
response.telemetry.model = "gpt-5.6-sol";
response.telemetry.promptVersion = SPRINT10_ANALYSIS_PROMPT_VERSION;
response.telemetry.attemptTrace[0].model = "gpt-5.6-sol";
Object.assign(response.telemetry, { estimatedCostUsd: 0.000024,
  costRateSource: "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output" });
Object.assign(response.telemetry.attemptTrace[0], { estimatedCostUsd: 0.000024 });
const artifact = parseSavedPointObjectArtifact({ schemaVersion: 1, artifactId: "artifact_offline", idempotencyKey: "operation_offline", payloadHash: "a".repeat(64), completedAt: response.generatedAt, updatedAt: response.generatedAt, viewRevision: 0,
  kind: "analyse", locale: "en", marketKey: "dubai", label: "Public offline fixture", payload: { selection: sprint10Selection, analysis: response } });
assert(artifact);
artifact.payloadHash = await hashPointObjectOperation(artifact);
const input = { candidateCommit: "a".repeat(40), candidateHost: "geoai-offline.vercel.app", sourceFeatureId: "way/91010", payloadHash: artifact.payloadHash, artifact };
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "geoai-real-artifact-check-")));
chmodSync(root, 0o700);
try {
  const target = path.join(root, "artifact.json");
  assert.deepEqual(helper.validateQuality20ArtifactExportEnvironment({}, "journey"), {});
  const env = { GEOAI_QUALITY20_ARTIFACT_EXPORT: helper.QUALITY20_ARTIFACT_EXPORT_OPT_IN, GEOAI_QUALITY20_ARTIFACT_EXPORT_PATH: target };
  assert.deepEqual(helper.validateQuality20ArtifactExportEnvironment(env, "dubai-analyse"), env);
  for (const scope of ["journey", "dubai-find-analysis", undefined]) assert.throws(() => helper.validateQuality20ArtifactExportEnvironment(env, scope));
  assert.throws(() => helper.validateQuality20ArtifactExportEnvironment({ ...env, GEOAI_QUALITY20_ARTIFACT_EXPORT: "yes" }, "dubai-analyse"));
  const output = await helper.writeQuality20RealArtifact(target, input);
  assert.deepEqual(output.artifact, artifact);
  assert.equal(lstatSync(target).mode & 0o777, 0o600);
  assert.deepEqual(await helper.parseQuality20RealArtifactExport(JSON.parse(readFileSync(target, "utf8")), input), output);
  await assert.rejects(() => helper.writeQuality20RealArtifact(target, input));
  await assert.rejects(() => helper.parseQuality20RealArtifactExport({ ...output, private: "extra" }, input));
  await assert.rejects(() => helper.parseQuality20RealArtifactExport(output, { ...input, candidateCommit: "b".repeat(40) }));
  for (const changed of [ { ...input, payloadHash: "b".repeat(64) }, { ...input, sourceFeatureId: "way/123" }, { ...input, candidateHost: "https://private.invalid/?token=secret" },
    { ...input, artifact: { ...artifact, userId: "private" } }, { ...input, artifact: { ...artifact, label: "Bearer private-secret" } },
    { ...input, artifact: { ...artifact, unexpected: true } }, { ...input, artifact: { ...artifact, payload: null } } ]) await assert.rejects(() => helper.buildQuality20RealArtifact(changed));
  const privatePayload = structuredClone(artifact);
  privatePayload.label = "a".repeat(helper.QUALITY20_REAL_ARTIFACT_MAX_BYTES);
  await assert.rejects(() => helper.buildQuality20RealArtifact({ ...input, artifact: privatePayload }), /bounded size/);
  const oldPrompt = structuredClone(artifact);
  assert.equal(oldPrompt.kind, "analyse");
  if (oldPrompt.kind === "analyse") oldPrompt.payload.analysis.telemetry.promptVersion = "POINT_OBJECT_AI_PROMPT_V10_2026_09_18";
  oldPrompt.payloadHash = await hashPointObjectOperation(oldPrompt);
  await assert.rejects(() => helper.buildQuality20RealArtifact({ ...input, artifact: oldPrompt, payloadHash: oldPrompt.payloadHash }), /telemetry/);
  const linked = path.join(root, "linked.json"); symlinkSync(target, linked);
  await assert.rejects(() => helper.writeQuality20RealArtifact(linked, input));
  assert.throws(() => helper.validateQuality20ArtifactExportEnvironment({ ...env, GEOAI_QUALITY20_ARTIFACT_EXPORT_PATH: `${root}/../artifact.json` }, "dubai-analyse"));
  chmodSync(root, 0o755);
  await assert.rejects(() => helper.writeQuality20RealArtifact(path.join(root, "unsafe.json"), input));
  chmodSync(root, 0o700);
  console.log("Real artifact offline checks passed: canonical parser/checksum/provenance, private fields, exact scope, bounded private output and no overwrite.");
} finally { rmSync(root, { recursive: true, force: true }); }

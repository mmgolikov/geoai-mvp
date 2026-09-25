import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, fchmodSync, fsyncSync, linkSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
// @ts-expect-error Node offline checks require explicit extensions.
import { validateSprint10AnalysisEvidencePath, type Sprint10AnalysisEvidenceInput } from "./sprint10-analysis-result-evidence.ts";
// @ts-expect-error Node offline checks require explicit extensions.
import { QUALITY20_CASES, quality20Hash, quality20RequestKey, validateQuality20Manifest, type Quality20Selection } from "./quality20-frozen-case.ts";
// @ts-expect-error Node offline checks require explicit extensions.
import { buildQuality20AnalysisEvidence } from "./quality20-analysis-evidence.ts";
// @ts-expect-error Node offline checks require explicit extensions.
import { SPRINT10_ANALYSIS_PROMPT_VERSION } from "./sprint10-live-budget.ts";

export const COMPLETE25_ARTIFACT_CAPTURE_OPT_IN = "export-one-frozen-a09-browser-artifact-v1";
export const COMPLETE25_ARTIFACT_SCHEMA = "geoai.complete25.a09-browser-artifact.v1";
const MAX_BYTES = 512 * 1024;
const SOURCE_ID = "way/797700047";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function assertSelection(selection: Quality20Selection | null): asserts selection is Quality20Selection {
  if (!selection || selection.definition.id !== "A09" ||
      canonical(selection.definition) !== canonical(QUALITY20_CASES.find(item => item.id === "A09")) ||
      ![JSON.stringify(selection.manifest), `${JSON.stringify(selection.manifest, null, 2)}\n`]
        .some(bytes => createHash("sha256").update(bytes).digest("hex") === selection.manifestSha256) ||
      selection.manifest.cases.filter(item => item.id === "A09").length !== 1 ||
      canonical(selection.manifest.cases.find(item => item.id === "A09")?.binding) !== canonical(selection.binding) ||
      selection.binding.subject?.sourceIdentity !== SOURCE_ID || selection.binding.locale !== "en" ||
      selection.binding.role !== "developer" || selection.binding.scenario !== "unspecified" || selection.binding.goal !== "custom" ||
      !/^[a-f0-9]{40}$/.test(selection.manifest.execution.commit) ||
      !/^https:\/\/geoai-[a-z0-9-]+\.vercel\.app$/.test(selection.manifest.execution.origin) ||
      !/^dpl_[A-Za-z0-9]+$/.test(selection.manifest.execution.deploymentId)) throw new Error("A09 artifact capture requires the exact approved frozen case.");
  // Only the batch's immutable pretty+newline serializer or compact fixture is
  // admitted; arbitrary whitespace variants are not this bounded capture seam.
  validateQuality20Manifest(JSON.stringify(selection.manifest), quality20Hash(selection.manifest), "A09", "quality20-analyse", selection.manifest.execution);
}
export function validateComplete25ArtifactCaptureEnvironment(source: Record<string, string | undefined>, scope: string | undefined, selection: Quality20Selection | null) {
  const optIn = source.GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE;
  const path = source.GEOAI_COMPLETE25_A09_ARTIFACT_PATH;
  if (optIn === undefined && path === undefined) return {};
  if (optIn !== COMPLETE25_ARTIFACT_CAPTURE_OPT_IN || scope !== "quality20-analyse") throw new Error("A09 artifact capture requires its exact opt-in and scope.");
  assertSelection(selection);
  return { GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE: optIn, GEOAI_COMPLETE25_A09_ARTIFACT_PATH: validateSprint10AnalysisEvidencePath(path) };
}
function assertPublic(value: unknown): void {
  if (typeof value === "string" && (/\b(?:Bearer\s+|sk-[A-Za-z0-9_-]{12,}|sb_(?:secret|publishable)_|eyJ[A-Za-z0-9_-]{10,}\.)/i.test(value) ||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /[?&](?:token|key|secret|password|code)=/i.test(value))) throw new Error("Private text is not exportable.");
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (/^(?:userId|identityKey|projectId|email|password|authorization|cookie|headers|challenge|access_token|refresh_token|serviceRoleKey)$/i.test(key)) throw new Error("Private fields are not exportable.");
    assertPublic(child);
  }
}
export type Complete25ArtifactInput = { artifact: unknown; payloadHash: string; evidence: Sprint10AnalysisEvidenceInput };
export type Complete25ArtifactExpected = { candidateCommit: string; candidateHost: string; manifestRaw: string; manifestSha256: string };
/** Read-only saved-result verification; does not acquire sources or renew leases. */
export function validateComplete25RealArtifactEnvelope(value: unknown, expected: Complete25ArtifactExpected) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > MAX_BYTES) throw new Error("A09 artifact envelope is invalid.");
  const envelope = value as Record<string, unknown>;
  if (Object.keys(envelope).sort().join(",") !== "actualRequestHash,artifact,caseId,execution,manifestSha256,payloadHash,responseHash,resultHash,schemaVersion,source" ||
      envelope.schemaVersion !== COMPLETE25_ARTIFACT_SCHEMA || envelope.caseId !== "A09" ||
      envelope.manifestSha256 !== expected.manifestSha256 ||
      ![envelope.responseHash, envelope.resultHash, envelope.actualRequestHash, envelope.payloadHash].every(hash => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash))) throw new Error("A09 artifact envelope provenance is invalid.");
  const selection = validateQuality20Manifest(expected.manifestRaw, expected.manifestSha256, "A09", "quality20-analyse",
    { commit: expected.candidateCommit, origin: `https://${expected.candidateHost}` });
  assertSelection(selection); assertPublic(value);
  if (canonical(envelope.execution) !== canonical(selection.manifest.execution) || canonical(envelope.source) !== canonical(selection.binding.subject)) throw new Error("A09 artifact manifest binding differs.");
  return { envelope, selection };
}
export async function parseComplete25RealArtifactExport(value: unknown, expected: Complete25ArtifactExpected) {
  const { envelope, selection } = validateComplete25RealArtifactEnvelope(value, expected);
  const candidate = envelope.artifact as { payload?: { analysis?: { request?: Record<string, unknown> } } } | null;
  const analysis = candidate?.payload?.analysis;
  if (!analysis?.request) throw new Error("A09 saved analysis is missing.");
  // Revalidate saved content and telemetry; the wire-response hash is capture
  // provenance, not a claim that the parser's saved projection is wire JSON.
  const rebuilt = await buildComplete25RealArtifact(selection, { artifact: envelope.artifact, payloadHash: envelope.payloadHash as string,
    evidence: { response: analysis, expectedSourceFeatureId: SOURCE_ID,
      submittedRequest: { ...analysis.request, caseKey: "dubai", expectedSourceFeatureId: SOURCE_ID, consent: true },
      telemetryIdentity: { requestKey: quality20RequestKey(selection, "ai"), phase: "S4", candidateHost: expected.candidateHost,
        candidateCommit: expected.candidateCommit, route: "ai", depth: "standard", promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 } } });
  if (rebuilt.resultHash !== envelope.resultHash || rebuilt.actualRequestHash !== envelope.actualRequestHash) throw new Error("A09 saved result/request hashes differ.");
  return { ...rebuilt, responseHash: envelope.responseHash as string };
}
export async function buildComplete25RealArtifact(selection: Quality20Selection, input: Complete25ArtifactInput) {
  assertSelection(selection);
  if (Buffer.byteLength(JSON.stringify(input.artifact), "utf8") > MAX_BYTES) throw new Error("A09 artifact exceeds bounded size.");
  assertPublic(input.artifact);
  const evidence = buildQuality20AnalysisEvidence(selection, input.evidence);
  const { parseSavedPointObjectArtifact } = await import("../../../src/lib/prototype/point-object-projects-contract");
  const { hashPointObjectOperation } = await import("../../../src/lib/prototype/point-object-projects");
  const { parsePointObjectAiResponse } = await import("../../../components/point-to-object/live-session");
  const artifact = parseSavedPointObjectArtifact(input.artifact);
  if (!artifact || artifact.kind !== "analyse" || artifact.marketKey !== "dubai" || artifact.locale !== "en" ||
      canonical(artifact) !== canonical(input.artifact) || artifact.payloadHash !== input.payloadHash ||
      await hashPointObjectOperation(artifact) !== input.payloadHash) throw new Error("A09 saved artifact parser or checksum rejected the value.");
  const { analysis, selection: savedSelection } = artifact.payload;
  const receipt = savedSelection.resolvedObject?.evidenceReceipt;
  const subject = selection.binding.subject!;
  if (canonical(analysis) !== canonical(parsePointObjectAiResponse(input.evidence.response)) ||
      savedSelection.object.sourceFeatureId !== SOURCE_ID || savedSelection.resolvedObject?.sourceFeatureId !== SOURCE_ID ||
      quality20Hash(savedSelection.resolvedObject.displayGeometry ?? null) !== subject.geometryHash ||
      receipt?.evidencePackHash !== subject.evidencePackHash || receipt.sourceResponseHash !== subject.sourceResponseHash ||
      receipt.acquiredAt !== subject.acquiredAt) throw new Error("A09 saved artifact differs from the actual response or frozen source.");
  // Retain the original browser object, never reconstruct it from provider JSON.
  return { schemaVersion: COMPLETE25_ARTIFACT_SCHEMA, caseId: "A09" as const,
    execution: { ...selection.manifest.execution }, manifestSha256: selection.manifestSha256,
    source: { ...subject }, responseHash: evidence.responseHash, resultHash: evidence.resultHash,
    actualRequestHash: evidence.actualRequestHash, payloadHash: input.payloadHash, artifact: input.artifact };
}
export async function writeComplete25RealArtifact(path: string, selection: Quality20Selection, input: Complete25ArtifactInput) {
  validateSprint10AnalysisEvidencePath(path);
  const output = await buildComplete25RealArtifact(selection, input);
  assertPublic(output);
  const bytes = `${JSON.stringify(output)}\n`;
  if (Buffer.byteLength(bytes, "utf8") > MAX_BYTES) throw new Error("A09 artifact exceeds bounded size.");
  validateSprint10AnalysisEvidencePath(path);
  const temporaryPath = join(dirname(path), `.a09-artifact-${randomUUID()}.tmp`);
  const descriptor = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    fchmodSync(descriptor, 0o600); writeFileSync(descriptor, bytes, "utf8"); fsyncSync(descriptor);
    validateSprint10AnalysisEvidencePath(path); linkSync(temporaryPath, path);
  } finally { closeSync(descriptor); unlinkSync(temporaryPath); }
  const directory = openSync(dirname(path), constants.O_RDONLY);
  try { fsyncSync(directory); } finally { closeSync(directory); }
  return output;
}

import { randomUUID } from "node:crypto";
import { closeSync, constants, fchmodSync, fsyncSync, linkSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
// @ts-expect-error Node's offline runner requires the explicit extension.
import { validateSprint10AnalysisEvidencePath, SPRINT10_PUBLIC_ANALYSIS_QUESTION } from "./sprint10-analysis-result-evidence.ts";
// @ts-expect-error Node's offline runner requires the explicit extension.
import { parseSprint10ProviderTelemetry, SPRINT10_ANALYSIS_PROMPT_VERSION } from "./sprint10-live-budget.ts";

export const QUALITY20_ARTIFACT_EXPORT_OPT_IN = "export-private-real-analysis-artifact-v1";
export const QUALITY20_REAL_ARTIFACT_SCHEMA = "geoai.quality20.real-artifact.v1";
export const QUALITY20_REAL_ARTIFACT_MAX_BYTES = 512 * 1024;

export function validateQuality20ArtifactExportEnvironment(source: Record<string, string | undefined>, scope: string | undefined) {
  const optIn = source.GEOAI_QUALITY20_ARTIFACT_EXPORT;
  const path = source.GEOAI_QUALITY20_ARTIFACT_EXPORT_PATH;
  if (optIn === undefined && path === undefined) return {};
  if (optIn !== QUALITY20_ARTIFACT_EXPORT_OPT_IN || scope !== "dubai-analyse") throw new Error("Real artifact export requires its exact opt-in and Dubai Analyse scope.");
  return { GEOAI_QUALITY20_ARTIFACT_EXPORT: optIn, GEOAI_QUALITY20_ARTIFACT_EXPORT_PATH: validateSprint10AnalysisEvidencePath(path) };
}

type ExportInput = { candidateCommit: string; candidateHost: string; sourceFeatureId: string; payloadHash: string; artifact: unknown };
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function assertPublic(value: unknown): void {
  if (typeof value === "string" && (/\b(?:Bearer\s+|sk-[A-Za-z0-9_-]{12,}|sb_(?:secret|publishable)_|eyJ[A-Za-z0-9_-]{10,}\.)/i.test(value) ||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /[?&](?:token|key|secret|password|code)=/i.test(value))) throw new Error("Private text is not exportable.");
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (/^(?:userId|identityKey|projectId|email|password|authorization|cookie|headers|challenge|access_token|refresh_token|serviceRoleKey)$/i.test(key)) throw new Error("Private fields are not exportable.");
    assertPublic(child);
  }
}

export async function buildQuality20RealArtifact(input: ExportInput) {
  if (!/^[a-f0-9]{40}$/.test(input.candidateCommit) || !/^geoai-[a-z0-9-]+\.vercel\.app$/.test(input.candidateHost) ||
      !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(input.sourceFeatureId) || !/^[a-f0-9]{64}$/.test(input.payloadHash)) throw new Error("Real artifact provenance is invalid.");
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > QUALITY20_REAL_ARTIFACT_MAX_BYTES) throw new Error("Real artifact exceeds bounded size.");
  assertPublic(input.artifact);
  // Lazy imports keep the runner's environment-only validation independent of application aliases.
  const { parseSavedPointObjectArtifact } = await import("../../../src/lib/prototype/point-object-projects-contract");
  const { hashPointObjectOperation } = await import("../../../src/lib/prototype/point-object-projects");
  const artifact = parseSavedPointObjectArtifact(input.artifact);
  if (!artifact || artifact.kind !== "analyse" || artifact.marketKey !== "dubai" || artifact.locale !== "en" ||
      canonical(artifact) !== canonical(input.artifact) || artifact.payloadHash !== input.payloadHash ||
      await hashPointObjectOperation(artifact) !== input.payloadHash) throw new Error("Real artifact parser or checksum rejected the saved value.");
  const { analysis, selection } = artifact.payload;
  if (analysis.subject.sourceFeatureId !== input.sourceFeatureId || selection.object.sourceFeatureId !== input.sourceFeatureId ||
      selection.resolvedObject?.sourceFeatureId !== input.sourceFeatureId || analysis.subject.sourceLabel !== "© OpenStreetMap contributors" ||
      analysis.request.question !== SPRINT10_PUBLIC_ANALYSIS_QUESTION || analysis.request.depth !== "standard" ||
      analysis.request.goal !== "custom" || analysis.request.role !== "developer" || analysis.request.scenario !== "unspecified" ||
      !/^p2o_live_evidence_[a-f0-9]{24}$/.test(analysis.evidencePackId)) throw new Error("Real artifact source or ordinary Analyse request changed.");
  const telemetry = parseSprint10ProviderTelemetry({ requestKey: "S4.REAL.ARTIFACT.EXPORT", phase: "S4", candidateHost: input.candidateHost,
    candidateCommit: input.candidateCommit, route: "ai", depth: "standard", promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 }, analysis);
  if (!telemetry) throw new Error("Real artifact current provider telemetry is missing.");
  return { schemaVersion: QUALITY20_REAL_ARTIFACT_SCHEMA, candidateCommit: input.candidateCommit, candidateHost: input.candidateHost,
    sourceFeatureId: input.sourceFeatureId, payloadHash: input.payloadHash, artifact };
}

export async function parseQuality20RealArtifactExport(value: unknown, expected: { candidateCommit: string; candidateHost: string }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Real artifact envelope is invalid.");
  const envelope = value as Record<string, unknown>;
  if (Object.keys(envelope).sort().join(",") !== "artifact,candidateCommit,candidateHost,payloadHash,schemaVersion,sourceFeatureId" ||
      envelope.schemaVersion !== QUALITY20_REAL_ARTIFACT_SCHEMA || envelope.candidateCommit !== expected.candidateCommit ||
      envelope.candidateHost !== expected.candidateHost) throw new Error("Real artifact envelope provenance is invalid.");
  return buildQuality20RealArtifact(envelope as unknown as ExportInput);
}

export async function writeQuality20RealArtifact(path: string, input: ExportInput) {
  validateSprint10AnalysisEvidencePath(path);
  const output = await buildQuality20RealArtifact(input);
  const serialized = `${JSON.stringify(output)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > QUALITY20_REAL_ARTIFACT_MAX_BYTES) throw new Error("Real artifact exceeds bounded size.");
  validateSprint10AnalysisEvidencePath(path);
  const temporaryPath = join(dirname(path), `.real-artifact-${randomUUID()}.tmp`);
  const descriptor = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    fchmodSync(descriptor, 0o600); writeFileSync(descriptor, serialized, "utf8"); fsyncSync(descriptor);
    validateSprint10AnalysisEvidencePath(path);
    linkSync(temporaryPath, path);
  } finally { closeSync(descriptor); unlinkSync(temporaryPath); }
  const directory = openSync(dirname(path), constants.O_RDONLY);
  try { fsyncSync(directory); } finally { closeSync(directory); }
  return output;
}

import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, openSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
// @ts-expect-error The offline Node strip-types runner needs an explicit extension.
import { QUALITY20_CASES } from "./quality20-frozen-case.ts";

export type Quality20Acquisition = {
  schemaVersion: "geoai.quality20.nonpaid-acquisition.v1";
  execution: { commit: string; origin: string; deploymentId: string };
  caseId: string; marketKey: "dubai" | "singapore"; query: string; expectedSourceIdentity: string;
  planSha256: string; outputPath: string;
};
function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`QUALITY20_ACQUISITION_BLOCKED: ${message}`);
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function canonicalReceivedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalReceivedJson).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalReceivedJson(value[key])}`).join(",")}}`;
  guard(value === null || ["string", "number", "boolean"].includes(typeof value), "Unsupported received JSON value.");
  return JSON.stringify(value);
}
export function loadQuality20Acquisition(env: Record<string, string | undefined>, execution: { commit: string; origin: string }): Quality20Acquisition {
  const path = env.GEOAI_QUALITY20_ACQUISITION_PLAN_PATH;
  const hash = env.GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256;
  const outputPath = env.GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH;
  guard(path && isAbsolute(path) && realpathSync(path) === path && hash && /^[a-f0-9]{64}$/.test(hash), "Private plan path and approved SHA256 required.");
  guard(outputPath && isAbsolute(outputPath) && dirname(outputPath) === realpathSync(dirname(outputPath)) &&
    (statSync(dirname(outputPath)).mode & 0o077) === 0, "Output must be in a canonical private directory.");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes: string;
  try {
    const stat = fstatSync(fd);
    guard(stat.isFile() && stat.nlink === 1 && stat.size <= 16_384 && (stat.mode & 0o077) === 0, "Plan is not a private bounded regular file.");
    bytes = readFileSync(fd, "utf8");
  } finally { closeSync(fd); }
  guard(createHash("sha256").update(bytes).digest("hex") === hash, "Plan bytes do not match approval.");
  const plan: unknown = JSON.parse(bytes);
  guard(record(plan) && Object.keys(plan).sort().join(",") === "caseId,execution,expectedSourceIdentity,marketKey,query,schemaVersion" &&
    plan.schemaVersion === "geoai.quality20.nonpaid-acquisition.v1" && record(plan.execution) &&
    plan.execution.commit === execution.commit && plan.execution.origin === execution.origin &&
    typeof plan.execution.deploymentId === "string" && /^dpl_[A-Za-z0-9]+$/.test(plan.execution.deploymentId), "Invalid acquisition plan/execution identity.");
  const definition = QUALITY20_CASES.find((entry) => entry.id === plan.caseId);
  guard(definition?.scope === "quality20-analyse" && definition.marketKey === plan.marketKey &&
    typeof plan.query === "string" && plan.query.length >= 2 && plan.query.length <= 200 && !/[\u0000-\u001f]/.test(plan.query) &&
    typeof plan.expectedSourceIdentity === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(plan.expectedSourceIdentity), "Use a registered case and exact previously observed source ID/query.");
  return { ...(plan as unknown as Omit<Quality20Acquisition, "planSha256" | "outputPath">), planSha256: hash, outputPath };
}
export function writeQuality20Acquisition(plan: Quality20Acquisition, payload: unknown, receivedAt: string) {
  guard(record(payload) && payload.mode === "resolved" && payload.schemaVersion === 2 && record(payload.subject) &&
    payload.subject.sourceFeatureId === plan.expectedSourceIdentity && Number.isFinite(Date.parse(receivedAt)), "Received subject differs from the acquisition plan.");
  const canonical = canonicalReceivedJson(payload);
  guard(Buffer.byteLength(canonical) <= 512_000 && !/\b(?:Bearer\s+[A-Za-z0-9._~-]+|sk-[A-Za-z0-9_-]{12,}|sb_secret_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/.test(canonical), "Received context is oversized or credential-shaped.");
  const evidence = payload.evidenceReceipt;
  if (evidence !== undefined) {
    guard(record(evidence) && [evidence.evidencePackHash, evidence.sourceResponseHash].every((value) =>
      typeof value === "string" && /^[a-f0-9]{64}$/.test(value)) && typeof evidence.acquiredAt === "string" &&
      Number.isFinite(Date.parse(evidence.acquiredAt)), "Present server evidence receipt is malformed.");
  }
  const serverReceipt = record(evidence) ? evidence : null;
  const receipt = {
    schemaVersion: "geoai.quality20.nonpaid-acquisition-receipt.v1", status: "ACQUIRED_NOT_ANALYSED",
    caseId: plan.caseId, execution: plan.execution, planSha256: plan.planSha256,
    sourceIdentity: payload.subject.sourceFeatureId, geometry: payload.subject.displayGeometry ?? null,
    geometryHash: createHash("sha256").update(JSON.stringify(payload.subject.displayGeometry ?? null)).digest("hex"),
    canonicalReceivedEvidenceHash: createHash("sha256").update(canonical).digest("hex"),
    receivedAt, receivedAtMeaning: "local_browser_response_receipt_time_NOT_source_freshness",
    sourceAcquiredAt: serverReceipt?.acquiredAt ?? null, serverEvidencePackHash: serverReceipt?.evidencePackHash ?? null,
    sourceResponseHash: serverReceipt?.sourceResponseHash ?? null,
    receivedEvidence: payload, paidPostCount: 0,
    comparisonAcceptance: serverReceipt ? "NOT_EVALUATED_ACQUISITION_ONLY" : "BLOCKED_SERVER_SNAPSHOT_NOT_EXPOSED"
  };
  const fd = openSync(plan.outputPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify(receipt, null, 2)); fsyncSync(fd); } finally { closeSync(fd); }
  return { status: receipt.status, canonicalReceivedEvidenceHash: receipt.canonicalReceivedEvidenceHash };
}

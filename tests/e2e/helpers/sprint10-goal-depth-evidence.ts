import {
  SPRINT10_PUBLIC_ANALYSIS_QUESTION, validateSprint10AnalysisEvidencePath,
  buildSprint10AnalysisResultEvidence, type Sprint10AnalysisEvidenceInput
// @ts-expect-error Node transform-types requires the explicit extension.
} from "./sprint10-analysis-result-evidence.ts";
// @ts-expect-error Node transform-types requires the explicit extension.
import { validateSprint10DepthCycleTransportIdentity } from "./sprint10-depth-cycle-evidence.ts";
import { closeSync, constants, fchmodSync, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import {
  SPRINT10_GOAL_DEPTH_SCOPES, validateSprint10GoalDepthRequest, type Sprint10GoalDepthScope
// @ts-expect-error Node transform-types requires the explicit extension.
} from "./sprint10-live-journey-gate.ts";

export const SPRINT10_GOAL_DEPTH_CAPTURE_OPT_IN = "write-three-public-goal-depth-responses";
const depths = ["standard", "deep", "quick"] as const;

export function validateGoalDepthCaptureEnvironment(source: Record<string, string | undefined>, scope: string | undefined) {
  const capture = source.GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_CAPTURE;
  const prefix = source.GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX;
  if (capture === undefined && prefix === undefined) return {};
  if (capture !== SPRINT10_GOAL_DEPTH_CAPTURE_OPT_IN || typeof prefix !== "string" || !scope ||
      !Object.hasOwn(SPRINT10_GOAL_DEPTH_SCOPES, scope)) throw new Error("Goal-depth capture requires its exact opt-in, scope and output prefix.");
  if (["GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE", "GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH",
    "GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE", "GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_PATH"].some((key) => source[key] !== undefined)) {
    throw new Error("Goal-depth capture cannot be combined with another capture.");
  }
  for (const depth of depths) validateSprint10AnalysisEvidencePath(`${prefix}-${depth}.json`);
  return { GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_CAPTURE: capture, GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX: prefix };
}

export function writeSprint10GoalDepthEvidence(prefix: string, scope: Sprint10GoalDepthScope, occurrence: number, input: Sprint10AnalysisEvidenceInput) {
  if (occurrence < 2 || occurrence > 4 || !Number.isInteger(occurrence)) throw new Error("Goal-depth capture permits only the three follow-up results.");
  const transport = validateSprint10DepthCycleTransportIdentity(input.submittedRequest, input.expectedSourceFeatureId);
  validateSprint10GoalDepthRequest(input.submittedRequest, occurrence, { sourceFeatureId: input.expectedSourceFeatureId,
    longitude: transport.longitude, latitude: transport.latitude }, scope);
  const submitted = input.submittedRequest as Record<string, unknown>;
  const response = input.response as { request?: Record<string, unknown> } | null;
  const receipt = response?.request;
  if (!receipt || receipt.focused !== true || ["goal", "question", "depth", "role", "scenario", "perspective", "horizon", "locale"].some((key) => receipt[key] !== submitted[key])) {
    throw new Error("Goal-depth capture response changed its exact submitted public inputs.");
  }
  // Preserve the real goal/depth in the unchanged bounded capture schema. The
  // public preset question is verified above, then normalized only in copies
  // for the existing strict content/telemetry sanitizer (as in depth-cycle).
  const sanitized = buildSprint10AnalysisResultEvidence({
    ...input,
    submittedRequest: { ...submitted, question: SPRINT10_PUBLIC_ANALYSIS_QUESTION },
    response: { ...response, request: { ...receipt, question: SPRINT10_PUBLIC_ANALYSIS_QUESTION } }
  });
  const evidence = {
    schemaVersion: "geoai.sprint10.functional-goal-depth-evidence.v1",
    captureKind: "one_validated_public_goal_depth_result",
    comparativeBenchmark: false, rawResponseCaptured: false, privateRequestFieldsCaptured: false,
    scope, occurrence,
    // These fields are copied from the real validated response, before the
    // validation-only question normalization. Coordinates/challenge omitted.
    actualRequest: Object.fromEntries(["goal", "question", "depth", "role", "scenario", "perspective", "horizon", "locale", "focused"].map((key) => [key, receipt[key]])),
    result: sanitized
  };
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > 100 * 1024) throw new Error("Goal-depth evidence exceeds its bounded file size.");
  const path = validateSprint10AnalysisEvidencePath(`${prefix}-${depths[occurrence - 2]}.json`);
  const descriptor = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    fchmodSync(descriptor, 0o600);
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.nlink !== 1 || (opened.mode & 0o777) !== 0o600) throw new Error("Goal-depth capture file is unsafe.");
    writeFileSync(descriptor, serialized, "utf8"); fsyncSync(descriptor);
  }
  finally { closeSync(descriptor); }
  const written = lstatSync(path);
  if (!written.isFile() || written.isSymbolicLink() || written.nlink !== 1 || (written.mode & 0o777) !== 0o600 || realpathSync(path) !== path) {
    throw new Error("Goal-depth capture output is not one private regular file.");
  }
  if (readFileSync(path, "utf8") !== serialized) throw new Error("Goal-depth evidence did not round-trip exactly.");
  return evidence;
}

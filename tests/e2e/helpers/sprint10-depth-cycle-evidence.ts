import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

import {
  SPRINT10_PUBLIC_ANALYSIS_QUESTION,
  buildSprint10AnalysisResultEvidence,
  validateSprint10AnalysisEvidencePath,
  type Sprint10AnalysisEvidenceInput,
  type Sprint10AnalysisResultEvidence
// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
} from "./sprint10-analysis-result-evidence.ts";
// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
import { validateSprint10PublicEvidenceReceipt } from "./sprint10-live-journey-gate.ts";

export const SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA = "geoai.sprint10.depth-cycle-evidence.v1" as const;
export const SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN = "write-three-dubai-depth-cycle-responses" as const;
export const SPRINT10_DEPTH_CYCLE_EVIDENCE_MAX_BYTES = 320 * 1024;
export const SPRINT10_DEVELOPMENT_SCREENING_QUESTION =
  "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment." as const;

const DEPTHS = ["standard", "deep", "quick"] as const;
const SUBMITTED_KEYS = [
  "caseKey", "longitude", "latitude", "locale", "role", "scenario", "question", "depth", "goal",
  "perspective", "horizon", "expectedSourceFeatureId", "consent", "challenge", "evidenceReceipt"
] as const;

type JsonRecord = Record<string, unknown>;

export type Sprint10DepthCycleEvidenceInput = Sprint10AnalysisEvidenceInput;

export type Sprint10DepthCycleTransportIdentity = {
  caseKey: "dubai";
  longitude: number;
  latitude: number;
};

export type Sprint10DepthCycleEvidence = {
  schemaVersion: typeof SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA;
  captureKind: "three_synthetic_public_dubai_screening_responses";
  rawSourcePackCaptured: false;
  privateRequestFieldsCaptured: false;
  sourceFeatureId: string;
  screeningInputs: {
    role: string;
    scenario: string;
    goal: "development_screening";
    perspective: string;
    horizon: string;
    locale: "en";
    question: typeof SPRINT10_DEVELOPMENT_SCREENING_QUESTION;
  };
  evidencePackComparison: {
    status: "COMPARABLE" | "NOT_COMPARABLE";
    basis: "same_evidence_pack_hash" | "evidence_pack_hash_changed";
    evidencePackHashes: [string, string, string];
  };
  results: [Sprint10AnalysisResultEvidence, Sprint10AnalysisResultEvidence, Sprint10AnalysisResultEvidence];
};

function fail(message: string): never {
  throw new Error(`Sprint 10 depth-cycle evidence rejected: ${message}`);
}

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

export function validateSprint10DepthCycleTransportIdentity(
  submittedRequest: unknown,
  expectedSourceFeatureId: unknown
): Sprint10DepthCycleTransportIdentity {
  if (!record(submittedRequest) || !exactKeys(submittedRequest, SUBMITTED_KEYS)) {
    fail("one submitted request has an unexpected shape.");
  }
  if (submittedRequest.caseKey !== "dubai" ||
      typeof submittedRequest.longitude !== "number" || !Number.isFinite(submittedRequest.longitude) ||
      submittedRequest.longitude < -180 || submittedRequest.longitude > 180 ||
      typeof submittedRequest.latitude !== "number" || !Number.isFinite(submittedRequest.latitude) ||
      submittedRequest.latitude < -90 || submittedRequest.latitude > 90 ||
      typeof expectedSourceFeatureId !== "string" ||
      submittedRequest.expectedSourceFeatureId !== expectedSourceFeatureId ||
      submittedRequest.consent !== true) {
    fail("the public source transport identity is invalid.");
  }
  validateSprint10PublicEvidenceReceipt(submittedRequest.evidenceReceipt, expectedSourceFeatureId, false);
  return {
    caseKey: "dubai",
    longitude: submittedRequest.longitude,
    latitude: submittedRequest.latitude
  };
}

function pathEntry(path: string): ReturnType<typeof lstatSync> | null {
  try { return lstatSync(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    fail("output path could not be inspected safely.");
  }
}

function validateAndSanitize(input: Sprint10DepthCycleEvidenceInput, expectedDepth: typeof DEPTHS[number]) {
  if (!record(input) || !exactKeys(input, ["response", "submittedRequest", "expectedSourceFeatureId", "telemetryIdentity"])) {
    fail("one result input has an unexpected shape.");
  }
  if (!record(input.response) || !record(input.response.request)) fail("one response has an unexpected shape.");
  const transportIdentity = validateSprint10DepthCycleTransportIdentity(input.submittedRequest, input.expectedSourceFeatureId);
  const submitted = record(input.submittedRequest) ? input.submittedRequest : fail("one submitted request has an unexpected shape.");
  const receipt = input.response.request;
  const compared = ["role", "scenario", "depth", "goal", "perspective", "horizon", "locale", "question"] as const;
  if (compared.some((key) => receipt[key] !== submitted[key]) || receipt.focused !== true ||
      submitted.depth !== expectedDepth || submitted.goal !== "development_screening" ||
      submitted.locale !== "en" || submitted.question !== SPRINT10_DEVELOPMENT_SCREENING_QUESTION ||
      submitted.expectedSourceFeatureId !== input.expectedSourceFeatureId || submitted.consent !== true) {
    fail(`the ${expectedDepth} request does not preserve the exact screening inputs.`);
  }
  if (input.telemetryIdentity.depth !== expectedDepth) fail(`the ${expectedDepth} telemetry identity is mismatched.`);

  // The established single-response sanitizer is deliberately restricted to its
  // fixed public benchmark question. Substitute that field only in validation
  // copies so its strict content/telemetry whitelist can be reused; the actual
  // preset question was matched above and is recorded once in screeningInputs.
  const validationResponse = structuredClone(input.response) as JsonRecord;
  (validationResponse.request as JsonRecord).question = SPRINT10_PUBLIC_ANALYSIS_QUESTION;
  const validationSubmitted = { ...submitted, question: SPRINT10_PUBLIC_ANALYSIS_QUESTION };
  return {
    transportIdentity,
    evidence: buildSprint10AnalysisResultEvidence({
      ...input,
      response: validationResponse,
      submittedRequest: validationSubmitted
    })
  };
}

export function buildSprint10DepthCycleEvidence(inputs: unknown): Sprint10DepthCycleEvidence {
  if (!Array.isArray(inputs) || inputs.length !== 3) fail("exactly three screening responses are required.");
  const validated = DEPTHS.map((depth, index) => validateAndSanitize(inputs[index] as Sprint10DepthCycleEvidenceInput, depth));
  const results = validated.map((item) => item.evidence) as
    [Sprint10AnalysisResultEvidence, Sprint10AnalysisResultEvidence, Sprint10AnalysisResultEvidence];
  const publicTransportIdentity = validated[0].transportIdentity;
  if (validated.slice(1).some(({ transportIdentity }) =>
    transportIdentity.caseKey !== publicTransportIdentity.caseKey ||
    transportIdentity.longitude !== publicTransportIdentity.longitude ||
    transportIdentity.latitude !== publicTransportIdentity.latitude)) {
    fail("public source transport identity changed across the depth cycle.");
  }
  const sourceFeatureId = results[0].sourceFeatureId;
  if (results.some((result) => result.sourceFeatureId !== sourceFeatureId)) fail("source identity changed across the depth cycle.");
  const [first, ...rest] = results.map((result) => result.submitted);
  if (rest.some((submitted) => ["role", "scenario", "goal", "perspective", "horizon", "locale"]
    .some((key) => submitted[key as keyof typeof submitted] !== first[key as keyof typeof first]))) {
    fail("non-depth screening inputs changed across the depth cycle.");
  }
  const hashes = results.map((result) => result.evidencePackHash) as [string, string, string];
  const evidence: Sprint10DepthCycleEvidence = {
    schemaVersion: SPRINT10_DEPTH_CYCLE_EVIDENCE_SCHEMA,
    captureKind: "three_synthetic_public_dubai_screening_responses",
    rawSourcePackCaptured: false,
    privateRequestFieldsCaptured: false,
    sourceFeatureId,
    screeningInputs: {
      role: first.role,
      scenario: first.scenario,
      goal: "development_screening",
      perspective: first.perspective,
      horizon: first.horizon,
      locale: "en",
      question: SPRINT10_DEVELOPMENT_SCREENING_QUESTION
    },
    evidencePackComparison: {
      status: hashes.every((hash) => hash === hashes[0])
        ? "COMPARABLE"
        : "NOT_COMPARABLE",
      basis: hashes.every((hash) => hash === hashes[0])
        ? "same_evidence_pack_hash"
        : "evidence_pack_hash_changed",
      evidencePackHashes: hashes
    },
    results
  };
  if (Buffer.byteLength(`${JSON.stringify(evidence)}\n`, "utf8") > SPRINT10_DEPTH_CYCLE_EVIDENCE_MAX_BYTES) {
    fail("whitelisted evidence exceeds the bounded file size.");
  }
  return evidence;
}

export function validateSprint10DepthCycleEvidencePath(pathValue: unknown): string {
  return validateSprint10AnalysisEvidencePath(pathValue);
}

export function writeSprint10DepthCycleEvidence(pathValue: unknown, inputs: unknown): Sprint10DepthCycleEvidence {
  const path = validateSprint10DepthCycleEvidencePath(pathValue);
  const evidence = buildSprint10DepthCycleEvidence(inputs);
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > SPRINT10_DEPTH_CYCLE_EVIDENCE_MAX_BYTES) fail("formatted evidence exceeds the bounded file size.");
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, serialized, "utf8");
    fsyncSync(descriptor);
    const temporary = fstatSync(descriptor);
    if (!temporary.isFile() || temporary.nlink !== 1 || (temporary.mode & 0o777) !== 0o600) fail("temporary evidence file is unsafe.");
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporaryPath, path);
    unlinkSync(temporaryPath);
    const written = lstatSync(path);
    if (!written.isFile() || written.isSymbolicLink() || written.nlink !== 1 || (written.mode & 0o777) !== 0o600 || realpathSync(path) !== path) {
      fail("written evidence file is not one private regular file.");
    }
    const directory = openSync(dirname(path), constants.O_RDONLY);
    try { fsyncSync(directory); } finally { closeSync(directory); }
    const reread: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (JSON.stringify(reread) !== JSON.stringify(evidence)) fail("written evidence did not round-trip exactly.");
    return evidence;
  } catch (error) {
    if (typeof descriptor === "number") closeSync(descriptor);
    const temporary = pathEntry(temporaryPath);
    if (temporary?.isFile() && !temporary.isSymbolicLink()) unlinkSync(temporaryPath);
    throw error;
  }
}

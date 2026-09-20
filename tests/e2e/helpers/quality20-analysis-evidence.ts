import { randomUUID } from "node:crypto";
import { closeSync, constants, fchmodSync, fstatSync, fsyncSync, linkSync, lstatSync, openSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN, SPRINT10_PUBLIC_ANALYSIS_QUESTION,
  buildSprint10AnalysisResultEvidence, validateSprint10AnalysisEvidencePath, type Sprint10AnalysisEvidenceInput
// @ts-expect-error Node offline runner requires the explicit extension.
} from "./sprint10-analysis-result-evidence.ts";
import { QUALITY20_CASES, quality20Hash, quality20RequestKey, validateQuality20PaidBody, validateQuality20AnalysisResult, type Quality20Selection
// @ts-expect-error Node offline runner requires the explicit extension.
} from "./quality20-frozen-case.ts";

export const QUALITY20_ANALYSIS_EVIDENCE_SCHEMA = "geoai.quality20.analysis-result-evidence.v1";
const MAX_BYTES = 112 * 1024;
const hashPattern = /^[a-f0-9]{64}$/;
const requestFields = ["role", "scenario", "depth", "goal", "perspective", "horizon", "question", "locale", "focused"] as const;

export function validateQuality20AnalysisCaptureEnvironment(source: Record<string, string | undefined>, scope: string | undefined) {
  const capture = source.GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE;
  const path = source.GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH;
  if (capture === undefined && path === undefined) return {};
  if (capture !== SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN || scope !== "quality20-analyse") {
    throw new Error("Quality20 analysis capture requires its exact public-response opt-in and frozen Analyse scope.");
  }
  if (Object.keys(source).some(key => source[key] !== undefined &&
      (/^GEOAI_SPRINT10_.*EVIDENCE_(?:CAPTURE|PATH|PREFIX)$/.test(key) || /^GEOAI_QUALITY20_ARTIFACT_EXPORT/.test(key)))) {
    throw new Error("Quality20 analysis capture cannot be combined with another capture or artifact export.");
  }
  return { GEOAI_QUALITY20_ANALYSIS_EVIDENCE_CAPTURE: capture,
    GEOAI_QUALITY20_ANALYSIS_EVIDENCE_PATH: validateSprint10AnalysisEvidencePath(path) };
}

export function buildQuality20AnalysisEvidence(selection: Quality20Selection, input: Sprint10AnalysisEvidenceInput) {
  const definition = QUALITY20_CASES.find(item => item.id === selection.definition.id);
  if (!definition || definition.scope !== "quality20-analyse" || quality20Hash(definition) !== quality20Hash(selection.definition) ||
      !hashPattern.test(selection.manifestSha256) || input.telemetryIdentity.requestKey !== quality20RequestKey(selection, "ai") ||
      input.telemetryIdentity.candidateCommit !== selection.manifest.execution.commit ||
      input.telemetryIdentity.candidateHost !== new URL(selection.manifest.execution.origin).hostname ||
      !/^[a-f0-9]{40}$/.test(input.telemetryIdentity.candidateCommit)) throw new Error("Quality20 capture identity differs from the frozen case.");
  // Exact original request/response acceptance runs BEFORE normalization. Never
  // change the submitted paid request, actual response, frozen question or hashes.
  validateQuality20PaidBody(selection, "ai", input.submittedRequest);
  validateQuality20AnalysisResult(selection, input.response);
  const submitted = input.submittedRequest as Record<string, unknown>;
  const response = input.response as Record<string, unknown> & { request: Record<string, unknown> };
  if (response.request.focused !== true || requestFields.filter(key => key !== "focused").some(key => response.request[key] !== submitted[key])) {
    throw new Error("Quality20 capture response changed the actual submitted public request.");
  }
  const question = response.request.question;
  if (typeof question !== "string" || !question.length || question.length > 2000 || /[\u0000-\u001f\u007f]/.test(question) ||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bBearer\s+|\bsk-[A-Za-z0-9_-]{12,}|\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|[?&](?:token|key|secret|password|code)=/i.test(question)) {
    throw new Error("Quality20 capture question is not bounded public text.");
  }
  // Same compatibility adapter as goal-depth capture: normalize only copies for
  // the existing strict content/telemetry sanitizer. The envelope retains the
  // actual frozen public question and hashes the untouched wire response.
  const result = buildSprint10AnalysisResultEvidence({ ...input,
    submittedRequest: { ...submitted, question: SPRINT10_PUBLIC_ANALYSIS_QUESTION },
    response: { ...response, request: { ...response.request, question: SPRINT10_PUBLIC_ANALYSIS_QUESTION } } });
  const actualRequest = Object.fromEntries(requestFields.map(key => [key, response.request[key]]));
  const evidence = { schemaVersion: QUALITY20_ANALYSIS_EVIDENCE_SCHEMA, captureKind: "one_frozen_public_analysis_response",
    caseId: definition.id, marketKey: definition.marketKey, manifestSha256: selection.manifestSha256,
    candidateCommit: input.telemetryIdentity.candidateCommit,
    rawResponseCaptured: false, rawSourcePackCaptured: false, privateRequestFieldsCaptured: false,
    sanitizerQuestionNormalization: "validation_only_after_frozen_parity",
    hashMethod: "sha256_json_stringify",
    responseHash: quality20Hash(input.response), actualRequestHash: quality20Hash(actualRequest),
    resultHash: quality20Hash(result), actualRequest, result };
  if (Buffer.byteLength(JSON.stringify(evidence), "utf8") > MAX_BYTES) throw new Error("Quality20 analysis evidence exceeds its bounded size.");
  return evidence;
}

export function writeQuality20AnalysisEvidence(pathValue: unknown, selection: Quality20Selection, input: Sprint10AnalysisEvidenceInput) {
  const path = validateSprint10AnalysisEvidencePath(pathValue);
  const evidence = buildQuality20AnalysisEvidence(selection, input);
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > MAX_BYTES) throw new Error("Quality20 formatted analysis evidence exceeds its bounded size.");
  // Existing evidence-writer contract: private real 0700 parent, exclusive0600
  // temp file, no-follow, atomic no-overwrite publication, fsync and exact readback.
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  const descriptor = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    fchmodSync(descriptor, 0o600);
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.nlink !== 1 || (opened.mode & 0o777) !== 0o600) throw new Error("Quality20 evidence temporary file is unsafe.");
    writeFileSync(descriptor, serialized, "utf8"); fsyncSync(descriptor);
    validateSprint10AnalysisEvidencePath(path);
    linkSync(temporaryPath, path);
  } finally { closeSync(descriptor); unlinkSync(temporaryPath); }
  const directory = openSync(dirname(path), constants.O_RDONLY);
  try { fsyncSync(directory); } finally { closeSync(directory); }
  const written = lstatSync(path);
  if (!written.isFile() || written.isSymbolicLink() || written.nlink !== 1 || (written.mode & 0o777) !== 0o600 ||
      realpathSync(path) !== path || readFileSync(path, "utf8") !== serialized) throw new Error("Quality20 evidence did not round-trip as one private regular file.");
  return evidence;
}

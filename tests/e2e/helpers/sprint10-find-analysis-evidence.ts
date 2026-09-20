// @ts-expect-error Node transform-types requires the explicit extension.
import { validateSprint10AnalysisEvidencePath } from "./sprint10-analysis-result-evidence.ts";

export const SPRINT10_FIND_ANALYSIS_CAPTURE_OPT_IN = "write-three-public-find-analysis-responses";
export function validateFindAnalysisCaptureEnvironment(source: Record<string, string | undefined>, scope: string | undefined) {
  const capture = source.GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_CAPTURE;
  const prefix = source.GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_PREFIX;
  if (capture === undefined && prefix === undefined) return {};
  if (capture !== SPRINT10_FIND_ANALYSIS_CAPTURE_OPT_IN || typeof prefix !== "string" || !prefix || (scope !== "dubai-find-analysis" && scope !== "dubai-find-construction")) {
    throw new Error("Find analysis capture requires its exact opt-in, scope and output prefix.");
  }
  if (["GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE", "GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH", "GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE",
    "GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_PATH", "GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_CAPTURE", "GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX"].some((key) => source[key] !== undefined)) {
    throw new Error("Find analysis capture cannot be combined with another capture.");
  }
  for (const index of [1, 2, 3]) validateSprint10AnalysisEvidencePath(`${prefix}-${index}.json`);
  return { GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_CAPTURE: capture, GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_PREFIX: prefix };
}

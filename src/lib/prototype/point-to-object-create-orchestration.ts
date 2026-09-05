import {
  createProgramSeed,
  inferPromptMassingStyle,
  POINT_OBJECT_CREATE_CONTROL_KEYS,
  type PointObjectCreateControlKey,
  type PointObjectCreateNumericControls
} from "./point-to-object-create-ai-core";
import {
  ConceptMassingError,
  conceptTemplate,
  generateConceptMassingAlternatives,
  validateRedevelopmentProgram,
  type ConceptLocale,
  type ConceptMassingAlternative,
  type ConceptMassingStyle,
  type ConceptTemplateId,
  type ValidatedRedevelopmentProgram
} from "./point-to-object-create";

export const POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT = 8;

export type PointObjectCreateCoverageSuggestion = {
  control: "targetSiteCoveragePct";
  requestedValue: number;
  suggestedValue: number;
  validatedAchievedValue: number;
  searchAttempts: number;
  basis: "bounded_validated_geometry_candidate";
};

export type PointObjectCreatePreflightResult =
  | {
      kind: "not_applicable";
      requestedMassingStyle: ConceptMassingStyle | null;
      reason: "numeric_programme_not_fully_fixed";
    }
  | {
      kind: "ready";
      program: ValidatedRedevelopmentProgram;
      alternatives: ConceptMassingAlternative[];
      seed: string;
      searchAttempts: 1;
    }
  | {
      kind: "suggestion";
      program: ValidatedRedevelopmentProgram;
      alternatives: ConceptMassingAlternative[];
      seed: string;
      suggestion: PointObjectCreateCoverageSuggestion;
    }
  | {
      kind: "failed";
      code: "program_invalid" | "solver_exhausted" | "geometry_validation_failed";
      searchAttempts: number;
    };

function hasEveryFixedControl(keys: readonly PointObjectCreateControlKey[]): boolean {
  const fixed = new Set(keys);
  return POINT_OBJECT_CREATE_CONTROL_KEYS.every((key) => fixed.has(key));
}

function validatedFixedProgram(input: {
  locale: ConceptLocale;
  templateId: ConceptTemplateId;
  controls: PointObjectCreateNumericControls;
  massingStyle: ConceptMassingStyle;
}): ValidatedRedevelopmentProgram | null {
  const base = conceptTemplate(input.templateId, input.locale);
  const validation = validateRedevelopmentProgram({
    ...base,
    ...input.controls,
    massingStyle: input.massingStyle
  });
  return validation.ok ? validation.value : null;
}

function lowerCoverageCandidates(requested: number): number[] {
  if (requested <= 8) return [];
  const candidates = new Set<number>();
  const span = requested - 8;
  for (let attempt = 1; attempt <= POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT; attempt += 1) {
    candidates.add(Math.max(8, Math.floor(requested - span * attempt / POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT)));
  }
  return [...candidates].filter((value) => value < requested).sort((left, right) => right - left);
}

export function preflightPointObjectCreate(input: {
  aoiCoordinates: [number, number][][];
  aoiHash: string;
  locale: ConceptLocale;
  templateId: ConceptTemplateId;
  customPrompt: string | null;
  controls: PointObjectCreateNumericControls;
  lockedControlKeys: readonly PointObjectCreateControlKey[];
}): PointObjectCreatePreflightResult {
  const inferredStyle = inferPromptMassingStyle(input.customPrompt);
  if (!hasEveryFixedControl(input.lockedControlKeys)) {
    return {
      kind: "not_applicable",
      requestedMassingStyle: inferredStyle,
      reason: "numeric_programme_not_fully_fixed"
    };
  }

  const massingStyle = inferredStyle ?? conceptTemplate(input.templateId, input.locale).massingStyle;
  const program = validatedFixedProgram({
    locale: input.locale,
    templateId: input.templateId,
    controls: input.controls,
    massingStyle
  });
  if (!program) return { kind: "failed", code: "program_invalid", searchAttempts: 0 };

  const seed = createProgramSeed(program, input.aoiHash);
  try {
    return {
      kind: "ready",
      program,
      alternatives: generateConceptMassingAlternatives(input.aoiCoordinates, program, seed, input.locale),
      seed,
      searchAttempts: 1
    };
  } catch (error) {
    if (!(error instanceof ConceptMassingError) || error.code !== "programme_does_not_fit") {
      return {
        kind: "failed",
        code: error instanceof ConceptMassingError && error.code === "geometry_validation_failed"
          ? "geometry_validation_failed"
          : "solver_exhausted",
        searchAttempts: 1
      };
    }
  }

  let searchAttempts = 1;
  for (const targetSiteCoveragePct of lowerCoverageCandidates(program.targetSiteCoveragePct)) {
    if (searchAttempts >= POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT) break;
    searchAttempts += 1;
    const candidateProgram = validatedFixedProgram({
      locale: input.locale,
      templateId: input.templateId,
      controls: { ...input.controls, targetSiteCoveragePct },
      massingStyle
    });
    if (!candidateProgram) continue;
    const candidateSeed = createProgramSeed(candidateProgram, input.aoiHash);
    try {
      const alternatives = generateConceptMassingAlternatives(input.aoiCoordinates, candidateProgram, candidateSeed, input.locale);
      const achieved = alternatives[0]?.massing.achievedSiteCoveragePct;
      if (typeof achieved !== "number") continue;
      return {
        kind: "suggestion",
        program: candidateProgram,
        alternatives,
        seed: candidateSeed,
        suggestion: {
          control: "targetSiteCoveragePct",
          requestedValue: program.targetSiteCoveragePct,
          suggestedValue: targetSiteCoveragePct,
          validatedAchievedValue: achieved,
          searchAttempts,
          basis: "bounded_validated_geometry_candidate"
        }
      };
    } catch {
      // Continue through the finite candidate set. No failed candidate is exposed as a suggestion.
    }
  }

  return { kind: "failed", code: "solver_exhausted", searchAttempts };
}

export function bindPointObjectCreateProgramToPreflight(
  generated: ValidatedRedevelopmentProgram,
  preflight: PointObjectCreatePreflightResult
): ValidatedRedevelopmentProgram {
  if (preflight.kind !== "ready") return generated;
  return {
    ...preflight.program,
    title: generated.title,
    summary: generated.summary,
    rationale: [...generated.rationale]
  };
}

export function pointObjectCreatePreflightAllowsProvider(preflight: PointObjectCreatePreflightResult): boolean {
  return preflight.kind === "ready" || preflight.kind === "not_applicable";
}

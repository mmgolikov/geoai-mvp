import {
  exploreRoles,
  isExploreScenarioForRole
} from "@/src/lib/explore/scenarios";
import type {
  ExploreRole,
  ExploreScenarioId
} from "@/src/lib/explore/types";

export const POINT_OBJECT_ANALYSIS_UNSPECIFIED = "unspecified" as const;

export type PointObjectAnalysisRole = ExploreRole | typeof POINT_OBJECT_ANALYSIS_UNSPECIFIED;
export type PointObjectAnalysisScenario = ExploreScenarioId | typeof POINT_OBJECT_ANALYSIS_UNSPECIFIED;

export type PointObjectAnalysisRoleScenarioContext = {
  role: PointObjectAnalysisRole;
  scenario: PointObjectAnalysisScenario;
};

export const POINT_OBJECT_ANALYSIS_ROLE_POLICY = "decision_lens_only_not_permission_or_evidence" as const;

export function parsePointObjectAnalysisRoleScenario(
  role: unknown,
  scenario: unknown
): PointObjectAnalysisRoleScenarioContext | null {
  if (role === POINT_OBJECT_ANALYSIS_UNSPECIFIED && scenario === POINT_OBJECT_ANALYSIS_UNSPECIFIED) {
    return { role, scenario };
  }
  if (typeof role !== "string" || typeof scenario !== "string") return null;
  const roleDefinition = exploreRoles.find((item) => item.id === role);
  if (!roleDefinition) return null;
  if (scenario === POINT_OBJECT_ANALYSIS_UNSPECIFIED) {
    return { role: roleDefinition.id, scenario };
  }
  if (!isExploreScenarioForRole(roleDefinition.audience, roleDefinition.id, scenario)) return null;
  return { role: roleDefinition.id, scenario };
}

export function pointObjectAnalysisRoleScenarioOrUnspecified(
  role: unknown,
  scenario: unknown
): PointObjectAnalysisRoleScenarioContext {
  return parsePointObjectAnalysisRoleScenario(role, scenario) ?? {
    role: POINT_OBJECT_ANALYSIS_UNSPECIFIED,
    scenario: POINT_OBJECT_ANALYSIS_UNSPECIFIED
  };
}

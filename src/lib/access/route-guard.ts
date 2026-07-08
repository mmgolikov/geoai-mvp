import {
  getProjectAccessDecision,
  type ProjectAccessDecision,
  type ProjectAccessDecisionInput,
  type ProjectAccessDecisionMode
} from "@/src/lib/access/access-decision";

export type ProtectedRouteAccessResult = {
  allowed: boolean;
  enforced: boolean;
  responseStatus: 200 | 401 | 403;
  decision: ProjectAccessDecision;
  wouldBlock: ProjectAccessDecision | null;
  responseBody: {
    ok: boolean;
    access: {
      allowed: boolean;
      enforced: boolean;
      status: ProjectAccessDecision["status"];
      reason: string;
      mode: ProjectAccessDecisionMode;
      action: ProjectAccessDecision["action"];
      role: ProjectAccessDecision["role"];
      warnings: string[];
      caveat: string;
    };
    message: string;
    caveat: string;
  };
};

export function getProtectedRouteAccess(input: ProjectAccessDecisionInput): ProtectedRouteAccessResult {
  const mode = input.mode ?? "soft";
  const hardDecision = getProjectAccessDecision({ ...input, mode: "hard" });

  if (mode === "hard") {
    return {
      allowed: hardDecision.allowed,
      enforced: true,
      responseStatus: hardDecision.httpStatus,
      decision: hardDecision,
      wouldBlock: hardDecision.allowed ? null : hardDecision,
      responseBody: toProtectedRouteResponseBody(hardDecision, true, hardDecision.allowed)
    };
  }

  const softDecision = getProjectAccessDecision({ ...input, mode: "soft" });
  const warnings = hardDecision.allowed
    ? softDecision.warnings
    : [...softDecision.warnings, `Hard mode would return ${hardDecision.httpStatus}: ${hardDecision.reason}`];
  const advisoryDecision: ProjectAccessDecision = {
    ...softDecision,
    warnings
  };

  return {
    allowed: true,
    enforced: false,
    responseStatus: 200,
    decision: advisoryDecision,
    wouldBlock: hardDecision.allowed ? null : hardDecision,
    responseBody: toProtectedRouteResponseBody(advisoryDecision, false, true)
  };
}

export function toProtectedRouteResponseBody(
  decision: ProjectAccessDecision,
  enforced: boolean,
  ok = decision.allowed
): ProtectedRouteAccessResult["responseBody"] {
  return {
    ok,
    access: {
      allowed: decision.allowed,
      enforced,
      status: decision.status,
      reason: decision.reason,
      mode: decision.mode,
      action: decision.action,
      role: decision.role,
      warnings: decision.warnings,
      caveat: decision.caveat
    },
    message: decision.reason,
    caveat: decision.caveat
  };
}

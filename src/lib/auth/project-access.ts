import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoUser } from "@/src/lib/auth/demo-session";
import {
  getProjectAccessDecision,
  roleAllowsAction,
  type ProjectAccessAction as DecisionProjectAccessAction
} from "@/src/lib/access/access-decision";
import { getEnforcementConfig, type GeoAIAccessEnforcementMode } from "@/src/lib/platform/enforcement-config";
import type { GeoAIProjectMembership, GeoAIUser } from "@/src/types/auth";

export type ProjectAccessAction = DecisionProjectAccessAction;
export type ProjectAccessMode = GeoAIAccessEnforcementMode;

const serverMutationActions = new Set<ProjectAccessAction>([
  "write",
  "manage",
  "validate",
  "upload",
  "review",
  "generate",
  "attest_client",
  "attest_official",
  "project.create",
  "project.update",
  "project.delete",
  "members.manage",
  "aoi.write",
  "aoi.delete",
  "analysis.run",
  "comparison.write",
  "comparison.delete",
  "report.generate",
  "evidence.upload",
  "evidence.delete",
  "evidence.review_screening",
  "evidence.attest_client",
  "evidence.attest_official",
  "dataset.upload",
  "dataset.delete",
  "workflow.write",
  "source.manage"
]);
const publicDemoProjectKeys = new Set([
  "unscoped-demo-project",
  "all-demo-projects",
  "dubai-investment-screening-demo",
  "developer-land-pipeline-demo",
  "bank-asset-review-demo",
  "home-buyer-neighborhood-demo",
  "family-relocation-area-demo"
]);

export function isPreAuthServerMutationBlocked(action: ProjectAccessAction) {
  // AUTH-01 has not supplied a request-scoped, verified caller yet. Merely
  // selecting supabase_auth in the environment is not identity evidence.
  return serverMutationActions.has(action);
}

function isDemoProjectKey(projectKey: string) {
  return publicDemoProjectKeys.has(projectKey);
}

export function getProjectAccessCaveat() {
  return "Access control foundation only; enforce Supabase Auth, RLS and deployment governance before using this for protected client data.";
}

export function getServerSafeUser(): GeoAIUser | null {
  const authStatus = getAuthModeStatus();

  if (authStatus.effectiveMode === "supabase_auth") {
    return null;
  }

  return authStatus.effectiveMode === "demo_public" ? demoUser : null;
}

export function getDemoProjectMembership(projectKey: string): GeoAIProjectMembership {
  return createDemoProjectMembership(projectKey);
}

export function requireProjectAccess({
  projectKey,
  action,
  mode
}: {
  projectKey?: string | null;
  action: ProjectAccessAction;
  mode?: ProjectAccessMode;
}) {
  const authStatus = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const effectiveMode = mode === "hard" ? "hard" : enforcement.accessEnforcementMode;
  const effectiveProjectKey = projectKey ?? "unscoped-demo-project";
  const demoPublicAllowed = enforcement.allowDemoPublic && isDemoProjectKey(effectiveProjectKey);
  const membership = authStatus.effectiveMode === "demo_public" && demoPublicAllowed
    ? createDemoProjectMembership(effectiveProjectKey)
    : null;
  const roleAllowed = membership ? roleAllowsAction(membership.role, action) : false;
  const accessDecision = getProjectAccessDecision({
    mode: effectiveMode,
    authMode: authStatus.effectiveMode,
    action,
    user: membership ? { id: demoUser.id, email: demoUser.email } : null,
    profile: membership ? { id: demoUser.id, authUserId: demoUser.id, status: "active" } : null,
    organizationMembership: membership
      ? {
          profileId: demoUser.id,
          organizationId: demoOrganization.id,
          role: "owner",
          status: "active"
        }
      : null,
    project: { projectKey: effectiveProjectKey, organizationId: demoOrganization.id },
    membership: membership
      ? {
          id: membership.id,
          userId: demoUser.id,
          organizationId: membership.organizationId,
          projectKey: membership.projectKey,
          role: membership.role,
          status: membership.status
        }
      : null,
    allowDemoPublic: demoPublicAllowed
  });
  const serverMutationBlocked = isPreAuthServerMutationBlocked(action);
  // The lower decision is authoritative. Synthetic demo membership must never
  // turn a denied hard-mode decision into an allow result.
  const allowed = accessDecision.allowed && Boolean(membership && roleAllowed) && !serverMutationBlocked;
  const reason = allowed
    ? accessDecision.reason
    : serverMutationBlocked
      ? "Server mutations are disabled until request-scoped Auth, membership and RLS are verified; keep public-demo user state in the browser."
      : accessDecision.allowed
      ? "Project membership does not allow this action."
      : accessDecision.reason;
  const status = allowed ? 200 : serverMutationBlocked || accessDecision.allowed ? 403 : accessDecision.httpStatus;

  return {
    allowed,
    reason,
    role: membership?.role ?? null,
    mode: effectiveMode,
    requestedMode: mode ?? enforcement.accessEnforcementMode,
    authMode: authStatus.effectiveMode,
    allowDemoPublic: enforcement.allowDemoPublic,
    status,
    user: membership ? demoUser : null,
    organization: membership ? demoOrganization : null,
    membership,
    decisionStatus: accessDecision.status,
    warnings: accessDecision.warnings,
    projectKey: effectiveProjectKey,
    action,
    caveat: membership?.caveat ?? getProjectAccessCaveat()
  };
}

export type ProjectAccessResult = ReturnType<typeof requireProjectAccess>;

export function projectAccessDeniedPayload(access: ProjectAccessResult) {
  return {
    ok: false,
    access,
    message: access.reason,
    caveat: getProjectAccessCaveat()
  };
}

export function canReadProject(projectKey: string) {
  return requireProjectAccess({ projectKey, action: "read" }).allowed;
}

export function canWriteProject(projectKey: string) {
  return requireProjectAccess({ projectKey, action: "write" }).allowed;
}

export function canManageProject(projectKey: string) {
  return requireProjectAccess({ projectKey, action: "manage" }).allowed;
}

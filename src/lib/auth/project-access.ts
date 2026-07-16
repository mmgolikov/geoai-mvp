import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoUser } from "@/src/lib/auth/demo-session";
import { getProjectAccessDecision, roleAllowsAction } from "@/src/lib/access/access-decision";
import { getEnforcementConfig, type GeoAIAccessEnforcementMode } from "@/src/lib/platform/enforcement-config";
import type { GeoAIProjectMembership, GeoAIUser } from "@/src/types/auth";

export type ProjectAccessAction = "read" | "write" | "manage" | "export" | "validate" | "upload" | "review" | "generate";
export type ProjectAccessMode = GeoAIAccessEnforcementMode;

function isDemoProjectKey(projectKey: string) {
  return projectKey === "unscoped-demo-project" || projectKey === "all-demo-projects" || projectKey.endsWith("-demo");
}

export function getProjectAccessCaveat() {
  return "Access control foundation only; enforce Supabase Auth, RLS and deployment governance before using this for protected client data.";
}

export function getServerSafeUser(): GeoAIUser | null {
  const authStatus = getAuthModeStatus();

  if (authStatus.effectiveMode === "supabase_auth") {
    return null;
  }

  return demoUser;
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
  const membership =
    authStatus.effectiveMode === "supabase_auth" && !demoPublicAllowed
      ? null
      : createDemoProjectMembership(effectiveProjectKey);
  const roleAllowed = membership ? roleAllowsAction(membership.role, action) : false;
  const accessDecision = getProjectAccessDecision({
    mode: effectiveMode,
    authMode: authStatus.effectiveMode,
    action,
    user: membership ? { id: demoUser.id, email: demoUser.email } : null,
    profile: membership ? { id: demoUser.id, organizationId: demoOrganization.id, status: "active" } : null,
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
  const allowed = authStatus.effectiveMode === "demo_public"
    ? effectiveMode === "soft" || demoPublicAllowed
      ? roleAllowed
      : false
    : Boolean(membership && roleAllowed);
  const reason = allowed
    ? authStatus.effectiveMode === "demo_public"
      ? effectiveMode === "hard"
        ? "Public demo project access allowed by GEOAI_ALLOW_DEMO_PUBLIC for seeded demo project."
        : "Public demo project access allowed in soft mode."
      : "Project membership allows this action."
    : authStatus.effectiveMode === "supabase_auth"
      ? "Supabase Auth is requested, but project membership is not available in this runtime."
      : effectiveMode === "hard"
        ? "Hard enforcement blocks this request without authenticated project membership or demo-public allowance."
        : "Project access was not granted.";
  const status = allowed ? 200 : authStatus.effectiveMode === "demo_public" ? 403 : 401;

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

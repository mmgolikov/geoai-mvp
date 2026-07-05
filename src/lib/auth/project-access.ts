import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoUser } from "@/src/lib/auth/demo-session";
import { getEnforcementConfig, type GeoAIAccessEnforcementMode } from "@/src/lib/platform/enforcement-config";
import type { GeoAIProjectMembership, GeoAIProjectRole, GeoAIUser } from "@/src/types/auth";

export type ProjectAccessAction = "read" | "write" | "manage" | "export" | "validate" | "upload" | "review";
export type ProjectAccessMode = GeoAIAccessEnforcementMode;

const ROLE_RANK: Record<GeoAIProjectRole, number> = {
  client_viewer: 1,
  viewer: 2,
  analyst: 3,
  admin: 4,
  owner: 5
};

function roleCan(role: GeoAIProjectRole, action: ProjectAccessAction) {
  if (action === "read") return ROLE_RANK[role] >= ROLE_RANK.client_viewer;
  if (action === "export") return role === "client_viewer" || ROLE_RANK[role] >= ROLE_RANK.viewer;
  if (action === "write" || action === "upload" || action === "review" || action === "validate") {
    return ROLE_RANK[role] >= ROLE_RANK.analyst;
  }
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

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
  const roleAllowed = membership ? roleCan(membership.role, action) : false;
  const allowed = authStatus.effectiveMode === "demo_public"
    ? effectiveMode === "soft" || demoPublicAllowed
      ? roleAllowed
      : false
    : Boolean(membership && roleAllowed);
  const reason = allowed
    ? authStatus.effectiveMode === "demo_public"
      ? effectiveMode === "hard"
        ? "Public pilot project access allowed by GEOAI_ALLOW_DEMO_PUBLIC for seeded demo project."
        : "Public pilot project access allowed in soft mode."
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

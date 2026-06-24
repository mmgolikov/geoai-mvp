import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoUser } from "@/src/lib/auth/demo-session";
import type { GeoAIProjectMembership, GeoAIProjectRole, GeoAIUser } from "@/src/types/auth";

export type ProjectAccessAction = "read" | "write" | "manage";
export type ProjectAccessMode = "soft" | "hard";

const ROLE_RANK: Record<GeoAIProjectRole, number> = {
  client_viewer: 1,
  viewer: 2,
  analyst: 3,
  admin: 4,
  owner: 5
};

function roleCan(role: GeoAIProjectRole, action: ProjectAccessAction) {
  if (action === "read") return ROLE_RANK[role] >= ROLE_RANK.client_viewer;
  if (action === "write") return ROLE_RANK[role] >= ROLE_RANK.analyst;
  return ROLE_RANK[role] >= ROLE_RANK.admin;
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
  mode = "soft"
}: {
  projectKey?: string | null;
  action: ProjectAccessAction;
  mode?: ProjectAccessMode;
}) {
  const authStatus = getAuthModeStatus();
  const effectiveProjectKey = projectKey ?? "unscoped-demo-project";
  const membership =
    authStatus.effectiveMode === "supabase_auth"
      ? null
      : createDemoProjectMembership(effectiveProjectKey);
  const demoHardAllowed = process.env.GEOAI_ALLOW_DEMO_HARD_ACCESS?.trim().toLowerCase() === "true";
  const roleAllowed = membership ? roleCan(membership.role, action) : false;
  const allowed = authStatus.effectiveMode === "demo_public"
    ? mode === "soft"
      ? roleAllowed
      : demoHardAllowed && roleAllowed
    : Boolean(membership && roleAllowed);
  const reason = allowed
    ? authStatus.effectiveMode === "demo_public"
      ? "Demo project access allowed in soft mode."
      : "Project membership allows this action."
    : authStatus.effectiveMode === "supabase_auth"
      ? "Supabase Auth is requested, but project membership is not available in this runtime."
      : mode === "hard"
        ? "Hard enforcement blocks demo access unless GEOAI_ALLOW_DEMO_HARD_ACCESS=true."
        : "Project access was not granted.";

  return {
    allowed,
    reason,
    role: membership?.role ?? null,
    mode,
    authMode: authStatus.effectiveMode,
    user: membership ? demoUser : null,
    organization: membership ? demoOrganization : null,
    membership,
    projectKey: effectiveProjectKey,
    action,
    caveat: membership?.caveat ?? getProjectAccessCaveat()
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

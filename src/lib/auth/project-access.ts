import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoUser } from "@/src/lib/auth/demo-session";
import type { GeoAIProjectMembership, GeoAIProjectRole, GeoAIUser } from "@/src/types/auth";

export type ProjectAccessAction = "read" | "write" | "manage";

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
  action
}: {
  projectKey: string;
  action: ProjectAccessAction;
}) {
  const authStatus = getAuthModeStatus();
  const membership =
    authStatus.effectiveMode === "supabase_auth"
      ? null
      : createDemoProjectMembership(projectKey);
  const allowed = membership ? roleCan(membership.role, action) : action === "read";

  return {
    allowed,
    authMode: authStatus.effectiveMode,
    user: membership ? demoUser : null,
    organization: membership ? demoOrganization : null,
    membership,
    projectKey,
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

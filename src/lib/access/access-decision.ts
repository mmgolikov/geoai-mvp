import type { GeoAIAuthMode, GeoAIProjectMembershipStatus, GeoAIProjectRole } from "@/src/types/auth";

export type ProjectAccessAction =
  | "read"
  | "write"
  | "manage"
  | "export"
  | "validate"
  | "upload"
  | "review"
  | "generate"
  | "attest_client"
  | "attest_official";
export type ProjectAccessDecisionMode = "soft" | "hard";

export type ProjectAccessDecisionStatus =
  | "unauthenticated"
  | "demo_public"
  | "authenticated_without_profile"
  | "profile_without_project_membership"
  | "allowed_project_member"
  | "wrong_organization"
  | "insufficient_role"
  | "hard_access_disabled";

export type ProjectAccessDecisionUser = {
  id: string;
  email?: string | null;
};

export type ProjectAccessDecisionProfile = {
  id: string;
  authUserId?: string | null;
  organizationId?: string | null;
  status?: "active" | "invited" | "disabled" | string | null;
};

export type ProjectAccessDecisionProject = {
  id?: string | null;
  projectKey?: string | null;
  organizationId?: string | null;
};

export type ProjectAccessDecisionMembership = {
  id?: string | null;
  profileId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  organizationId?: string | null;
  role: GeoAIProjectRole;
  status: GeoAIProjectMembershipStatus;
};

export type ProjectAccessDecisionInput = {
  mode?: ProjectAccessDecisionMode;
  authMode: GeoAIAuthMode;
  action: ProjectAccessAction;
  user?: ProjectAccessDecisionUser | null;
  profile?: ProjectAccessDecisionProfile | null;
  project?: ProjectAccessDecisionProject | null;
  membership?: ProjectAccessDecisionMembership | null;
  allowDemoPublic?: boolean;
};

export type ProjectAccessDecision = {
  allowed: boolean;
  status: ProjectAccessDecisionStatus;
  httpStatus: 200 | 401 | 403;
  mode: ProjectAccessDecisionMode;
  authMode: GeoAIAuthMode;
  action: ProjectAccessAction;
  role: GeoAIProjectRole | null;
  reason: string;
  caveat: string;
  warnings: string[];
};

export const accessDecisionCaveat =
  "Access decision scaffold only; enable hard access only after Supabase Auth, project memberships and RLS are verified.";

export const roleRank: Record<GeoAIProjectRole, number> = {
  client_viewer: 1,
  viewer: 2,
  analyst: 3,
  admin: 4,
  owner: 5
};

export function roleAllowsAction(role: GeoAIProjectRole, action: ProjectAccessAction) {
  if (action === "read") return roleRank[role] >= roleRank.client_viewer;
  if (action === "export") return role === "client_viewer" || roleRank[role] >= roleRank.viewer;
  if (action === "attest_official") return role === "owner";
  if (action === "attest_client") return roleRank[role] >= roleRank.admin;
  if (action === "write" || action === "upload" || action === "review" || action === "validate" || action === "generate") {
    return roleRank[role] >= roleRank.analyst;
  }
  return roleRank[role] >= roleRank.admin;
}

function decision(input: {
  allowed: boolean;
  status: ProjectAccessDecisionStatus;
  httpStatus: 200 | 401 | 403;
  mode: ProjectAccessDecisionMode;
  authMode: GeoAIAuthMode;
  action: ProjectAccessAction;
  role?: GeoAIProjectRole | null;
  reason: string;
  warnings?: string[];
}): ProjectAccessDecision {
  return {
    allowed: input.allowed,
    status: input.status,
    httpStatus: input.httpStatus,
    mode: input.mode,
    authMode: input.authMode,
    action: input.action,
    role: input.role ?? null,
    reason: input.reason,
    caveat: accessDecisionCaveat,
    warnings: input.warnings ?? []
  };
}

function isActiveProfile(profile: ProjectAccessDecisionProfile | null | undefined) {
  if (!profile) return false;
  return profile.status === "active";
}

function isMatchingMembership(input: ProjectAccessDecisionInput) {
  const membership = input.membership;
  const profile = input.profile;
  const project = input.project;

  if (!membership || membership.status !== "active") {
    return false;
  }

  const membershipProfileId = membership.profileId ?? membership.userId ?? null;
  if (!profile?.id || !membershipProfileId || membershipProfileId !== profile.id) return false;
  if (!project?.id || !membership.projectId || membership.projectId !== project.id) return false;
  if (project.projectKey && membership.projectKey !== project.projectKey) return false;
  return true;
}

function isWrongOrganization(input: ProjectAccessDecisionInput) {
  const profileOrg = input.profile?.organizationId;
  const membershipOrg = input.membership?.organizationId;
  const projectOrg = input.project?.organizationId;

  if (!projectOrg || !membershipOrg || !profileOrg) return true;
  return projectOrg !== membershipOrg || projectOrg !== profileOrg || membershipOrg !== profileOrg;
}

export function getProjectAccessDecision(input: ProjectAccessDecisionInput): ProjectAccessDecision {
  const mode = input.mode ?? "soft";
  const allowDemoPublic = input.allowDemoPublic ?? false;

  if (mode !== "hard") {
    return decision({
      allowed: true,
      status: "hard_access_disabled",
      httpStatus: 200,
      mode,
      authMode: input.authMode,
      action: input.action,
      role: input.membership?.role ?? null,
      reason: "Soft access mode is active; this decision is advisory and does not block demo workflows.",
      warnings: ["Hard access enforcement is disabled."]
    });
  }

  if (input.authMode !== "supabase_auth") {
    return decision({
      allowed: allowDemoPublic,
      status: allowDemoPublic ? "demo_public" : "unauthenticated",
      httpStatus: allowDemoPublic ? 200 : 401,
      mode,
      authMode: input.authMode,
      action: input.action,
      role: allowDemoPublic ? input.membership?.role ?? "owner" : null,
      reason: allowDemoPublic
        ? "Demo public project access is explicitly allowed for this request."
        : "Supabase Auth is not active for this hard-access request."
    });
  }

  if (!input.user) {
    return decision({
      allowed: false,
      status: "unauthenticated",
      httpStatus: 401,
      mode,
      authMode: input.authMode,
      action: input.action,
      reason: "No authenticated Supabase user was available to the server runtime."
    });
  }

  if (!isActiveProfile(input.profile)) {
    return decision({
      allowed: false,
      status: "authenticated_without_profile",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      reason: "The authenticated user does not have an active server-verified GeoAI profile."
    });
  }

  if (!input.profile?.authUserId || input.profile.authUserId !== input.user.id) {
    return decision({
      allowed: false,
      status: "authenticated_without_profile",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      reason: "The authenticated user is not mapped to this server-verified GeoAI profile."
    });
  }

  if (!isMatchingMembership(input)) {
    return decision({
      allowed: false,
      status: "profile_without_project_membership",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      reason: "The active profile does not have a verified membership for this project."
    });
  }

  if (isWrongOrganization(input)) {
    return decision({
      allowed: false,
      status: "wrong_organization",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      role: input.membership?.role ?? null,
      reason: "The profile, project or membership organization does not match."
    });
  }

  const role = input.membership?.role ?? null;
  if (!role || !roleAllowsAction(role, input.action)) {
    return decision({
      allowed: false,
      status: "insufficient_role",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      role,
      reason: "The project membership role is not sufficient for this action."
    });
  }

  return decision({
    allowed: true,
    status: "allowed_project_member",
    httpStatus: 200,
    mode,
    authMode: input.authMode,
    action: input.action,
    role,
    reason: "The authenticated profile has active project membership with a sufficient role."
  });
}

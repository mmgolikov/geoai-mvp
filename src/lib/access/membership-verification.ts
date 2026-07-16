import {
  accessDecisionCaveat,
  roleAllowsAction,
  type ProjectAccessAction,
  type ProjectAccessDecisionMode
} from "@/src/lib/access/access-decision";
import type { GeoAIAuthMode, GeoAIProjectMembershipStatus, GeoAIProjectRole } from "@/src/types/auth";

export type MembershipVerificationStatus =
  | "no_session"
  | "no_profile"
  | "inactive_profile"
  | "no_org_membership"
  | "no_project_membership"
  | "inactive_membership"
  | "wrong_organization"
  | "insufficient_role"
  | "allowed";

export type MembershipVerificationProfile = {
  id: string;
  authUserId?: string | null;
  organizationId?: string | null;
  status?: "active" | "invited" | "disabled" | "inactive" | string | null;
};

export type MembershipVerificationSession = {
  userId?: string | null;
  authMode?: GeoAIAuthMode;
};

export type MembershipVerificationProject = {
  id?: string | null;
  projectKey?: string | null;
  organizationId?: string | null;
};

export type MembershipVerificationOrgMembership = {
  id?: string | null;
  profileId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  status?: GeoAIProjectMembershipStatus | "inactive" | string | null;
};

export type MembershipVerificationProjectMembership = {
  id?: string | null;
  profileId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  organizationId?: string | null;
  role: GeoAIProjectRole;
  status?: GeoAIProjectMembershipStatus | "inactive" | string | null;
};

export type MembershipVerificationInput = {
  mode?: ProjectAccessDecisionMode;
  authMode?: GeoAIAuthMode;
  action: ProjectAccessAction;
  session?: MembershipVerificationSession | null;
  profile?: MembershipVerificationProfile | null;
  project?: MembershipVerificationProject | null;
  organizationMemberships?: MembershipVerificationOrgMembership[];
  organizationMembership?: MembershipVerificationOrgMembership | null;
  projectMemberships?: MembershipVerificationProjectMembership[];
  projectMembership?: MembershipVerificationProjectMembership | null;
};

export type MembershipVerificationResult = {
  allowed: boolean;
  hardModeAllowed: boolean;
  enforced: boolean;
  status: MembershipVerificationStatus;
  httpStatus: 200 | 401 | 403;
  action: ProjectAccessAction;
  mode: ProjectAccessDecisionMode;
  authMode: GeoAIAuthMode;
  role: GeoAIProjectRole | null;
  reason: string;
  warnings: string[];
  caveat: string;
};

function normalizeList<T>(single: T | null | undefined, many: T[] | undefined) {
  return [...(many ?? []), ...(single ? [single] : [])];
}

function memberProfileId(
  membership: MembershipVerificationOrgMembership | MembershipVerificationProjectMembership
) {
  return membership.profileId ?? membership.userId ?? null;
}

function statusIsActive(status?: string | null) {
  return status === "active";
}

function orgMatches(
  membership: MembershipVerificationOrgMembership | MembershipVerificationProjectMembership,
  organizationId?: string | null
) {
  return Boolean(organizationId && membership.organizationId && membership.organizationId === organizationId);
}

function projectMatches(
  membership: MembershipVerificationProjectMembership,
  project?: MembershipVerificationProject | null
) {
  if (!project?.id || !membership.projectId || membership.projectId !== project.id) return false;
  if (project.projectKey && membership.projectKey !== project.projectKey) return false;
  return true;
}

function denial(input: {
  status: MembershipVerificationStatus;
  httpStatus: 401 | 403;
  mode: ProjectAccessDecisionMode;
  authMode: GeoAIAuthMode;
  action: ProjectAccessAction;
  role?: GeoAIProjectRole | null;
  reason: string;
}): Omit<MembershipVerificationResult, "allowed" | "hardModeAllowed" | "enforced"> {
  return {
    status: input.status,
    httpStatus: input.httpStatus,
    action: input.action,
    mode: input.mode,
    authMode: input.authMode,
    role: input.role ?? null,
    reason: input.reason,
    warnings: [],
    caveat: accessDecisionCaveat
  };
}

function evaluateHard(input: MembershipVerificationInput): Omit<MembershipVerificationResult, "allowed" | "hardModeAllowed" | "enforced"> {
  const mode = input.mode ?? "soft";
  const authMode = input.authMode ?? input.session?.authMode ?? "demo_public";
  const action = input.action;
  const profile = input.profile ?? null;
  const project = input.project ?? null;
  const projectOrgId = project?.organizationId ?? null;

  if (authMode !== "supabase_auth" || !input.session?.userId) {
    return denial({
      status: "no_session",
      httpStatus: 401,
      mode,
      authMode,
      action,
      reason: "No server-verified Supabase Auth session is available."
    });
  }

  if (!profile) {
    return denial({
      status: "no_profile",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "The authenticated user has no server-verified GeoAI profile."
    });
  }

  if (!profile.authUserId || profile.authUserId !== input.session.userId) {
    return denial({
      status: "no_profile",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "The authenticated session is not mapped to this GeoAI profile."
    });
  }

  if (!statusIsActive(profile.status)) {
    return denial({
      status: "inactive_profile",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "The server-verified GeoAI profile is not active."
    });
  }

  const organizationMemberships = normalizeList(input.organizationMembership, input.organizationMemberships);
  const profileOrgMemberships = organizationMemberships.filter((membership) => {
    const id = memberProfileId(membership);
    return Boolean(id && id === profile.id);
  });
  const matchingOrgMembership = profileOrgMemberships.find((membership) => orgMatches(membership, projectOrgId));

  if (!matchingOrgMembership) {
    if (profileOrgMemberships.length > 0 || (projectOrgId && profile.organizationId && projectOrgId !== profile.organizationId)) {
      return denial({
        status: "wrong_organization",
        httpStatus: 403,
        mode,
        authMode,
        action,
        reason: "The profile is not a member of the project organization."
      });
    }

    return denial({
      status: "no_org_membership",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "No organization membership is available for this profile."
    });
  }

  if (!statusIsActive(matchingOrgMembership.status)) {
    return denial({
      status: "inactive_membership",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "The organization membership is not active."
    });
  }

  const projectMemberships = normalizeList(input.projectMembership, input.projectMemberships);
  const profileProjectMemberships = projectMemberships.filter((membership) => {
    const id = memberProfileId(membership);
    return Boolean(id && id === profile.id);
  });
  const matchingProjectMembership = profileProjectMemberships.find((membership) => projectMatches(membership, project));

  if (!matchingProjectMembership) {
    return denial({
      status: "no_project_membership",
      httpStatus: 403,
      mode,
      authMode,
      action,
      reason: "No project membership is available for this profile and project."
    });
  }

  if (!statusIsActive(matchingProjectMembership.status)) {
    return denial({
      status: "inactive_membership",
      httpStatus: 403,
      mode,
      authMode,
      action,
      role: matchingProjectMembership.role,
      reason: "The project membership is not active."
    });
  }

  if (
    !orgMatches(matchingProjectMembership, projectOrgId) ||
    !profile.organizationId ||
    matchingProjectMembership.organizationId !== profile.organizationId
  ) {
    return denial({
      status: "wrong_organization",
      httpStatus: 403,
      mode,
      authMode,
      action,
      role: matchingProjectMembership.role,
      reason: "The project membership is attached to a different organization."
    });
  }

  if (!roleAllowsAction(matchingProjectMembership.role, action)) {
    return denial({
      status: "insufficient_role",
      httpStatus: 403,
      mode,
      authMode,
      action,
      role: matchingProjectMembership.role,
      reason: "The project membership role is not sufficient for this action."
    });
  }

  return {
    status: "allowed",
    httpStatus: 200,
    mode,
    authMode,
    action,
    role: matchingProjectMembership.role,
    reason: "The session profile has active organization and project membership with a sufficient role.",
    warnings: [],
    caveat: accessDecisionCaveat
  };
}

export function verifyMembershipAccess(input: MembershipVerificationInput): MembershipVerificationResult {
  const mode = input.mode ?? "soft";
  const hard = evaluateHard({ ...input, mode: "hard" });
  const hardModeAllowed = hard.status === "allowed";
  const enforced = mode === "hard";

  return {
    ...hard,
    mode,
    allowed: enforced ? hardModeAllowed : true,
    hardModeAllowed,
    enforced,
    httpStatus: enforced ? hard.httpStatus : 200,
    warnings: enforced || hardModeAllowed
      ? hard.warnings
      : [...hard.warnings, `Soft mode advisory only; hard mode would return ${hard.httpStatus}: ${hard.reason}`]
  };
}

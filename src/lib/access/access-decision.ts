import type {
  GeoAIAuthMode,
  GeoAIOrganizationCapability,
  GeoAIProjectMembershipStatus,
  GeoAIProjectRole
} from "@/src/types/auth";

export type LegacyProjectAccessAction =
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
export type ProjectResourceAction =
  | "project.read"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "members.read"
  | "members.manage"
  | "aoi.read"
  | "aoi.write"
  | "aoi.delete"
  | "analysis.read"
  | "analysis.run"
  | "comparison.read"
  | "comparison.write"
  | "comparison.delete"
  | "report.read"
  | "report.generate"
  | "report.export"
  | "evidence.read"
  | "evidence.upload"
  | "evidence.delete"
  | "evidence.review_screening"
  | "evidence.attest_client"
  | "evidence.attest_official"
  | "dataset.read"
  | "dataset.upload"
  | "dataset.delete"
  | "workflow.read"
  | "workflow.write"
  | "source.read"
  | "source.manage"
  | "audit.read";
export type ProjectAccessAction = LegacyProjectAccessAction | ProjectResourceAction;
export type ProjectAccessDecisionMode = "soft" | "hard";

export type ProjectAccessDecisionStatus =
  | "unauthenticated"
  | "demo_public"
  | "authenticated_without_profile"
  | "profile_without_organization_membership"
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
  status?: "active" | "invited" | "disabled" | string | null;
};

export type ProjectAccessDecisionOrganizationMembership = {
  profileId?: string | null;
  organizationId?: string | null;
  role?: "owner" | "admin" | "member" | null;
  status?: "active" | "invited" | "disabled" | "suspended" | string | null;
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
  organizationMembership?: ProjectAccessDecisionOrganizationMembership | null;
  membership?: ProjectAccessDecisionMembership | null;
  capabilities?: GeoAIOrganizationCapability[];
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

const actionRoles: Record<ProjectResourceAction, readonly GeoAIProjectRole[]> = {
  "project.read": ["client_viewer", "viewer", "analyst", "admin", "owner"],
  "project.create": ["admin", "owner"],
  "project.update": ["admin", "owner"],
  "project.delete": ["owner"],
  "members.read": ["admin", "owner"],
  "members.manage": ["admin", "owner"],
  "aoi.read": ["viewer", "analyst", "admin", "owner"],
  "aoi.write": ["analyst", "admin", "owner"],
  "aoi.delete": ["admin", "owner"],
  "analysis.read": ["viewer", "analyst", "admin", "owner"],
  "analysis.run": ["analyst", "admin", "owner"],
  "comparison.read": ["viewer", "analyst", "admin", "owner"],
  "comparison.write": ["analyst", "admin", "owner"],
  "comparison.delete": ["admin", "owner"],
  "report.read": ["client_viewer", "viewer", "analyst", "admin", "owner"],
  "report.generate": ["analyst", "admin", "owner"],
  "report.export": ["client_viewer", "viewer", "analyst", "admin", "owner"],
  "evidence.read": ["viewer", "analyst", "admin", "owner"],
  "evidence.upload": ["analyst", "admin", "owner"],
  "evidence.delete": ["admin", "owner"],
  "evidence.review_screening": ["analyst", "admin", "owner"],
  "evidence.attest_client": ["admin", "owner"],
  "evidence.attest_official": ["admin", "owner"],
  "dataset.read": ["viewer", "analyst", "admin", "owner"],
  "dataset.upload": ["analyst", "admin", "owner"],
  "dataset.delete": ["admin", "owner"],
  "workflow.read": ["client_viewer", "viewer", "analyst", "admin", "owner"],
  "workflow.write": ["analyst", "admin", "owner"],
  "source.read": ["viewer", "analyst", "admin", "owner"],
  "source.manage": [],
  "audit.read": ["admin", "owner"]
};

const legacyActionMap: Record<LegacyProjectAccessAction, ProjectResourceAction> = {
  read: "project.read",
  write: "project.update",
  manage: "members.manage",
  export: "report.export",
  validate: "evidence.review_screening",
  upload: "evidence.upload",
  review: "evidence.review_screening",
  generate: "report.generate",
  attest_client: "evidence.attest_client",
  attest_official: "evidence.attest_official"
};

function normalizeAction(action: ProjectAccessAction): ProjectResourceAction {
  return action.includes(".")
    ? action as ProjectResourceAction
    : legacyActionMap[action as LegacyProjectAccessAction];
}

export function roleAllowsAction(
  role: GeoAIProjectRole,
  action: ProjectAccessAction,
  capabilities: readonly GeoAIOrganizationCapability[] = []
) {
  const normalized = normalizeAction(action);
  if (normalized === "evidence.attest_client") {
    return actionRoles[normalized].includes(role) && capabilities.includes("client_attestor");
  }
  if (normalized === "evidence.attest_official") {
    return actionRoles[normalized].includes(role) && capabilities.includes("official_attestor");
  }
  if (normalized === "source.manage") {
    return capabilities.includes("source_operator");
  }
  return actionRoles[normalized].includes(role);
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

function isActiveOrganizationMembership(input: ProjectAccessDecisionInput) {
  const membership = input.organizationMembership;
  return Boolean(
    membership &&
    membership.status === "active" &&
    input.profile?.id &&
    membership.profileId === input.profile.id
  );
}

function isWrongOrganization(input: ProjectAccessDecisionInput) {
  const organizationMembershipOrg = input.organizationMembership?.organizationId;
  const membershipOrg = input.membership?.organizationId;
  const projectOrg = input.project?.organizationId;

  if (!projectOrg || !membershipOrg || !organizationMembershipOrg) return true;
  return projectOrg !== membershipOrg || projectOrg !== organizationMembershipOrg || membershipOrg !== organizationMembershipOrg;
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

  if (!isActiveOrganizationMembership(input)) {
    return decision({
      allowed: false,
      status: "profile_without_organization_membership",
      httpStatus: 403,
      mode,
      authMode: input.authMode,
      action: input.action,
      reason: "The active profile does not have an active organization membership for this project."
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
  if (!role || !roleAllowsAction(role, input.action, input.capabilities)) {
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

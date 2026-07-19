import {
  getProjectAccessDecision,
  type ProjectAccessDecision,
  type ProjectResourceAction
} from "@/src/lib/access/access-decision";
import type {
  GeoAIOrganizationCapability,
  GeoAIProjectRole
} from "@/src/types/auth";

export const requestProjectReadActions = [
  "project.read",
  "members.read",
  "aoi.read",
  "analysis.read",
  "comparison.read",
  "report.read",
  "report.export",
  "evidence.read",
  "dataset.read",
  "workflow.read",
  "source.read",
  "audit.read"
] as const satisfies readonly ProjectResourceAction[];

export type RequestProjectReadAction = typeof requestProjectReadActions[number];

export type RequestProjectReadReadiness = {
  repositoriesEnabled: boolean;
  authKernelImplemented: boolean;
  requestUserVerified: boolean;
  projectMembershipVerified: boolean;
  rlsPersonaMatrixVerified: boolean;
};

export type RequestProjectReadPrincipal = {
  userId: string;
  profileId: string;
  authUserId: string;
};

export type CurrentProjectAccessRow = {
  profile_id: string;
  organization_id: string;
  organization_role: string;
  capabilities: unknown;
  project_id: string;
  project_key: string;
  project_status: string;
  project_role: string;
  project_membership_status: string;
};

export type RequestProjectReadScope = {
  profileId: string;
  organizationId: string;
  organizationRole: "owner" | "admin" | "member";
  capabilities: readonly GeoAIOrganizationCapability[];
  projectId: string;
  projectKey: string;
  projectRole: GeoAIProjectRole;
};

export type RequestProjectReadDenialCode =
  | "invalid_project_key"
  | "invalid_read_parameters"
  | "unsupported_read_action"
  | "unsupported_bearer_transport"
  | "auth_mode_inactive"
  | "readiness_unverified"
  | "request_identity_unverified"
  | "project_access_denied"
  | "project_access_malformed"
  | "insufficient_role"
  | "dependency_unavailable";

export type RequestProjectReadDenial = {
  allowed: false;
  code: RequestProjectReadDenialCode;
  httpStatus: 400 | 401 | 403 | 503;
  reason: string;
};

export type RequestProjectReadAllowance = {
  allowed: true;
  code: "allowed";
  httpStatus: 200;
  scope: RequestProjectReadScope;
  decision: ProjectAccessDecision;
};

export type RequestProjectReadPolicyResult =
  | RequestProjectReadDenial
  | RequestProjectReadAllowance;

const exactProjectKeyPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const organizationRoles = new Set(["owner", "admin", "member"] as const);
const projectRoles = new Set<GeoAIProjectRole>([
  "owner",
  "admin",
  "analyst",
  "viewer",
  "client_viewer"
]);
const organizationCapabilities = new Set<GeoAIOrganizationCapability>([
  "client_attestor",
  "official_attestor",
  "source_operator"
]);

function denial(
  code: RequestProjectReadDenialCode,
  httpStatus: RequestProjectReadDenial["httpStatus"],
  reason: string
): RequestProjectReadDenial {
  return { allowed: false, code, httpStatus, reason };
}

export function isExactProjectKey(value: unknown): value is string {
  // Do not trim, case-fold, decode or substitute a default. The exact caller
  // target is sent to the caller-bound RPC and must match its returned key.
  return typeof value === "string" && exactProjectKeyPattern.test(value);
}

export function isRequestProjectReadAction(value: unknown): value is RequestProjectReadAction {
  return typeof value === "string" && (requestProjectReadActions as readonly string[]).includes(value);
}

export function evaluateRequestProjectReadPrerequisites(input: {
  projectKey: unknown;
  action: unknown;
  authMode: string;
  authorizationHeaderPresent: boolean;
  readiness: RequestProjectReadReadiness;
}): RequestProjectReadDenial | null {
  if (!isExactProjectKey(input.projectKey)) {
    return denial(
      "invalid_project_key",
      400,
      "An exact, bounded project key is required; normalization and unscoped defaults are forbidden."
    );
  }
  if (!isRequestProjectReadAction(input.action)) {
    return denial("unsupported_read_action", 400, "Only an explicitly registered project read action is accepted.");
  }
  if (input.authorizationHeaderPresent) {
    return denial(
      "unsupported_bearer_transport",
      401,
      "Bearer and mixed credential transports are not supported by the cookie-scoped repository facade."
    );
  }
  if (input.authMode !== "supabase_auth") {
    return denial(
      "auth_mode_inactive",
      401,
      "Supabase Auth must be the effective mode; public demo and disabled modes never fall back to protected reads."
    );
  }

  const readiness = input.readiness;
  if (
    !readiness.repositoriesEnabled ||
    !readiness.authKernelImplemented ||
    !readiness.requestUserVerified ||
    !readiness.projectMembershipVerified ||
    !readiness.rlsPersonaMatrixVerified
  ) {
    return denial(
      "readiness_unverified",
      503,
      "Request-scoped repositories remain disabled until Auth, membership and RLS persona evidence are all verified."
    );
  }

  return null;
}

function parseCapabilities(value: unknown): GeoAIOrganizationCapability[] | null {
  if (!Array.isArray(value)) return null;
  const capabilities: GeoAIOrganizationCapability[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string" || !organizationCapabilities.has(candidate as GeoAIOrganizationCapability)) {
      return null;
    }
    if (capabilities.includes(candidate as GeoAIOrganizationCapability)) return null;
    capabilities.push(candidate as GeoAIOrganizationCapability);
  }
  return capabilities;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function evaluateCurrentProjectReadAccess(input: {
  projectKey: string;
  action: RequestProjectReadAction;
  principal: RequestProjectReadPrincipal;
  row: CurrentProjectAccessRow | null;
}): RequestProjectReadPolicyResult {
  if (!isExactProjectKey(input.projectKey)) {
    return denial("invalid_project_key", 400, "The project key is not an exact canonical target.");
  }

  const row = input.row;
  if (!row) {
    // Keep missing, inactive and cross-tenant projects indistinguishable.
    return denial("project_access_denied", 403, "No caller-bound access exists for the requested project.");
  }

  const capabilities = parseCapabilities(row.capabilities);
  const organizationRole = organizationRoles.has(row.organization_role as "owner" | "admin" | "member")
    ? row.organization_role as "owner" | "admin" | "member"
    : null;
  const projectRole = projectRoles.has(row.project_role as GeoAIProjectRole)
    ? row.project_role as GeoAIProjectRole
    : null;

  if (
    !isUuid(input.principal.userId) ||
    !isUuid(input.principal.profileId) ||
    !isUuid(input.principal.authUserId) ||
    input.principal.authUserId !== input.principal.userId ||
    !isUuid(row.profile_id) ||
    !isUuid(row.organization_id) ||
    !isUuid(row.project_id) ||
    row.profile_id !== input.principal.profileId ||
    row.project_key !== input.projectKey ||
    !organizationRole ||
    !projectRole ||
    !capabilities ||
    !["active", "demo"].includes(row.project_status) ||
    row.project_membership_status !== "active"
  ) {
    return denial(
      "project_access_malformed",
      403,
      "The caller-bound project access projection failed its identity, scope or status invariants."
    );
  }

  const decision = getProjectAccessDecision({
    mode: "hard",
    authMode: "supabase_auth",
    action: input.action,
    user: { id: input.principal.userId },
    profile: {
      id: row.profile_id,
      authUserId: input.principal.authUserId,
      status: "active"
    },
    organizationMembership: {
      profileId: row.profile_id,
      organizationId: row.organization_id,
      role: organizationRole,
      status: "active"
    },
    project: {
      id: row.project_id,
      projectKey: row.project_key,
      organizationId: row.organization_id
    },
    membership: {
      profileId: row.profile_id,
      projectId: row.project_id,
      projectKey: row.project_key,
      organizationId: row.organization_id,
      role: projectRole,
      status: "active"
    },
    capabilities,
    allowDemoPublic: false
  });

  if (!decision.allowed) {
    return denial("insufficient_role", decision.httpStatus === 401 ? 401 : 403, decision.reason);
  }

  return {
    allowed: true,
    code: "allowed",
    httpStatus: 200,
    decision,
    scope: {
      profileId: row.profile_id,
      organizationId: row.organization_id,
      organizationRole,
      capabilities,
      projectId: row.project_id,
      projectKey: row.project_key,
      projectRole
    }
  };
}

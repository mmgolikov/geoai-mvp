import { createElevatedRequestContext } from "@/src/lib/auth/elevated-request-context";
import { createInvitationToken, hashInvitationToken } from "@/src/lib/auth/invitation-token.server";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyPattern = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const organizationRoles = new Set(["owner", "admin", "member"]);
const organizationStatuses = new Set(["active", "invited", "disabled", "suspended"]);
const projectRoles = new Set(["owner", "admin", "analyst", "viewer", "client_viewer"]);
const projectStatuses = new Set(["active", "invited", "disabled"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function nullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  return text(value, maxLength);
}

function uuid(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function positiveVersion(value: unknown, nullable = false) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

async function parseBody(request: Request) {
  const raw = await request.text();
  if (raw.length === 0 || raw.length > 16_384) return null;
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function invalid(requestId: string) {
  return privateNoStoreJson({ ok: false, status: "invalid_admin_request", requestId }, { status: 400 });
}

function failed(requestId: string) {
  return privateNoStoreJson({ ok: false, status: "admin_action_denied_or_failed", requestId }, { status: 409 });
}

export async function GET(request: Request) {
  const elevated = await createElevatedRequestContext(request);
  if (!elevated.ok) {
    return privateNoStoreJson({ ok: false, status: elevated.status }, { status: elevated.httpStatus });
  }

  const organizationId = uuid(new URL(request.url).searchParams.get("organizationId"));
  if (!organizationId) return invalid(crypto.randomUUID());

  const response = await elevated.context.supabase!.schema("api").rpc("organization_admin_snapshot", {
    target_organization_id: organizationId,
    page_size: 25,
    before_created_at: null,
    before_id: null
  });
  if (response.error) return failed(crypto.randomUUID());
  return privateNoStoreJson({ ok: true, status: "initial_snapshot", data: response.data });
}

export async function POST(request: Request) {
  const elevated = await createElevatedRequestContext(request);
  if (!elevated.ok) {
    return privateNoStoreJson({ ok: false, status: elevated.status }, { status: elevated.httpStatus });
  }

  const body = await parseBody(request);
  const action = text(body?.action, 64);
  const requestId = crypto.randomUUID();
  if (!body || !action) return invalid(requestId);
  const supabase = elevated.context.supabase!;

  let response: Awaited<ReturnType<typeof supabase.rpc>>;
  if (action === "create_organization") {
    const organizationName = text(body.organizationName, 160);
    const organizationSlug = text(body.organizationSlug, 64)?.toLowerCase();
    if (!organizationName || !organizationSlug || !keyPattern.test(organizationSlug)) return invalid(requestId);
    response = await supabase.schema("api").rpc("create_organization", {
      organization_name: organizationName,
      organization_slug: organizationSlug,
      request_id: requestId
    });
  } else if (action === "create_client") {
    const organizationId = uuid(body.organizationId);
    const clientKey = text(body.clientKey, 64)?.toLowerCase();
    const displayName = text(body.displayName, 160);
    const legalName = nullableText(body.legalName, 240);
    if (!organizationId || !clientKey || !keyPattern.test(clientKey) || !displayName) return invalid(requestId);
    response = await supabase.schema("api").rpc("create_client", {
      target_organization_id: organizationId,
      target_client_key: clientKey,
      target_display_name: displayName,
      target_legal_name: legalName,
      request_id: requestId
    });
  } else if (action === "create_project") {
    const organizationId = uuid(body.organizationId);
    const clientId = body.clientId ? uuid(body.clientId) : null;
    const projectKey = text(body.projectKey, 64)?.toLowerCase();
    const name = text(body.name, 160);
    const description = nullableText(body.description, 1000);
    if (!organizationId || (body.clientId && !clientId) || !projectKey || !keyPattern.test(projectKey) || !name) return invalid(requestId);
    response = await supabase.schema("api").rpc("create_project", {
      target_organization_id: organizationId,
      target_client_id: clientId,
      target_project_key: projectKey,
      target_name: name,
      target_description: description,
      request_id: requestId
    });
  } else if (action === "create_invitation") {
    const organizationId = uuid(body.organizationId);
    const projectId = body.projectId ? uuid(body.projectId) : null;
    const email = text(body.email, 254)?.toLowerCase();
    const organizationRole = text(body.organizationRole, 32);
    const projectRole = body.projectRole ? text(body.projectRole, 32) : null;
    const expiresInDays = typeof body.expiresInDays === "number" && Number.isInteger(body.expiresInDays)
      ? body.expiresInDays
      : 7;
    if (
      !organizationId ||
      (body.projectId && !projectId) ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !organizationRole ||
      !organizationRoles.has(organizationRole) ||
      (projectId ? !projectRole || !projectRoles.has(projectRole) : projectRole !== null) ||
      expiresInDays < 1 ||
      expiresInDays > 30
    ) return invalid(requestId);

    const rawToken = createInvitationToken();
    response = await supabase.schema("api").rpc("create_invitation", {
      target_organization_id: organizationId,
      target_project_id: projectId,
      target_email: email,
      target_organization_role: organizationRole,
      target_project_role: projectRole,
      target_token_hash: hashInvitationToken(rawToken),
      target_expires_at: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
      request_id: requestId
    });
    if (response.error) return failed(requestId);
    return privateNoStoreJson({
      ok: true,
      status: "invitation_created",
      data: response.data,
      acceptPath: `/onboarding#invitation=${rawToken}`,
      caveat: "This acceptance link contains the raw one-time token and is returned only once. The database stores only its SHA-256 hash."
    });
  } else if (action === "revoke_invitation") {
    const invitationId = uuid(body.invitationId);
    const rowVersion = positiveVersion(body.rowVersion);
    if (!invitationId || rowVersion === undefined) return invalid(requestId);
    response = await supabase.schema("api").rpc("revoke_invitation", {
      target_invitation_id: invitationId,
      expected_row_version: rowVersion,
      request_id: requestId
    });
  } else if (action === "set_organization_member") {
    const organizationId = uuid(body.organizationId);
    const profileId = uuid(body.profileId);
    const role = text(body.role, 32);
    const status = text(body.status, 32);
    const rowVersion = positiveVersion(body.rowVersion, true);
    if (!organizationId || !profileId || !role || !organizationRoles.has(role) || !status || !organizationStatuses.has(status) || rowVersion === undefined) return invalid(requestId);
    response = await supabase.schema("api").rpc("set_organization_member", {
      target_organization_id: organizationId,
      target_profile_id: profileId,
      target_role: role,
      target_status: status,
      expected_row_version: rowVersion,
      request_id: requestId
    });
  } else if (action === "set_project_member") {
    const projectId = uuid(body.projectId);
    const profileId = uuid(body.profileId);
    const role = text(body.role, 32);
    const status = text(body.status, 32);
    const rowVersion = positiveVersion(body.rowVersion, true);
    if (!projectId || !profileId || !role || !projectRoles.has(role) || !status || !projectStatuses.has(status) || rowVersion === undefined) return invalid(requestId);
    response = await supabase.schema("api").rpc("set_project_member", {
      target_project_id: projectId,
      target_profile_id: profileId,
      target_role: role,
      target_status: status,
      expected_row_version: rowVersion,
      request_id: requestId
    });
  } else {
    return invalid(requestId);
  }

  if (response.error) return failed(requestId);
  return privateNoStoreJson({ ok: true, status: "admin_action_completed", action, data: response.data, requestId });
}

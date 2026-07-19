import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const moduleCache = new Map();

function toSourcePath(id) {
  if (id.startsWith("@/")) {
    return path.join(process.cwd(), `${id.slice(2)}.ts`);
  }

  return path.join(process.cwd(), id);
}

function loadTsModule(id) {
  const sourcePath = toSourcePath(id);
  if (moduleCache.has(sourcePath)) return moduleCache.get(sourcePath);

  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      verbatimModuleSyntax: false
    }
  });

  const module = { exports: {} };
  moduleCache.set(sourcePath, module.exports);
  vm.runInNewContext(transpiled.outputText, {
    exports: module.exports,
    module,
    process,
    require: (requireId) => {
      if (requireId.startsWith("@/")) return loadTsModule(requireId);
      throw new Error(`Unexpected runtime dependency while checking access decisions: ${requireId}`);
    }
  }, { filename: sourcePath });
  moduleCache.set(sourcePath, module.exports);
  return module.exports;
}

const {
  getProjectAccessDecision,
  roleAllowsAction
} = loadTsModule("src/lib/access/access-decision.ts");

const {
  verifyMembershipAccess
} = loadTsModule("src/lib/access/membership-verification.ts");

const {
  requireProjectAccess
} = loadTsModule("src/lib/auth/project-access.ts");

const {
  getEnforcementConfig
} = loadTsModule("src/lib/platform/enforcement-config.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decision(input) {
  const profileOrganizationId = input.profile?.organizationId;
  return getProjectAccessDecision({
    mode: "hard",
    authMode: "supabase_auth",
    action: "read",
    organizationMembership: input.organizationMembership ?? (profileOrganizationId
      ? {
          profileId: input.profile.id,
          organizationId: profileOrganizationId,
          role: "member",
          status: "active"
        }
      : null),
    ...input
  });
}

assert(roleAllowsAction("client_viewer", "read"), "client_viewer should read");
assert(roleAllowsAction("client_viewer", "export"), "client_viewer should export");
assert(!roleAllowsAction("client_viewer", "write"), "client_viewer should not write");
assert(roleAllowsAction("analyst", "validate"), "analyst should validate");
assert(!roleAllowsAction("analyst", "attest_client"), "analyst screening review must not establish client attestation");
assert(!roleAllowsAction("analyst", "attest_official"), "analyst screening review must not establish official attestation");
assert(!roleAllowsAction("admin", "attest_client"), "admin role alone must not establish client attestation");
assert(roleAllowsAction("admin", "attest_client", ["client_attestor"]), "admin with explicit capability may establish client attestation");
assert(!roleAllowsAction("admin", "attest_official"), "admin must not establish official attestation");
assert(!roleAllowsAction("owner", "attest_official"), "owner role alone must not establish official attestation");
assert(roleAllowsAction("owner", "attest_official", ["official_attestor"]), "owner with explicit capability may establish official attestation");
assert(roleAllowsAction("analyst", "aoi.write"), "analyst should write AOIs through an exact action");
assert(!roleAllowsAction("analyst", "write"), "legacy generic write must fail narrower than analyst resource writes");
assert(!roleAllowsAction("client_viewer", "evidence.read"), "client viewer must not read base evidence without an audience check");
assert(roleAllowsAction("admin", "audit.read"), "admin should read audit metadata");
assert(roleAllowsAction("viewer", "source.read"), "viewer should read approved source metadata");
assert(!roleAllowsAction("owner", "source.manage"), "owner role alone must not manage source custody");
assert(roleAllowsAction("viewer", "source.manage", ["source_operator"]), "source operator capability is separate from project hierarchy");
assert(!roleAllowsAction("analyst", "manage"), "analyst should not manage");
assert(roleAllowsAction("admin", "manage"), "admin should manage");
assert(roleAllowsAction("owner", "manage"), "owner should manage");

const roles = ["client_viewer", "viewer", "analyst", "admin", "owner"];
for (const role of roles) {
  assert(roleAllowsAction(role, "read"), `${role} should read`);
}
for (const role of ["client_viewer", "viewer", "analyst", "admin", "owner"]) {
  assert(roleAllowsAction(role, "export"), `${role} should export`);
}
for (const action of ["upload", "review", "validate"]) {
  for (const role of ["analyst", "admin", "owner"]) {
    assert(roleAllowsAction(role, action), `${role} should ${action}`);
  }
  for (const role of ["client_viewer", "viewer"]) {
    assert(!roleAllowsAction(role, action), `${role} should not ${action}`);
  }
}
for (const role of ["admin", "owner"]) {
  assert(roleAllowsAction(role, "write"), `${role} should pass the legacy conservative write guard`);
}
for (const role of ["client_viewer", "viewer", "analyst"]) {
  assert(!roleAllowsAction(role, "write"), `${role} should not pass the legacy generic write guard`);
}
for (const role of ["admin", "owner"]) {
  assert(roleAllowsAction(role, "manage"), `${role} should manage`);
}
for (const role of ["client_viewer", "viewer", "analyst"]) {
  assert(!roleAllowsAction(role, "manage"), `${role} should not manage`);
}

const softDemo = getProjectAccessDecision({
  mode: "soft",
  authMode: "demo_public",
  action: "read"
});
assert(softDemo.allowed && softDemo.status === "hard_access_disabled", "soft demo mode should not block");

const envKeys = [
  "NEXT_PUBLIC_AUTH_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "GEOAI_ACCESS_ENFORCEMENT_MODE",
  "GEOAI_ALLOW_DEMO_PUBLIC",
  "GEOAI_REQUIRE_SUPABASE_READY",
  "GEOAI_REQUIRE_STORAGE_READY"
];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
function accessWithEnv(env, input = {}) {
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, env);
  return requireProjectAccess({ projectKey: "dubai-investment-screening-demo", action: "read", ...input });
}

const hardDisabledNoBypass = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "disabled",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "false"
});
assert(!hardDisabledNoBypass.allowed && hardDisabledNoBypass.decisionStatus === "unauthenticated", "hard + disabled Auth + no demo bypass must deny");

const hardDemoNoBypass = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "false"
});
assert(!hardDemoNoBypass.allowed, "hard public demo without explicit bypass must deny");

const hardExplicitDemoRead = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
});
assert(hardExplicitDemoRead.allowed && hardExplicitDemoRead.decisionStatus === "demo_public", "hard seeded demo read may pass only with explicit bypass");

const hardExplicitDemoMutation = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
}, { action: "upload" });
assert(!hardExplicitDemoMutation.allowed && hardExplicitDemoMutation.status === 403, "public demo server mutations must remain blocked even with read bypass");

const hardNonDemo = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
}, { projectKey: "client-project" });
assert(!hardNonDemo.allowed, "hard public demo bypass must not authorize non-demo projects");

const hardSupabaseWithoutRequestIdentity = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "supabase_auth",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "false"
});
assert(!hardSupabaseWithoutRequestIdentity.allowed, "hard Supabase mode must deny without request-scoped membership");

const softSupabaseDemoMutationWithoutRequestIdentity = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "supabase_auth",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
}, { action: "upload" });
assert(
  !softSupabaseDemoMutationWithoutRequestIdentity.allowed && softSupabaseDemoMutationWithoutRequestIdentity.status === 403,
  "Environment-selected Supabase mode must not authorize server mutations without request-scoped identity"
);

const softDemoRead = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft",
  GEOAI_ALLOW_DEMO_PUBLIC: "false"
});
assert(!softDemoRead.allowed, "explicitly disabled public demo access must deny even in soft mode");

const defaultSoftDemoRead = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft"
});
assert(defaultSoftDemoRead.allowed, "explicit public demo mode with the default allowlist must remain available");

const requestedSupabaseMissingConfig = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "supabase_auth",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
});
assert(!requestedSupabaseMissingConfig.allowed && requestedSupabaseMissingConfig.authMode === "disabled", "incomplete requested Supabase Auth must fail closed without demo fallback");

const invalidExplicitAuthMode = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo-pbulic",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
});
assert(!invalidExplicitAuthMode.allowed && invalidExplicitAuthMode.authMode === "disabled", "invalid explicit Auth mode must fail closed");

accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "sfot",
  GEOAI_ALLOW_DEMO_PUBLIC: "treu",
  GEOAI_REQUIRE_SUPABASE_READY: "flase",
  GEOAI_REQUIRE_STORAGE_READY: "flase"
});
const invalidEnforcement = getEnforcementConfig();
assert(invalidEnforcement.accessEnforcementMode === "hard", "invalid enforcement mode must fail to hard");
assert(!invalidEnforcement.allowDemoPublic, "invalid demo-public flag must fail to false");
assert(invalidEnforcement.requireSupabaseReady && invalidEnforcement.requireStorageReady, "invalid readiness flags must fail to required");

const suffixOnlyDemoBypass = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
}, { projectKey: "attacker-controlled-demo" });
assert(!suffixOnlyDemoBypass.allowed, "demo bypass must use the explicit seeded-key allowlist, not a suffix");

const softDemoMutation = accessWithEnv({
  NEXT_PUBLIC_AUTH_MODE: "demo_public",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "soft",
  GEOAI_ALLOW_DEMO_PUBLIC: "true"
}, { action: "write" });
assert(!softDemoMutation.allowed, "soft public demo server mutation must be browser-local instead");

for (const key of envKeys) {
  if (originalEnv[key] === undefined) delete process.env[key];
  else process.env[key] = originalEnv[key];
}

const unauthenticated = decision({ user: null });
assert(!unauthenticated.allowed && unauthenticated.status === "unauthenticated", "hard mode should deny unauthenticated requests");

const noProfile = decision({ user: { id: "auth-user-1" }, profile: null });
assert(!noProfile.allowed && noProfile.status === "authenticated_without_profile", "hard mode should deny users without profiles");

const noMembership = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
  project: { id: "project-1", organizationId: "org-1" }
});
assert(!noMembership.allowed && noMembership.status === "profile_without_project_membership", "hard mode should deny profiles without membership");

const missingProfileStatus = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1" },
  project: { id: "project-1", projectKey: "project-1", organizationId: "org-1" },
  membership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "active" }
});
assert(!missingProfileStatus.allowed && missingProfileStatus.status === "authenticated_without_profile", "hard mode must reject a profile without explicit active status");

const wrongOrganization = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-2", status: "active" },
  project: { id: "project-1", organizationId: "org-1" },
  membership: {
    userId: "profile-1",
    projectId: "project-1",
    organizationId: "org-2",
    role: "owner",
    status: "active"
  }
});
assert(!wrongOrganization.allowed && wrongOrganization.status === "wrong_organization", "hard mode should reject wrong organization");

const insufficientRole = decision({
  action: "write",
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
  project: { id: "project-1", organizationId: "org-1" },
  membership: {
    userId: "profile-1",
    projectId: "project-1",
    organizationId: "org-1",
    role: "client_viewer",
    status: "active"
  }
});
assert(!insufficientRole.allowed && insufficientRole.status === "insufficient_role", "hard mode should reject insufficient role");

const allowed = decision({
  action: "upload",
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
  project: { id: "project-1", organizationId: "org-1" },
  membership: {
    userId: "profile-1",
    projectId: "project-1",
    organizationId: "org-1",
    role: "analyst",
    status: "active"
  }
});
assert(allowed.allowed && allowed.status === "allowed_project_member", "hard mode should allow analyst upload");

const missingProjectIdentity = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
  project: { projectKey: "project-1", organizationId: "org-1" },
  membership: { profileId: "profile-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "active" }
});
assert(!missingProjectIdentity.allowed, "hard mode must fail closed when canonical project ids are missing");

const mismatchedProjectKey = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
  project: { id: "project-1", projectKey: "project-1", organizationId: "org-1" },
  membership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-2", organizationId: "org-1", role: "owner", status: "active" }
});
assert(!mismatchedProjectKey.allowed, "hard mode must reject a mismatched denormalized project key even when ids match");

const mismatchedAuthProfile = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", authUserId: "auth-user-2", organizationId: "org-1", status: "active" },
  project: { id: "project-1", projectKey: "project-1", organizationId: "org-1" },
  membership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "active" }
});
assert(!mismatchedAuthProfile.allowed, "hard mode must reject a profile mapped to another auth user");

function membershipInput(overrides = {}) {
  return {
    mode: "hard",
    authMode: "supabase_auth",
    action: "read",
    session: { userId: "auth-user-1", authMode: "supabase_auth" },
    profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "active" },
    organizationMembership: { profileId: "profile-1", organizationId: "org-1", status: "active" },
    project: { id: "project-1", projectKey: "project-1", organizationId: "org-1" },
    projectMembership: {
      profileId: "profile-1",
      projectId: "project-1",
      projectKey: "project-1",
      organizationId: "org-1",
      role: "owner",
      status: "active"
    },
    ...overrides
  };
}

function assertMembership(overrides, expectedStatus, expectedAllowed, message) {
  const result = verifyMembershipAccess(membershipInput(overrides));
  assert(result.status === expectedStatus, `${message}: expected ${expectedStatus}, got ${result.status}`);
  assert(result.allowed === expectedAllowed, `${message}: expected allowed=${expectedAllowed}, got ${result.allowed}`);
  return result;
}

assertMembership({ session: null }, "no_session", false, "membership hard mode should deny no session");
assertMembership({ profile: null }, "no_profile", false, "membership hard mode should deny no profile");
assertMembership(
  { profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1", status: "disabled" } },
  "inactive_profile",
  false,
  "membership hard mode should deny inactive profile"
);
assertMembership(
  { profile: { id: "profile-1", authUserId: "auth-user-1", organizationId: "org-1" } },
  "inactive_profile",
  false,
  "membership hard mode should deny a profile without explicit status"
);
assertMembership(
  { organizationMembership: { profileId: "profile-1", organizationId: "org-1" } },
  "inactive_membership",
  false,
  "membership hard mode should deny org membership without explicit status"
);
assertMembership({ organizationMembership: null }, "no_org_membership", false, "membership hard mode should deny no org membership");
assertMembership({ projectMembership: null }, "no_project_membership", false, "membership hard mode should deny no project membership");
assertMembership(
  { projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "disabled" } },
  "inactive_membership",
  false,
  "membership hard mode should deny inactive project membership"
);
assertMembership(
  { projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "owner" } },
  "inactive_membership",
  false,
  "membership hard mode should deny project membership without explicit status"
);
assertMembership(
  {
    organizationMembership: { profileId: "profile-1", organizationId: "org-2", status: "active" },
    projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-2", role: "owner", status: "active" }
  },
  "wrong_organization",
  false,
  "membership hard mode should deny other org member"
);
assertMembership(
  { action: "write", projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "client_viewer", status: "active" } },
  "insufficient_role",
  false,
  "membership hard mode should deny insufficient role"
);
assertMembership(
  { action: "manage", projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "admin", status: "active" } },
  "allowed",
  true,
  "membership hard mode should allow admin manage"
);
assertMembership(
  {
    project: { projectKey: "project-1", organizationId: "org-1" },
    projectMembership: { profileId: "profile-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "active" }
  },
  "no_project_membership",
  false,
  "membership hard mode should require canonical project ids"
);
assertMembership(
  { projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-2", organizationId: "org-1", role: "owner", status: "active" } },
  "no_project_membership",
  false,
  "membership hard mode should reject project id/key mismatch"
);
assertMembership(
  { profile: { id: "profile-1", authUserId: "auth-user-2", organizationId: "org-1", status: "active" } },
  "no_profile",
  false,
  "membership hard mode should reject auth/profile mismatch"
);

const softMembership = verifyMembershipAccess(membershipInput({
  mode: "soft",
  session: null
}));
assert(softMembership.allowed, "membership soft mode should not block demo flow");
assert(!softMembership.hardModeAllowed && softMembership.status === "no_session", "membership soft mode should keep advisory hard status");

const serialized = JSON.stringify([softDemo, unauthenticated, allowed, softMembership]);
assert(!/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(serialized), "decisions must not expose JWT-like values");
assert(!/service[_-]?role/i.test(serialized), "decisions must not expose service-role strings");

const evidenceReviewRouteSource = fs.readFileSync(
  path.join(process.cwd(), "app/api/validation/evidence/[id]/reviews/route.ts"),
  "utf8"
);
const attestationGuardIndex = evidenceReviewRouteSource.indexOf("hasEvidenceAttestationAuthority()");
const evidenceReviewCreateIndex = evidenceReviewRouteSource.indexOf("const review = await createEvidenceReview");
assert(attestationGuardIndex >= 0, "evidence review route must include the attestation-authority guard");
assert(
  evidenceReviewCreateIndex > attestationGuardIndex,
  "evidence attestation authority and role checks must run before an evidence review is persisted"
);

console.log(JSON.stringify({
  ok: true,
  checked: [
    "role/action matrix",
    "client/official attestation capability separation",
    "evidence-attestation guard before persistence",
    "soft demo advisory mode",
    "env-driven hard/soft/Auth/demo-bypass matrix",
    "Supabase misconfiguration fail-closed matrix",
    "invalid explicit environment values fail closed",
    "explicit demo-key allowlist",
    "public-demo server mutation denial",
    "hard unauthenticated denial",
    "hard no-profile denial",
    "missing profile-status denial",
    "hard no-membership denial",
    "wrong organization denial",
    "insufficient role denial",
    "allowed project member",
    "canonical project-id requirement",
    "project id/key consistency denial",
    "auth-user/profile mapping denial",
    "membership no-session denial",
    "membership no-profile denial",
    "membership inactive-profile denial",
    "membership missing-status denials",
    "membership no-org-membership denial",
    "membership no-project-membership denial",
    "membership inactive-membership denial",
    "membership other-org denial",
    "membership insufficient-role denial",
    "membership canonical-id and auth mapping denials",
    "membership soft-mode advisory"
  ],
  caveat: "Access decision checks validate helper behavior only; they are not Supabase RLS certification."
}, null, 2));

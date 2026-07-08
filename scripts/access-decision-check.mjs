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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decision(input) {
  return getProjectAccessDecision({
    mode: "hard",
    authMode: "supabase_auth",
    action: "read",
    ...input
  });
}

assert(roleAllowsAction("client_viewer", "read"), "client_viewer should read");
assert(roleAllowsAction("client_viewer", "export"), "client_viewer should export");
assert(!roleAllowsAction("client_viewer", "write"), "client_viewer should not write");
assert(roleAllowsAction("analyst", "validate"), "analyst should validate");
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
for (const action of ["write", "upload", "review", "validate"]) {
  for (const role of ["analyst", "admin", "owner"]) {
    assert(roleAllowsAction(role, action), `${role} should ${action}`);
  }
  for (const role of ["client_viewer", "viewer"]) {
    assert(!roleAllowsAction(role, action), `${role} should not ${action}`);
  }
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

const unauthenticated = decision({ user: null });
assert(!unauthenticated.allowed && unauthenticated.status === "unauthenticated", "hard mode should deny unauthenticated requests");

const noProfile = decision({ user: { id: "auth-user-1" }, profile: null });
assert(!noProfile.allowed && noProfile.status === "authenticated_without_profile", "hard mode should deny users without profiles");

const noMembership = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", organizationId: "org-1", status: "active" },
  project: { id: "project-1", organizationId: "org-1" }
});
assert(!noMembership.allowed && noMembership.status === "profile_without_project_membership", "hard mode should deny profiles without membership");

const wrongOrganization = decision({
  user: { id: "auth-user-1" },
  profile: { id: "profile-1", organizationId: "org-2", status: "active" },
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
  profile: { id: "profile-1", organizationId: "org-1", status: "active" },
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
  profile: { id: "profile-1", organizationId: "org-1", status: "active" },
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
assertMembership({ organizationMembership: null }, "no_org_membership", false, "membership hard mode should deny no org membership");
assertMembership({ projectMembership: null }, "no_project_membership", false, "membership hard mode should deny no project membership");
assertMembership(
  { projectMembership: { profileId: "profile-1", projectId: "project-1", projectKey: "project-1", organizationId: "org-1", role: "owner", status: "disabled" } },
  "inactive_membership",
  false,
  "membership hard mode should deny inactive project membership"
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

const softMembership = verifyMembershipAccess(membershipInput({
  mode: "soft",
  session: null
}));
assert(softMembership.allowed, "membership soft mode should not block demo flow");
assert(!softMembership.hardModeAllowed && softMembership.status === "no_session", "membership soft mode should keep advisory hard status");

const serialized = JSON.stringify([softDemo, unauthenticated, allowed, softMembership]);
assert(!/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(serialized), "decisions must not expose JWT-like values");
assert(!/service[_-]?role/i.test(serialized), "decisions must not expose service-role strings");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "role/action matrix",
    "soft demo advisory mode",
    "hard unauthenticated denial",
    "hard no-profile denial",
    "hard no-membership denial",
    "wrong organization denial",
    "insufficient role denial",
    "allowed project member",
    "membership no-session denial",
    "membership no-profile denial",
    "membership inactive-profile denial",
    "membership no-org-membership denial",
    "membership no-project-membership denial",
    "membership inactive-membership denial",
    "membership other-org denial",
    "membership insufficient-role denial",
    "membership soft-mode advisory"
  ],
  caveat: "Access decision checks validate helper behavior only; they are not Supabase RLS certification."
}, null, 2));

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = path.join(process.cwd(), "src/lib/access/access-decision.ts");
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
vm.runInNewContext(transpiled.outputText, {
  exports: module.exports,
  module,
  require: (id) => {
    throw new Error(`Unexpected runtime dependency while checking access decisions: ${id}`);
  }
}, { filename: sourcePath });

const {
  getProjectAccessDecision,
  roleAllowsAction
} = module.exports;

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

const serialized = JSON.stringify([softDemo, unauthenticated, allowed]);
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
    "allowed project member"
  ],
  caveat: "Access decision checks validate helper behavior only; they are not Supabase RLS certification."
}, null, 2));

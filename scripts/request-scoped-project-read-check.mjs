import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const moduleCache = new Map();

function sourcePath(id) {
  return path.join(process.cwd(), id.startsWith("@/") ? `${id.slice(2)}.ts` : id);
}

function loadTsModule(id) {
  const target = sourcePath(id);
  if (moduleCache.has(target)) return moduleCache.get(target);
  const output = ts.transpileModule(fs.readFileSync(target, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      verbatimModuleSyntax: false
    }
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(target, module.exports);
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    process,
    require: (request) => {
      if (request.startsWith("@/")) return loadTsModule(request);
      throw new Error(`Unexpected dependency in request read policy test: ${request}`);
    }
  }, { filename: target });
  moduleCache.set(target, module.exports);
  return module.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const policy = loadTsModule("src/lib/auth/request-project-read-policy.ts");
const readiness = {
  repositoriesEnabled: true,
  authKernelImplemented: true,
  requestUserVerified: true,
  projectMembershipVerified: true,
  rlsPersonaMatrixVerified: true
};
const userId = "81000000-0000-4000-8000-000000000002";
const profileId = "82000000-0000-4000-8000-000000000002";
const organizationId = "83000000-0000-4000-8000-000000000001";
const projectId = "84000000-0000-4000-8000-000000000001";

function prerequisite(patch = {}) {
  return policy.evaluateRequestProjectReadPrerequisites({
    projectKey: "persona-project-a",
    action: "source.read",
    authMode: "supabase_auth",
    authorizationHeaderPresent: false,
    readiness,
    ...patch
  });
}

function access(role, action, patch = {}) {
  return policy.evaluateCurrentProjectReadAccess({
    projectKey: "persona-project-a",
    action,
    principal: { userId, profileId, authUserId: userId },
    row: projectAccessRow(role, patch)
  });
}

function projectAccessRow(role, patch = {}) {
  return {
    profile_id: profileId,
    organization_id: organizationId,
    organization_role: "member",
    capabilities: [],
    project_id: projectId,
    project_key: "persona-project-a",
    project_status: "active",
    project_role: role,
    project_membership_status: "active",
    ...patch
  };
}

assert(prerequisite() === null, "verified cookie/readiness prerequisites should pass");
assert(prerequisite({ projectKey: null })?.code === "invalid_project_key", "null project target must fail closed");
assert(prerequisite({ projectKey: " persona-project-a" })?.code === "invalid_project_key", "project keys must not be trimmed");
assert(prerequisite({ projectKey: "persona/project-a" })?.code === "invalid_project_key", "path-like project keys must be rejected");
assert(prerequisite({ projectKey: "a".repeat(129) })?.code === "invalid_project_key", "project keys must be bounded before RPC execution");
assert(prerequisite({ action: "project.update" })?.code === "unsupported_read_action", "mutation actions must never enter the read facade");
assert(prerequisite({ authorizationHeaderPresent: true })?.code === "unsupported_bearer_transport", "bearer/mixed transport must be rejected");
assert(prerequisite({ authMode: "demo_public" })?.code === "auth_mode_inactive", "public demo must not fall back to protected reads");
assert(prerequisite({ authMode: "disabled" })?.code === "auth_mode_inactive", "disabled Auth must fail closed");
for (const flag of Object.keys(readiness)) {
  assert(
    prerequisite({ readiness: { ...readiness, [flag]: false } })?.code === "readiness_unverified",
    `${flag} must independently keep repositories closed`
  );
}

assert(access("viewer", "source.read").allowed, "viewer should pass the canonical source.read role rule");
assert(!access("client_viewer", "source.read").allowed, "client_viewer must not read raw source releases");
for (const action of ["project.read", "report.read", "report.export", "workflow.read"]) {
  assert(access("client_viewer", action).allowed, `client_viewer should retain its canonical ${action} projection`);
}
for (const action of ["members.read", "aoi.read", "analysis.read", "comparison.read", "evidence.read", "dataset.read", "source.read", "audit.read"]) {
  assert(!access("client_viewer", action).allowed, `client_viewer must not be widened into ${action}`);
}
assert(!access("viewer", "audit.read").allowed, "viewer must not read audit metadata");
assert(access("admin", "audit.read").allowed, "admin should pass the canonical audit.read role rule");
assert(!access("viewer", "source.read", { project_key: "persona-project-b" }).allowed, "RPC scope must exactly match the requested project");
assert(!policy.evaluateCurrentProjectReadAccess({
  projectKey: "persona-project-a",
  action: "source.read",
  principal: { userId, profileId, authUserId: userId },
  row: null
}).allowed, "missing and cross-tenant project access must be indistinguishable denials");
assert(!access("viewer", "source.read", { profile_id: "82000000-0000-4000-8000-000000000099" }).allowed, "RPC profile must match the request principal");
assert(!policy.evaluateCurrentProjectReadAccess({
  projectKey: "persona-project-a",
  action: "source.read",
  principal: { userId, profileId, authUserId: "81000000-0000-4000-8000-000000000099" },
  row: projectAccessRow("viewer")
}).allowed, "profile/auth-user substitution must fail closed");
assert(!access("viewer", "source.read", { project_membership_status: "disabled" }).allowed, "inactive membership must fail closed");
assert(!access("viewer", "source.read", { project_status: "archived" }).allowed, "inactive project status must fail closed");
assert(!access("viewer", "source.read", { capabilities: ["unknown_capability"] }).allowed, "unknown capabilities must not be trusted");
assert(!access("owner", "source.read", { capabilities: ["source_operator", "source_operator"] }).allowed, "duplicate capability claims must fail closed");

const runtimeSource = fs.readFileSync(sourcePath("src/lib/auth/request-project-read-access.ts"), "utf8");
const repositorySource = fs.readFileSync(sourcePath("src/lib/repositories/request-scoped-project-read.ts"), "utf8");
const combined = `${runtimeSource}\n${repositorySource}`;
assert(runtimeSource.includes("createRequestAuthContext(input.request)"), "runtime access must use the existing request context");
assert(runtimeSource.includes('.schema("api")') && runtimeSource.includes('.rpc("current_project_access"'), "membership resolution must use api.current_project_access");
assert(runtimeSource.includes("target_project_key: projectKey"), "current_project_access must receive the exact requested project key");
assert(repositorySource.includes('action: "source.read"'), "source releases must use the exact source.read action");
assert(repositorySource.includes("target_project_key: access.scope.projectKey"), "resource RPC scope must derive from verified access, not caller organization input");
assert(repositorySource.includes('.rpc("current_source_releases"'), "the facade must expose only the reviewed bounded source RPC");
assert(repositorySource.includes("pageSize > 100") && repositorySource.includes("response.data.length > pageSize"), "source reads must enforce request and response row bounds");
for (const forbiddenField of ["objectPath:", "object_path:", "sourceUri:", "source_uri:", "secret:", "credentials:", "qualitySummary:", "lineageSummary:"]) {
  assert(!repositorySource.includes(forbiddenField), `source release DTO must not map ${forbiddenField}`);
}
assert(!/organization(Id|_id)\s*:\s*input\./.test(combined), "caller-supplied organization scope must never be trusted");
assert(!/\.from\s*\(/.test(combined), "request read facade must not bypass api RPCs with base-table reads");
for (const forbidden of ["getSession(", "service_role", "SERVICE_ROLE", "unstable_cache", "use cache", "globalThis", "new Map("]) {
  assert(!combined.includes(forbidden), `request read facade contains forbidden boundary pattern: ${forbidden}`);
}
assert(!/authorization[^\n]*(split|replace|substring|slice)/i.test(combined), "authorization headers must be rejected, never parsed into a bearer fallback");

console.log("Request-scoped project read contract passed: exact cookie principal/project RPC scope, evidence gates, shared role kernel, client_viewer limits and no shared cache/base-table fallback.");

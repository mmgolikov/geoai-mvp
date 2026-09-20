import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");
const originalLoad = Module._load;
const originalNodeEnv = process.env.NODE_ENV;

let persona = "member";
let projectAccessCalls = 0;
let identityAttempts = 0;
const userId = "00000000-0000-4000-8000-000000000001";
const profileId = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000003";
const organizationId = "00000000-0000-4000-8000-000000000004";

const fakeClient = {
  auth: {
    getClaims: async () => {
      identityAttempts += 1;
      if (persona === "transient_unverified" && identityAttempts === 1) {
        return { data: { claims: null }, error: { code: "synthetic_unverified" } };
      }
      const isAnonymous = persona === "transient_anonymous" && identityAttempts === 1;
      return { data: { claims: { sub: userId, is_anonymous: isAnonymous } }, error: null };
    },
    getUser: async () => {
      const isAnonymous = persona === "transient_anonymous" && identityAttempts === 1;
      return { data: { user: { id: userId, is_anonymous: isAnonymous } }, error: null };
    }
  },
  schema(name) {
    assert.equal(name, "api");
    return {
      rpc(name, args) {
        if (name === "current_profile") {
          return { maybeSingle: async () => ({
            data: { id: profileId, auth_user_id: userId, status: "active", identity_kind: "user", email: null, full_name: null },
            error: null
          }) };
        }
        assert.equal(name, "current_project_access");
        projectAccessCalls += 1;
        if (persona === "dependency") return { maybeSingle: async () => ({ data: null, error: { code: "offline" } }) };
        if (persona === "outsider") return { maybeSingle: async () => ({ data: null, error: null }) };
        return { maybeSingle: async () => ({
          data: {
            profile_id: profileId,
            project_id: projectId,
            organization_id: organizationId,
            project_key: persona === "wrong_project" ? "different-project" : args.target_project_key,
            project_status: persona === "inactive" ? "disabled" : "demo",
            project_role: persona === "viewer" ? "viewer" : persona === "client_viewer" ? "client_viewer" : "analyst",
            project_membership_status: persona === "inactive" ? "disabled" : "active"
          },
          error: null
        }) };
      }
    };
  }
};

Module._load = function (name, parent, isMain) {
  if (name === "server-only") return {};
  if (name.endsWith("/src/lib/supabase/ssr-server")) {
    return { createRequestScopedSupabaseClient: async () => fakeClient };
  }
  if (name === "next/navigation") {
    return { redirect: value => { throw new Error(`REDIRECT:${value}`); } };
  }
  return originalLoad.call(this, name, parent, isMain);
};

require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(
  readFileSync(filename, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_all, _quote, path) =>
    JSON.stringify(new URL(`../${path}`, import.meta.url).pathname)),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
).outputText, filename);

const identity = require("../src/lib/auth/require-pilot-identity.ts");
const page = require("../src/lib/auth/require-pilot-page-identity.ts");
const envKeys = [
  "VERCEL_ENV", "NODE_ENV", "GEOAI_RUNTIME_TARGET", "NEXT_PUBLIC_AUTH_MODE", "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE",
  "GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE", "GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY"
];
const prior = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const valid = {
  VERCEL_ENV: "production",
  NODE_ENV: "production",
  NEXT_PUBLIC_AUTH_MODE: "supabase_auth",
  NEXT_PUBLIC_SUPABASE_URL: "https://pphdqkurxneyagvnnjdt.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "synthetic_offline_fixture"].join("_"),
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE: "true",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE: "true",
  GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY: "synthetic-production-scope"
};
function configure(values) {
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, values);
}
function request(method = "GET") {
  return new Request("https://geoai-mvp.vercel.app/api/prototype/point-to-object/ai", { method });
}

try {
  configure(valid);
  persona = "member";
  assert.equal((await identity.requirePilotIdentity(request("GET"))).allowed, true);
  await page.requirePilotPageIdentity("/prototype/point-to-object");

  for (const deniedPersona of ["outsider", "wrong_project", "inactive"]) {
    persona = deniedPersona;
    assert.equal((await identity.requirePilotIdentity(request("GET"))).response.status, 403, deniedPersona);
  }
  persona = "outsider";
  await assert.rejects(page.requirePilotPageIdentity("/prototype/point-to-object"), /REDIRECT:\/request-access/);

  for (const transientPersona of ["transient_unverified", "transient_anonymous"]) {
    persona = transientPersona;
    identityAttempts = 0;
    await assert.rejects(
      page.requirePilotPageIdentity("/prototype/point-to-object"),
      /REDIRECT:\/login\?next=%2Fprototype%2Fpoint-to-object/,
      `${transientPersona} must terminate at login instead of retrying into a verified context`
    );
    assert.equal(identityAttempts, 1, `${transientPersona} must not receive a second Auth/context attempt`);
  }

  persona = "dependency";
  assert.equal((await identity.requirePilotIdentity(request("POST"))).response.status, 503);
  await assert.rejects(
    page.requirePilotPageIdentity("/prototype/point-to-object"),
    error => error?.status === 503 && error?.code === "project_membership_dependency_unavailable"
  );

  persona = "viewer";
  assert.equal((await identity.requirePilotIdentity(request("GET"))).allowed, true, "viewer may read");
  assert.equal((await identity.requirePilotIdentity(request("POST"))).response.status, 403, "viewer may not run analysis");
  persona = "client_viewer";
  await assert.rejects(
    page.requirePilotPageIdentity("/prototype/point-to-object"),
    /REDIRECT:\/request-access/,
    "a role without analysis.read may not enter the analysis product"
  );

  configure({ ...valid, VERCEL_ENV: "preview" });
  projectAccessCalls = 0;
  assert.equal((await identity.requirePilotIdentity(request("POST"))).allowed, true, "Preview keeps the existing identity-only path");
  assert.equal(projectAccessCalls, 0, "Preview must not query the Production project scope");

  const genericProduction = { ...valid };
  delete genericProduction.VERCEL_ENV;
  configure(genericProduction);
  projectAccessCalls = 0;
  persona = "outsider";
  assert.equal(identity.productionPointObjectMembershipRequired(process.env), true, "optimized null-VERCEL_ENV runtime fails closed");
  assert.equal((await identity.requirePilotIdentity(request("GET"))).response.status, 403);
  assert.equal(projectAccessCalls, 1);

  configure({ ...valid, VERCEL_ENV: "preview" });
  assert.equal(identity.productionPointObjectMembershipRequired(process.env), false, "Preview wins over NODE_ENV=production");

  const routeFiles = ["ai", "context", "search", "suggest", "find", "area-context", "create"];
  for (const route of routeFiles) {
    const source = readFileSync(new URL(`../app/api/prototype/point-to-object/${route}/route.ts`, import.meta.url), "utf8");
    const guardIndex = source.indexOf("await requirePilotIdentity(request)");
    const bodyIndex = source.indexOf("readBoundedJson(request", guardIndex);
    assert.ok(guardIndex >= 0, `${route} must use the common identity/membership guard`);
    if (bodyIndex >= 0) assert.ok(guardIndex < bodyIndex, `${route} must authorize before reading a billable/upstream body`);
  }

  console.log("quality20-production-membership-check: PASS (member/outsider/scope/status/role/runtime isolation and pre-upstream guard)");
} finally {
  configure(Object.fromEntries(Object.entries(prior).filter(([, value]) => value !== undefined)));
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  Module._load = originalLoad;
}

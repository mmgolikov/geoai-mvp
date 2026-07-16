import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [browser, server, updater, middleware, mutationOrigin, context, summary, kernel] = await Promise.all([
  source("src/lib/supabase/browser.ts"),
  source("src/lib/supabase/ssr-server.ts"),
  source("src/lib/supabase/update-session.ts"),
  source("middleware.ts"),
  source("src/lib/auth/api-mutation-origin.ts"),
  source("src/lib/auth/request-context.ts"),
  source("src/lib/auth/session-summary.ts"),
  source("src/lib/auth/request-auth-kernel.ts")
]);
const combined = [browser, server, updater, middleware, mutationOrigin, context, summary].join("\n");
const failures = [];

if (!browser.includes('createBrowserClient') || !browser.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !browser.includes("getSupabasePublishableKey")) {
  failures.push("Browser client is not using @supabase/ssr with the publishable key");
}
if (!server.includes("createServerClient") || !server.includes("cookies") || !server.includes("getAll") || !server.includes("setAll")) {
  failures.push("Server client does not implement the SSR cookie adapter");
}
if (!updater.includes("await supabase.auth.getClaims()") || !updater.includes("response.cookies.set")) {
  failures.push("Middleware does not verify/refresh claims and propagate response cookies");
}
if (!middleware.includes('NEXT_PUBLIC_AUTH_MODE') || !middleware.includes("updateSupabaseSession")) {
  failures.push("Next middleware does not fail closed outside explicit Supabase Auth mode");
}
const middlewareBody = middleware.slice(middleware.indexOf("export function middleware"));
const authModeIndex = middlewareBody.indexOf('NEXT_PUBLIC_AUTH_MODE');
const originGuardIndex = middlewareBody.indexOf("evaluateApiMutationOrigin(");
const sessionRefreshIndex = middlewareBody.indexOf("updateSupabaseSession(request)");
if (authModeIndex < 0 || originGuardIndex < authModeIndex || sessionRefreshIndex < originGuardIndex) {
  failures.push("Supabase cookie mutation-origin enforcement must run after the explicit Auth-mode gate and before session refresh");
}
if (!/status:\s*403/.test(middlewareBody) || !/private, no-store/.test(middlewareBody) || !middlewareBody.includes('"request_origin_rejected"')) {
  failures.push("Rejected authenticated API mutations are not returned as private no-store JSON 403 responses");
}
if (
  !mutationOrigin.includes('"missing_origin"') ||
  !mutationOrigin.includes('"cross_site_fetch_metadata"') ||
  !mutationOrigin.includes('"invalid_request_authority"') ||
  !mutationOrigin.includes('"same-origin"') ||
  !mutationOrigin.includes('pathname.startsWith("/api/")')
) {
  failures.push("Mutation-origin helper does not cover missing Origin, Fetch Metadata and request-authority boundaries");
}
const contextBody = context.slice(context.indexOf("export async function createRequestAuthContext"));
if (!context.includes('"unsupported_bearer_transport"') || contextBody.indexOf('headers.get("authorization")') > contextBody.indexOf("await createRequestScopedSupabaseClient")) {
  failures.push("Request context does not reject bearer/mixed transport before client creation");
}
if (context.indexOf("auth.getClaims()") < 0 || context.indexOf("auth.getUser()") < 0 || context.indexOf("auth.getClaims()") > context.indexOf("auth.getUser()")) {
  failures.push("Request context does not verify claims before canonical user lookup");
}
if (!/\.schema\s*\(\s*["']api["']\s*\)[\s\S]*?\.rpc\s*\(\s*["']current_profile["']\s*\)/.test(context)) {
  failures.push("Request context bypasses the api.current_profile allowlist RPC");
}
if (/\.from\s*\(\s*["']profiles["']\s*\)/.test(context)) {
  failures.push("Request context reads the public profiles base table directly");
}
if (!context.includes('profile.status !== "active"') || !context.includes('profile.identity_kind !== "user"')) {
  failures.push("Request context does not require an active human profile");
}
if (!summary.includes("createRequestAuthContext") || /createClient|Bearer|appRole/.test(summary)) {
  failures.push("Session summary still owns a bearer/global client path or exposes claim-derived roles");
}
for (const forbidden of ["getSession(", "user_metadata", "raw_user_meta_data", "SUPABASE_SERVICE_ROLE_KEY", "GEOAI_OPERATOR_SUPABASE_"]) {
  if (combined.includes(forbidden)) failures.push(`Auth transport contains forbidden authority/credential pattern: ${forbidden}`);
}
if (!kernel.includes("ssrCookieTransportImplemented: true") || !kernel.includes("implemented: false") || !kernel.includes("rlsPersonaMatrixVerified: false")) {
  failures.push("Auth activation evidence flags are not pinned off while transport is staged");
}

if (failures.length > 0) {
  console.error("Auth SSR transport contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth SSR transport contract passed: publishable-key cookie clients, claims/user/profile verification and evidence-gated activation are present.");

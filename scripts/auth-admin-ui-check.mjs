import fs from "node:fs";

async function source(path) {
  return fs.promises.readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [adminRoute, onboardingRoute, onboardingStageRoute, invitationCookie, tokenHelper, elevated, adminUi, onboardingUi, callback, redirectPath, landing, navigation, accessBadge, login, provider, routeGate, workspacePage, projectsPage, explorePage, profilePage] = await Promise.all([
  source("app/api/admin/route.ts"),
  source("app/api/onboarding/invitation/route.ts"),
  source("app/api/onboarding/invitation/stage/route.ts"),
  source("src/lib/auth/invitation-cookie.server.ts"),
  source("src/lib/auth/invitation-token.server.ts"),
  source("src/lib/auth/elevated-request-context.ts"),
  source("components/auth/admin-panel.tsx"),
  source("components/auth/onboarding-panel.tsx"),
  source("app/auth/callback/route.ts"),
  source("src/lib/auth/redirect-path.ts"),
  source("app/page.tsx"),
  source("components/top-navigation.tsx"),
  source("components/auth/access-status-badge.tsx"),
  source("components/auth/login-panel.tsx"),
  source("components/auth/auth-provider.tsx"),
  source("components/auth/authenticated-route-gate.tsx"),
  source("app/workspace/page.tsx"),
  source("app/projects/page.tsx"),
  source("app/explore/page.tsx"),
  source("app/profile/page.tsx")
]);

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const allowedAdminRpcs = [
  "organization_admin_snapshot",
  "create_organization",
  "create_client",
  "create_project",
  "create_invitation",
  "revoke_invitation",
  "set_organization_member",
  "set_project_member"
];
for (const rpc of allowedAdminRpcs) {
  assert(adminRoute.includes(`.rpc("${rpc}"`), `Admin API is not wired to api.${rpc}`);
}
assert(onboardingRoute.includes('.rpc("accept_invitation"'), "Onboarding API is not wired to api.accept_invitation");
assert(!/\.from\s*\(/.test(`${adminRoute}\n${onboardingRoute}`), "Admin/Onboarding APIs must not read protected base tables");
assert(adminRoute.includes('.schema("api")') && onboardingRoute.includes('.schema("api")'), "All Admin/Onboarding calls must stay in the api schema");
assert(elevated.includes('assuranceLevel: "permanent_identity"') && !elevated.includes("verified_identity") && !elevated.includes(".mfa"), "Admin API must require a permanent non-anonymous identity without claiming credential verification or MFA");
assert(adminRoute.includes("expected_row_version") && adminUi.includes("rowVersion"), "Admin mutation flow must preserve optimistic row versions");
assert(tokenHelper.includes('randomBytes(32).toString("base64url")') && tokenHelper.includes('createHash("sha256")'), "Invitation tokens must be random and SHA-256 hashed server-side");
assert(adminRoute.includes("target_token_hash: hashInvitationToken(rawToken)") && !adminRoute.includes("target_token:"), "Admin API must send only the invitation hash to the RPC");
assert(adminRoute.includes("/onboarding#invitation=") && onboardingUi.includes("window.location.hash"), "Raw invitation token must use a browser fragment, not a server query string");
assert(onboardingUi.includes("window.history.replaceState") && !onboardingUi.includes("console."), "Onboarding UI must clear the fragment and never log the token");
assert(onboardingUi.includes("/api/onboarding/invitation/stage") && onboardingStageRoute.includes("response.cookies.set") && invitationCookie.includes("httpOnly: true") && invitationCookie.includes('sameSite: "lax"'), "Invitation token must survive the email round trip only through a short-lived HttpOnly same-site cookie");
assert(onboardingRoute.includes("onboardingInvitationCookieName") && onboardingRoute.includes("maxAge: 0") || onboardingRoute.includes("onboardingInvitationCookieOptions(request.url, 0)"), "Successful invitation processing must clear the staged token cookie");
assert(callback.includes("exchangeCodeForSession") && redirectPath.includes("approvedAuthDestinations"), "PKCE callback must use a bounded same-origin redirect allowlist");
assert(!callback.includes(".mfa") && !adminUi.includes("MFA") && !onboardingUi.includes("MFA"), "Current user flows must not expose or require MFA");
assert(!onboardingUi.includes('type="password"') && !onboardingUi.includes("One-time invitation token"), "Onboarding must not ask users to paste technical invitation tokens");
assert(landing.includes('href="/login?next=/workspace&intent=demo"') && landing.includes("View demo"), "Landing demo CTA must enter the bounded auth flow before Workspace");
assert(landing.includes('href="/request-access"') && landing.includes("Prepare request brief"), "Landing must expose the separate public request-brief CTA");
assert(!landing.includes('href="/workspace"') && !landing.includes('href="/projects"'), "Landing must not bypass the requested authentication funnel");
assert(login.includes("Sign in to GeoAI") && login.includes("sign-in only") && login.includes("separate approved invitation") && !login.includes("Sign in or create account") && login.includes("window.location.replace(getDestination())") && login.includes("Authorization saved. Opening Workspace"), "Existing-user-only login must not advertise public signup and must immediately continue a saved session to Workspace");
assert(navigation.includes("AccessStatusBadge") && accessBadge.includes('data-authenticated={isAuthenticated ? "true" : "false"}') && accessBadge.includes('isAuthenticated ? "/profile" : "/login"'), "Product navigation must expose a highlighted profile icon that opens the personal account");
assert(provider.includes("isSessionResolved") && provider.includes("finally") && provider.includes("setIsSessionResolved(true)"), "AuthProvider must resolve the browser session before protected product UI renders");
assert(routeGate.includes('authStatus.effectiveMode === "demo_public"') && routeGate.includes("return children"), "Public demo mode must preserve direct product access");
assert(routeGate.includes("!isSessionResolved") && routeGate.includes("!isAuthenticated"), "Supabase-auth product routes must wait for session resolution and reject anonymous rendering");
assert(routeGate.includes("getSafeAuthRedirectPath(requestedPath") && routeGate.includes('router.replace(`/login?next=${encodeURIComponent(next)}`)'), "Anonymous product routes must use a bounded same-origin login continuation");
assert(!routeGate.includes("getSession(") && !routeGate.includes("user_metadata") && !routeGate.includes("SUPABASE_"), "Client route gate must not invent session authority or consume privileged/user-editable data");
for (const [name, page] of [["Workspace", workspacePage], ["Projects", projectsPage], ["Explore", explorePage], ["Profile", profilePage]]) {
  assert(page.includes("AuthenticatedRouteGate") && page.includes("<AuthenticatedRouteGate>"), `${name} route is not wrapped in the resolved-session gate`);
}
assert(redirectPath.includes('"/explore"') && redirectPath.includes('"/profile"'), "Explore and Profile must be valid bounded post-login destinations");
assert(adminRoute.includes("privateNoStoreJson") && onboardingRoute.includes("privateNoStoreJson"), "Authenticated Admin APIs must be private no-store");
assert(adminUi.includes("initial-only") && adminUi.includes("capped at 25"), "Admin UI must disclose bounded initial-only snapshot pagination");

for (const sourceText of [adminRoute, onboardingRoute, onboardingStageRoute, invitationCookie, tokenHelper, elevated, adminUi, onboardingUi, callback]) {
  for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "GEOAI_OPERATOR_SUPABASE_"]) {
    assert(!sourceText.includes(forbidden), `Auth/Admin surface contains forbidden privileged credential name: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error("Auth/Admin UI contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth/Admin UI contract passed: resolved-session route gating, bounded existing-user login, permanent-identity same-origin APIs, api-only RPCs, invisible hashed invitation handoff, invitation-only onboarding and no MFA dependency are wired.");

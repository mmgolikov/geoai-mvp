import fs from "node:fs";

async function source(path) {
  return fs.promises.readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [adminRoute, onboardingRoute, onboardingStageRoute, invitationCookie, tokenHelper, elevated, adminUi, onboardingUi, mfaUi, callback, redirectPath] = await Promise.all([
  source("app/api/admin/route.ts"),
  source("app/api/onboarding/invitation/route.ts"),
  source("app/api/onboarding/invitation/stage/route.ts"),
  source("src/lib/auth/invitation-cookie.server.ts"),
  source("src/lib/auth/invitation-token.server.ts"),
  source("src/lib/auth/elevated-request-context.ts"),
  source("components/auth/admin-panel.tsx"),
  source("components/auth/onboarding-panel.tsx"),
  source("components/auth/mfa-panel.tsx"),
  source("app/auth/callback/route.ts"),
  source("src/lib/auth/redirect-path.ts")
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
assert(elevated.includes('currentLevel !== "aal2"'), "Admin API must fail closed below AAL2");
assert(adminRoute.includes("expected_row_version") && adminUi.includes("rowVersion"), "Admin mutation flow must preserve optimistic row versions");
assert(tokenHelper.includes('randomBytes(32).toString("base64url")') && tokenHelper.includes('createHash("sha256")'), "Invitation tokens must be random and SHA-256 hashed server-side");
assert(adminRoute.includes("target_token_hash: hashInvitationToken(rawToken)") && !adminRoute.includes("target_token:"), "Admin API must send only the invitation hash to the RPC");
assert(adminRoute.includes("/onboarding#invitation=") && onboardingUi.includes("window.location.hash"), "Raw invitation token must use a browser fragment, not a server query string");
assert(onboardingUi.includes("window.history.replaceState") && !onboardingUi.includes("console."), "Onboarding UI must clear the fragment and never log the token");
assert(onboardingUi.includes("/api/onboarding/invitation/stage") && onboardingStageRoute.includes("response.cookies.set") && invitationCookie.includes("httpOnly: true") && invitationCookie.includes('sameSite: "lax"'), "Invitation token must survive the email round trip only through a short-lived HttpOnly same-site cookie");
assert(onboardingRoute.includes("onboardingInvitationCookieName") && onboardingRoute.includes("maxAge: 0") || onboardingRoute.includes("onboardingInvitationCookieOptions(request.url, 0)"), "Successful invitation processing must clear the staged token cookie");
assert(callback.includes("exchangeCodeForSession") && redirectPath.includes("approvedAuthDestinations"), "PKCE callback must use a bounded same-origin redirect allowlist");
assert(mfaUi.includes("challengeAndVerify") && mfaUi.includes("auth.refreshSession()") && mfaUi.includes("selectedFactorId"), "MFA UI must cover verification, explicit selection and immediate downgrade refresh");
assert(adminRoute.includes("privateNoStoreJson") && onboardingRoute.includes("privateNoStoreJson"), "Authenticated Admin APIs must be private no-store");
assert(adminUi.includes("initial-only") && adminUi.includes("capped at 25"), "Admin UI must disclose bounded initial-only snapshot pagination");

for (const sourceText of [adminRoute, onboardingRoute, onboardingStageRoute, invitationCookie, tokenHelper, elevated, adminUi, onboardingUi, mfaUi, callback]) {
  for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "GEOAI_OPERATOR_SUPABASE_"]) {
    assert(!sourceText.includes(forbidden), `Auth/Admin surface contains forbidden privileged credential name: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error("Auth/Admin UI contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth/Admin UI contract passed: AAL2 same-origin APIs, api-only RPCs, hashed one-time invitations, bounded redirects and initial-only pagination caveat are wired.");

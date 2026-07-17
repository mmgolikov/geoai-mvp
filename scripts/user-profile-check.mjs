import fs from "node:fs";

function source(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const files = {
  page: source("app/profile/page.tsx"),
  panel: source("components/auth/profile-panel.tsx"),
  provider: source("components/auth/auth-provider.tsx"),
  login: source("components/auth/login-panel.tsx"),
  badge: source("components/auth/access-status-badge.tsx"),
  workspace: source("components/workspace-shell.tsx"),
  projects: source("components/project-dashboard/project-dashboard.tsx"),
  localStore: source("src/lib/auth/profile-local-store.ts"),
  preferences: source("src/lib/auth/profile-preferences.ts"),
  session: source("src/lib/auth/session-summary.ts")
};

const failures = [];
function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(files.page.includes("ProfilePanel") && files.page.includes("TopNavigation"), "Profile route is not wired into shared navigation");
for (const contract of [
  "Full name",
  "Region",
  "Contact phone",
  "Default workspace",
  "Change email",
  "Change password",
  "Choose photo"
]) {
  expect(files.panel.includes(contract), `Profile UI is missing '${contract}'`);
}
expect(files.panel.includes('(["b2b", "b2c"]') && files.panel.includes("getExploreRolesByAudience"), "Profile does not expose validated B2B/B2C role defaults");
expect(files.panel.includes("maxProfileAvatarBytes") && files.localStore.includes("image\\/(?:jpeg|png|webp)"), "Avatar browser-local type/size boundary is missing");
expect(files.localStore.includes("geoai-user-profile-v1") && files.localStore.includes("includePersonalFields"), "Profile browser storage is not user-scoped or does not separate real-user personal fields");
expect(files.provider.includes("saveProfile") && files.provider.includes("requestEmailChange") && files.provider.includes("changePassword"), "Profile account actions are not exposed by AuthProvider");
expect(files.provider.includes("signInWithPassword") && files.login.includes("passwordSelected"), "A changed real-user password cannot be used by the login UI");
expect(files.login.includes("normalizedIdentifier === mockDemoEmail") && !files.login.includes("mockDemoEmail || password.length"), "Any password must not be treated as mock-demo authority");
expect(files.badge.includes('isAuthenticated ? "/profile" : "/login"'), "Authenticated account control does not open the profile");
expect(files.workspace.includes("user?.profile.defaultAudience") && files.workspace.includes("user?.profile.defaultRole"), "Workspace does not consume profile defaults");
expect(files.workspace.includes("hasExplicitWorkspaceContext"), "Workspace profile defaults can overwrite explicit URL context");
expect(files.projects.includes("user?.profile.defaultAudience") && files.projects.includes("getExploreRolesByAudience(projectAudienceDraft)"), "Projects does not consume the full profile audience/role contract");
expect(files.preferences.includes("geoai_profile") && files.preferences.includes("contact_phone"), "Real-user UX preferences are not namespaced in Auth metadata");
expect(!files.session.includes("user_metadata") && files.session.includes("readGeoAIUserProfile(null"), "Server session authority must not consume user-editable metadata");
expect(files.panel.includes("Two-factor authentication is not part of the current MVP flow."), "Profile reintroduced an MFA dependency or omitted the product decision");

if (failures.length) {
  console.error("User profile contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("User profile contract passed: personal fields, browser-local photo, safe account actions and B2B/B2C role defaults are wired without MFA or authorization-metadata trust.");

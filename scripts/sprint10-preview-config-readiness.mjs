// Read-only: run under `vercel env run` for the exact approved Preview branch.
// Only allowlisted non-secret classifications leave this process. No network or writes.
const expectedRef = "pphdqkurxneyagvnnjdt";
const flag = (name) => {
  const value = process.env[name]?.trim().toLowerCase();
  return value === undefined || value === "" ? "unset" : ["true", "false"].includes(value) ? value : "invalid";
};
const choice = (name, allowed) => {
  const value = process.env[name]?.trim();
  return !value ? "unset" : allowed.includes(value) ? value : "invalid";
};
let exactDevelopmentUrl = false;
try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  exactDevelopmentUrl = url.origin === `https://${expectedRef}.supabase.co` &&
    url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
} catch {}
console.log(JSON.stringify({
  schemaVersion: "geoai.sprint10.preview-config-readiness.v1",
  expectedProjectRef: expectedRef,
  exactDevelopmentUrl,
  authMode: choice("NEXT_PUBLIC_AUTH_MODE", ["demo_public", "supabase_auth", "disabled"]),
  accessEnforcementMode: choice("GEOAI_ACCESS_ENFORCEMENT_MODE", ["soft", "hard"]),
  allowDemoPublic: flag("GEOAI_ALLOW_DEMO_PUBLIC"),
  previewAiEnabled: flag("GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI"),
  previewPersistenceEnabled: flag("GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE"),
  publishableKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
  openAiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
  automationProtectionCredentialPresent: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()),
  secretValuesEmitted: false,
  runtimeAcceptance: false
}, null, 2));

const approvedAuthDestinations = new Set([
  "/admin",
  "/mfa",
  "/onboarding",
  "/projects",
  "/workspace"
]);

export function getSafeAuthRedirectPath(value: string | null | undefined, fallback = "/onboarding") {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, "https://geoai.invalid");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://geoai.invalid" || parsed.username || parsed.password || parsed.hash) {
    return fallback;
  }

  return approvedAuthDestinations.has(parsed.pathname) ? `${parsed.pathname}${parsed.search}` : fallback;
}

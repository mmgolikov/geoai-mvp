export const onboardingInvitationCookieName = "geoai-onboarding-invitation";

export function onboardingInvitationCookieOptions(requestUrl: string, maxAge = 30 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(requestUrl).protocol === "https:",
    path: "/",
    maxAge
  };
}

import { getPublicRequestOrigin } from "@/src/lib/platform/public-request-origin";

export const onboardingInvitationCookieName = "geoai-onboarding-invitation";

export function onboardingInvitationCookieOptions(requestUrl: string, maxAge = 30 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(getPublicRequestOrigin(requestUrl)).protocol === "https:",
    path: "/",
    maxAge
  };
}

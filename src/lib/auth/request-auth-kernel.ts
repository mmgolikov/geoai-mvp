export const requestAuthKernelStatus = {
  implemented: true,
  ssrCookieTransportImplemented: true,
  requestContextImplemented: true,
  requestUserVerified: false,
  projectMembershipVerified: false,
  rlsPersonaMatrixVerified: false,
  reason: "SSR cookie transport, PKCE callback, session/logout routes and a fail-closed request context are implemented, but real JWT, project-membership and RLS persona evidence is not certified yet. Environment flags are not security evidence."
} as const;

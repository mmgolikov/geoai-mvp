export const requestAuthKernelStatus = {
  implemented: false,
  ssrCookieTransportImplemented: true,
  requestContextImplemented: true,
  requestUserVerified: false,
  projectMembershipVerified: false,
  rlsPersonaMatrixVerified: false,
  reason: "SSR cookie transport and a fail-closed request context are implemented, but real JWT, project-membership and RLS persona evidence is not certified yet. Environment flags are not security evidence."
} as const;

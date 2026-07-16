export const requestAuthKernelStatus = {
  implemented: false,
  requestUserVerified: false,
  projectMembershipVerified: false,
  rlsPersonaMatrixVerified: false,
  reason: "Request-scoped Supabase user/JWT and project-membership verification are not implemented yet. Environment flags are not security evidence."
} as const;

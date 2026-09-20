/** Deployment-static client policy; does not configure the hosted Auth provider. */
export function isPasswordOnlyAuthEnabled() {
  return process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY?.trim().toLowerCase() === "true";
}

export const passwordOnlyAuthMessage = "Use your existing account email and password. Email links and SMS codes are disabled in this environment.";

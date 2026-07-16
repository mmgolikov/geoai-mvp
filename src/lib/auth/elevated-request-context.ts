import { createRequestAuthContext, type RequestAuthContext } from "@/src/lib/auth/request-context";

export type ElevatedRequestContext =
  | {
      ok: true;
      context: RequestAuthContext & { verified: true };
      currentLevel: "aal2";
    }
  | {
      ok: false;
      status: "authentication_required" | "mfa_required" | "dependency_unavailable";
      httpStatus: 401 | 403 | 503;
    };

export async function createElevatedRequestContext(request: Request): Promise<ElevatedRequestContext> {
  const context = await createRequestAuthContext(request);
  if (!context.verified || !context.supabase || !context.user || !context.profile) {
    return { ok: false, status: "authentication_required", httpStatus: 401 };
  }

  const assurance = await context.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) {
    return { ok: false, status: "dependency_unavailable", httpStatus: 503 };
  }
  if (assurance.data.currentLevel !== "aal2") {
    return { ok: false, status: "mfa_required", httpStatus: 403 };
  }

  return {
    ok: true,
    context: context as RequestAuthContext & { verified: true },
    currentLevel: "aal2"
  };
}

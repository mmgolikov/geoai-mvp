import { createRequestAuthContext, type RequestAuthContext } from "@/src/lib/auth/request-context";

export type ElevatedRequestContext =
  | {
      ok: true;
      context: RequestAuthContext & { verified: true };
      assuranceLevel: "permanent_identity";
    }
  | {
      ok: false;
      status: "authentication_required";
      httpStatus: 401;
    };

export async function createElevatedRequestContext(request: Request): Promise<ElevatedRequestContext> {
  const context = await createRequestAuthContext(request);
  if (!context.verified || !context.supabase || !context.user || !context.profile) {
    return { ok: false, status: "authentication_required", httpStatus: 401 };
  }

  return {
    ok: true,
    context: context as RequestAuthContext & { verified: true },
    assuranceLevel: "permanent_identity"
  };
}

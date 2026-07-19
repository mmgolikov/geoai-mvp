import { privateNoStoreJson } from "@/src/lib/http/private-no-store";
import { createRequestScopedSupabaseClient } from "@/src/lib/supabase/ssr-server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createRequestScopedSupabaseClient();
  if (!supabase) {
    return privateNoStoreJson({ ok: false, status: "auth_configuration_unavailable" }, { status: 503 });
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  return privateNoStoreJson(
    error
      ? { ok: false, status: "logout_failed" }
      : { ok: true, status: "signed_out" },
    { status: error ? 503 : 200 }
  );
}

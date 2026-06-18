import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured
} from "@/src/lib/supabase/config";

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns?: string, options?: unknown) => unknown;
    insert: (values: unknown) => unknown;
    upsert: (values: unknown, options?: unknown) => unknown;
  };
};

type SupabaseModuleLike = {
  createClient: (url: string, key: string, options?: unknown) => SupabaseClientLike;
};

async function loadSupabaseModule() {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<SupabaseModuleLike>;

    return await dynamicImport("@supabase/supabase-js");
  } catch {
    return null;
  }
}

export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() ?? getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  const supabase = await loadSupabaseModule();
  if (!supabase) {
    return null;
  }

  return supabase.createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

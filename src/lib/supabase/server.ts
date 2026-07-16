import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured
} from "@/src/lib/supabase/config";

export type SupabaseServerClient = {
  from: (table: string) => {
    select: (columns?: string, options?: unknown) => unknown;
    insert: (values: unknown) => unknown;
    upsert: (values: unknown, options?: unknown) => unknown;
    update: (values: unknown) => unknown;
    delete?: () => unknown;
  };
  storage?: {
    getBucket?: (bucket: string) => Promise<{ data?: unknown; error?: unknown }>;
    createBucket?: (bucket: string, options?: unknown) => Promise<{ data?: unknown; error?: unknown }>;
    from?: (bucket: string) => unknown;
  };
};

type SupabaseModuleLike = {
  createClient: (url: string, key: string, options?: unknown) => SupabaseServerClient;
};

function getServerSupabaseKey() {
  // Request-scoped repositories must never inherit service-role privileges.
  // A real authenticated server client must later forward the caller's JWT so
  // Postgres RLS, rather than this process, remains the authorization boundary.
  return getSupabasePublishableKey();
}

async function loadSupabaseModule(): Promise<SupabaseModuleLike | null> {
  try {
    return (await import("@supabase/supabase-js")) as unknown as SupabaseModuleLike;
  } catch {
    return null;
  }
}

export async function getSupabaseServerClient(): Promise<SupabaseServerClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl();
  const key = getServerSupabaseKey();

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
    },
    global: {
      headers: {
        "X-Client-Info": "geoai-mvp-server"
      }
    }
  });
}

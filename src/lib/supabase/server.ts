import {
  geoaiSupabaseProjectRef,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  isPreviewRuntime
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

type JwtPayload = {
  role?: string;
  ref?: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function isLegacyServiceRoleJwt(value: string | null) {
  if (!value || !value.includes(".")) {
    return false;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(value.split(".")[1] ?? "")) as JwtPayload;
    if (payload.role !== "service_role") {
      return false;
    }

    return isPreviewRuntime() ? payload.ref === geoaiSupabaseProjectRef : true;
  } catch {
    return false;
  }
}

function getServerSupabaseKey() {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();

  if (isLegacyServiceRoleJwt(serviceRoleKey)) {
    return serviceRoleKey;
  }

  return anonKey ?? serviceRoleKey;
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

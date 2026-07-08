import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/src/lib/supabase/config";

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

type SupabaseAuthResponse = {
  data?: {
    user?: SupabaseAuthUser | null;
  } | null;
  error?: unknown;
};

type SupabaseProfileRow = {
  id?: string | null;
  auth_user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
};

type SupabaseProfileResponse = {
  data?: SupabaseProfileRow[] | null;
  error?: unknown;
};

type SupabaseAuthClient = {
  auth: {
    getUser: (jwt?: string) => Promise<SupabaseAuthResponse>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (count: number) => Promise<SupabaseProfileResponse>;
      };
    };
  };
};

type SupabaseModuleLike = {
  createClient: (url: string, key: string, options?: unknown) => SupabaseAuthClient;
};

type SafeProfileSummary = {
  id: string;
  authUserId: string | null;
  email: string | null;
  fullName: string | null;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

async function loadSupabaseModule(): Promise<SupabaseModuleLike | null> {
  try {
    return (await import("@supabase/supabase-js")) as unknown as SupabaseModuleLike;
  } catch {
    return null;
  }
}

async function readProfile(client: SupabaseAuthClient, authUserId: string): Promise<SafeProfileSummary | null> {
  try {
    const response = await client
      .from("profiles")
      .select("id,auth_user_id,email,full_name")
      .eq("auth_user_id", authUserId)
      .limit(1);

    const profile = Array.isArray(response.data) ? response.data[0] : null;
    if (response.error || !profile?.id) {
      return null;
    }

    return {
      id: profile.id,
      authUserId: profile.auth_user_id ?? null,
      email: profile.email ?? null,
      fullName: profile.full_name ?? null
    };
  } catch {
    return null;
  }
}

export async function getSafeAuthSessionSummary(request: Request) {
  const authStatus = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const hardAccessEnabled = authStatus.effectiveMode === "supabase_auth" && enforcement.accessEnforcementMode === "hard";
  const base = {
    ok: true,
    authMode: authStatus.effectiveMode,
    requestedAuthMode: authStatus.requestedMode,
    label: authStatus.label,
    hardAccessEnabled,
    requestedHardAccessEnabled: enforcement.accessEnforcementMode === "hard",
    accessEnforcementMode: enforcement.accessEnforcementMode,
    allowDemoPublic: enforcement.allowDemoPublic,
    caveat: authStatus.caveat,
    generatedAt: new Date().toISOString()
  };

  if (authStatus.effectiveMode !== "supabase_auth") {
    return {
      ...base,
      isDemo: true,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "demo_public",
      user: demoUser,
      supabaseUser: null,
      profile: null,
      organization: demoOrganization,
      projectRole: demoProjectRole,
      membership: createDemoProjectMembership(),
      warnings: ["Public demo access is not a Supabase-authenticated session."]
    };
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const bearerToken = getBearerToken(request);

  if (!url || !anonKey) {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "supabase_public_config_missing",
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["Supabase Auth mode is requested, but public Supabase config is missing."]
    };
  }

  if (!bearerToken) {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "missing_bearer_session",
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["No bearer session token was provided to this server route."]
    };
  }

  const supabase = await loadSupabaseModule();
  if (!supabase) {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "supabase_client_unavailable",
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["Supabase client library could not be loaded in the server runtime."]
    };
  }

  try {
    const client = supabase.createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "X-Client-Info": "geoai-mvp-auth-session"
        }
      }
    });
    const response = await client.auth.getUser(bearerToken);
    const supabaseUser = response.data?.user ?? null;

    if (response.error || !supabaseUser?.id) {
      return {
        ...base,
        isDemo: false,
        isAuthenticated: false,
        supabaseAuthenticated: false,
        sessionStatus: "supabase_user_unverified",
        user: null,
        supabaseUser: null,
        profile: null,
        organization: null,
        projectRole: null,
        membership: null,
        warnings: ["Supabase Auth did not verify the provided server-side bearer session."]
      };
    }

    const profile = await readProfile(client, supabaseUser.id);
    const safeUser = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? profile?.email ?? null,
      name: profile?.fullName ?? supabaseUser.email ?? "Supabase Auth user",
      isDemoUser: false
    };

    return {
      ...base,
      isDemo: false,
      isAuthenticated: true,
      supabaseAuthenticated: true,
      sessionStatus: profile ? "supabase_user_with_profile" : "supabase_user_without_profile",
      user: safeUser,
      supabaseUser: {
        id: supabaseUser.id,
        email: supabaseUser.email ?? null,
        appRole: typeof supabaseUser.app_metadata?.role === "string" ? supabaseUser.app_metadata.role : null
      },
      profile,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: profile
        ? ["Project membership authorization is not enforced by this route yet."]
        : ["Authenticated Supabase user has no server-verified GeoAI profile yet."]
    };
  } catch {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "supabase_auth_check_failed",
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["Supabase Auth session lookup failed safely without exposing token details."]
    };
  }
}

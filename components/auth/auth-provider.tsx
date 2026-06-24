"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import type { AuthModeStatus } from "@/src/lib/auth/auth-mode";
import type { GeoAIAuthSession, GeoAIProjectRole } from "@/src/types/auth";

type AuthContextValue = GeoAIAuthSession & {
  authStatus: AuthModeStatus;
  roleLabel: string;
  signIn: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function formatRole(role: GeoAIProjectRole | null) {
  return role ? role.replace(/_/g, " ") : "public preview";
}

function createDemoSession(): GeoAIAuthSession {
  return {
    user: demoUser,
    organization: demoOrganization,
    projectRole: demoProjectRole,
    membership: createDemoProjectMembership(),
    isAuthenticated: true,
    isDemo: true
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStatus = useMemo(() => getAuthModeStatus(), []);
  const [session, setSession] = useState<GeoAIAuthSession>(() =>
    authStatus.effectiveMode === "supabase_auth"
      ? {
          user: null,
          organization: null,
          projectRole: null,
          membership: null,
          isAuthenticated: false,
          isDemo: false
        }
      : createDemoSession()
  );

  async function refreshSession() {
    if (authStatus.effectiveMode !== "supabase_auth") {
      setSession(createDemoSession());
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setSession(createDemoSession());
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, anonKey);
      const { data } = await supabase.auth.getSession();
      const supabaseUser = data.session?.user;

      if (!supabaseUser?.email) {
        setSession({
          user: null,
          organization: null,
          projectRole: null,
          membership: null,
          isAuthenticated: false,
          isDemo: false
        });
        return;
      }

      setSession({
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name:
            typeof supabaseUser.user_metadata?.name === "string"
              ? supabaseUser.user_metadata.name
              : supabaseUser.email,
          isDemoUser: false
        },
        organization: {
          id: "supabase-auth-placeholder-org",
          name: "Supabase Auth Organization",
          mode: "customer"
        },
        projectRole: "viewer",
        membership: {
          id: `supabase-placeholder-${supabaseUser.id}`,
          userId: supabaseUser.id,
          organizationId: "supabase-auth-placeholder-org",
          projectKey: "all-demo-projects",
          role: "viewer",
          status: "active",
          source: "supabase_placeholder",
          caveat: authStatus.caveat
        },
        isAuthenticated: true,
        isDemo: false
      });
    } catch {
      setSession(createDemoSession());
    }
  }

  useEffect(() => {
    void refreshSession();
    // Run once at startup; auth mode is static per deployment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string) {
    if (authStatus.effectiveMode !== "supabase_auth") {
      return {
        ok: true,
        message: "GeoAI is running in public demo access mode; no sign-in is required."
      };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return {
        ok: false,
        message: "Supabase public configuration is missing, so GeoAI is using demo access."
      };
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined
        }
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, message: "Magic link requested. Check the configured email inbox." };
    } catch {
      return {
        ok: false,
        message: "Sign-in could not be started. Public demo access remains available."
      };
    }
  }

  async function signOut() {
    if (authStatus.effectiveMode !== "supabase_auth") {
      setSession(createDemoSession());
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setSession(createDemoSession());
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, anonKey);
      await supabase.auth.signOut();
    } finally {
      await refreshSession();
    }
  }

  const value: AuthContextValue = {
    ...session,
    authStatus,
    roleLabel: formatRole(session.projectRole),
    signIn,
    signOut,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

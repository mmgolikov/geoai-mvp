"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import type { AuthModeStatus } from "@/src/lib/auth/auth-mode";
import type { GeoAIAuthSession, GeoAIProjectRole } from "@/src/types/auth";
import { clearBrowserDemoStorage } from "@/src/lib/browser-demo-storage";

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

function createAnonymousSession(): GeoAIAuthSession {
  return {
    user: null,
    organization: null,
    projectRole: null,
    membership: null,
    isAuthenticated: false,
    isDemo: false
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStatus = useMemo(() => getAuthModeStatus(), []);
  const [session, setSession] = useState<GeoAIAuthSession>(() =>
    authStatus.effectiveMode === "demo_public" ? createDemoSession() : createAnonymousSession()
  );

  async function refreshSession() {
    if (authStatus.effectiveMode === "demo_public") {
      setSession(createDemoSession());
      return;
    }
    // AUTH-01 is intentionally incomplete. Do not contact Supabase or create a
    // placeholder organization/membership from an unbound browser session.
    setSession(createAnonymousSession());
  }

  useEffect(() => {
    if (authStatus.effectiveMode !== "demo_public") {
      clearBrowserDemoStorage();
    }
    void refreshSession();
    // Run once at startup; auth mode is static per deployment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string) {
    if (authStatus.effectiveMode === "demo_public") {
      return {
        ok: true,
        message: "GeoAI is running in public demo access mode; no sign-in is required."
      };
    }
    void email;
    return { ok: false, message: authStatus.caveat };
  }

  async function signOut() {
    clearBrowserDemoStorage();
    setSession(authStatus.effectiveMode === "demo_public" ? createDemoSession() : createAnonymousSession());
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

"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import type { AuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import type { GeoAIAuthSession, GeoAIProjectRole } from "@/src/types/auth";
import { clearBrowserDemoStorage } from "@/src/lib/browser-demo-storage";
import {
  activateMockDemoSession,
  clearMockDemoSession,
  isMockDemoSessionActive,
  matchesMockDemoCredentials
} from "@/src/lib/auth/mock-demo-session";

async function loadSupabaseBrowserClient() {
  const { getSupabaseBrowserClient } = await import("@/src/lib/supabase/browser");
  return getSupabaseBrowserClient();
}

type AuthContextValue = GeoAIAuthSession & {
  authStatus: AuthModeStatus;
  roleLabel: string;
  signIn: (email: string) => Promise<{ ok: boolean; message: string }>;
  signInDemo: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signInWithPhone: (phone: string) => Promise<{ ok: boolean; message: string }>;
  verifyPhoneCode: (phone: string, code: string) => Promise<{ ok: boolean; message: string }>;
  register: (email: string) => Promise<{ ok: boolean; message: string }>;
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
    if (isMockDemoSessionActive()) {
      setSession(createDemoSession());
      return;
    }
    if (authStatus.effectiveMode === "demo_public") {
      setSession(createDemoSession());
      return;
    }
    if (authStatus.effectiveMode !== "supabase_auth") {
      setSession(createAnonymousSession());
      return;
    }
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        setSession(createAnonymousSession());
        return;
      }
      const summary = await response.json() as {
        isAuthenticated?: unknown;
        user?: GeoAIAuthSession["user"];
      };
      if (summary.isAuthenticated !== true || !summary.user) {
        setSession(createAnonymousSession());
        return;
      }
      setSession({
        user: summary.user,
        organization: null,
        projectRole: null,
        membership: null,
        isAuthenticated: true,
        isDemo: false
      });
    } catch {
      setSession(createAnonymousSession());
    }
  }

  useEffect(() => {
    if (authStatus.effectiveMode !== "demo_public" && !isMockDemoSessionActive()) {
      clearBrowserDemoStorage();
    }
    void refreshSession();
    // Run once at startup; auth mode is static per deployment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authStatus.effectiveMode !== "supabase_auth") return;

    let active = true;
    let unsubscribe: (() => void) | null = null;
    const synchronize = () => {
      if (document.visibilityState === "visible") void refreshSession();
    };

    window.addEventListener("focus", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    void loadSupabaseBrowserClient().then((supabase) => {
      if (!active || !supabase) return;
      const { data } = supabase.auth.onAuthStateChange(() => {
        if (active) void refreshSession();
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("focus", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
    // Auth mode is deployment-static and refreshSession intentionally reads no
    // changing closure state beyond that mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus.effectiveMode]);

  async function signIn(email: string) {
    if (authStatus.effectiveMode === "demo_public") {
      return {
        ok: true,
        message: "GeoAI is running in public demo access mode; no sign-in is required."
      };
    }
    const supabase = await loadSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: authStatus.caveat };

    clearMockDemoSession();

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return { ok: false, message: "Enter a valid email address." };
    }

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", getSafeAuthRedirectPath(new URL(window.location.href).searchParams.get("next")));
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: callback.toString(),
        shouldCreateUser: true
      }
    });
    if (error) {
      return {
        ok: false,
        message: "We could not send the sign-in email. Try again in a moment."
      };
    }
    return {
      ok: true,
      message: "Check your email and open the GeoAI sign-in link."
    };
  }

  async function signInDemo(email: string, password: string) {
    if (!matchesMockDemoCredentials(email, password)) {
      return { ok: false, message: "The demo email or password is incorrect." };
    }
    if (authStatus.effectiveMode === "supabase_auth") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: "{}"
        });
      } catch {
        // A mock demo session never receives protected server authorization,
        // so an unavailable Supabase logout cannot elevate it.
      }
    }
    activateMockDemoSession();
    setSession(createDemoSession());
    return { ok: true, message: "Demo account is ready." };
  }

  async function signInWithPhone(phone: string) {
    if (authStatus.effectiveMode !== "supabase_auth") {
      return { ok: false, message: authStatus.caveat };
    }
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      return { ok: false, message: "Enter the phone number with country code, for example +971501234567." };
    }
    const supabase = await loadSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: authStatus.caveat };
    clearMockDemoSession();
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: { channel: "sms", shouldCreateUser: true }
    });
    if (error) {
      return { ok: false, message: "Phone sign-in is not connected yet. Use email or the demo account." };
    }
    return { ok: true, message: "Enter the six-digit code sent to your phone." };
  }

  async function verifyPhoneCode(phone: string, code: string) {
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    const normalizedCode = code.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone) || !/^\d{6}$/.test(normalizedCode)) {
      return { ok: false, message: "Enter the six-digit code from the SMS." };
    }
    const supabase = await loadSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: authStatus.caveat };
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: normalizedCode,
      type: "sms"
    });
    if (error) return { ok: false, message: "The code is invalid or expired. Request a new code." };
    await refreshSession();
    return { ok: true, message: "Phone verified. You are signed in." };
  }

  async function register(email: string) {
    return signIn(email);
  }

  async function signOut() {
    clearMockDemoSession();
    clearBrowserDemoStorage();
    if (authStatus.effectiveMode === "supabase_auth") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: "{}"
        });
      } finally {
        setSession(createAnonymousSession());
      }
      return;
    }
    setSession(authStatus.effectiveMode === "demo_public" ? createDemoSession() : createAnonymousSession());
  }

  const value: AuthContextValue = {
    ...session,
    authStatus,
    roleLabel: formatRole(session.projectRole),
    signIn,
    signInDemo,
    signInWithPhone,
    verifyPhoneCode,
    register,
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

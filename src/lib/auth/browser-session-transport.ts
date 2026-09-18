import type { GeoAIAuthSession } from "@/src/types/auth";

type BrowserAuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type BrowserSignOutRequest =
  | { ok: true; reason: "confirmed" }
  | { ok: false; reason: "server_rejected" | "network_failure" | "timeout" };

export type BrowserSessionRead =
  | { status: "authenticated"; user: NonNullable<GeoAIAuthSession["user"]> }
  | { status: "anonymous" }
  | { status: "unavailable" };

export type BrowserSignOutDisposition =
  | { status: "signed_out" }
  | { status: "still_authenticated"; user: NonNullable<GeoAIAuthSession["user"]> }
  | { status: "unconfirmed" };

const defaultAuthRequestTimeoutMs = 10_000;

async function runBoundedAuthRequest(
  fetcher: BrowserAuthFetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function requestConfirmedBrowserSignOut(
  fetcher: BrowserAuthFetch = fetch,
  timeoutMs = defaultAuthRequestTimeoutMs
): Promise<BrowserSignOutRequest> {
  const controllerState = { timedOut: false };
  const boundedFetcher: BrowserAuthFetch = async (input, init) => {
    try {
      return await runBoundedAuthRequest(fetcher, input, init ?? {}, timeoutMs);
    } catch (error) {
      controllerState.timedOut = error instanceof DOMException && error.name === "AbortError";
      throw error;
    }
  };

  try {
    const response = await boundedFetcher("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    if (!response.ok) return { ok: false, reason: "server_rejected" };
    let payload: { ok?: unknown; status?: unknown };
    try {
      payload = await response.json() as { ok?: unknown; status?: unknown };
    } catch {
      return { ok: false, reason: "server_rejected" };
    }
    return payload.ok === true && payload.status === "signed_out"
      ? { ok: true, reason: "confirmed" }
      : { ok: false, reason: "server_rejected" };
  } catch {
    return {
      ok: false,
      reason: controllerState.timedOut ? "timeout" : "network_failure"
    };
  }
}

export async function readBrowserServerSession(
  fetcher: BrowserAuthFetch = fetch,
  timeoutMs = defaultAuthRequestTimeoutMs
): Promise<BrowserSessionRead> {
  try {
    const response = await runBoundedAuthRequest(fetcher, "/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    }, timeoutMs);
    if (!response.ok) return { status: "unavailable" };
    const payload = await response.json() as {
      isAuthenticated?: unknown;
      user?: GeoAIAuthSession["user"];
    };
    if (payload.isAuthenticated === false) return { status: "anonymous" };
    if (payload.isAuthenticated === true && payload.user) {
      return { status: "authenticated", user: payload.user };
    }
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function resolveBrowserSignOutDisposition(
  request: BrowserSignOutRequest,
  sessionRead: BrowserSessionRead | null
): BrowserSignOutDisposition {
  if (request.ok || sessionRead?.status === "anonymous") {
    return { status: "signed_out" };
  }
  if (sessionRead?.status === "authenticated") {
    return { status: "still_authenticated", user: sessionRead.user };
  }
  return { status: "unconfirmed" };
}

export function createSingleFlight<T>() {
  let inFlight: Promise<T> | null = null;
  return {
    run(operation: () => Promise<T>) {
      if (inFlight) return inFlight;
      const active = operation().finally(() => {
        if (inFlight === active) inFlight = null;
      });
      inFlight = active;
      return active;
    }
  };
}

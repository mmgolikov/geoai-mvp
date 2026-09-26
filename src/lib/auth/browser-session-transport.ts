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

async function runBoundedAuthRequest<T>(
  fetcher: BrowserAuthFetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  consumeResponse: (response: Response) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const startedAt = performance.now();
  const timeoutError = new DOMException("Authentication request timed out.", "AbortError");
  const throwIfExpired = () => {
    // JSON parsing can occupy a task past the deadline before its timer runs.
    if (performance.now() - startedAt >= timeoutMs) controller.abort(timeoutError);
    controller.signal.throwIfAborted();
  };
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timeout = globalThis.setTimeout(() => {
      // Settle first even when a dependency ignores abort or catches body errors.
      reject(timeoutError);
      controller.abort(timeoutError);
    }, timeoutMs);
  });
  const operation = (async () => {
    const response = await fetcher(input, { ...init, signal: controller.signal });
    throwIfExpired();
    const result = await consumeResponse(response);
    throwIfExpired();
    return result;
  })();
  try {
    return await Promise.race([operation, expired]);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function requestConfirmedBrowserSignOut(
  fetcher: BrowserAuthFetch = fetch,
  timeoutMs = defaultAuthRequestTimeoutMs
): Promise<BrowserSignOutRequest> {
  try {
    return await runBoundedAuthRequest<BrowserSignOutRequest>(fetcher, "/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: "{}"
    }, timeoutMs, async (response) => {
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
    });
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network_failure"
    };
  }
}

export async function readBrowserServerSession(
  fetcher: BrowserAuthFetch = fetch,
  timeoutMs = defaultAuthRequestTimeoutMs
): Promise<BrowserSessionRead> {
  try {
    return await runBoundedAuthRequest<BrowserSessionRead>(fetcher, "/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    }, timeoutMs, async (response) => {
      if (!response.ok) return { status: "unavailable" };
      const payload = await response.json() as {
        isAuthenticated?: unknown;
        sessionStatus?: unknown;
        user?: GeoAIAuthSession["user"];
      };
      if (payload.isAuthenticated === false && payload.sessionStatus === "session_missing") {
        return { status: "anonymous" };
      }
      if (payload.isAuthenticated === true && payload.user) {
        return { status: "authenticated", user: payload.user };
      }
      return { status: "unavailable" };
    });
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

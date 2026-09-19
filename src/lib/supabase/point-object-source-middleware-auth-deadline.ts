export const POINT_OBJECT_SOURCE_MIDDLEWARE_AUTH_DEADLINE_MS = 5_000;

export type PointObjectSourceMiddlewareRoute = "find" | "area-context";
type PointObjectSourceMiddlewareAuthStage = "auth_started" | "auth_completed" | "auth_timeout" | "auth_failed" | "finished";

const SOURCE_PATHS = new Map<string, PointObjectSourceMiddlewareRoute>([
  ["/api/prototype/point-to-object/find", "find"],
  ["/api/prototype/point-to-object/area-context", "area-context"]
]);

export class PointObjectSourceMiddlewareAuthDeadlineError extends Error {
  readonly code = "POINT_OBJECT_SOURCE_MIDDLEWARE_AUTH_DEADLINE";

  constructor() {
    super("The source middleware authentication dependency did not complete in time.");
    this.name = "PointObjectSourceMiddlewareAuthDeadlineError";
  }
}

export function pointObjectSourceMiddlewareRoute(pathname: string): PointObjectSourceMiddlewareRoute | null {
  return SOURCE_PATHS.get(pathname) ?? null;
}

export function isPointObjectSourceMiddlewareAuthDeadlineError(
  error: unknown
): error is PointObjectSourceMiddlewareAuthDeadlineError {
  return error instanceof PointObjectSourceMiddlewareAuthDeadlineError || (
    error instanceof Error &&
    error.name === "PointObjectSourceMiddlewareAuthDeadlineError" &&
    "code" in error &&
    error.code === "POINT_OBJECT_SOURCE_MIDDLEWARE_AUTH_DEADLINE"
  );
}

function combinedAbortSignal(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0];
  const controller = new AbortController();
  const listeners: Array<{ signal: AbortSignal; abort: () => void }> = [];
  const cleanup = () => {
    for (const listener of listeners) listener.signal.removeEventListener("abort", listener.abort);
    listeners.length = 0;
  };
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      cleanup();
      break;
    }
    const abort = () => {
      if (!controller.signal.aborted) controller.abort(signal.reason);
      cleanup();
    };
    listeners.push({ signal, abort });
    signal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

export function createPointObjectSourceMiddlewareAuthDeadline(
  route: PointObjectSourceMiddlewareRoute,
  options: {
    timeoutMs?: number;
    fetch?: typeof fetch;
    emit?: (line: string) => void;
    now?: () => number;
  } = {}
) {
  const timeoutMs = options.timeoutMs ?? POINT_OBJECT_SOURCE_MIDDLEWARE_AUTH_DEADLINE_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError("A positive finite middleware Auth deadline is required.");
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const emit = options.emit ?? ((line: string) => console.info(line));
  const now = options.now ?? Date.now;
  const startedAt = now();
  const controller = new AbortController();
  let terminal = false;

  const stage = (value: PointObjectSourceMiddlewareAuthStage) => {
    try {
      emit(JSON.stringify({
        event: "point_object_source_middleware_auth",
        route,
        stage: value,
        elapsedMs: Math.max(0, Math.round(now() - startedAt))
      }));
    } catch {
      // Diagnostics must not alter Auth behavior or cleanup.
    }
  };
  const timeoutError = new PointObjectSourceMiddlewareAuthDeadlineError();
  const expire = () => {
    if (terminal) return;
    terminal = true;
    controller.abort(timeoutError);
  };
  const timer = setTimeout(expire, timeoutMs);

  const boundedFetch: typeof fetch = (input, init) => {
    const signals = [controller.signal];
    const inputSignal = typeof input === "object" && input !== null && "signal" in input
      ? (input as Request).signal
      : undefined;
    if (inputSignal) signals.push(inputSignal);
    if (init?.signal) signals.push(init.signal);
    return fetchImplementation(input, { ...init, signal: combinedAbortSignal(signals) });
  };

  return {
    fetch: boundedFetch,
    stage,
    runCookieMutation(action: () => void): boolean {
      if (terminal) return false;
      action();
      return true;
    },
    async run<T>(operation: PromiseLike<T>): Promise<T> {
      controller.signal.throwIfAborted();
      let onAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(controller.signal.reason ?? timeoutError);
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        return await Promise.race([Promise.resolve(operation), aborted]);
      } finally {
        if (onAbort) controller.signal.removeEventListener("abort", onAbort);
      }
    },
    terminate(): void {
      clearTimeout(timer);
      if (!terminal) {
        terminal = true;
        controller.abort();
      }
    }
  };
}

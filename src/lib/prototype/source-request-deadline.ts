export const POINT_OBJECT_SOURCE_ROUTE_DEADLINE_MS = 40_000;
export const POINT_OBJECT_SOURCE_PLATFORM_MAX_DURATION_SECONDS = 45;
export const POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS = 50_000;
export const POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS = 60_000;
export const POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS = 24_000;
export const POINT_OBJECT_SOURCE_CACHE_COMPLETION_MARGIN_MS = 1_000;

const deadlineExpiryBySignal = new WeakMap<AbortSignal, number>();
const authDeadlineByRequest = new WeakMap<Request, AbortSignal>();

export class PointObjectSourceDeadlineError extends Error {
  readonly code = "POINT_OBJECT_SOURCE_DEADLINE";

  constructor() {
    super("The bounded source request did not complete in time.");
    this.name = "PointObjectSourceDeadlineError";
  }
}

export type PointObjectSourceRequestDeadline = {
  readonly signal: AbortSignal;
  run<T>(operation: (signal: AbortSignal) => Promise<T> | T): Promise<T>;
  throwIfExpired(): void;
  dispose(): void;
};

export function pointObjectRequestAuthDeadlineSignal(request?: Request): AbortSignal | undefined {
  return request ? authDeadlineByRequest.get(request) : undefined;
}

/**
 * Keep the framework-owned request identity intact while attaching the
 * route-owned deadline to opt-in Auth work. Reconstructing a NextRequest with
 * the native Request constructor crosses incompatible private runtimes.
 */
export function withPointObjectSourceRequestDeadline(request: Request, signal: AbortSignal): Request {
  authDeadlineByRequest.set(request, signal);
  return request;
}

export function isPointObjectSourceDeadlineError(error: unknown): error is PointObjectSourceDeadlineError {
  return error instanceof PointObjectSourceDeadlineError || (
    error instanceof Error &&
    error.name === "PointObjectSourceDeadlineError" &&
    "code" in error &&
    error.code === "POINT_OBJECT_SOURCE_DEADLINE"
  );
}

export function createPointObjectSourceRequestDeadline(
  timeoutMs = POINT_OBJECT_SOURCE_ROUTE_DEADLINE_MS,
  parentSignal?: AbortSignal
): PointObjectSourceRequestDeadline {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("A positive finite source request deadline is required.");
  }

  const controller = new AbortController();
  deadlineExpiryBySignal.set(controller.signal, Date.now() + timeoutMs);
  const expire = () => {
    if (!controller.signal.aborted) controller.abort(new PointObjectSourceDeadlineError());
  };
  const timer = setTimeout(expire, timeoutMs);
  const onParentAbort = () => expire();
  if (parentSignal?.aborted) onParentAbort();
  else parentSignal?.addEventListener("abort", onParentAbort, { once: true });

  return {
    signal: controller.signal,
    async run<T>(operation: (signal: AbortSignal) => Promise<T> | T): Promise<T> {
      controller.signal.throwIfAborted();
      let onAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(controller.signal.reason ?? new PointObjectSourceDeadlineError());
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), aborted]);
      } finally {
        if (onAbort) controller.signal.removeEventListener("abort", onAbort);
      }
    },
    throwIfExpired(): void {
      controller.signal.throwIfAborted();
    },
    dispose(): void {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onParentAbort);
    }
  };
}

export function pointObjectSourceDeadlineRemainingMs(signal: AbortSignal, now = Date.now()): number | null {
  const expiresAt = deadlineExpiryBySignal.get(signal);
  return expiresAt === undefined ? null : Math.max(0, expiresAt - now);
}

/**
 * A validated shared cache operation may outlive one consumer, so it must not
 * inherit that consumer's cancellation. It is safe only when the cache miss's
 * complete 24s internal deadline fits inside the route-entry budget. A late
 * request bypasses the shared cache and receives direct route cancellation.
 */
export function pointObjectSourceCanUseSharedCache(signal?: AbortSignal): boolean {
  if (!signal) return true;
  signal.throwIfAborted();
  const remainingMs = pointObjectSourceDeadlineRemainingMs(signal);
  return remainingMs !== null &&
    remainingMs >= POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS + POINT_OBJECT_SOURCE_CACHE_COMPLETION_MARGIN_MS;
}

export function pointObjectSourceOperationSignal(
  routeSignal?: AbortSignal,
  operationTimeoutMs = POINT_OBJECT_SOURCE_UPSTREAM_TIMEOUT_MS
): AbortSignal {
  if (!Number.isFinite(operationTimeoutMs) || operationTimeoutMs <= 0) {
    throw new TypeError("A positive finite source operation timeout is required.");
  }
  const operationSignal = AbortSignal.timeout(operationTimeoutMs);
  return routeSignal ? AbortSignal.any([routeSignal, operationSignal]) : operationSignal;
}

export async function waitForPointObjectSourceOperation<T>(
  operation: PromiseLike<T>,
  signal: AbortSignal
): Promise<T> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason ?? new PointObjectSourceDeadlineError());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([Promise.resolve(operation), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

type PointObjectAreaRequestIdentity = {
  marketKey: string;
  locale: string;
  aoiCoordinates: readonly (readonly (readonly [number, number])[])[];
};

export function samePointObjectAreaRequest(
  left: PointObjectAreaRequestIdentity,
  right: PointObjectAreaRequestIdentity
): boolean {
  if (left.marketKey !== right.marketKey || left.locale !== right.locale || left.aoiCoordinates.length !== right.aoiCoordinates.length) {
    return false;
  }
  return left.aoiCoordinates.every((leftRing, ringIndex) => {
    const rightRing = right.aoiCoordinates[ringIndex];
    return rightRing !== undefined && leftRing.length === rightRing.length && leftRing.every((leftPoint, pointIndex) => {
      const rightPoint = rightRing[pointIndex];
      return rightPoint !== undefined && leftPoint[0] === rightPoint[0] && leftPoint[1] === rightPoint[1];
    });
  });
}

export function pointObjectSourceResponseIsCurrent(
  requestId: number,
  currentRequestId: number,
  signal: AbortSignal
): boolean {
  return requestId === currentRequestId && !signal.aborted;
}

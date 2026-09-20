export type Sprint10PaidDispatchReservation<T> = {
  receipt: T;
};

export const SPRINT10_LIVE_PAID_SCOPE_MATRIX = {
  journey: { ai: 1, create: 1 },
  "dubai-analyse": { ai: 1, create: 0 },
  "dubai-find": { ai: 0, create: 0 },
  "singapore-create": { ai: 0, create: 1 },
  "singapore-analyse": { ai: 1, create: 0 },
  "singapore-find": { ai: 0, create: 0 },
  "dubai-create": { ai: 0, create: 1 },
  "dubai-depth-cycle": { ai: 4, create: 0 },
  "quality20-analyse": { ai: 1, create: 0 },
  "quality20-find": { ai: 0, create: 0 },
  "quality20-acquire": { ai: 0, create: 0 },
  "quality20-create": { ai: 0, create: 1 }
} as const;

export type Sprint10LiveScope = keyof typeof SPRINT10_LIVE_PAID_SCOPE_MATRIX;

export function sprint10PaidPostDecision(
  scope: Sprint10LiveScope,
  route: "ai" | "create",
  occurrence: number
): { ok: true } | { ok: false; reason: "route_disallowed" | "occurrence_exceeded" } {
  const expected = SPRINT10_LIVE_PAID_SCOPE_MATRIX[scope][route];
  if (expected === 0) return { ok: false, reason: "route_disallowed" };
  if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > expected) {
    return { ok: false, reason: "occurrence_exceeded" };
  }
  return { ok: true };
}

export type Sprint10PaidDispatchResult<T> =
  | { ok: true; receipt: T }
  | { ok: false; reason: string };

type Sprint10PaidDispatchActions<T> = {
  reserve: () => Sprint10PaidDispatchReservation<T>;
  dispatch: () => Promise<void>;
  markUnknown: (receipt: T) => void;
};

/**
 * The only ordering accepted for a paid browser transport: reserve first,
 * dispatch once, and make a failed dispatch terminally unknown.
 */
export async function dispatchSprint10PaidRequest<T>(
  actions: Sprint10PaidDispatchActions<T>
): Promise<Sprint10PaidDispatchResult<T>> {
  let reservation: Sprint10PaidDispatchReservation<T>;
  try {
    reservation = actions.reserve();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "The paid request reservation was rejected."
    };
  }

  try {
    await actions.dispatch();
    return { ok: true, receipt: reservation.receipt };
  } catch {
    actions.markUnknown(reservation.receipt);
    throw new Error("The paid request failed after reservation; its charge is unknown and later paid requests are blocked.");
  }
}

export function sprint10LiveRequestKey(
  scope: string,
  route: "ai" | "create",
  occurrence: number,
  commit: string
): string {
  const normalizedScope = scope.toUpperCase().replace(/[^A-Z0-9._:-]+/g, "-").slice(0, 36);
  const normalizedCommit = commit.toUpperCase().slice(0, 12);
  const key = `S4:${normalizedScope}:${route.toUpperCase()}:${occurrence}:${normalizedCommit}`;
  if (!/^[A-Z0-9][A-Z0-9._:-]{2,95}$/.test(key)) {
    throw new Error("The paid request identity could not be bounded safely.");
  }
  return key;
}

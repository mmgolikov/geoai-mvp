import { waitForSourceAdmission } from "./point-to-object-source-recovery";

export const PUBLIC_SOURCE_TOTAL_BUDGET_MS = 12_000;
export const OVERPASS_EXECUTION_BUDGET_MS = 4_000;
const OVERPASS_REQUEST_BUDGET_MS = 4_500;

type SourceClock = { now: () => number; timeout: (milliseconds: number) => AbortSignal };
const systemClock: SourceClock = { now: () => Date.now(), timeout: (milliseconds) => AbortSignal.timeout(milliseconds) };
export type OverpassFailureTelemetry = {
  phase: "admission" | "headers" | "body" | "parse";
  dispatched: boolean;
  elapsedMs: number;
  admissionMs: number;
  upstreamStatus: number | null;
  abortSource: "shared_deadline" | "per_request" | "upstream_http" | "transport_abort" | null;
};
const boundedElapsed = (value: number) => Math.min(60_000, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));

/** Admission has the shared deadline; the network allowance begins only after admission. */
export async function runOverpassWithinBudget<T>(
  deadlineAtMs: number,
  admit: (signal: AbortSignal) => Promise<void>,
  request: (signal: AbortSignal) => Promise<T>,
  clock: SourceClock = systemClock,
  diagnostic?: OverpassFailureTelemetry
): Promise<T> {
  const startedAt = clock.now();
  let admittedAt: number | undefined;
  let totalSignal: AbortSignal | undefined;
  let requestSignal: AbortSignal | undefined;
  try {
    const remaining = () => Math.max(0, Math.floor(deadlineAtMs - clock.now()));
    if (remaining() < OVERPASS_EXECUTION_BUDGET_MS) { if (diagnostic) diagnostic.abortSource = "shared_deadline"; throw new DOMException("Source deadline exhausted", "TimeoutError"); }
    totalSignal = clock.timeout(remaining());
    await waitForSourceAdmission(admit(totalSignal), totalSignal);
    admittedAt = clock.now();
    // Do not dispatch a query advertising four seconds when the shared lease cannot permit it.
    if (remaining() < OVERPASS_EXECUTION_BUDGET_MS) { if (diagnostic) diagnostic.abortSource = "shared_deadline"; throw new DOMException("Source deadline exhausted", "TimeoutError"); }
    requestSignal = clock.timeout(Math.min(OVERPASS_REQUEST_BUDGET_MS, remaining()));
    const signal = AbortSignal.any([totalSignal, requestSignal]);
    if (diagnostic) { diagnostic.phase = "headers"; diagnostic.dispatched = true; }
    let result: T | undefined;
    await waitForSourceAdmission(request(signal).then((value) => { result = value; }), signal);
    return result as T;
  } catch (error) {
    if (diagnostic && diagnostic.abortSource !== "upstream_http") {
      if (totalSignal?.aborted) diagnostic.abortSource = "shared_deadline";
      else if (requestSignal?.aborted) diagnostic.abortSource = "per_request";
      else if (!diagnostic.abortSource && error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) diagnostic.abortSource = "transport_abort";
    }
    throw error;
  } finally {
    if (diagnostic) { diagnostic.elapsedMs = boundedElapsed(clock.now() - startedAt); diagnostic.admissionMs = boundedElapsed((admittedAt ?? clock.now()) - startedAt); }
  }
}

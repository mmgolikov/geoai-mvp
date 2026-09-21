import { waitForSourceAdmission } from "./point-to-object-source-recovery";

export const PUBLIC_SOURCE_TOTAL_BUDGET_MS = 12_000;
export const OVERPASS_EXECUTION_BUDGET_MS = 4_000;
const OVERPASS_REQUEST_BUDGET_MS = 4_500;

type SourceClock = { now: () => number; timeout: (milliseconds: number) => AbortSignal };
const systemClock: SourceClock = { now: () => Date.now(), timeout: (milliseconds) => AbortSignal.timeout(milliseconds) };

/** Admission has the shared deadline; the network allowance begins only after admission. */
export async function runOverpassWithinBudget<T>(
  deadlineAtMs: number,
  admit: (signal: AbortSignal) => Promise<void>,
  request: (signal: AbortSignal) => Promise<T>,
  clock: SourceClock = systemClock
): Promise<T> {
  const remaining = () => Math.max(0, Math.floor(deadlineAtMs - clock.now()));
  if (remaining() < OVERPASS_EXECUTION_BUDGET_MS) throw new DOMException("Source deadline exhausted", "TimeoutError");
  const totalSignal = clock.timeout(remaining());
  await waitForSourceAdmission(admit(totalSignal), totalSignal);
  // Do not dispatch a query advertising four seconds when the shared lease cannot permit it.
  if (remaining() < OVERPASS_EXECUTION_BUDGET_MS) throw new DOMException("Source deadline exhausted", "TimeoutError");
  const signal = AbortSignal.any([totalSignal, clock.timeout(Math.min(OVERPASS_REQUEST_BUDGET_MS, remaining()))]);
  let result: T | undefined;
  await waitForSourceAdmission(request(signal).then((value) => { result = value; }), signal);
  return result as T;
}

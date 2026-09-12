/** Shared, public-source recovery metadata. Never use a local marker as authorization. */
export type PointObjectSourceFailure = "application_rate" | "source_rate" | "timeout" | "unavailable";

export function sourceRetryAfterSeconds(value: string | null, fallback = 15, now = Date.now()): number {
  const numeric = value?.trim().match(/^\d+$/) ? Number(value) : Number.NaN;
  const seconds = Number.isFinite(numeric) ? numeric : value ? Math.ceil((Date.parse(value) - now) / 1_000) : Number.NaN;
  // Do not shorten a provider cooldown to the application's separate 10-minute window.
  return Number.isFinite(seconds) ? Math.min(2_147_483_647, Math.max(1, seconds)) : fallback;
}

export function pointObjectSourceFailure(status: number, payload: unknown): PointObjectSourceFailure {
  if (status === 429) {
    return typeof payload === "object" && payload !== null && "code" in payload && payload.code === "APPLICATION_RATE_LIMITED"
      ? "application_rate" : "source_rate";
  }
  return status === 504 ? "timeout" : "unavailable";
}

export function sourceFailureMessage(failure: PointObjectSourceFailure, seconds: number, locale: "en" | "ru"): string {
  const message = locale === "ru"
    ? { application_rate: "Лимит запросов приложения.", source_rate: "Источник ограничил запросы.", timeout: "Источник не ответил вовремя.", unavailable: "Не удалось получить данные источника." }[failure]
    : { application_rate: "Application request limit reached.", source_rate: "The source limited requests.", timeout: "The source did not respond in time.", unavailable: "Source data could not be loaded." }[failure];
  return seconds > 0 ? `${message} ${locale === "ru" ? `Повтор через ${seconds} с.` : `Retry in ${seconds}s.`}` : message;
}

/** A single deadline includes local admission, upstream queue, headers and body. No automatic retry. */
export async function waitForSourceAdmission(gate: Promise<void>, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  try {
    await Promise.race([gate, new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    })]);
    signal.throwIfAborted();
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { contextRequestDiagnosticJson, type PointObjectContextRequestDiagnostic } from "@/src/lib/prototype/point-to-object-context-diagnostic";
import { createVerificationBundle, snapshotVerificationSubmission, snapshotVerificationResponse, snapshotVerificationFailureResponse, VERIFICATION_BUNDLE_MAX_BYTES, type VerificationOperation, type VerificationRecord, type VerificationFailureRecord } from "@/src/lib/prototype/point-to-object-verification-export";

type Capture = { records: VerificationRecord[]; failedResponses: VerificationFailureRecord[]; captureRefused: boolean; begin: (operation: VerificationOperation, intent: unknown, sourceSnapshot: unknown) => (response: unknown, httpStatus?: number) => void };
const CaptureContext = createContext<Capture | null>(null);
export function VerificationCaptureBoundary({ value, children }: { value: Capture; children: ReactNode }) {
  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useVerificationCapture(enabled: boolean): Capture {
  const shared = useContext(CaptureContext);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const heldRecords = useRef<VerificationRecord[]>([]);
  const [failedResponses, setFailedResponses] = useState<VerificationFailureRecord[]>([]);
  const heldFailures = useRef<VerificationFailureRecord[]>([]);
  const [captureRefused, setCaptureRefused] = useState(false);
  const begin = useCallback((operation: VerificationOperation, intent: unknown, sourceSnapshot: unknown) => {
    if (!enabled) return () => {};
    try {
      const submission = snapshotVerificationSubmission(operation, intent, sourceSnapshot);
      const submittedAt = new Date().toISOString();
      return (response: unknown, httpStatus?: number) => {
        try {
          if (operation === "analyse" && response && typeof response === "object" && "mode" in response && response.mode === "unavailable") {
            if (httpStatus === undefined) throw new Error("EXPORT_FAILURE_STATUS_REFUSED");
            const snapshot = snapshotVerificationFailureResponse(response, httpStatus);
            const record: VerificationFailureRecord = { operation, ...submission, httpStatus,
              ...snapshot, submittedAt, completedAt: new Date().toISOString() };
            const next = heldFailures.current.concat(record);
            if (next.length + heldRecords.current.length > 16 || new TextEncoder().encode(JSON.stringify([heldRecords.current, next])).byteLength > VERIFICATION_BUNDLE_MAX_BYTES) { setCaptureRefused(true); return; }
            heldFailures.current = next;
            setFailedResponses(next);
            return;
          }
          const record: VerificationRecord = { operation, ...submission, response: snapshotVerificationResponse(operation, response), submittedAt, completedAt: new Date().toISOString() };
          const next = heldRecords.current.concat(record);
          if (next.length + heldFailures.current.length > 16 || new TextEncoder().encode(JSON.stringify([next, heldFailures.current])).byteLength > VERIFICATION_BUNDLE_MAX_BYTES) { setCaptureRefused(true); return; }
          heldRecords.current = next;
          setRecords(next);
        } catch { setCaptureRefused(true); }
      };
    } catch { setCaptureRefused(true); return () => {}; }
  }, [enabled]);
  return shared ?? { records, failedResponses, begin, captureRefused };
}

export function VerificationExport({ enabled, locale, preSubmit = null, records = [], failedResponses = [], currentSelection, captureRefused = false, compactMobile = false, contextDiagnostic = null }: {
  enabled: boolean; locale: "en" | "ru";
  preSubmit?: { operation: VerificationOperation; intent: unknown; sourceSnapshot: unknown } | null;
  records?: readonly VerificationRecord[]; failedResponses?: readonly VerificationFailureRecord[]; currentSelection: unknown; captureRefused?: boolean; compactMobile?: boolean;
  contextDiagnostic?: PointObjectContextRequestDiagnostic | null;
}) {
  const [json, setJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!enabled) return null;
  const ru = locale === "ru";
  const diagnosticJson = preSubmit?.operation === "context" ? contextRequestDiagnosticJson(contextDiagnostic, preSubmit.intent) : null;
  async function prepare() {
    setBusy(true); setError(false); setJson(null);
    try {
      if (captureRefused) throw new Error("EXPORT_CAPTURE_REFUSED");
      const result = await createVerificationBundle(enabled, { preSubmit, records, failedResponses, currentSelection });
      setJson(result);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  function download() {
    if (!json) return;
    try {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "geoai-preview-verification.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); }
  }
  return <details className={compactMobile ? "group my-1 rounded-xl border border-line bg-white px-3 py-0 text-xs open:py-3 sm:my-2 sm:p-3" : "my-2 rounded-xl border border-line bg-white p-3 text-xs"} data-testid="verification-export" data-mobile-layout={compactMobile ? "compact" : undefined}>
    <summary className={`${compactMobile ? "flex min-h-[44px] items-center gap-2 sm:list-item sm:min-h-11" : "min-h-11"} cursor-pointer font-semibold text-[#087f8c] focus-visible:outline focus-visible:outline-2`}>
      {compactMobile ? <span aria-hidden="true" className="shrink-0 group-open:rotate-90 sm:hidden">▸</span> : null}
      {ru ? "Проверочные данные · Preview" : "Verification data · Preview"}
    </summary>
    <p className="my-2 text-muted">{ru ? "Локальный файл, без нового запроса. История старых сохранений не восстанавливается." : "Local file, no new request. Legacy request provenance is not reconstructed."}</p>
    {diagnosticJson ? <label className="mt-3 block">{ru ? "Диагностика Context · не данные источника (только чтение)" : "Context diagnostic · not source evidence (read only)"}<textarea readOnly value={diagnosticJson} className="mt-1 h-48 w-full max-w-full rounded-lg border border-line p-2 font-mono text-xs" data-testid="context-request-diagnostic" /></label> : null}
    <button type="button" disabled={busy} onClick={() => void prepare()} data-testid="verification-prepare" className="min-h-11 rounded-lg border border-line px-3 font-semibold focus-visible:outline focus-visible:outline-2">{busy ? (ru ? "Подготовка…" : "Preparing…") : (ru ? "Подготовить JSON" : "Prepare JSON")}</button>
    <p role="status" aria-live="polite" className="mt-2">{error ? (ru ? "Экспорт отклонён: данные неполные, небезопасные или превышают лимит. Основной результат не изменён." : "Export refused: incomplete, unsafe or oversized data. The main result is unchanged.") : json ? (ru ? "Снимок подготовлен. Текущий выбор и исходный запрос записаны отдельно." : "Snapshot ready. Current selection and original submission are recorded separately.") : ""}</p>
    {json ? <><button type="button" onClick={download} data-testid="verification-download" className="mt-2 min-h-11 rounded-lg bg-[#087f8c] px-3 font-semibold text-white focus-visible:outline focus-visible:outline-2">{ru ? "Скачать JSON" : "Download JSON"}</button><label className="mt-3 block">{ru ? "JSON снимка (только чтение)" : "Snapshot JSON (read only)"}<textarea readOnly value={json} className="mt-1 h-48 w-full max-w-full rounded-lg border border-line p-2 font-mono text-xs" data-testid="verification-json" /></label></> : null}
  </details>;
}

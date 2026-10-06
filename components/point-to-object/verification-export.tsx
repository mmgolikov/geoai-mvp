"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createVerificationBundle, snapshotVerificationSubmission, snapshotVerificationResponse, VERIFICATION_BUNDLE_MAX_BYTES, type VerificationOperation, type VerificationRecord } from "@/src/lib/prototype/point-to-object-verification-export";

type Capture = { records: VerificationRecord[]; captureRefused: boolean; begin: (operation: VerificationOperation, intent: unknown, sourceSnapshot: unknown) => (response: unknown) => void };
const CaptureContext = createContext<Capture | null>(null);
export function VerificationCaptureBoundary({ value, children }: { value: Capture; children: ReactNode }) {
  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useVerificationCapture(enabled: boolean): Capture {
  const shared = useContext(CaptureContext);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const heldRecords = useRef<VerificationRecord[]>([]);
  const [captureRefused, setCaptureRefused] = useState(false);
  const begin = useCallback((operation: VerificationOperation, intent: unknown, sourceSnapshot: unknown) => {
    if (!enabled) return () => {};
    try {
      const submission = snapshotVerificationSubmission(operation, intent, sourceSnapshot);
      const submittedAt = new Date().toISOString();
      return (response: unknown) => {
        try {
          const record: VerificationRecord = { operation, ...submission, response: snapshotVerificationResponse(operation, response), submittedAt, completedAt: new Date().toISOString() };
          const next = heldRecords.current.concat(record);
          if (next.length > 16 || new TextEncoder().encode(JSON.stringify(next)).byteLength > VERIFICATION_BUNDLE_MAX_BYTES) { setCaptureRefused(true); return; }
          heldRecords.current = next;
          setRecords(next);
        } catch { setCaptureRefused(true); }
      };
    } catch { setCaptureRefused(true); return () => {}; }
  }, [enabled]);
  return shared ?? { records, begin, captureRefused };
}

export function VerificationExport({ enabled, locale, preSubmit = null, records = [], currentSelection, captureRefused = false }: {
  enabled: boolean; locale: "en" | "ru";
  preSubmit?: { operation: VerificationOperation; intent: unknown; sourceSnapshot: unknown } | null;
  records?: readonly VerificationRecord[]; currentSelection: unknown; captureRefused?: boolean;
}) {
  const [json, setJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!enabled) return null;
  const ru = locale === "ru";
  async function prepare() {
    setBusy(true); setError(false); setJson(null);
    try {
      if (captureRefused) throw new Error("EXPORT_CAPTURE_REFUSED");
      const result = await createVerificationBundle(enabled, { preSubmit, records, currentSelection });
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
  return <details className="my-2 rounded-xl border border-line bg-white p-3 text-xs" data-testid="verification-export">
    <summary className="min-h-11 cursor-pointer font-semibold text-[#087f8c] focus-visible:outline focus-visible:outline-2">{ru ? "Проверочные данные · Preview" : "Verification data · Preview"}</summary>
    <p className="my-2 text-muted">{ru ? "Локальный файл, без нового запроса. История старых сохранений не восстанавливается." : "Local file, no new request. Legacy request provenance is not reconstructed."}</p>
    <button type="button" disabled={busy} onClick={() => void prepare()} data-testid="verification-prepare" className="min-h-11 rounded-lg border border-line px-3 font-semibold focus-visible:outline focus-visible:outline-2">{busy ? (ru ? "Подготовка…" : "Preparing…") : (ru ? "Подготовить JSON" : "Prepare JSON")}</button>
    <p role="status" aria-live="polite" className="mt-2">{error ? (ru ? "Экспорт отклонён: данные неполные, небезопасные или превышают лимит. Основной результат не изменён." : "Export refused: incomplete, unsafe or oversized data. The main result is unchanged.") : json ? (ru ? "Снимок подготовлен. Текущий выбор и исходный запрос записаны отдельно." : "Snapshot ready. Current selection and original submission are recorded separately.") : ""}</p>
    {json ? <><button type="button" onClick={download} data-testid="verification-download" className="mt-2 min-h-11 rounded-lg bg-[#087f8c] px-3 font-semibold text-white focus-visible:outline focus-visible:outline-2">{ru ? "Скачать JSON" : "Download JSON"}</button><label className="mt-3 block">{ru ? "JSON снимка (только чтение)" : "Snapshot JSON (read only)"}<textarea readOnly value={json} className="mt-1 h-48 w-full max-w-full rounded-lg border border-line p-2 font-mono text-xs" data-testid="verification-json" /></label></> : null}
  </details>;
}

import { parseLiveResolvedObject } from "./live-session";
import type { LiveMapSelection } from "./live-types";
import { nominatimLocale } from "@/src/lib/prototype/point-to-object-markets";
import { publicEvidenceReceiptIsCurrent } from "@/src/lib/prototype/point-to-object-evidence-receipt";
import { pointObjectSelectedLookupId } from "@/src/lib/prototype/point-to-object-trusted-identity";

/** Reuses current public evidence; refresh is Context-only and never calls AI. */
export async function selectionWithCurrentEvidence(
  selection: LiveMapSelection,
  locale: "en" | "ru",
  signal: AbortSignal,
  request: typeof fetch = fetch
): Promise<LiveMapSelection> {
  const existing = selection.resolvedObject?.evidenceReceipt;
  if (publicEvidenceReceiptIsCurrent(existing) && existing?.sourceLocale === nominatimLocale(locale)) return selection;
  const response = await request("/api/prototype/point-to-object/context", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ caseKey: selection.locationKey, longitude: selection.longitude, latitude: selection.latitude,
      locale, expectedSourceFeatureId: pointObjectSelectedLookupId(selection) })
  });
  const payload: unknown = await response.json();
  const subject = response.ok && payload && typeof payload === "object" && "mode" in payload && payload.mode === "resolved" && "subject" in payload
    ? parseLiveResolvedObject(payload.subject) : null;
  const expectedId = pointObjectSelectedLookupId(selection);
  if (!subject || !publicEvidenceReceiptIsCurrent(subject.evidenceReceipt) ||
      subject.evidenceReceipt?.sourceLocale !== nominatimLocale(locale) ||
      subject.evidenceReceipt?.lookupSourceFeatureId !== expectedId ||
      (expectedId && subject.sourceFeatureId !== expectedId)) {
    throw new Error(locale === "ru" ? "Не удалось обновить данные объекта. Повторите попытку; анализ не запускался." : "Could not refresh this object's data. Try again; analysis was not started.");
  }
  return { ...selection, resolvedObject: subject };
}

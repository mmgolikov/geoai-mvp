/** Public source metadata only. This is a reuse lease, not a retention promise. */
export const PUBLIC_EVIDENCE_LEASE_MS = 15 * 60_000;
export type PublicEvidenceReceipt = {
  version: "PUBLIC_EVIDENCE_LEASE_V1";
  evidencePackHash: string;
  sourceResponseHash: string;
  acquiredAt: string;
  createdAt: string;
  expiresAt: string;
  cacheWindow: number;
  sourceLocale: string;
  lookupSourceFeatureId: string | null;
};

export function parsePublicEvidenceReceipt(value: unknown): PublicEvidenceReceipt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = ["version", "evidencePackHash", "sourceResponseHash", "acquiredAt", "createdAt", "expiresAt", "cacheWindow", "sourceLocale", "lookupSourceFeatureId"];
  if (Object.keys(row).length !== keys.length || Object.keys(row).some((key) => !keys.includes(key)) ||
      row.version !== "PUBLIC_EVIDENCE_LEASE_V1" ||
      typeof row.evidencePackHash !== "string" || !/^[a-f0-9]{64}$/.test(row.evidencePackHash) ||
      typeof row.sourceResponseHash !== "string" || !/^[a-f0-9]{64}$/.test(row.sourceResponseHash) ||
      ![row.acquiredAt, row.createdAt, row.expiresAt].every((item) => typeof item === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item) && Number.isFinite(Date.parse(item))) ||
      !Number.isSafeInteger(row.cacheWindow) || (row.cacheWindow as number) < 0 ||
      (row.sourceLocale !== "en" && row.sourceLocale !== "ru,en") ||
      (row.lookupSourceFeatureId !== null && (typeof row.lookupSourceFeatureId !== "string" || !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(row.lookupSourceFeatureId)))) return null;
  const created = Date.parse(row.createdAt as string);
  const expires = Date.parse(row.expiresAt as string);
  if (expires - created !== PUBLIC_EVIDENCE_LEASE_MS ||
      Math.floor(created / PUBLIC_EVIDENCE_LEASE_MS) !== row.cacheWindow ||
      Date.parse(row.acquiredAt as string) > expires) return null;
  return row as PublicEvidenceReceipt;
}

export function publicEvidenceReceiptIsCurrent(receipt: PublicEvidenceReceipt | null | undefined, now = Date.now()): boolean {
  return !!receipt && Date.parse(receipt.createdAt) <= now && Date.parse(receipt.expiresAt) > now;
}

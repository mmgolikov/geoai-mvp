import "server-only";
import { randomUUID } from "node:crypto";
import { readSharedExactFindSnapshot, type SharedExactSourceSnapshot } from "./point-to-object-exact-source";
import { unstable_cache } from "next/cache";
import { semanticHash } from "@/src/lib/point-to-object/hash";
import { buildLivePointObjectEvidencePack, type LivePointEvidenceRequest, type LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import { parsePublicEvidenceReceipt, publicEvidenceReceiptIsCurrent, PUBLIC_EVIDENCE_LEASE_MS, type PublicEvidenceReceipt } from "./point-to-object-evidence-receipt";

const MAX_PUBLIC_PACK_BYTES = 512 * 1024;
const SOURCE_BUDGET_MS = 12_000;
// Never share an unspecified local deployment across processes or deployments.
const LOCAL_INSTANCE = randomUUID();
const CACHE_VERSION = "geoai-public-evidence-lease-v1";
type PublicLookup = Pick<LivePointEvidenceRequest, "longitude" | "latitude" | "locale" | "osmFeatureId" | "expectedCountryCode">;
type Lease = { receipt: PublicEvidenceReceipt; pack: LivePointObjectEvidencePack; integrityHash: string };

export class PublicEvidenceLeaseError extends Error {
  readonly code = "AI_EVIDENCE_REFRESH_REQUIRED";
  readonly httpStatus = 409;
  readonly retryable = true;
  constructor() { super("The public data snapshot is missing, changed or expired. Refresh the selected object and try again."); }
}

function deploymentIdentity(): string {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL ||
    `${process.env.VERCEL_GIT_COMMIT_SHA || "local"}:${LOCAL_INSTANCE}`;
}

function publicLookup(input: PublicLookup): Required<PublicLookup> {
  if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180 ||
      !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90 ||
      !["ae", "sg", "sa", "qa", "om", "my", "hk", "ru"].includes(input.expectedCountryCode) ||
      (input.osmFeatureId != null && !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(input.osmFeatureId)) ||
      (input.locale != null && input.locale !== "en" && input.locale !== "ru,en")) throw new PublicEvidenceLeaseError();
  // Only these public fields enter the cache key or source adapter.
  return { longitude: Number(input.longitude.toFixed(6)), latitude: Number(input.latitude.toFixed(6)),
    locale: input.locale ?? "en", osmFeatureId: input.osmFeatureId ?? null, expectedCountryCode: input.expectedCountryCode };
}

const PACK_KEYS = ["protocol", "evidencePackId", "evidencePackHash", "caseKey", "caseId", "displayGeometry", "coordinates", "resolution", "selectedObject", "linkedEntity", "source", "nearbyContext", "geoContext", "evidence", "conflicts", "missingInformation", "limitations", "caveat"];

function validatedPublicPack(value: LivePointObjectEvidencePack, input: Required<PublicLookup>): LivePointObjectEvidencePack {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PUBLIC_PACK_BYTES ||
      Object.keys(value).length !== PACK_KEYS.length || Object.keys(value).some((key) => !PACK_KEYS.includes(key)) ||
      /"(?:password|authorization|apiKey|accessToken|refreshToken|userId|accountId|projectId|question|prompt|query)"\s*:/.test(serialized) ||
      value.protocol !== "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2" || value.caseKey !== "live" ||
      value.coordinates.longitude !== input.longitude || value.coordinates.latitude !== input.latitude ||
      (input.osmFeatureId !== null && value.selectedObject.sourceFeatureId !== input.osmFeatureId) ||
      !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value.selectedObject.sourceFeatureId) ||
      !/^[a-f0-9]{64}$/.test(value.source.sourceResponseHash) ||
      !Number.isFinite(Date.parse(value.source.acquiredAt))) throw new PublicEvidenceLeaseError();
  const { evidencePackHash, evidencePackId, displayGeometry, ...core } = value;
  if (semanticHash(core) !== evidencePackHash || evidencePackId !== `p2o_live_evidence_${evidencePackHash.slice(0, 24)}`) throw new PublicEvidenceLeaseError();
  // Clone prevents a consumer from mutating a cache entry in process.
  return JSON.parse(serialized) as LivePointObjectEvidencePack;
}

async function boundedSource(input: Required<PublicLookup>, serverExactSnapshot: SharedExactSourceSnapshot | null): Promise<LivePointObjectEvidencePack> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      buildLivePointObjectEvidencePack({ ...input, ...(serverExactSnapshot ? { serverExactSnapshot } : {}), deadlineAtMs: Date.now() + SOURCE_BUDGET_MS }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new PublicEvidenceLeaseError()), SOURCE_BUDGET_MS); })
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

async function readLease(input: PublicLookup, allowFill: boolean, expected: PublicEvidenceReceipt | null): Promise<Lease> {
  const lookup = publicLookup(input);
  const startedAt = Date.now();
  if (!allowFill && (!expected || !publicEvidenceReceiptIsCurrent(expected, startedAt))) throw new PublicEvidenceLeaseError();
  // The window makes a later explicit Context refresh use a fresh key; AI keeps
  // the original window. It is not a physical retention/deletion guarantee.
  const cacheWindow = expected?.cacheWindow ?? Math.floor(startedAt / PUBLIC_EVIDENCE_LEASE_MS);
  const cacheKey = semanticHash({ version: CACHE_VERSION, deployment: deploymentIdentity(), lookup, cacheWindow });
  // Lookup only, outside the pack cache. The builder revalidates identity, original
  // timestamp and anchor; no browser-supplied geometry enters this trusted lane.
  const exactSnapshot = allowFill && lookup.osmFeatureId ? await readSharedExactFindSnapshot(lookup.osmFeatureId) : null;
  const cached = unstable_cache(async () => {
    // Mode is deliberately a closure, not a key argument: both routes read the
    // SAME entry. A cache miss or stale revalidation in AI never fetches sources.
    if (!allowFill) throw new PublicEvidenceLeaseError();
    const pack = validatedPublicPack(await boundedSource(lookup, exactSnapshot), lookup);
    const receipt: PublicEvidenceReceipt = {
      version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: pack.evidencePackHash,
      sourceResponseHash: pack.source.sourceResponseHash, acquiredAt: pack.source.acquiredAt,
      createdAt: new Date(startedAt).toISOString(), expiresAt: new Date(startedAt + PUBLIC_EVIDENCE_LEASE_MS).toISOString(),
      cacheWindow, sourceLocale: lookup.locale!, lookupSourceFeatureId: lookup.osmFeatureId
    };
    if (!parsePublicEvidenceReceipt(receipt)) throw new PublicEvidenceLeaseError();
    return { receipt, pack, integrityHash: semanticHash(pack) };
  }, [CACHE_VERSION, cacheKey], { revalidate: PUBLIC_EVIDENCE_LEASE_MS / 1000 });
  const value = await cached();
  const receipt = parsePublicEvidenceReceipt(value?.receipt);
  if (!receipt || !publicEvidenceReceiptIsCurrent(receipt) || receipt.cacheWindow !== cacheWindow ||
      receipt.lookupSourceFeatureId !== lookup.osmFeatureId || receipt.sourceLocale !== lookup.locale ||
      (expected && semanticHash(receipt) !== semanticHash(expected))) throw new PublicEvidenceLeaseError();
  const pack = validatedPublicPack(value.pack, lookup);
  // A newer Find snapshot can outlive a source window while an older pack still
  // exists in this pack window. Never serve differing subject data on Context.
  if (exactSnapshot && pack.source.sourceResponseHash !== semanticHash(exactSnapshot.element)) throw new PublicEvidenceLeaseError();
  if (value.integrityHash !== semanticHash(pack) || receipt.evidencePackHash !== pack.evidencePackHash ||
      receipt.sourceResponseHash !== pack.source.sourceResponseHash || receipt.acquiredAt !== pack.source.acquiredAt) throw new PublicEvidenceLeaseError();
  return { receipt, pack, integrityHash: value.integrityHash };
}

/** Call only after route authentication, origin validation and rate admission. */
export function acquirePublicEvidenceLease(input: PublicLookup): Promise<Lease> {
  return readLease(input, true, null);
}

/** No source/provider fallback: caller must explicitly refresh Context on 409. */
export function reusePublicEvidenceLease(input: PublicLookup, receipt: PublicEvidenceReceipt | null): Promise<Lease> {
  return readLease(input, false, receipt);
}

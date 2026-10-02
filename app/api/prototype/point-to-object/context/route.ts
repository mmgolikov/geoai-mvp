import { explicitSourceHeight } from "@/src/lib/prototype/point-to-object-source-geometry";
import { projectPointObjectFabricDiagnostic } from "@/src/lib/prototype/point-to-object-fabric-diagnostic";
import { normalizePointObjectContext } from "@/src/lib/prototype/point-to-object-normalized-context";

import { NextResponse } from "next/server";

import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";
import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { LivePointEvidenceError } from "@/src/lib/prototype/point-to-object-live-evidence";
import { acquirePublicEvidenceLease, PublicEvidenceLeaseError } from "@/src/lib/prototype/point-to-object-evidence-lease";
import { admitPointObjectContextSourceAcquisition, PointObjectSourceAdmissionError } from "@/src/lib/prototype/point-to-object-source-admission";
import {
  coordinatesMatchPointObjectMarket,
  isPointObjectLocale,
  isPointObjectMarketKey,
  nominatimLocale,
  pointObjectMarket,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "@/src/lib/prototype/point-to-object-markets";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runtimeAllowed(): boolean {
  return getPointObjectSurfaceStatus().enabled;
}

function noStoreHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    ...extra
  };
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expected = `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost || requestUrl.host}`;
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

function validBody(value: unknown): value is {
  caseKey: PointObjectMarketKey;
  longitude: number;
  latitude: number;
  locale: PointObjectLocale;
  expectedSourceFeatureId?: string | null;
} {
  if (!isRecord(value) || Object.keys(value).some((key) => !["caseKey", "longitude", "latitude", "locale", "expectedSourceFeatureId"].includes(key))) return false;
  return isPointObjectMarketKey(value.caseKey) &&
    typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 &&
    typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    coordinatesMatchPointObjectMarket(value.caseKey, value.longitude, value.latitude) &&
    isPointObjectLocale(value.locale) &&
    (value.expectedSourceFeatureId === undefined || value.expectedSourceFeatureId === null ||
      (typeof value.expectedSourceFeatureId === "string" && /^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value.expectedSourceFeatureId)));
}

export async function POST(request: Request) {
  const identity = await requirePilotIdentity(request);
  if (!identity.allowed) return identity.response;
  const mutationOrigin = requirePilotMutationOrigin(request);
  if (mutationOrigin) return mutationOrigin;
  if (!runtimeAllowed()) {
    return NextResponse.json({ mode: "unavailable", error: "Live object details are not available in this environment." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ mode: "unavailable", error: "The live object request must originate from this application." }, {
      status: 403,
      headers: noStoreHeaders()
    });
  }
  const parsed = await readBoundedJson(request, 1_024);
  if (!parsed.ok || !validBody(parsed.value)) {
    return NextResponse.json({ mode: "unavailable", error: "A valid selected point is required." }, {
      status: parsed.ok ? 400 : parsed.status,
      headers: noStoreHeaders()
    });
  }
  try {
    const { pack: evidencePack, receipt } = await acquirePublicEvidenceLease({
      longitude: parsed.value.longitude,
      latitude: parsed.value.latitude,
      locale: nominatimLocale(parsed.value.locale),
      osmFeatureId: parsed.value.expectedSourceFeatureId ?? null,
      expectedCountryCode: pointObjectMarket(parsed.value.caseKey).countryCode
    }, () => admitPointObjectContextSourceAcquisition(identity, {
      environment: process.env, surfaceEnabled: runtimeAllowed()
    }));
    return NextResponse.json({
      mode: "resolved",
      schemaVersion: 2,
      // Actual server-acquired evidence provenance, not a client-inferred
      // freshness claim. Allows comparing analyses against the same evidence.
      evidenceReceipt: receipt,
      subject: {
        evidenceReceipt: receipt,
        name: evidencePack.selectedObject.name,
        address: evidencePack.selectedObject.displayAddress,
        featureClass: evidencePack.selectedObject.featureClass,
        sourceFeatureId: evidencePack.selectedObject.sourceFeatureId,
        geometryType: evidencePack.selectedObject.geometryType,
        coordinateAssociation: evidencePack.resolution.coordinateAssociation,
        resultCentroidDistanceM: evidencePack.resolution.resultCentroidDistanceM,
        addressParts: evidencePack.selectedObject.addressParts,
        tags: evidencePack.selectedObject.tags,
        metrics: evidencePack.selectedObject.metrics,
        displayGeometry: evidencePack.displayGeometry ?? null,
        geometryProvenance: evidencePack.displayGeometry ? "confirmed_complete_footprint" : null,
        // Reverse lookup may describe a nearby building, not the selected map
        // footprint. Keep its raw height tag as source context, but only attach
        // rendering metadata to a source-bound complete display geometry.
        ...(evidencePack.displayGeometry ? explicitSourceHeight(evidencePack.selectedObject.tags) : {}),
        geoContext: evidencePack.geoContext,
        normalizedContext: normalizePointObjectContext(evidencePack),
        ...projectPointObjectFabricDiagnostic(evidencePack.source, evidencePack.geoContext.coverage),
        linkedEntity: evidencePack.linkedEntity,
        ...(evidencePack.climate ? { climate: evidencePack.climate } : {})
      }
    }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PointObjectSourceAdmissionError) {
      return NextResponse.json({ mode: "unavailable", code: error.code, error: error.message,
        rateLimitScope: "source_acquisition", retryable: error.retryable }, {
        status: error.httpStatus, headers: noStoreHeaders({ "Retry-After": String(error.retryAfterSeconds) })
      });
    }
    if (error instanceof PublicEvidenceLeaseError) {
      return NextResponse.json({ mode: "unavailable", code: error.code, error: error.message, retryable: true }, {
        status: 409, headers: noStoreHeaders()
      });
    }
    if (error instanceof LivePointEvidenceError) {
      return NextResponse.json({ mode: "unavailable", code: error.code, error: error.message, retryable: error.retryable }, {
        status: error.httpStatus,
        headers: noStoreHeaders(error.httpStatus === 429 ? { "Retry-After": String(error.retryAfterSeconds ?? 15) } : {})
      });
    }
    return NextResponse.json({ mode: "unavailable", error: "Live object details could not be resolved.", retryable: true }, {
      status: 500,
      headers: noStoreHeaders()
    });
  }
}

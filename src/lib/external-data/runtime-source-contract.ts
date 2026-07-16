import { timingSafeEqual } from "node:crypto";
import { publicDataCaveat } from "@/src/lib/external-data/public-source-catalog";

export const runtimeSourcePackId = "runtime_api_preview_v1" as const;
export const runtimeSourcePackDemoId = "dubai-downtown-public-demo" as const;

export type RuntimeSourceEnvironment = "local" | "preview" | "production";
export type RuntimeSourceMode = "live" | "cached" | "unavailable" | "disabled";
export type RuntimeSourceActivationMode = "local_operator_enabled" | "preview_operator_enabled" | "disabled";

export type RuntimeSourceObservation<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  sourceId: string;
  mode: RuntimeSourceMode;
  retrievedAt: string | null;
  servedAt: string;
  sourceObservedAt: string | null;
  queryFingerprint: string;
  coverage: string;
  licenseName: string;
  licenseUrl: string;
  attribution: string;
  caveat: string;
  fallbackReason: string | null;
  payload: TPayload | null;
};

export type RuntimeSourcePackResponse = {
  ok: boolean;
  packId: typeof runtimeSourcePackId;
  demoId: typeof runtimeSourcePackDemoId;
  environment: RuntimeSourceEnvironment;
  requestedMode: typeof runtimeSourcePackId;
  effectiveMode: "runtime_api_context" | "disabled";
  activationAllowed: boolean;
  scoreImpact: "none";
  persistence: "none";
  generatedAt: string;
  sources: RuntimeSourceObservation[];
  caveat: string;
};

export function getRuntimeSourceEnvironment(): RuntimeSourceEnvironment {
  if (process.env.VERCEL_ENV === "preview") return "preview";
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") return "production";
  return "local";
}

export function isRuntimeSourcePackOperatorEnabled() {
  const token = process.env.GEOAI_OPERATOR_SOURCE_TOKEN?.trim() ?? "";
  return process.env.GEOAI_ENABLE_PREVIEW_SOURCE_PACK?.trim().toLowerCase() === "true" && Buffer.byteLength(token, "utf8") >= 32;
}

export function hasRuntimeSourcePackOperatorAccess(request: Request) {
  const expected = process.env.GEOAI_OPERATOR_SOURCE_TOKEN?.trim() ?? "";
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : request.headers.get("x-geoai-operator-token")?.trim() ?? "";
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  if (expectedBytes.byteLength < 32 || suppliedBytes.byteLength !== expectedBytes.byteLength) return false;
  return timingSafeEqual(suppliedBytes, expectedBytes);
}

export function isRuntimeSourcePackAllowed(environment = getRuntimeSourceEnvironment()) {
  return environment !== "production" && isRuntimeSourcePackOperatorEnabled();
}

export function getRuntimeSourcePackActivationMode(
  environment = getRuntimeSourceEnvironment()
): RuntimeSourceActivationMode {
  if (!isRuntimeSourcePackAllowed(environment)) return "disabled";
  return environment === "preview" ? "preview_operator_enabled" : "local_operator_enabled";
}

export function disabledRuntimeSourcePack(now = new Date()): RuntimeSourcePackResponse {
  const environment = getRuntimeSourceEnvironment();

  return {
    ok: false,
    packId: runtimeSourcePackId,
    demoId: runtimeSourcePackDemoId,
    environment,
    requestedMode: runtimeSourcePackId,
    effectiveMode: "disabled",
    activationAllowed: false,
    scoreImpact: "none",
    persistence: "none",
    generatedAt: now.toISOString(),
    sources: [],
    caveat: `Runtime source activation is not operator-enabled for this deployment. ${publicDataCaveat}`
  };
}

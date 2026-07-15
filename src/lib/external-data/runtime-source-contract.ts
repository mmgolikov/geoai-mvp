import { publicDataCaveat } from "@/src/lib/external-data/public-source-catalog";

export const runtimeSourcePackId = "runtime_api_preview_v1" as const;
export const runtimeSourcePackDemoId = "dubai-downtown-public-demo" as const;

export type RuntimeSourceEnvironment = "local" | "preview" | "production";
export type RuntimeSourceMode = "live" | "cached" | "unavailable" | "disabled";

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
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "local";
}

export function isRuntimeSourcePackAllowed(environment = getRuntimeSourceEnvironment()) {
  return environment !== "production";
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
    caveat: `Production runtime source activation is not authorized. ${publicDataCaveat}`
  };
}

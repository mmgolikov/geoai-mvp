export type LivePointFeatureGateReason =
  | "enabled"
  | "flag_disabled"
  | "main_gate_hold"
  | "production_denied"
  | "unsupported_vercel_environment";

export interface LivePointFeatureGateStatus {
  enabled: boolean;
  environment: "local" | "preview" | "production" | "unsupported_vercel_environment";
  reason: LivePointFeatureGateReason;
}

type EnvironmentReader = Partial<Pick<NodeJS.ProcessEnv,
  "GEOAI_ENABLE_LIVE_POINT_PREVIEW" | "VERCEL" | "VERCEL_ENV">>;

function isExplicitlyEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Main authority for this work package: no runtime/import surface may activate. */
export const LIVE_POINT_MAIN_GATE_OPEN = false as const;

export function getLivePointFeatureGate(
  environment: EnvironmentReader
): LivePointFeatureGateStatus {
  const vercelEnvironment = environment.VERCEL_ENV?.trim().toLowerCase();
  const isVercel = environment.VERCEL?.trim() === "1" || Boolean(vercelEnvironment);

  if (vercelEnvironment === "production") {
    return { enabled: false, environment: "production", reason: "production_denied" };
  }

  if (isVercel && vercelEnvironment !== "preview" && vercelEnvironment !== "development") {
    return {
      enabled: false,
      environment: "unsupported_vercel_environment",
      reason: "unsupported_vercel_environment"
    };
  }

  const resolvedEnvironment = vercelEnvironment === "preview" ? "preview" : "local";
  if (!LIVE_POINT_MAIN_GATE_OPEN) {
    return { enabled: false, environment: resolvedEnvironment, reason: "main_gate_hold" };
  }
  if (!isExplicitlyEnabled(environment.GEOAI_ENABLE_LIVE_POINT_PREVIEW)) {
    return { enabled: false, environment: resolvedEnvironment, reason: "flag_disabled" };
  }

  return { enabled: true, environment: resolvedEnvironment, reason: "enabled" };
}

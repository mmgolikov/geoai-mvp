export type PointObjectRuntimeEnvironment = "preview" | "production" | "unsupported";

export type PointObjectRuntimePolicyEnvironment = Readonly<Record<string, string | undefined>>;

export type PointObjectRuntimeGate = {
  enabled: boolean;
  reason:
    | "enabled"
    | "unsupported_environment"
    | "preview_flag_disabled"
    | "production_surface_flag_disabled"
    | "production_ai_flag_disabled"
    | "openai_key_missing";
};

export type PointObjectRuntimePolicy = {
  environment: PointObjectRuntimeEnvironment;
  surface: PointObjectRuntimeGate;
  ai: PointObjectRuntimeGate & {
    scope: "general_governed_upstream" | "isolated_point_object_preview" | "isolated_point_object_production" | "disabled";
  };
};

function isExplicitlyEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function resolvePointObjectRuntimePolicy(
  environment: PointObjectRuntimePolicyEnvironment,
  options: { openAiKeyConfigured: boolean; generalUpstreamEnabled: boolean }
): PointObjectRuntimePolicy {
  const vercelEnvironment = environment.VERCEL_ENV;
  if (vercelEnvironment === "preview") {
    const previewEnabled = isExplicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI);
    const surface: PointObjectRuntimeGate = previewEnabled
      ? { enabled: true, reason: "enabled" }
      : { enabled: false, reason: "preview_flag_disabled" };
    if (options.generalUpstreamEnabled) {
      return {
        environment: "preview",
        surface,
        ai: { enabled: true, reason: "enabled", scope: "general_governed_upstream" }
      };
    }
    if (!previewEnabled) {
      return {
        environment: "preview",
        surface,
        ai: { enabled: false, reason: "preview_flag_disabled", scope: "disabled" }
      };
    }
    return {
      environment: "preview",
      surface,
      ai: options.openAiKeyConfigured
        ? { enabled: true, reason: "enabled", scope: "isolated_point_object_preview" }
        : { enabled: false, reason: "openai_key_missing", scope: "disabled" }
    };
  }

  if (vercelEnvironment === "production") {
    const surfaceEnabled = isExplicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE);
    const surface: PointObjectRuntimeGate = surfaceEnabled
      ? { enabled: true, reason: "enabled" }
      : { enabled: false, reason: "production_surface_flag_disabled" };
    if (!surfaceEnabled) {
      return {
        environment: "production",
        surface,
        ai: { enabled: false, reason: "production_surface_flag_disabled", scope: "disabled" }
      };
    }
    if (!isExplicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI)) {
      return {
        environment: "production",
        surface,
        ai: { enabled: false, reason: "production_ai_flag_disabled", scope: "disabled" }
      };
    }
    return {
      environment: "production",
      surface,
      ai: options.openAiKeyConfigured
        ? { enabled: true, reason: "enabled", scope: "isolated_point_object_production" }
        : { enabled: false, reason: "openai_key_missing", scope: "disabled" }
    };
  }

  return {
    environment: "unsupported",
    surface: { enabled: false, reason: "unsupported_environment" },
    ai: { enabled: false, reason: "unsupported_environment", scope: "disabled" }
  };
}

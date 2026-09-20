export type PointObjectRuntimeEnvironment = "preview" | "production" | "self_hosted_candidate" | "unsupported";

export type PointObjectRuntimePolicyEnvironment = Readonly<Record<string, string | undefined>>;

export type PointObjectRuntimeGate = {
  enabled: boolean;
  reason:
    | "enabled"
    | "unsupported_environment"
    | "preview_flag_disabled"
    | "self_hosted_surface_flag_disabled"
    | "self_hosted_ai_flag_disabled"
    | "production_surface_flag_disabled"
    | "production_ai_flag_disabled"
    | "production_auth_configuration_required"
    | "openai_key_missing";
};

export type PointObjectRuntimePolicy = {
  environment: PointObjectRuntimeEnvironment;
  surface: PointObjectRuntimeGate;
  ai: PointObjectRuntimeGate & {
    scope: "general_governed_upstream" | "isolated_point_object_preview" | "isolated_point_object_production" | "isolated_point_object_self_hosted_candidate" | "disabled";
  };
};

function isExplicitlyEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Closed MVP is authorized only on the existing geoai-dev target. This checks
 * public configuration, not credentials, user authorization or hosted readiness. */
export function pointObjectProductionAuthConfigured(environment: PointObjectRuntimePolicyEnvironment): boolean {
  if (environment.NEXT_PUBLIC_AUTH_MODE?.trim() !== "supabase_auth" ||
      !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "")) return false;
  try {
    const url = new URL(environment.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "");
    return url.origin === "https://pphdqkurxneyagvnnjdt.supabase.co" && url.pathname === "/" &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
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
    if (!pointObjectProductionAuthConfigured(environment)) {
      return {
        environment: "production",
        surface: { enabled: false, reason: "production_auth_configuration_required" },
        ai: { enabled: false, reason: "production_auth_configuration_required", scope: "disabled" }
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

  if (!vercelEnvironment && environment.GEOAI_RUNTIME_TARGET?.trim() === "self_hosted_candidate") {
    const surfaceEnabled = isExplicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_SURFACE);
    const surface: PointObjectRuntimeGate = surfaceEnabled
      ? { enabled: true, reason: "enabled" }
      : { enabled: false, reason: "self_hosted_surface_flag_disabled" };
    if (!surfaceEnabled) {
      return {
        environment: "self_hosted_candidate",
        surface,
        ai: { enabled: false, reason: "self_hosted_surface_flag_disabled", scope: "disabled" }
      };
    }
    if (!isExplicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI)) {
      return {
        environment: "self_hosted_candidate",
        surface,
        ai: { enabled: false, reason: "self_hosted_ai_flag_disabled", scope: "disabled" }
      };
    }
    return {
      environment: "self_hosted_candidate",
      surface,
      ai: options.openAiKeyConfigured
        ? { enabled: true, reason: "enabled", scope: "isolated_point_object_self_hosted_candidate" }
        : { enabled: false, reason: "openai_key_missing", scope: "disabled" }
    };
  }

  return {
    environment: "unsupported",
    surface: { enabled: false, reason: "unsupported_environment" },
    ai: { enabled: false, reason: "unsupported_environment", scope: "disabled" }
  };
}

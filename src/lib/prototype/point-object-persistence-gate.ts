import "server-only";
import { pointObjectProductionAuthConfigured } from "./point-object-runtime-policy";

export type PointObjectPersistenceGate = {
  enabled: boolean;
  environment: string | null;
  reason: "enabled" | "not_preview" | "operator_flag_disabled" | "self_hosted_flag_disabled" |
    "production_flag_disabled" | "production_auth_configuration_required";
};

/**
 * Dedicated environment-specific gate. Production requires its own explicit
 * opt-in and approved closed-MVP Auth target; no global repository activation.
 */
export function getPointObjectPersistenceGate(): PointObjectPersistenceGate {
  const environment = process.env.VERCEL_ENV?.trim() || null;
  if (environment === "production") {
    if (process.env.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE?.trim().toLowerCase() !== "true") {
      return { enabled: false, environment, reason: "production_flag_disabled" };
    }
    return pointObjectProductionAuthConfigured(process.env)
      ? { enabled: true, environment, reason: "enabled" }
      : { enabled: false, environment, reason: "production_auth_configuration_required" };
  }
  if (!environment && process.env.GEOAI_RUNTIME_TARGET?.trim() === "self_hosted_candidate") {
    const explicitlyAllowed =
      process.env.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE?.trim().toLowerCase() === "true";
    return explicitlyAllowed
      ? { enabled: true, environment: "self_hosted_candidate", reason: "enabled" }
      : { enabled: false, environment: "self_hosted_candidate", reason: "self_hosted_flag_disabled" };
  }
  if (environment !== "preview") {
    return { enabled: false, environment, reason: "not_preview" };
  }

  const explicitlyAllowed =
    process.env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE?.trim().toLowerCase() === "true";
  if (!explicitlyAllowed) {
    return { enabled: false, environment, reason: "operator_flag_disabled" };
  }

  return { enabled: true, environment, reason: "enabled" };
}

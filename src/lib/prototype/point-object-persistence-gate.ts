import "server-only";

export type PointObjectPersistenceGate = {
  enabled: boolean;
  environment: string | null;
  reason: "enabled" | "not_preview" | "operator_flag_disabled" | "self_hosted_flag_disabled";
};

/**
 * Dedicated Preview-only gate. This intentionally does not reuse or modify the
 * global repository switch and can never enable persistence in Production.
 */
export function getPointObjectPersistenceGate(): PointObjectPersistenceGate {
  const environment = process.env.VERCEL_ENV?.trim() || null;
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

export const spatialProductSourceModes = [
  "synthetic_fallback",
  "open_context_preview",
  "licensed_provider",
  "client_validated",
  "official_validated"
] as const;

export type SpatialProductSourceMode = (typeof spatialProductSourceModes)[number];
export type SpatialRuntimeEnvironment = "production" | "preview" | "development";

export type SpatialSourceRequest = {
  runtimeEnvironment: SpatialRuntimeEnvironment;
  requestedSourceMode: SpatialProductSourceMode;
  approvedSourceMode: SpatialProductSourceMode;
};

export const defaultSpatialProductSourceMode: SpatialProductSourceMode = "synthetic_fallback";

export const spatialProductSourceModeLabels: Record<SpatialProductSourceMode, string> = {
  synthetic_fallback: "Sample/demo",
  open_context_preview: "Open-context",
  licensed_provider: "Licensed provider",
  client_validated: "Client validated",
  official_validated: "Official validated"
};

export function parseSpatialProductSourceMode(value: unknown): SpatialProductSourceMode {
  return typeof value === "string" && spatialProductSourceModes.includes(value as SpatialProductSourceMode)
    ? value as SpatialProductSourceMode
    : defaultSpatialProductSourceMode;
}

export function resolveSpatialRuntimeEnvironment(
  vercelEnvironment: string | undefined,
  nodeEnvironment: string | undefined
): SpatialRuntimeEnvironment {
  if (vercelEnvironment === "production") return "production";
  if (vercelEnvironment === "preview") return "preview";
  if (nodeEnvironment === "production") return "production";
  return "development";
}

export function createSpatialSourceRequest(input: {
  requestedSourceMode?: unknown;
  vercelEnvironment?: string;
  nodeEnvironment?: string;
}): SpatialSourceRequest {
  const runtimeEnvironment = resolveSpatialRuntimeEnvironment(input.vercelEnvironment, input.nodeEnvironment);
  const requestedSourceMode = parseSpatialProductSourceMode(input.requestedSourceMode);

  return {
    runtimeEnvironment,
    requestedSourceMode,
    approvedSourceMode:
      runtimeEnvironment === "production"
        ? defaultSpatialProductSourceMode
        : requestedSourceMode === "open_context_preview"
          ? "open_context_preview"
          : defaultSpatialProductSourceMode
  };
}

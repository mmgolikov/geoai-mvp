import { getExternalDataSource } from "@/src/lib/external-data/source-registry";

export function getCopernicusAvailabilityStatus() {
  const source = getExternalDataSource("copernicus-sentinel-catalog");
  const hasCopernicusCredentials = Boolean(process.env.COPERNICUS_CLIENT_ID && process.env.COPERNICUS_CLIENT_SECRET);
  const hasSentinelHubCredentials = Boolean(process.env.SENTINELHUB_CLIENT_ID && process.env.SENTINELHUB_CLIENT_SECRET);

  if (!hasCopernicusCredentials && !hasSentinelHubCredentials) {
    return {
      source: source?.name ?? "Copernicus / Sentinel imagery availability",
      status: "token_required",
      message: "Copernicus/Sentinel credentials are not configured; imagery availability is shown as a planned connector.",
      disclaimer: source?.disclaimer ?? "Satellite imagery availability check only; analytics pipeline planned."
    };
  }

  return {
    source: source?.name ?? "Copernicus / Sentinel imagery availability",
    status: "token_required",
    message: "Credentials are present, but the imagery availability query pipeline is not enabled in v0.7.",
    disclaimer: source?.disclaimer ?? "Satellite imagery availability check only; analytics pipeline planned."
  };
}

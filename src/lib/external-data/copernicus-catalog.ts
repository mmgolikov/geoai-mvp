import { getExternalDataSource } from "@/src/lib/external-data/source-registry";

export function getCopernicusAvailabilityStatus() {
  const source = getExternalDataSource("copernicus-sentinel-catalog");

  return {
    source: source?.name ?? "Copernicus / Sentinel imagery availability",
    status: "planned",
    catalogueMetadataAccess: "public_preview_candidate",
    runtimeEndpoint: "/api/external-data/source-connection-pack",
    message: "Public STAC catalogue metadata is available only through the fixed local/Preview source pack. Imagery download and analytics remain disabled.",
    disclaimer: source?.disclaimer ?? "Satellite catalogue metadata only; no imagery, geometry, assets or analytics are returned."
  };
}

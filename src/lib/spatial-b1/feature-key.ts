import type { SpatialGeometryRoleV1, SpatialSourceAliasV1 } from "@/src/types/spatial-data-v1";

const roleTokens: Record<SpatialGeometryRoleV1, string> = {
  context_boundary: "area",
  screening_zone: "zone",
  asset_footprint: "asset",
  aoi: "aoi",
  corridor: "corridor",
  anchor: "anchor",
  observation_footprint: "observation"
};

export function normalizeSpatialKeyTokenV1(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "unnamed";
}

export function buildStableFeatureKeyV1(input: {
  role: SpatialGeometryRoleV1;
  slug: string;
  countryCode?: string;
  regionCode?: string;
}) {
  const country = normalizeSpatialKeyTokenV1(input.countryCode ?? "ae");
  const region = normalizeSpatialKeyTokenV1(input.regionCode ?? "du");
  const slug = normalizeSpatialKeyTokenV1(input.slug);
  return `geoai:${roleTokens[input.role]}:${country}-${region}:${slug}`;
}

export function buildProviderIndependentFeatureKeyV1(input: {
  role: SpatialGeometryRoleV1;
  semanticName: string | null;
  category: string;
  centroid: { longitude: number; latitude: number };
  countryCode?: string;
  regionCode?: string;
}) {
  const semanticSlug = input.semanticName?.trim()
    ? input.semanticName
    : `${input.category}-${input.centroid.longitude.toFixed(5)}-${input.centroid.latitude.toFixed(5)}`;
  return buildStableFeatureKeyV1({
    role: input.role,
    slug: semanticSlug,
    countryCode: input.countryCode,
    regionCode: input.regionCode
  });
}

export function isStableFeatureKeyV1(value: string) {
  return /^geoai:(area|zone|asset|aoi|corridor|anchor|observation):[a-z0-9-]+:[a-z0-9-]+$/.test(value);
}

export function spatialSourceAliasKeyV1(alias: SpatialSourceAliasV1) {
  return `${normalizeSpatialKeyTokenV1(alias.sourceId)}:${normalizeSpatialKeyTokenV1(alias.sourceFeatureId)}`;
}

export function dedupeSpatialSourceAliasesV1(aliases: SpatialSourceAliasV1[]) {
  const seen = new Set<string>();
  return aliases.filter((alias) => {
    const key = spatialSourceAliasKeyV1(alias);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function withStableKeyCollisionSuffixV1(featureKey: string, collisionIndex: number) {
  if (collisionIndex <= 0) return featureKey;
  return `${featureKey}-${String(collisionIndex + 1).padStart(2, "0")}`;
}

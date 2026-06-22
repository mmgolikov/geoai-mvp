export type PublicSourceCategory =
  | "market"
  | "real-estate"
  | "spatial"
  | "buildings"
  | "transport"
  | "poi"
  | "administrative-boundaries"
  | "climate"
  | "energy"
  | "air-quality"
  | "demographics"
  | "satellite-metadata"
  | "official-validation";

export type PublicSourceAccessMode =
  | "open-api"
  | "public-download"
  | "manual-snapshot"
  | "public-web-csv"
  | "open-snapshot"
  | "api-context"
  | "token-optional"
  | "permissioned"
  | "planned-validation";

export type PublicSourceConnectionStatus =
  | "connected"
  | "snapshot_available"
  | "sample_fallback"
  | "manual_import_ready"
  | "token_required"
  | "permission_required"
  | "planned"
  | "unavailable";

export type PublicDataQualityTier =
  | "sample"
  | "screening"
  | "open-context"
  | "snapshot"
  | "requires-validation";

export type PublicSourceCatalogItem = {
  id: string;
  name: string;
  provider: string;
  geography: string;
  category: PublicSourceCategory;
  accessMode: PublicSourceAccessMode;
  connectionStatus: PublicSourceConnectionStatus;
  licenseNote: string;
  updateCadence: string;
  dataQualityTier: PublicDataQualityTier;
  officialClaimAllowed: boolean;
  allowedUse: string[];
  forbiddenClaims: string[];
  limitations: string[];
  caveat: string;
};

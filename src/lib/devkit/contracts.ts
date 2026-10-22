import type { Geometry, Polygon } from "geojson";
import type { ConceptUse, PointObjectCreateAoi, RedevelopmentProgramInput } from "../prototype/point-to-object-create";
import type { PointObjectLocale, PointObjectMarketKey } from "../prototype/point-to-object-markets";

/** E1 local candidate contract, not a hosted/tenant or official-data authority. */
export const DEVKIT_SCHEMA_VERSION = 1 as const;
export const DEVKIT_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type DevkitTrust = "public_source" | "user_provided" | "synthetic" | "derived" | "generated" | "unavailable";
export type DevkitRefKind = "design" | "areas" | "finance" | "kit";
export type VersionRef = { kind: DevkitRefKind; id: string; revision: number };
export type ProjectBrief = {
  title: string; objective: string; marketKey: PointObjectMarketKey; locale: PointObjectLocale;
  strategy: string; budget: { amount: number | null; currency: "AED" | "RUB" | "USD"; includesLand: boolean | null };
  requirements: string[]; assumptions: string[];
};
/** Reuses Create coordinates/measurements; the drawn AOI is NOT a parcel. */
export type AOI = PointObjectCreateAoi & { revision: number; crs: "EPSG:4326"; provenance: "user_provided" | "synthetic" };
export type SpatialObject = {
  id: string; kind: "land_parcel" | "building" | "poi"; label: string;
  sourceFeatureId: string | null; geometry: Geometry | null; crs: "EPSG:4326";
  trust: DevkitTrust; evidenceIds: string[];
};
export type LandParcel = SpatialObject & { kind: "land_parcel" };
export type Building = SpatialObject & { kind: "building" };
export type POI = SpatialObject & { kind: "poi" };
export type Evidence = {
  id: string; subjectId: string; label: string; sourceId: string; sourceUrl: string | null;
  excerpt: string | null; acquiredAt: string | null; validAt: string | null; responseHash: string | null;
  trust: DevkitTrust; status: "available" | "partial" | "unavailable" | "conflicting";
  rights: { licence: string | null; attribution: string; permittedUse: "public_demo" | "synthetic_demo" | "unknown"; redistribution: "allowed" | "not_allowed" | "unknown" };
};
export type Claim = {
  id: string; subjectId: string; field: string; value: string | number | boolean | null; unit: string | null;
  status: "source_backed" | "assumption" | "derived" | "generated" | "unknown" | "conflicting";
  evidenceIds: string[]; explanation: string;
};
export type Constraint = {
  id: string; subjectId: string; label: string; status: "source_backed" | "proposed" | "assumed" | "unknown" | "conflicting";
  severity: "critical" | "warning" | "information"; geometry: Geometry | null; evidenceIds: string[];
  impact: string; nextAction: string;
};
export type Scenario = { id: string; label: string; objective: string };
export type DesignBuilding = {
  id: string; label: string; footprint: Polygon; levels: number | null; use: ConceptUse;
  retained: boolean; assumptionIds: string[];
};
export type DesignVersion = {
  id: string; revision: number; scenarioId: string; label: string; createdAt: string;
  inputRevision: number; aoiId: string; aoiRevision: number; program: RedevelopmentProgramInput;
  buildings: DesignBuilding[]; retainedObjectIds: string[]; exclusionConstraintIds: string[];
  assumptions: string[]; status: "draft" | "review_required";
};
/** Module-specific data stay bounded JSON; that module validates mathematics.
 * Foundation validates references, scope and persistence, not finance accuracy. */
export type DerivedArtifact<K extends Exclude<DevkitRefKind, "design"> = Exclude<DevkitRefKind, "design">> = {
  id: string; kind: K; revision: number; inputRevision: number; inputs: VersionRef[];
  createdAt: string; status: "draft" | "current" | "stale" | "blocked";
  methodVersion: string; assumptions: string[]; missingInputs: string[]; data: JsonObject;
};
export type AreaSchedule = DerivedArtifact<"areas">;
export type FinanceRun = DerivedArtifact<"finance">;
export type KitArtifact = DerivedArtifact<"kit">;
export type Procedure = {
  id: string; label: string; authority: string | null; sourceUrl: string | null; version: string | null;
  applicant: string | null; status: "hypothesis" | "draft" | "review_required"; missingInputs: string[];
};
export type Artifact = DerivedArtifact;
export type DevkitProject = {
  schemaVersion: 1; id: string; revision: number; inputRevision: number; createdAt: string; updatedAt: string;
  storageMode: "browser_local_on_this_device"; dataClass: "public_demo" | "synthetic_demo";
  brief: ProjectBrief; aoi: AOI | null; objects: SpatialObject[]; evidence: Evidence[]; claims: Claim[];
  constraints: Constraint[]; scenarios: Scenario[]; designVersions: DesignVersion[];
  activeDesignVersionId: string | null; derivedArtifacts: DerivedArtifact[]; procedures: Procedure[];
  caveat: typeof DEVKIT_CAVEAT;
};
export type Project = DevkitProject;
export type DevkitExport = { format: "GEOAI_DEVKIT_PROJECT"; schemaVersion: 1; exportedAt: string; project: DevkitProject };
export type DevkitStorage = Pick<Storage, "getItem" | "setItem">;
export type DevkitStoreFailure = "invalid_project" | "invalid_import" | "unsupported_version" | "storage_unavailable" | "store_damaged" | "conflict" | "capacity" | "scope_mismatch";
export type DevkitResult<T> = { ok: true; value: T; persistence: "browser_local_only" } | { ok: false; code: DevkitStoreFailure; message: string };

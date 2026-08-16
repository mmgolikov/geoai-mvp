#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const illustrativeLabel = "Illustrative local screening context";
const writeRequested = process.argv.includes("--write");
const nonDryRunRequested = process.argv.includes("--non-dry-run");
const dryRun = process.argv.includes("--dry-run") || !writeRequested || !nonDryRunRequested;
const strict = process.argv.includes("--strict") || process.env.GEOAI_SOURCE_READINESS_SYNC_STRICT?.trim().toLowerCase() === "true";
const generatedAt = new Date().toISOString();

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    throw new Error(
      `Unable to load ${relativePath}: ${errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")}`
    );
  }
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

const {
  SOURCE_PROVENANCE_CONTRACT_VERSION,
  deriveSourceConfidence,
  evaluateSourceReleaseGate
} = await loadTypeScriptModule("../src/lib/external-data/source-provenance-contract.ts");
const { validateSourceReleaseProvenance } = await loadTypeScriptModule(
  "../src/lib/external-data/source-provenance-invariants.ts"
);

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      __error: error instanceof Error ? error.message : "Invalid JSON"
    };
  }
}

function normalizeStatus(value, fallback = "manual_import_ready") {
  const key = String(value ?? fallback).trim().toLowerCase().replace(/-/g, "_");
  if (["connected", "snapshot_available", "sample_fallback", "manual_import_ready", "token_required", "permission_required", "planned", "unavailable"].includes(key)) {
    return key;
  }
  if (key === "connected_context_ready") return "connected";
  if (key === "planned_validation") return "planned";
  return fallback;
}

function modeFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "connected") return "api_context";
  if (normalized === "snapshot_available") return "imported_snapshot";
  if (normalized === "sample_fallback") return "sample_fallback";
  if (normalized === "manual_import_ready") return "manual_import_ready";
  if (normalized === "permission_required" || normalized === "token_required") return "permission_required";
  return "planned_validation";
}

function bestStatus(values, fallback) {
  const priority = {
    connected: 10,
    snapshot_available: 20,
    sample_fallback: 30,
    manual_import_ready: 40,
    token_required: 50,
    permission_required: 60,
    planned: 70,
    unavailable: 80
  };
  const statuses = values.map((value) => normalizeStatus(value, fallback));
  if (statuses.length === 0) return fallback;
  return statuses.sort((a, b) => priority[a] - priority[b])[0];
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)));
}

function countCollections(collections) {
  if (!Array.isArray(collections)) return null;
  return collections.reduce((total, item) => total + (typeof item.sceneCount === "number" ? item.sceneCount : 0), 0);
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validationStatusFor(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available") return "snapshot-not-live";
  if (normalized === "sample_fallback") return "sample-only";
  if (normalized === "manual_import_ready") return "manual-import-ready";
  if (normalized === "connected") return "api-context";
  if (normalized === "permission_required" || normalized === "token_required") return "token-or-permission-required";
  return "planned-validation";
}

function presentationLabelFor(status, dataMode = modeFromStatus(status), validationStatus = validationStatusFor(status)) {
  const rawValues = [status, dataMode, validationStatus]
    .map((value) => String(value ?? "").trim().toLowerCase().replace(/-/g, "_"));
  if (rawValues.some((value) => value === "sample_fallback" || value === "sample_only")) {
    return illustrativeLabel;
  }
  if (dataMode === "api_context") return "Bounded screening API context";
  if (dataMode === "imported_snapshot") return "Local snapshot screening context";
  if (dataMode === "manual_import_ready") return "Local source import awaiting validation";
  if (dataMode === "permission_required") return "Source access pending approval";
  return "Source validation pending";
}

function confidenceFor(status, hasRecords, fallback) {
  const normalized = normalizeStatus(status);
  if (normalized === "snapshot_available" || normalized === "connected") return "medium";
  if (normalized === "sample_fallback" && hasRecords) return "low";
  return fallback;
}

function newestDate(values) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function sourceQualityGroup({ sourceGroupId, sourceGroupName, status, dataMode, recordCount, featureCount, generatedAt: groupGeneratedAt, extractedAt, licenseNote, confidence, validationStatus, nextValidationStep, snapshots }) {
  const normalizedStatus = normalizeStatus(status);
  return {
    sourceGroupId,
    sourceGroupName,
    status: normalizedStatus,
    dataMode,
    recordCount,
    featureCount,
    generatedAt: groupGeneratedAt,
    extractedAt,
    licenseNote,
    confidence,
    validationStatus,
    presentationLabel: presentationLabelFor(normalizedStatus, dataMode, validationStatus),
    caveat,
    nextValidationStep,
    snapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      presentationLabel: presentationLabelFor(snapshot.status, snapshot.dataMode, snapshot.validationStatus)
    }))
  };
}

const manifest = readJson("data/external/normalized/external_data_manifest.json", { sources: [] });
const dldQuality = readJson("data/normalized/dld_source_quality.json", { categories: {}, totalRecords: null });
const osmQuality = readJson("data/normalized/osm_source_quality.json", { totalFeatures: null });
const overtureQuality = readJson("data/normalized/overture_source_quality.json", { totalFeatures: null });
const copernicusMetadata = readJson("data/external/samples/copernicus_sentinel_metadata_sample.json", { collections: [] });
const manifestSources = Array.isArray(manifest.sources) ? manifest.sources : [];
const byId = new Map(manifestSources.map((source) => [source.id, source]));

function sourceFiles(ids) {
  return unique(ids.flatMap((id) => byId.get(id)?.availableFiles ?? []));
}

function sourceStatuses(ids, fallback) {
  return ids.map((id) => byId.get(id)?.status).filter(Boolean).concat(fallback);
}

const dldNextValidationStep = "Confirm permitted DLD / Dubai Pulse files, extraction date, license terms and official/client validation source.";
const osmNextValidationStep = "Confirm extract date, ODbL attribution and compare against official/customer GIS before decisions.";
const overtureNextValidationStep = "Confirm Overture extract scope/license and reconcile buildings, places and transport against client/official evidence.";
const climateNextValidationStep = "Validate climate and energy assumptions with engineering/client-approved evidence before operational decisions.";
const copernicusNextValidationStep = "Add approved token/query pipeline and verify metadata/imagery lineage before analytics.";

const dldQualitySnapshots = Object.entries(dldQuality.categories ?? {}).map(([category, item]) => {
  const status = normalizeStatus(item.status, "manual_import_ready");
  const recordCount = numberOrNull(item.recordCount);
  return {
    sourceGroupId: "dld-dubai-pulse-public-real-estate",
    sourceGroupName: "DLD / Dubai Pulse public real estate snapshots",
    sourceId: item.sourceId ?? `dld-dubai-pulse-public-${category}`,
    sourceName: `DLD / Dubai Pulse public ${category} snapshot`,
    filePath: item.outputFile ?? null,
    inputFile: item.inputFile ?? null,
    availableFiles: unique([item.inputFile, item.outputFile]),
    recordCount,
    featureCount: null,
    generatedAt: dldQuality.generatedAt ?? null,
    extractedAt: null,
    licenseNote: "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(recordCount && recordCount > 0), "requires-validation"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: dldNextValidationStep,
    qualityNotes: Array.isArray(item.qualityNotes) ? item.qualityNotes : []
  };
});
const dldRecordCount = dldQualitySnapshots.reduce((sum, item) => sum + (item.recordCount ?? 0), 0);
const dldStatus = bestStatus(dldQualitySnapshots.map((item) => item.status), "sample_fallback");

const osmSourceIds = {
  roads: "osm-geofabrik-open-roads",
  buildings: "osm-geofabrik-open-buildings",
  pois: "osm-geofabrik-open-pois",
  landuse: "osm-geofabrik-baseline",
  transport: "osm-geofabrik-open-roads"
};
const osmQualitySnapshots = Object.entries(osmQuality.categories ?? {}).map(([category, item]) => {
  const status = normalizeStatus(osmQuality.status, "manual_import_ready");
  const featureCount = numberOrNull(item.featureCount);
  return {
    sourceGroupId: "osm-geofabrik-open-geospatial",
    sourceGroupName: "OSM / Geofabrik open geospatial baseline",
    sourceId: item.sourceId ?? osmSourceIds[category] ?? "osm-geofabrik-baseline",
    sourceName: `OSM / Geofabrik open ${category} snapshot`,
    filePath: item.outputFile ?? null,
    inputFile: osmQuality.inputFile ?? null,
    availableFiles: unique([osmQuality.inputFile, item.outputFile]),
    recordCount: featureCount,
    featureCount,
    generatedAt: osmQuality.generatedAt ?? null,
    extractedAt: null,
    licenseNote: "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(featureCount && featureCount > 0), "low"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: osmNextValidationStep,
    qualityNotes: []
  };
});
const osmFeatureCount = osmQualitySnapshots.reduce((sum, item) => sum + (item.featureCount ?? 0), 0);
const osmStatus = bestStatus(osmQualitySnapshots.map((item) => item.status), "sample_fallback");

const overtureSnapshots = [
  ["buildings", "overture-maps-open-buildings", "data/normalized/overture_buildings_snapshot.json"],
  ["places", "overture-maps-open-places", "data/normalized/overture_places_snapshot.json"],
  ["transportation", "overture-maps-open-transportation", "data/normalized/overture_transportation_snapshot.json"]
].map(([category, sourceId, filePath]) => {
  const snapshot = readJson(filePath, {});
  const status = normalizeStatus(snapshot.status ?? overtureQuality.status, "manual_import_ready");
  const featureCount = numberOrNull(snapshot.featureCount);
  return {
    sourceGroupId: "overture-maps-open-context",
    sourceGroupName: "Overture Maps buildings / places / transportation",
    sourceId,
    sourceName: `Overture Maps open ${category} snapshot`,
    filePath,
    inputFile: null,
    availableFiles: [filePath],
    recordCount: featureCount,
    featureCount,
    generatedAt: snapshot.generatedAt ?? overtureQuality.generatedAt ?? null,
    extractedAt: null,
    licenseNote: "Overture Maps public snapshot use requires Overture license and attribution review.",
    dataMode: modeFromStatus(status),
    status,
    confidence: confidenceFor(status, Boolean(featureCount && featureCount > 0), "low"),
    validationStatus: validationStatusFor(status),
    caveat,
    nextValidationStep: overtureNextValidationStep,
    qualityNotes: []
  };
});
const overtureFeatureCount = overtureSnapshots.reduce((sum, item) => sum + (item.featureCount ?? 0), 0);
const overtureStatus = bestStatus(overtureSnapshots.map((item) => item.status), normalizeStatus(overtureQuality.status, "manual_import_ready"));

const copernicusSceneCount = countCollections(copernicusMetadata.collections);
const copernicusStatus = normalizeStatus(copernicusMetadata.status, "sample_fallback");
const copernicusSnapshots = [{
  sourceGroupId: "copernicus-sentinel-metadata",
  sourceGroupName: "Copernicus / Sentinel metadata availability",
  sourceId: "copernicus-sentinel-metadata",
  sourceName: "Copernicus / Sentinel metadata availability",
  filePath: "data/external/samples/copernicus_sentinel_metadata_sample.json",
  inputFile: null,
  availableFiles: ["data/external/samples/copernicus_sentinel_metadata_sample.json"],
  recordCount: copernicusSceneCount,
  featureCount: null,
  generatedAt: copernicusMetadata.generatedAt ?? null,
  extractedAt: null,
  licenseNote: "Copernicus / Sentinel metadata and imagery use requires mission/product terms review and token/query lineage before analytics.",
  dataMode: modeFromStatus(copernicusStatus),
  status: copernicusStatus,
  confidence: confidenceFor(copernicusStatus, Boolean(copernicusSceneCount && copernicusSceneCount > 0), "requires-validation"),
  validationStatus: validationStatusFor(copernicusStatus),
  caveat,
  nextValidationStep: copernicusNextValidationStep,
  qualityNotes: [copernicusMetadata.limitation ?? "Metadata availability only; no imagery download or raster analytics connected."]
}];
const sourceQualityGeneratedAt = newestDate([
  ...dldQualitySnapshots.map((item) => item.generatedAt),
  ...osmQualitySnapshots.map((item) => item.generatedAt),
  ...overtureSnapshots.map((item) => item.generatedAt),
  ...copernicusSnapshots.map((item) => item.generatedAt)
]);

const sourceQualityManifest = {
  version: "1.3",
  generatedAt: sourceQualityGeneratedAt,
  mode: "local_normalized_snapshot_quality",
  source: "normalized_local_files",
  presentationLabel: illustrativeLabel,
  caveat,
  groups: [
    sourceQualityGroup({
      sourceGroupId: "dld-dubai-pulse-public-real-estate",
      sourceGroupName: "DLD / Dubai Pulse public real estate snapshots",
      status: dldStatus,
      dataMode: modeFromStatus(dldStatus),
      recordCount: dldRecordCount,
      featureCount: null,
      generatedAt: newestDate(dldQualitySnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(dldQualitySnapshots.map((item) => item.extractedAt)),
      licenseNote: "DLD / Dubai Pulse public/open snapshot terms, attribution and redistribution limits must be confirmed per file before external use.",
      confidence: confidenceFor(dldStatus, dldRecordCount > 0, "requires-validation"),
      validationStatus: validationStatusFor(dldStatus),
      nextValidationStep: dldNextValidationStep,
      snapshots: dldQualitySnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "osm-geofabrik-open-geospatial",
      sourceGroupName: "OSM / Geofabrik open geospatial baseline",
      status: osmStatus,
      dataMode: modeFromStatus(osmStatus),
      recordCount: osmFeatureCount,
      featureCount: osmFeatureCount,
      generatedAt: newestDate(osmQualitySnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(osmQualitySnapshots.map((item) => item.extractedAt)),
      licenseNote: "OSM / Geofabrik open geospatial context requires ODbL attribution, extract date tracking and compliance review.",
      confidence: confidenceFor(osmStatus, osmFeatureCount > 0, "low"),
      validationStatus: validationStatusFor(osmStatus),
      nextValidationStep: osmNextValidationStep,
      snapshots: osmQualitySnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "overture-maps-open-context",
      sourceGroupName: "Overture Maps buildings / places / transportation",
      status: overtureStatus,
      dataMode: modeFromStatus(overtureStatus),
      recordCount: overtureFeatureCount,
      featureCount: overtureFeatureCount,
      generatedAt: newestDate(overtureSnapshots.map((item) => item.generatedAt)),
      extractedAt: null,
      licenseNote: "Overture Maps public snapshot use requires Overture license and attribution review.",
      confidence: confidenceFor(overtureStatus, overtureFeatureCount > 0, "low"),
      validationStatus: validationStatusFor(overtureStatus),
      nextValidationStep: overtureNextValidationStep,
      snapshots: overtureSnapshots
    }),
    sourceQualityGroup({
      sourceGroupId: "open-meteo-nasa-power-context",
      sourceGroupName: "Open-Meteo + NASA POWER climate / energy context",
      status: "permission_required",
      dataMode: "permission_required",
      recordCount: null,
      featureCount: null,
      generatedAt: null,
      extractedAt: null,
      licenseNote: "Open-Meteo requires approved commercial access; NASA POWER Preview context requires citation and runtime receipt review.",
      confidence: "requires-validation",
      validationStatus: "token-or-permission-required",
      nextValidationStep: climateNextValidationStep,
      snapshots: [{
        sourceGroupId: "open-meteo-nasa-power-context",
        sourceGroupName: "Open-Meteo + NASA POWER climate / energy context",
        sourceId: "open-meteo-nasa-power-context",
        sourceName: "Open-Meteo + NASA POWER climate / energy context",
        filePath: null,
        inputFile: null,
        availableFiles: [],
        recordCount: null,
        featureCount: null,
        generatedAt: null,
        extractedAt: null,
        licenseNote: "Open-Meteo requires approved commercial access; NASA POWER Preview context requires citation and runtime receipt review.",
        dataMode: "permission_required",
        status: "permission_required",
        confidence: "requires-validation",
        validationStatus: "token-or-permission-required",
        caveat,
        nextValidationStep: climateNextValidationStep,
        qualityNotes: ["Static registry metadata is not runtime success; no engineering-grade climate or energy conclusion is provided."]
      }]
    }),
    sourceQualityGroup({
      sourceGroupId: "copernicus-sentinel-metadata",
      sourceGroupName: "Copernicus / Sentinel metadata availability",
      status: copernicusStatus,
      dataMode: modeFromStatus(copernicusStatus),
      recordCount: copernicusSceneCount,
      featureCount: null,
      generatedAt: newestDate(copernicusSnapshots.map((item) => item.generatedAt)),
      extractedAt: newestDate(copernicusSnapshots.map((item) => item.extractedAt)),
      licenseNote: "Copernicus / Sentinel metadata and imagery use requires mission/product terms review and token/query lineage before analytics.",
      confidence: confidenceFor(copernicusStatus, Boolean(copernicusSceneCount && copernicusSceneCount > 0), "requires-validation"),
      validationStatus: validationStatusFor(copernicusStatus),
      nextValidationStep: copernicusNextValidationStep,
      snapshots: copernicusSnapshots
    })
  ]
};
const sourceQualityByGroup = new Map(sourceQualityManifest.groups.map((group) => [group.sourceGroupId, group]));

const sourceOrigins = {
  "dld-dubai-pulse-public-real-estate": {
    originUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
    originHost: "dubailand.gov.ae",
    attributionNote: "Attribution and redistribution terms have not been approved for this local artifact."
  },
  "osm-geofabrik-open-geospatial": {
    originUrl: "https://download.geofabrik.de/asia/gcc-states.html",
    originHost: "download.geofabrik.de",
    attributionNote: "OpenStreetMap and Geofabrik attribution must be approved and attached before external use."
  },
  "overture-maps-open-context": {
    originUrl: "https://docs.overturemaps.org/getting-data/",
    originHost: "docs.overturemaps.org",
    attributionNote: "Overture attribution and downstream obligations must be approved and attached before external use."
  },
  "copernicus-sentinel-metadata": {
    originUrl: "https://dataspace.copernicus.eu/",
    originHost: "dataspace.copernicus.eu",
    attributionNote: "Copernicus product attribution and use terms must be approved before external use."
  }
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(Date.parse(value)).toISOString() === value ? value : null;
}

function mediaTypeFor(path) {
  if (path.endsWith(".geojson")) return "application/geo+json";
  if (path.endsWith(".csv")) return "text/csv";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

function observedCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { recordCount: null, featureCount: null, parsed: false };
  }
  if (Array.isArray(value.records)) return { recordCount: value.records.length, featureCount: null, parsed: true };
  if (Array.isArray(value.features)) return { recordCount: null, featureCount: value.features.length, parsed: true };
  if (Array.isArray(value.areas)) return { recordCount: value.areas.length, featureCount: null, parsed: true };
  if (Array.isArray(value.collections)) {
    return {
      recordCount: value.collections.reduce(
        (sum, item) => sum + (typeof item?.sceneCount === "number" && Number.isSafeInteger(item.sceneCount) && item.sceneCount >= 0 ? item.sceneCount : 0),
        0
      ),
      featureCount: null,
      parsed: true
    };
  }
  return {
    recordCount: numberOrNull(value.recordCount),
    featureCount: numberOrNull(value.featureCount),
    parsed: numberOrNull(value.recordCount) !== null || numberOrNull(value.featureCount) !== null
  };
}

function provenanceDataMode(snapshot) {
  if (snapshot.status === "sample_fallback") return "sample_fallback";
  if (snapshot.status !== "snapshot_available") return "metadata_only";
  if (snapshot.sourceGroupId === "osm-geofabrik-open-geospatial" || snapshot.sourceGroupId === "overture-maps-open-context") {
    return "open_snapshot";
  }
  return "local_snapshot";
}

function buildProvenanceRelease(snapshot) {
  const origin = sourceOrigins[snapshot.sourceGroupId];
  if (!origin || !snapshot.filePath || !existsSync(snapshot.filePath)) return null;

  const bytes = readFileSync(snapshot.filePath);
  let artifact = null;
  try {
    artifact = JSON.parse(bytes.toString("utf8"));
  } catch {
    artifact = null;
  }
  const counts = observedCounts(artifact);
  const declaredCount = snapshot.featureCount ?? snapshot.recordCount;
  const observedCount = counts.featureCount ?? counts.recordCount;
  const countMatches = declaredCount === null || observedCount === null || declaredCount === observedCount;
  const contentSha256 = sha256(bytes);
  const dataMode = provenanceDataMode(snapshot);
  const releaseGeneratedAt = canonicalTimestamp(artifact?.generatedAt ?? snapshot.generatedAt);
  const blockers = unique([
    "Reusable rights and attribution review is not recorded for this artifact.",
    "Immutable custody receipt is not recorded for this artifact.",
    "Source extraction timestamp is not recorded for this artifact.",
    dataMode === "sample_fallback" ? "Repository artifact is limited to screening context." : null,
    !counts.parsed ? "Observed record or feature count could not be derived from the artifact." : null,
    !countMatches ? "Declared record or feature count does not match artifact content." : null
  ]);
  const dimensions = {
    sourceIdentity: "partial",
    artifactIntegrity: "verified",
    temporalLineage: releaseGeneratedAt ? "partial" : "unverified",
    rights: "unverified",
    schema: typeof artifact?.version === "string" ? "partial" : "unverified",
    content: counts.parsed && countMatches ? "verified" : counts.parsed ? "partial" : "unverified",
    custody: "unverified"
  };
  const rights = {
    status: "unreviewed",
    licenseId: null,
    licenseUrl: null,
    licenseNote: snapshot.licenseNote,
    attributionNote: origin.attributionNote,
    reviewedAt: null,
    permittedUses: [],
    prohibitedUses: ["source-backed decision scoring", "external publication", "official validation claim"]
  };
  const freshness = {
    status: "unknown",
    referenceTimestamp: null,
    evaluatedAt: null,
    maximumAgeDays: null,
    ageDays: null,
    policyId: null
  };
  const custodyReceipt = {
    status: "not_recorded",
    receiptId: null,
    receiptSha256: null,
    recordedAt: null,
    repository: null
  };
  const validationStatus = "unverified";
  const confidence = deriveSourceConfidence({
    dataMode,
    rights,
    validationStatus,
    freshness,
    custodyReceipt,
    dimensions
  });
  const release = {
    contractVersion: SOURCE_PROVENANCE_CONTRACT_VERSION,
    releaseId: `${snapshot.sourceId}.${contentSha256.slice(0, 16)}`,
    releaseVersion: typeof artifact?.version === "string" ? artifact.version : contentSha256.slice(0, 16),
    schemaVersion: typeof artifact?.version === "string" ? `geoai-normalized-${artifact.version}` : "unversioned",
    sourceGroupId: snapshot.sourceGroupId,
    sourceGroupName: snapshot.sourceGroupName,
    sourceId: snapshot.sourceId,
    sourceName: snapshot.sourceName,
    originUrl: origin.originUrl,
    originHost: origin.originHost,
    artifact: {
      path: snapshot.filePath,
      mediaType: mediaTypeFor(snapshot.filePath),
      contentSha256,
      sourceUriSha256: null,
      schemaSha256: null,
      byteCount: bytes.byteLength,
      recordCount: counts.recordCount,
      featureCount: counts.featureCount
    },
    generatedAt: releaseGeneratedAt,
    extractedAt: null,
    publishedAt: null,
    rights,
    dataMode,
    confidence,
    validationStatus,
    caveat,
    nextValidationStep: snapshot.nextValidationStep,
    blockers,
    freshness,
    custodyReceipt
  };
  const validation = validateSourceReleaseProvenance(release);
  return {
    release,
    valid: validation.valid,
    violations: validation.violations,
    gate: evaluateSourceReleaseGate(release, validation.valid)
  };
}

function buildProvenanceGroup(group) {
  const releases = group.snapshots.map(buildProvenanceRelease).filter(Boolean);
  const validReleaseCount = releases.filter((entry) => entry.valid).length;
  const screeningReleaseCount = releases.filter((entry) => entry.gate.screeningContextAvailable).length;
  const decisionEligibleReleaseCount = releases.filter((entry) => entry.gate.decisionUse === "allowed").length;
  return {
    sourceGroupId: group.sourceGroupId,
    sourceGroupName: group.sourceGroupName,
    generatedAt: newestDate(releases.map((entry) => entry.release.generatedAt)),
    releaseCount: releases.length,
    validReleaseCount,
    screeningReleaseCount,
    decisionEligibleReleaseCount,
    qualityState: decisionEligibleReleaseCount > 0
      ? "validated_snapshot"
      : screeningReleaseCount > 0
        ? "screening_context"
        : releases.length > 0
          ? "blocked"
          : "no_release",
    confidence: releases.some((entry) => entry.release.confidence.level === "high")
      ? "high"
      : releases.some((entry) => entry.release.confidence.level === "medium")
        ? "medium"
        : releases.some((entry) => entry.release.confidence.level === "low")
          ? "low"
          : "insufficient",
    evidence: {
      hashesComplete: releases.length > 0 && releases.every((entry) => /^[0-9a-f]{64}$/.test(entry.release.artifact.contentSha256)),
      countsComplete: releases.length > 0 && releases.every((entry) => entry.release.artifact.recordCount !== null || entry.release.artifact.featureCount !== null),
      rightsComplete: releases.length > 0 && releases.every((entry) => entry.release.rights.status === "approved"),
      custodyComplete: releases.length > 0 && releases.every((entry) => entry.release.custodyReceipt.status === "immutable_receipt_recorded")
    },
    blockers: unique([
      ...releases.flatMap((entry) => [
        ...entry.gate.blockers,
        ...entry.violations.map((violation) => `${violation.path}: ${violation.message}`)
      ]),
      releases.length === 0 ? "No local normalized artifact is recorded for this source group." : null
    ]),
    nextValidationStep: group.nextValidationStep,
    caveat,
    releases
  };
}

const sourceProvenanceManifest = {
  contractVersion: SOURCE_PROVENANCE_CONTRACT_VERSION,
  mode: "strict_local_provenance",
  source: "repository_normalized_files",
  presentationLabel: illustrativeLabel,
  generatedAt: sourceQualityGeneratedAt,
  caveat,
  groups: sourceQualityManifest.groups.map(buildProvenanceGroup)
};
const sourceProvenanceByGroup = new Map(
  sourceProvenanceManifest.groups.map((group) => [group.sourceGroupId, group])
);

const sourceGroups = [
  {
    source_id: "dld-dubai-pulse-public-real-estate",
    source_name: "DLD / Dubai Pulse public real estate snapshots",
    category: "real-estate",
    access_mode: "manual-snapshot",
    sourceIds: [
      "dld-dubai-pulse-transactions",
      "dld-dubai-pulse-public-transactions",
      "dld-dubai-pulse-public-rents",
      "dld-dubai-pulse-public-projects",
      "dld-dubai-pulse-public-valuations",
      "dld-dubai-pulse-public-land",
      "dld-dubai-pulse-public-building",
      "dld-dubai-pulse-public-unit",
      "dld-dubai-pulse-public-brokers",
      "dld-dubai-pulse-public-developers"
    ],
    connection_status: bestStatus(Object.values(dldQuality.categories ?? {}).map((item) => item.status), "sample_fallback"),
    record_count: typeof dldQuality.totalRecords === "number" ? dldQuality.totalRecords : null,
    normalized_path: "data/normalized/dld_source_quality.json",
    files: unique([
      "data/normalized/dld_source_quality.json",
      "data/normalized/dld_market_summary.json",
      ...Object.values(dldQuality.categories ?? {}).map((item) => item.outputFile),
      ...sourceFiles(["dld-dubai-pulse-public-transactions"])
    ]),
    confidence: "requires-validation",
    nextValidationStep: dldNextValidationStep
  },
  {
    source_id: "osm-geofabrik-open-geospatial",
    source_name: "OSM / Geofabrik open geospatial baseline",
    category: "open-geospatial",
    access_mode: "open-snapshot",
    sourceIds: ["osm-geofabrik-baseline", "osm-geofabrik-open-roads", "osm-geofabrik-open-pois", "osm-geofabrik-open-buildings"],
    connection_status: bestStatus(sourceStatuses(["osm-geofabrik-baseline", "osm-geofabrik-open-roads", "osm-geofabrik-open-pois", "osm-geofabrik-open-buildings"], osmQuality.status), "sample_fallback"),
    record_count: typeof osmQuality.totalFeatures === "number" ? osmQuality.totalFeatures : null,
    normalized_path: "data/normalized/osm_source_quality.json",
    files: unique(["data/normalized/osm_source_quality.json", ...Object.values(osmQuality.categories ?? {}).map((item) => item.outputFile)]),
    confidence: "low",
    nextValidationStep: osmNextValidationStep
  },
  {
    source_id: "overture-maps-open-context",
    source_name: "Overture Maps buildings / places / transportation",
    category: "open-geospatial",
    access_mode: "public-download",
    sourceIds: ["overture-maps-open-buildings", "overture-maps-open-places", "overture-maps-open-transportation"],
    connection_status: normalizeStatus(overtureQuality.status, "manual_import_ready"),
    record_count: typeof overtureQuality.totalFeatures === "number" ? overtureQuality.totalFeatures : null,
    normalized_path: "data/normalized/overture_source_quality.json",
    files: unique([
      "data/normalized/overture_source_quality.json",
      "data/normalized/overture_buildings_snapshot.json",
      "data/normalized/overture_places_snapshot.json",
      "data/normalized/overture_transportation_snapshot.json"
    ]),
    confidence: "low",
    nextValidationStep: overtureNextValidationStep
  },
  {
    source_id: "open-meteo-nasa-power-context",
    source_name: "Open-Meteo + NASA POWER climate / energy context",
    category: "climate-energy",
    access_mode: "api-context",
    sourceIds: ["open-meteo-climate", "nasa-power-solar-energy"],
    connection_status: bestStatus(sourceStatuses(["open-meteo-climate", "nasa-power-solar-energy"], "permission_required"), "permission_required"),
    record_count: null,
    normalized_path: null,
    files: [],
    confidence: "requires-validation",
    nextValidationStep: climateNextValidationStep
  },
  {
    source_id: "copernicus-sentinel-metadata",
    source_name: "Copernicus / Sentinel metadata availability",
    category: "satellite-metadata",
    access_mode: "token-optional",
    sourceIds: ["copernicus-sentinel-metadata", "copernicus-sentinel-catalog"],
    connection_status: normalizeStatus(copernicusMetadata.status, "sample_fallback"),
    record_count: countCollections(copernicusMetadata.collections),
    normalized_path: "data/external/samples/copernicus_sentinel_metadata_sample.json",
    files: ["data/external/samples/copernicus_sentinel_metadata_sample.json"],
    confidence: "requires-validation",
    nextValidationStep: copernicusNextValidationStep
  }
].map((group) => {
  const sourceQuality = sourceQualityByGroup.get(group.source_id);
  const sourceProvenance = sourceProvenanceByGroup.get(group.source_id);
  const files = group.files.filter((path) => existsSync(path));
  const evidenceAllowsDecision = Boolean(sourceProvenance?.decisionEligibleReleaseCount);
  const requestedStatus = normalizeStatus(group.connection_status);
  const connectionStatus =
    (requestedStatus === "snapshot_available" || requestedStatus === "connected") && !evidenceAllowsDecision
      ? "manual_import_ready"
      : requestedStatus;
  const sourceMode = !evidenceAllowsDecision && (requestedStatus === "snapshot_available" || requestedStatus === "connected")
    ? "planned_validation"
    : modeFromStatus(connectionStatus);
  const confidence = sourceProvenance?.confidence === "insufficient"
    ? "requires-validation"
    : sourceProvenance?.confidence ?? group.confidence;
  const validationStatus = sourceQuality?.validationStatus ?? validationStatusFor(connectionStatus);
  const presentationLabel = presentationLabelFor(connectionStatus, sourceMode, validationStatus);

  return {
    ...group,
    normalized_path: group.normalized_path && existsSync(group.normalized_path) ? group.normalized_path : null,
    files,
    record_count: sourceProvenance?.evidence.countsComplete ? group.record_count : null,
    connection_status: connectionStatus,
    source_mode: sourceMode,
    validation_status: validationStatus,
    presentation_label: presentationLabel,
    data_quality_tier: confidence,
    caveat,
    sourceQuality,
    sourceProvenance,
    quality: {
      confidence,
      validationStatus,
      presentationLabel,
      recordCount: sourceProvenance?.evidence.countsComplete ? group.record_count : null,
      generatedAt: sourceQuality?.generatedAt ?? null,
      sourceQuality,
      sourceProvenance
    },
    lineage: {
      sourceIds: group.sourceIds,
      availableFiles: files,
      nextValidationStep: group.nextValidationStep,
      caveat,
      validationStatus,
      presentationLabel,
      sourceQuality,
      sourceProvenance
    }
  };
});

function toSourceRow(group) {
  return {
    project_key: null,
    source_id: group.source_id,
    source_name: group.source_name,
    category: group.category,
    access_mode: group.access_mode,
    connection_status: group.connection_status,
    source_mode: group.source_mode,
    data_quality_tier: group.data_quality_tier,
    record_count: group.record_count,
    date_range: null,
    quality: group.quality,
    lineage: group.lineage,
    caveat: group.caveat,
    updated_at: generatedAt
  };
}

function toExternalSnapshotRow(group) {
  return {
    project_key: null,
    source_id: group.source_id,
    category: group.category,
    source_mode: group.source_mode,
    raw_file_name: group.files[0] ?? null,
    normalized_path: group.normalized_path,
    record_count: group.record_count,
    quality: group.quality,
    manifest: {
      sourceName: group.source_name,
      sourceIds: group.sourceIds,
      availableFiles: group.files,
      sourceQuality: group.sourceQuality,
      sourceProvenance: group.sourceProvenance,
      nextValidationStep: group.nextValidationStep,
      caveat
    },
    imported_at: generatedAt,
    updated_at: generatedAt
  };
}

async function upsertBySourceId(client, table, sourceId, payload) {
  const existing = await client
    .from(table)
    .select("id")
    .eq("source_id", sourceId)
    .is("project_key", null)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw new Error(`${table} lookup failed for ${sourceId}: ${existing.error.message}`);
  if (existing.data?.id) {
    const update = await client.from(table).update(payload).eq("id", existing.data.id);
    if (update.error) throw new Error(`${table} update failed for ${sourceId}: ${update.error.message}`);
    return "updated";
  }

  const insert = await client.from(table).insert(payload);
  if (insert.error) throw new Error(`${table} insert failed for ${sourceId}: ${insert.error.message}`);
  return "inserted";
}

async function main() {
  const url = process.env.GEOAI_OPERATOR_SUPABASE_URL?.trim();
  const operatorSecretKey = process.env.GEOAI_OPERATOR_SUPABASE_SECRET_KEY?.trim();
  const legacyDatabaseWriterQuarantined = true;
  const sourceRows = sourceGroups.map(toSourceRow);
  const externalRows = sourceGroups.map(toExternalSnapshotRow);
  const canWrite =
    writeRequested &&
    nonDryRunRequested &&
    !dryRun &&
    Boolean(url && operatorSecretKey) &&
    !legacyDatabaseWriterQuarantined;

  if (!canWrite) {
    const blockers = [
      !writeRequested ? "Pass --write to request a database write; without it this command is dry-run only." : null,
      !nonDryRunRequested ? "Pass --non-dry-run together with --write to leave dry-run mode." : null,
      legacyDatabaseWriterQuarantined ? "Legacy mutable source-snapshot writes are quarantined until SOURCE-01 immutable custody and rights gates are implemented." : null,
      !url || !operatorSecretKey ? "Trusted operator Supabase URL/secret are required for writes." : null
    ].filter(Boolean);

    console.log(JSON.stringify({
      ok: Boolean(dryRun || !strict),
      synced: false,
      mode: dryRun ? "dry_run" : writeRequested ? "write_quarantined_source_01" : "preview_write_flag_required",
      writeRequested,
      nonDryRunRequested,
      preparedAt: generatedAt,
      generatedAt: sourceQualityGeneratedAt,
      sourceRegistryRows: sourceRows.length,
      externalSnapshotRows: externalRows.length,
      sourceQuality: sourceQualityManifest,
      sourceProvenance: sourceProvenanceManifest,
      sources: sourceRows.map((row) => ({
        sourceId: row.source_id,
        sourceName: row.source_name,
        status: row.connection_status,
        sourceMode: row.source_mode,
        validationStatus: row.quality.validationStatus,
        presentationLabel: row.quality.presentationLabel,
        recordCount: row.record_count,
        confidence: row.data_quality_tier,
        qualityState: row.quality.sourceProvenance?.qualityState,
        decisionUse: row.quality.sourceProvenance?.decisionEligibleReleaseCount > 0 ? "allowed" : "blocked",
        evidence: row.quality.sourceProvenance?.evidence,
        blockers: row.quality.sourceProvenance?.blockers ?? [],
        caveat: row.caveat,
        nextValidationStep: row.lineage.nextValidationStep
      })),
      sourceRegistryPreview: sourceRows.map((row) => ({
        source_id: row.source_id,
        source_name: row.source_name,
        category: row.category,
        access_mode: row.access_mode,
        connection_status: row.connection_status,
        source_mode: row.source_mode,
        validation_status: row.quality.validationStatus,
        presentation_label: row.quality.presentationLabel,
        data_quality_tier: row.data_quality_tier,
        record_count: row.record_count,
        quality: row.quality,
        lineage: row.lineage,
        caveat: row.caveat
      })),
      externalSnapshotPreview: externalRows.map((row) => ({
        source_id: row.source_id,
        category: row.category,
        source_mode: row.source_mode,
        raw_file_name: row.raw_file_name,
        normalized_path: row.normalized_path,
        record_count: row.record_count,
        quality: row.quality,
        manifest: row.manifest
      })),
      blockers,
      caveat
    }, null, 2));
    process.exit(writeRequested && nonDryRunRequested && strict ? 1 : 0);
  }

  const client = createClient(url, operatorSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const results = [];
  for (const row of sourceRows) {
    results.push({
      table: "source_registry_snapshots",
      sourceId: row.source_id,
      action: await upsertBySourceId(client, "source_registry_snapshots", row.source_id, row)
    });
  }
  for (const row of externalRows) {
    results.push({
      table: "external_data_snapshots",
      sourceId: row.source_id,
      action: await upsertBySourceId(client, "external_data_snapshots", row.source_id, row)
    });
  }

  console.log(JSON.stringify({
    ok: true,
    synced: true,
    sourceRegistryRows: sourceRows.length,
    externalSnapshotRows: externalRows.length,
    results,
    caveat
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    synced: false,
    error: error instanceof Error ? error.message : "Unknown sync failure.",
    caveat
  }, null, 2));
  process.exit(1);
});

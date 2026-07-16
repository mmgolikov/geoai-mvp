import type { EvidenceItem } from "@/src/types/data-source";
import type { ExpressAnalysis, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { UploadedCsvRow, UploadedDataContext, UploadedDataset, UploadedMetricMatch } from "@/src/types/uploaded-data";
import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";

export const uploadedDatasetStorageKey = browserDemoStorageKey("uploaded-datasets-v1");
export const maxUploadedFileSizeBytes = 5 * 1024 * 1024;
export const maxUploadedCsvRecords = 10_000;
export const maxUploadedCsvColumns = 128;
export const maxUploadedGeojsonFeatures = 2_500;
export const maxUploadedGeojsonCoordinatePairs = 100_000;
export const maxBrowserUploadedDatasetsPerProject = 24;

const maxUploadedCsvCellCharacters = 16_384;
const maxUploadedFeaturePropertyBytes = 32 * 1024;
const maxUploadedFeaturePropertyDepth = 8;
const allowedUploadedGeometryTypes = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon"
]);

const nameColumns = ["name", "area_name", "site_name"];
const recommendedColumns = [
  "latitude",
  "longitude",
  "area_name",
  "transaction_count",
  "median_price_per_sqm",
  "pipeline_status",
  "confidence"
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalCoordinate(value: string | undefined, label: "latitude" | "longitude", rowNumber: number) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return undefined;

  const parsed = parseNumber(normalized);
  const minimum = label === "latitude" ? -90 : -180;
  const maximum = label === "latitude" ? 90 : 180;
  if (parsed === undefined || parsed < minimum || parsed > maximum) {
    throw new Error(`CSV row ${rowNumber} has an invalid WGS84 ${label}.`);
  }
  return parsed;
}

function isValidWgs84Pair(latitude: unknown, longitude: unknown) {
  return typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsvRows(text: string) {
  if (new TextEncoder().encode(text).byteLength > maxUploadedFileSizeBytes) {
    throw new Error(`CSV exceeds the ${maxUploadedFileSizeBytes}-byte file limit.`);
  }

  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  let quotedFieldClosed = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      if (char === "\"") {
        quoted = false;
        quotedFieldClosed = true;
        continue;
      }
      current += char;
      if (current.length > maxUploadedCsvCellCharacters) {
        throw new Error(`CSV cell exceeds the ${maxUploadedCsvCellCharacters}-character limit.`);
      }
      continue;
    }

    if (quotedFieldClosed && char !== "," && char !== "\n" && char !== "\r" && char !== " " && char !== "\t") {
      throw new Error("CSV contains characters after a closing quote.");
    }

    if (char === "\"") {
      if (current.trim().length > 0 || quotedFieldClosed) {
        throw new Error("CSV contains an unexpected quote.");
      }
      current = "";
      quoted = true;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
      quotedFieldClosed = false;
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current.trim());
      current = "";
      quotedFieldClosed = false;
      if (row.length > maxUploadedCsvColumns) {
        throw new Error(`CSV exceeds the ${maxUploadedCsvColumns}-column limit.`);
      }
      if (row.some(Boolean)) {
        rows.push(row);
        if (rows.length > maxUploadedCsvRecords + 1) {
          throw new Error(`CSV exceeds the ${maxUploadedCsvRecords}-record limit.`);
        }
      }
      row = [];
      continue;
    }

    if (quotedFieldClosed) {
      continue;
    }

    current += char;
    if (current.length > maxUploadedCsvCellCharacters) {
      throw new Error(`CSV cell exceeds the ${maxUploadedCsvCellCharacters}-character limit.`);
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field.");
  }

  row.push(current.trim());
  if (row.length > maxUploadedCsvColumns) {
    throw new Error(`CSV exceeds the ${maxUploadedCsvColumns}-column limit.`);
  }
  if (row.some(Boolean)) {
    rows.push(row);
    if (rows.length > maxUploadedCsvRecords + 1) {
      throw new Error(`CSV exceeds the ${maxUploadedCsvRecords}-record limit.`);
    }
  }

  return rows;
}

export function parseUploadedCsv(text: string): { columns: string[]; rows: UploadedCsvRow[]; notes: string } {
  const parsedRows = parseCsvRows(text);
  const header = parsedRows[0]?.map(normalizeKey) ?? [];
  const hasNameColumn = nameColumns.some((column) => header.includes(column));

  if (header.length === 0 || header.some((column) => !column)) {
    throw new Error("CSV headers must be non-empty after normalization.");
  }
  if (new Set(header).size !== header.length) {
    throw new Error("CSV headers must be unique after normalization.");
  }
  if (!hasNameColumn) {
    throw new Error("CSV must include one of: name, area_name, site_name.");
  }
  if (parsedRows.length < 2) {
    throw new Error("CSV must contain at least one non-empty data row after the header.");
  }

  const latitudeColumns = ["latitude", "lat"].filter((column) => header.includes(column));
  const longitudeColumns = ["longitude", "lng", "lon"].filter((column) => header.includes(column));
  if (latitudeColumns.length > 1 || longitudeColumns.length > 1) {
    throw new Error("CSV must use only one latitude column and one longitude column.");
  }

  const rows = parsedRows.slice(1).map((values, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (values.length > header.length) {
      throw new Error(`CSV row ${rowNumber} has more fields than the header.`);
    }
    const raw = header.reduce<Record<string, string>>((accumulator, column, index) => {
      accumulator[column] = values[index] ?? "";
      return accumulator;
    }, {});
    const name = raw.name || raw.area_name || raw.site_name || "Unnamed site";
    const latitude = parseOptionalCoordinate(raw[latitudeColumns[0]], "latitude", rowNumber);
    const longitude = parseOptionalCoordinate(raw[longitudeColumns[0]], "longitude", rowNumber);
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new Error(`CSV row ${rowNumber} must provide latitude and longitude together.`);
    }
    const metrics = Object.fromEntries(
      Object.entries(raw)
        .filter(([key]) => !["name", "site_name", "area_name", "latitude", "lat", "longitude", "lng", "lon"].includes(key))
        .map(([key, value]) => [key, parseNumber(value) ?? value])
    );

    return {
      name,
      latitude,
      longitude,
      areaName: raw.area_name,
      metrics,
      raw
    };
  });

  const missingRecommended = recommendedColumns.filter((column) => !header.includes(column));
  const notes = missingRecommended.length
    ? `Parsed locally. Recommended fields missing: ${missingRecommended.slice(0, 4).join(", ")}${missingRecommended.length > 4 ? "..." : ""}.`
    : "Parsed locally with recommended screening fields available.";

  return { columns: header, rows, notes };
}

function isFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as GeoJSON.FeatureCollection).type === "FeatureCollection" &&
    Array.isArray((value as GeoJSON.FeatureCollection).features)
  );
}

function validateFeatureProperties(properties: GeoJSON.GeoJsonProperties) {
  const serialized = JSON.stringify(properties ?? {});
  if (new TextEncoder().encode(serialized).byteLength > maxUploadedFeaturePropertyBytes) {
    throw new Error(`GeoJSON feature properties exceed the ${maxUploadedFeaturePropertyBytes}-byte limit.`);
  }

  const stack: Array<{ value: unknown; depth: number }> = [{ value: properties ?? {}, depth: 0 }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.value === null || typeof current.value !== "object") continue;
    if (current.depth >= maxUploadedFeaturePropertyDepth) {
      throw new Error(`GeoJSON feature properties exceed the depth limit of ${maxUploadedFeaturePropertyDepth}.`);
    }
    const children = Array.isArray(current.value) ? current.value : Object.values(current.value as Record<string, unknown>);
    if (children.length > 256) {
      throw new Error("GeoJSON feature properties contain too many nested values.");
    }
    children.forEach((value) => stack.push({ value, depth: current.depth + 1 }));
  }
}

function validatePosition(value: unknown): number {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3 || value.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
    throw new Error("GeoJSON positions must contain two or three finite numeric coordinates.");
  }
  const [longitude, latitude] = value;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error("GeoJSON coordinates must be finite WGS84 longitude/latitude pairs.");
  }
  return 1;
}

function sumCoordinateCounts(values: unknown[], validator: (value: unknown) => number) {
  let count = 0;
  for (const value of values) {
    count += validator(value);
    if (count > maxUploadedGeojsonCoordinatePairs) {
      throw new Error(`GeoJSON exceeds the ${maxUploadedGeojsonCoordinatePairs}-coordinate-pair limit.`);
    }
  }
  return count;
}

function validateCoordinateArray(value: unknown, minimumLength: number, label: string, validator: (item: unknown) => number) {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new Error(`GeoJSON ${label} has invalid coordinate cardinality.`);
  }
  return sumCoordinateCounts(value, validator);
}

function validateLineStringCoordinates(value: unknown) {
  return validateCoordinateArray(value, 2, "LineString", validatePosition);
}

function validateLinearRing(value: unknown) {
  const count = validateCoordinateArray(value, 4, "Polygon ring", validatePosition);
  const ring = value as number[][];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error("GeoJSON Polygon rings must be closed.");
  }
  return count;
}

function validatePolygonCoordinates(value: unknown) {
  return validateCoordinateArray(value, 1, "Polygon", validateLinearRing);
}

function validateFeatureGeometry(geometry: GeoJSON.Geometry) {
  if (!allowedUploadedGeometryTypes.has(geometry.type)) {
    throw new Error(`GeoJSON geometry type ${geometry.type} is not supported.`);
  }

  const coordinates = (geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates;
  if (geometry.type === "Point") return validatePosition(coordinates);
  if (geometry.type === "MultiPoint") return validateCoordinateArray(coordinates, 1, "MultiPoint", validatePosition);
  if (geometry.type === "LineString") return validateLineStringCoordinates(coordinates);
  if (geometry.type === "MultiLineString") return validateCoordinateArray(coordinates, 1, "MultiLineString", validateLineStringCoordinates);
  if (geometry.type === "Polygon") return validatePolygonCoordinates(coordinates);
  if (geometry.type === "MultiPolygon") return validateCoordinateArray(coordinates, 1, "MultiPolygon", validatePolygonCoordinates);
  throw new Error(`GeoJSON geometry type ${geometry.type} is not supported.`);
}

function sanitizeFeature(feature: GeoJSON.Feature, datasetId: string, datasetName: string, index: number): GeoJSON.Feature {
  const properties = {
    ...(feature.properties ?? {}),
    id: String(feature.id ?? `${datasetId}-feature-${index}`),
    name: String(feature.properties?.name ?? feature.properties?.site_name ?? feature.properties?.area_name ?? `${datasetName} feature ${index + 1}`),
    uploadedDatasetId: datasetId,
    uploadedDatasetName: datasetName,
    uploadedFeatureKind: "user-uploaded",
    sourceMode: "user-uploaded",
    confidenceLevel: "user-provided",
    officialStatus: "official-validation-required",
    fillColor: "#6b7fd7",
    strokeColor: "#3447a5",
    clickPriority: 82,
    layerOrder: 82
  };

  return {
    type: "Feature",
    id: properties.id,
    properties,
    geometry: feature.geometry
  };
}

export function parseUploadedGeojson(text: string, datasetId: string, datasetName: string) {
  if (new TextEncoder().encode(text).byteLength > maxUploadedFileSizeBytes) {
    throw new Error(`GeoJSON exceeds the ${maxUploadedFileSizeBytes}-byte file limit.`);
  }
  const parsed = JSON.parse(text) as unknown;

  if (!isFeatureCollection(parsed)) {
    throw new Error("GeoJSON must be a FeatureCollection.");
  }

  if (parsed.features.length > maxUploadedGeojsonFeatures) {
    throw new Error(`GeoJSON exceeds the ${maxUploadedGeojsonFeatures}-feature limit.`);
  }

  let coordinatePairs = 0;
  parsed.features.forEach((feature) => {
    if (!feature.geometry) return;
    validateFeatureProperties(feature.properties);
    coordinatePairs += validateFeatureGeometry(feature.geometry);
    if (coordinatePairs > maxUploadedGeojsonCoordinatePairs) {
      throw new Error(`GeoJSON exceeds the ${maxUploadedGeojsonCoordinatePairs}-coordinate-pair limit.`);
    }
  });

  const features = parsed.features
    .filter((feature) => feature.geometry)
    .map((feature, index) => sanitizeFeature(feature, datasetId, datasetName, index));

  if (features.length === 0) {
    throw new Error("GeoJSON contains no usable features.");
  }

  return {
    type: "FeatureCollection",
    features
  } satisfies GeoJSON.FeatureCollection;
}

export function createUploadedDatasetId(fileName: string) {
  return `upload-${slugify(fileName.replace(/\.[^.]+$/, ""))}-${globalThis.crypto.randomUUID()}`;
}

export function createInvalidUploadedDataset(fileName: string, message: string, projectKey: string): UploadedDataset {
  return {
    id: createUploadedDatasetId(fileName),
    projectKey,
    name: fileName,
    type: fileName.toLowerCase().endsWith(".csv") ? "csv" : "geojson",
    status: "invalid",
    sourceMode: "user-uploaded",
    uploadedAt: new Date().toISOString(),
    confidence: "unknown",
    officialStatus: "official-validation-required",
    notes: message
  };
}

export function createUploadedCsvDataset(fileName: string, text: string, projectKey: string): UploadedDataset {
  const parsed = parseUploadedCsv(text);

  return {
    id: createUploadedDatasetId(fileName),
    projectKey,
    name: fileName,
    type: "csv",
    status: "parsed",
    sourceMode: "user-uploaded",
    uploadedAt: new Date().toISOString(),
    rowCount: parsed.rows.length,
    columns: parsed.columns,
    confidence: "user-provided",
    officialStatus: "official-validation-required",
    notes: parsed.notes,
    rows: parsed.rows
  };
}

export function createUploadedGeojsonDataset(fileName: string, text: string, projectKey: string): UploadedDataset {
  const id = createUploadedDatasetId(fileName);
  const geojson = parseUploadedGeojson(text, id, fileName);

  return {
    id,
    projectKey,
    name: fileName,
    type: "geojson",
    status: "parsed",
    sourceMode: "user-uploaded",
    uploadedAt: new Date().toISOString(),
    featureCount: geojson.features.length,
    confidence: "user-provided",
    officialStatus: "official-validation-required",
    notes: "Rendered locally as a user-uploaded spatial layer. Geometry requires validation before production use.",
    visible: true,
    geojson
  };
}

export function readBrowserUploadedDatasets() {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return [] as UploadedDataset[];

  try {
    const stored = window.localStorage.getItem(uploadedDatasetStorageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];

    const validated = parsed.flatMap((item): UploadedDataset[] => {
      if (typeof item !== "object" || item === null) return [];
      const dataset = item as Partial<UploadedDataset>;
      const hasValidBase = typeof dataset.id === "string" &&
        typeof dataset.projectKey === "string" &&
        dataset.projectKey.length > 0 &&
        typeof dataset.name === "string" &&
        (dataset.type === "csv" || dataset.type === "geojson") &&
        (dataset.status === "parsed" || dataset.status === "invalid" || dataset.status === "uploaded-local");
      if (!hasValidBase) return [];
      const validDataset = dataset as UploadedDataset;

      if (validDataset.type === "geojson" && validDataset.status === "parsed") {
        try {
          const geojson = parseUploadedGeojson(JSON.stringify(validDataset.geojson), validDataset.id, validDataset.name);
          return [{ ...validDataset, geojson, featureCount: geojson.features.length }];
        } catch {
          return [{
            ...validDataset,
            status: "invalid",
            confidence: "unknown",
            visible: false,
            featureCount: undefined,
            geojson: undefined,
            notes: "Stored GeoJSON was quarantined because it failed the current geometry and size validation rules."
          }];
        }
      }

      return [validDataset];
    });
    return limitUploadedDatasetsPerProject(validated);
  } catch {
    return [];
  }
}

export function limitUploadedDatasetsPerProject(
  items: UploadedDataset[],
  maximumPerProject = maxBrowserUploadedDatasetsPerProject
) {
  const counts = new Map<string, number>();
  const identities = new Set<string>();
  return items.filter((item) => {
    const identity = `${item.projectKey}\u0000${item.id}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    const count = counts.get(item.projectKey) ?? 0;
    if (count >= maximumPerProject) return false;
    counts.set(item.projectKey, count + 1);
    return true;
  });
}

export function writeBrowserUploadedDatasets(items: UploadedDataset[]) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return;
  try {
    window.localStorage.setItem(uploadedDatasetStorageKey, JSON.stringify(limitUploadedDatasetsPerProject(items)));
  } catch {
    // Parsing remains usable in memory when browser quota/storage is unavailable.
  }
}

function distanceKm(a: SelectedPoint, b: SelectedPoint) {
  const earthRadiusKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function metricLabel(row: UploadedCsvRow) {
  const entries = Object.entries(row.metrics).filter(([, value]) => String(value).trim().length > 0).slice(0, 3);
  return entries.length ? entries.map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`).join("; ") : "No numeric metrics provided.";
}

export function buildUploadedDataContext(
  datasets: UploadedDataset[],
  selectedPoint: SelectedPoint,
  selectedObject?: SelectedDemoObject | null
): UploadedDataContext {
  const parsedDatasets = datasets.filter((dataset) => dataset.status === "parsed");
  const appliedMetrics: UploadedMetricMatch[] = [];
  const availableButNotApplied: UploadedMetricMatch[] = [];
  const selectedObjectName = normalizeText(selectedObject?.name);
  const selectedLayerName = normalizeText(selectedObject?.layerName);

  parsedDatasets
    .filter((dataset) => dataset.type === "csv" && dataset.rows?.length)
    .forEach((dataset) => {
      const rows = dataset.rows ?? [];
      const objectMatch = rows.find((row) => {
        const rowName = normalizeText(row.name);
        const rowArea = normalizeText(row.areaName);
        return Boolean(selectedObjectName && (rowName.includes(selectedObjectName) || selectedObjectName.includes(rowName) || rowArea.includes(selectedLayerName)));
      });

      if (objectMatch) {
        appliedMetrics.push({
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowName: objectMatch.name,
          matchType: "selected-object",
          confidence: "high",
          note: `Matched uploaded CSV row to selected object context. ${metricLabel(objectMatch)}`,
          row: objectMatch
        });
        return;
      }

      const coordinateRows = rows.filter((row) => isValidWgs84Pair(row.latitude, row.longitude));
      const nearest = coordinateRows
        .map((row) => ({
          row,
          distanceKm: distanceKm(selectedPoint, {
            latitude: row.latitude as number,
            longitude: row.longitude as number
          })
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];

      if (nearest && nearest.distanceKm <= 4) {
        appliedMetrics.push({
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowName: nearest.row.name,
          matchType: "nearest-coordinate",
          confidence: nearest.distanceKm <= 1.5 ? "high" : "medium",
          distanceKm: nearest.distanceKm,
          note: `Nearest uploaded CSV row is ${nearest.distanceKm.toFixed(1)} km from the selected point. ${metricLabel(nearest.row)}`,
          row: nearest.row
        });
        return;
      }

      availableButNotApplied.push({
        datasetId: dataset.id,
        datasetName: dataset.name,
        rowName: rows[0]?.name ?? "Uploaded CSV",
        matchType: "available-not-applied",
        confidence: "low",
        note: "Uploaded CSV is available in the workspace but was not confidently matched to the current selection."
      });
    });

  return {
    uploadedDatasets: parsedDatasets,
    appliedMetrics,
    availableButNotApplied,
    visibleGeojsonLayers: parsedDatasets.filter((dataset) => dataset.type === "geojson" && dataset.visible !== false),
    selectedPoint,
    selectedObject
  };
}

function uploadedEvidenceItem(dataset: UploadedDataset, suffix: string, description: string, confidence: EvidenceItem["confidence"]): EvidenceItem {
  return {
    id: `uploaded-${dataset.id}-${suffix}`,
    label: `Uploaded dataset: ${dataset.name}`,
    description,
    sourceId: `uploaded-local:${dataset.id}`,
    sourceStatus: "mock",
    sourceType: "customer",
    confidence
  };
}

export function withUploadedDataContext(analysis: ExpressAnalysis, context: UploadedDataContext): ExpressAnalysis {
  if (context.uploadedDatasets.length === 0) {
    return analysis;
  }

  const appliedNotes = context.appliedMetrics.map((match) => match.note);
  const visibleGeojsonNotes = context.visibleGeojsonLayers.map((dataset) => `${dataset.name} is visible as a local user-uploaded spatial layer with ${dataset.featureCount ?? 0} feature(s).`);
  const availableNotes = context.availableButNotApplied.slice(0, 2).map((match) => match.note);
  const evidence = [
    ...context.appliedMetrics.map((match) => {
      const dataset = context.uploadedDatasets.find((item) => item.id === match.datasetId);
      return dataset
        ? uploadedEvidenceItem(dataset, "metrics", `${match.note} User-provided data is Local/API fallback and requires validation.`, match.confidence === "high" ? "medium" : "low")
        : null;
    }),
    ...context.visibleGeojsonLayers.map((dataset) =>
      uploadedEvidenceItem(dataset, "geojson", `${dataset.notes ?? "User-uploaded GeoJSON is displayed locally."} Not official unless externally validated.`, "low")
    )
  ].filter((item): item is EvidenceItem => Boolean(item));

  const limitations = [
    ...(analysis.limitations ?? []),
    "Uploaded datasets are stored locally in the browser and are treated as user-provided context, not official evidence, until validated."
  ];

  return {
    ...analysis,
    summary: appliedNotes[0]
      ? `${analysis.summary} User-uploaded metrics were matched to the selection and are treated as supplemental, validation-required context.`
      : analysis.summary,
    keyFactors: [
      ...appliedNotes,
      ...visibleGeojsonNotes,
      ...analysis.keyFactors
    ],
    opportunities: appliedNotes.length
      ? [
          "Use matched uploaded metrics to sharpen site screening assumptions before requesting official validation.",
          ...analysis.opportunities
        ]
      : analysis.opportunities,
    risks: [
      ...availableNotes,
      ...analysis.risks
    ],
    nextActions: [
      ...analysis.nextActions,
      "Validate any uploaded CSV or GeoJSON against official source lineage before using it in a client memo or investment committee pack."
    ],
    limitations,
    evidence: [
      ...evidence.filter((next) => !analysis.evidence.some((item) => item.id === next.id)),
      ...analysis.evidence
    ],
    uploadedDataContext: context
  };
}

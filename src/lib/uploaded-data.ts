import type { EvidenceItem } from "@/src/types/data-source";
import type { ExpressAnalysis, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { UploadedCsvRow, UploadedDataContext, UploadedDataset, UploadedMetricMatch } from "@/src/types/uploaded-data";

export const uploadedDatasetStorageKey = "geoai-uploaded-datasets-v1";
export const maxUploadedFileSizeBytes = 5 * 1024 * 1024;

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

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current.trim());
      current = "";
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

export function parseUploadedCsv(text: string): { columns: string[]; rows: UploadedCsvRow[]; notes: string } {
  const parsedRows = parseCsvRows(text);
  const header = parsedRows[0]?.map(normalizeKey) ?? [];
  const hasNameColumn = nameColumns.some((column) => header.includes(column));

  if (header.length === 0 || !hasNameColumn) {
    throw new Error("CSV must include one of: name, area_name, site_name.");
  }

  const rows = parsedRows.slice(1).map((values) => {
    const raw = header.reduce<Record<string, string>>((accumulator, column, index) => {
      accumulator[column] = values[index] ?? "";
      return accumulator;
    }, {});
    const name = raw.name || raw.area_name || raw.site_name || "Unnamed site";
    const latitude = parseNumber(raw.latitude ?? raw.lat);
    const longitude = parseNumber(raw.longitude ?? raw.lng ?? raw.lon);
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
  const parsed = JSON.parse(text) as unknown;

  if (!isFeatureCollection(parsed)) {
    throw new Error("GeoJSON must be a FeatureCollection.");
  }

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
  return `upload-${slugify(fileName.replace(/\.[^.]+$/, ""))}-${Date.now()}`;
}

export function createInvalidUploadedDataset(fileName: string, message: string): UploadedDataset {
  return {
    id: createUploadedDatasetId(fileName),
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

export function createUploadedCsvDataset(fileName: string, text: string): UploadedDataset {
  const parsed = parseUploadedCsv(text);

  return {
    id: createUploadedDatasetId(fileName),
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

export function createUploadedGeojsonDataset(fileName: string, text: string): UploadedDataset {
  const id = createUploadedDatasetId(fileName);
  const geojson = parseUploadedGeojson(text, id, fileName);

  return {
    id,
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

      const coordinateRows = rows.filter((row) => row.latitude !== undefined && row.longitude !== undefined);
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
        ? uploadedEvidenceItem(dataset, "metrics", `${match.note} User-provided data is local-only and requires validation.`, match.confidence === "high" ? "medium" : "low")
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

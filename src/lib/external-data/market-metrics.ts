import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listImportedMarketMetrics } from "@/src/lib/market-metrics";
import type { SourceDataMode } from "@/src/lib/external-data/source-modes";

export type RealMarketAreaMetric = {
  areaName: string;
  transactionCount: number;
  avgPricePerSqft: number | null;
  medianPricePerSqft: number | null;
  totalValueAED: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  confidence: string;
};

export type ExternalMarketMetricsResponse = {
  sourceMode: SourceDataMode;
  source: {
    id: string;
    name: string;
    status: string;
    sourceType: string;
    disclaimer: string;
  };
  count: number;
  areas: unknown[];
  availableAreaNames: string[];
  fallbackUsed: boolean;
  message: string;
  caveat: string;
  quality?: {
    lastUpdated?: string | null;
    dateRange?: string | null;
    warnings: string[];
  };
};

const realMetricsPath = join(process.cwd(), "data/external/normalized/market_area_metrics.real.json");
const dldSnapshotPath = join(process.cwd(), "data/normalized/dld_market_snapshot.json");
const requiredCaveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function sourceModeFromSnapshot(parsed: { source?: { status?: string }; areas?: Array<{ sourceFile?: string; sourceDate?: string }> }): SourceDataMode {
  const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  if (areas.length === 0) return "sample_fallback";

  const sourceStatus = String(parsed.source?.status ?? "").toLowerCase();
  const sourceFiles = areas.map((area) => area.sourceFile ?? "").join(" ");
  const sampleDerived = sourceStatus.includes("sample") || sourceFiles.includes("_sample") || sourceFiles.includes("/samples/");

  return sampleDerived ? "sample_fallback" : "imported_snapshot";
}

export function readExternalMarketMetrics(): ExternalMarketMetricsResponse {
  if (existsSync(dldSnapshotPath)) {
    try {
      const parsed = JSON.parse(readFileSync(dldSnapshotPath, "utf8")) as {
        source?: ExternalMarketMetricsResponse["source"];
        areas?: Array<{ areaName?: string; sourceFile?: string; sourceDate?: string }>;
        generatedAt?: string;
        quality?: { notes?: string[] };
      };
      const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
      const sourceMode = sourceModeFromSnapshot(parsed);

      return {
        sourceMode,
        source: parsed.source ?? {
          id: "dld-dubai-pulse-transactions",
          name: "DLD / Dubai Pulse market snapshot",
          status: "snapshot_available",
          sourceType: "official-open-data",
          disclaimer: "DLD / Dubai Pulse snapshot context; not a live official transactional feed."
        },
        count: areas.length,
        areas,
        availableAreaNames: areas.map((area) => typeof area === "object" && area !== null && "areaName" in area ? String(area.areaName) : "Unknown area"),
        fallbackUsed: sourceMode === "sample_fallback",
        message: sourceMode === "sample_fallback"
          ? "Using bundled DLD / Dubai Pulse-style sample snapshot records. Manual import is ready; this is not live official data."
          : "Using imported DLD / Dubai Pulse market snapshot. This is not a live official transactional feed.",
        caveat: requiredCaveat,
        quality: {
          lastUpdated: parsed.generatedAt ?? null,
          dateRange: areas.map((area) => area.sourceDate).filter(Boolean).join(" to ") || null,
          warnings: parsed.quality?.notes ?? (sourceMode === "sample_fallback" ? ["Bundled sample fallback records are active."] : [])
        }
      };
    } catch {
      // Fall through to legacy real snapshot or sample fallback if the v1.4 snapshot is malformed.
    }
  }

  if (existsSync(realMetricsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(realMetricsPath, "utf8")) as {
        source?: ExternalMarketMetricsResponse["source"];
        areas?: RealMarketAreaMetric[];
      };
      const areas = Array.isArray(parsed.areas) ? parsed.areas : [];

      return {
        sourceMode: "real_snapshot",
        source: parsed.source ?? {
          id: "dld-dubai-pulse-transactions",
          name: "DLD / Dubai Pulse transactions",
          status: "snapshot_available",
          sourceType: "official-open-data",
          disclaimer: "Open official dataset snapshot; not a live official transactional feed."
        },
        count: areas.length,
        areas,
        availableAreaNames: areas.map((area) => area.areaName),
        fallbackUsed: false,
        message: "Using DLD / Dubai Pulse open dataset snapshot. This is not a live official transactional feed.",
        caveat: requiredCaveat,
        quality: {
          lastUpdated: null,
          dateRange: null,
          warnings: []
        }
      };
    } catch {
      // Fall through to sample fallback if the snapshot is malformed.
    }
  }

  const sampleMetrics = listImportedMarketMetrics();

  return {
    sourceMode: "sample_fallback",
    source: {
      id: "sample-market-area-metrics",
      name: "GeoAI sample market metrics fallback",
      status: "sample_fallback",
      sourceType: "demo-normalized",
      disclaimer: "Sample/manual offline imports only; no live official DLD or Dubai Pulse integration is connected."
    },
    count: sampleMetrics.length,
    areas: sampleMetrics,
    availableAreaNames: sampleMetrics.map((metric) => metric.areaName),
    fallbackUsed: true,
    message: "Real DLD / Dubai Pulse snapshot not found. Existing sample market metrics fallback is active.",
    caveat: requiredCaveat,
    quality: {
      lastUpdated: null,
      dateRange: null,
      warnings: ["Sample fallback only; manual snapshot import required for client/official validation."]
    }
  };
}

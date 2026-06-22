import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dldSnapshotStatic from "@/data/normalized/dld_market_snapshot.json";
import type { MarketAreaAggregate } from "@/src/types/market-ingestion";
import type { MarketContextConfidence } from "@/src/types/market-context";

type DldSnapshotArea = {
  areaName: string;
  sourceAreaName?: string;
  transactionCount?: number;
  medianPriceIndex?: number;
  priceIndex?: number;
  rentalDemandIndex?: number;
  liquidityIndex?: number;
  developmentPipelineIndex?: number;
  riskIndex?: number;
  trend?: "rising" | "stable" | "cooling";
  confidence?: MarketContextConfidence | string;
  sourceDate?: string;
  limitations?: string[];
};

type DldSnapshot = {
  generatedAt?: string;
  areas?: DldSnapshotArea[];
};

const snapshotPath = join(process.cwd(), "data/normalized/dld_market_snapshot.json");

function normalizeAreaName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clampIndex(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

function confidence(value: unknown): MarketContextConfidence {
  return value === "high" || value === "medium" || value === "low" || value === "demo" ? value : "medium";
}

export function readDldMarketSnapshot(): DldSnapshot | null {
  if (!existsSync(snapshotPath)) {
    return Array.isArray((dldSnapshotStatic as DldSnapshot).areas)
      ? dldSnapshotStatic as DldSnapshot
      : null;
  }

  try {
    const parsed = JSON.parse(readFileSync(snapshotPath, "utf8")) as DldSnapshot;
    return Array.isArray(parsed.areas) ? parsed : null;
  } catch {
    return null;
  }
}

export function findDldMarketSnapshotForArea(areaName: string): MarketAreaAggregate | null {
  const snapshot = readDldMarketSnapshot();
  if (!snapshot) return null;

  const normalized = normalizeAreaName(areaName);
  const area = snapshot.areas?.find((item) => normalizeAreaName(item.areaName) === normalized);
  if (!area) return null;

  const priceIndex = clampIndex(area.medianPriceIndex ?? area.priceIndex, 60);
  const transactionCount = Math.max(0, Number(area.transactionCount ?? 0));

  return {
    areaName: area.areaName,
    normalizedAreaName: normalizeAreaName(area.areaName),
    sourceMode: "dld_dubai_pulse_snapshot",
    recordCount: transactionCount,
    activityIndex: priceIndex,
    rentalDemandIndex: clampIndex(area.rentalDemandIndex, 55),
    liquidityIndex: clampIndex(area.liquidityIndex, transactionCount > 150 ? 78 : 62),
    developmentPipelineIndex: clampIndex(area.developmentPipelineIndex, 58),
    riskIndex: clampIndex(area.riskIndex, 58),
    trend: area.trend ?? "stable",
    confidence: confidence(area.confidence),
    sourceIds: ["dld-dubai-pulse-transactions"],
    dataQualityNotes: [
      `DLD / Dubai Pulse snapshot matched ${area.sourceAreaName ?? area.areaName}; not a live feed.`,
      ...(area.limitations ?? [])
    ]
  };
}

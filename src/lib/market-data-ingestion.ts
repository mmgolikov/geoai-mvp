import {
  dubaiMarketSeedRecords,
  dubaiMarketSeedSource
} from "@/src/data/market-seed/dubai-market-seed";
import type {
  DataQualityIssue,
  MarketAreaAggregate,
  MarketDataImportResult,
  NormalizedMarketRecord,
  RawMarketRecord
} from "@/src/types/market-ingestion";
import type { MarketContextConfidence } from "@/src/types/market-context";

const confidenceRank: Record<MarketContextConfidence, number> = {
  demo: 0,
  low: 1,
  medium: 2,
  high: 3
};

function clampIndex(value: unknown, fallback: number, issues: DataQualityIssue[], record: RawMarketRecord, field: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    issues.push({
      recordId: record.id,
      areaName: record.areaName,
      field,
      severity: "warning",
      message: `${field} missing or invalid; fallback ${fallback} used.`
    });
    return fallback;
  }

  if (value < 0 || value > 100) {
    issues.push({
      recordId: record.id,
      areaName: record.areaName,
      field,
      severity: "warning",
      message: `${field} was outside 0-100 and has been clamped.`
    });
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeAreaName(areaName: string) {
  return areaName
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeMarketRecord(record: RawMarketRecord): {
  record: NormalizedMarketRecord | null;
  issues: DataQualityIssue[];
} {
  const issues: DataQualityIssue[] = [];

  if (!record.id || !record.areaName) {
    return {
      record: null,
      issues: [
        {
          recordId: record.id,
          areaName: record.areaName,
          severity: "error",
          message: "Record id and areaName are required."
        }
      ]
    };
  }

  const normalized: NormalizedMarketRecord = {
    id: record.id,
    areaName: record.areaName.trim(),
    normalizedAreaName: normalizeAreaName(record.areaName),
    sourceId: record.sourceId || "synthetic-demo-layers",
    sourceMode: record.sourceMode || "seed_static",
    activityIndex: clampIndex(record.activityIndex, 50, issues, record, "activityIndex"),
    rentalDemandIndex: clampIndex(record.rentalDemandIndex, 50, issues, record, "rentalDemandIndex"),
    liquidityIndex: clampIndex(record.liquidityIndex, 50, issues, record, "liquidityIndex"),
    developmentPipelineIndex: clampIndex(
      record.developmentPipelineIndex,
      50,
      issues,
      record,
      "developmentPipelineIndex"
    ),
    riskIndex: clampIndex(record.riskIndex, 50, issues, record, "riskIndex"),
    trend: record.trend ?? "stable",
    confidence: record.confidence ?? "demo",
    note: record.note ?? "Seed/demo-normalized market context.",
    updatedAt: record.updatedAt ?? "Not provided"
  };

  return { record: normalized, issues };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function mostCommonTrend(records: NormalizedMarketRecord[]) {
  const counts = records.reduce<Record<NormalizedMarketRecord["trend"], number>>(
    (current, record) => {
      current[record.trend] += 1;
      return current;
    },
    { rising: 0, stable: 0, cooling: 0 }
  );

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as NormalizedMarketRecord["trend"];
}

function strongestConfidence(records: NormalizedMarketRecord[]) {
  return records.reduce<MarketContextConfidence>((current, record) => {
    return confidenceRank[record.confidence] > confidenceRank[current] ? record.confidence : current;
  }, "demo");
}

export function aggregateMarketRecords(records: NormalizedMarketRecord[]) {
  const grouped = records.reduce<Record<string, NormalizedMarketRecord[]>>((current, record) => {
    current[record.normalizedAreaName] = current[record.normalizedAreaName] ?? [];
    current[record.normalizedAreaName].push(record);
    return current;
  }, {});

  return Object.values(grouped).map<MarketAreaAggregate>((areaRecords) => {
    const firstRecord = areaRecords[0];

    return {
      areaName: firstRecord.areaName,
      normalizedAreaName: firstRecord.normalizedAreaName,
      sourceMode: "seed_static",
      recordCount: areaRecords.length,
      activityIndex: average(areaRecords.map((record) => record.activityIndex)),
      rentalDemandIndex: average(areaRecords.map((record) => record.rentalDemandIndex)),
      liquidityIndex: average(areaRecords.map((record) => record.liquidityIndex)),
      developmentPipelineIndex: average(areaRecords.map((record) => record.developmentPipelineIndex)),
      riskIndex: average(areaRecords.map((record) => record.riskIndex)),
      trend: mostCommonTrend(areaRecords),
      confidence: strongestConfidence(areaRecords),
      sourceIds: Array.from(new Set(areaRecords.map((record) => record.sourceId))),
      dataQualityNotes: [
        `Aggregated from ${areaRecords.length} seed_static record(s).`,
        "Current values are demo-normalized indices, not official market data."
      ]
    };
  });
}

export function importSeedMarketData(): MarketDataImportResult {
  const normalizedRecords: NormalizedMarketRecord[] = [];
  const issues: DataQualityIssue[] = [];

  for (const rawRecord of dubaiMarketSeedRecords) {
    const result = normalizeMarketRecord(rawRecord);
    issues.push(...result.issues);

    if (result.record) {
      normalizedRecords.push(result.record);
    }
  }

  return {
    source: dubaiMarketSeedSource,
    records: normalizedRecords,
    issues
  };
}

export function getSeedMarketAggregates() {
  return aggregateMarketRecords(importSeedMarketData().records);
}

export function getMarketAggregateForArea(areaName: string) {
  const normalizedAreaName = normalizeAreaName(areaName);
  return getSeedMarketAggregates().find((aggregate) => aggregate.normalizedAreaName === normalizedAreaName) ?? null;
}

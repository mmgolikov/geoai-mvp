import type {
  IngestionConfidence,
  MarketAreaMetric,
  NormalizedProject,
  NormalizedRentRecord,
  NormalizedTransaction
} from "@/src/lib/ingestion/types";

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : Math.round(sorted[middle]);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeIndex(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / max) * 100));
}

function sampleAwareConfidence(transactionCount: number): IngestionConfidence {
  if (transactionCount < 5) {
    return "low";
  }

  if (transactionCount <= 20) {
    return "medium";
  }

  return "high";
}

function capSmallSampleIndex(value: number, count: number, cap: number) {
  return count < 5 ? Math.min(value, cap) : value;
}

function confidenceForArea(records: Array<{ confidence: IngestionConfidence }>): IngestionConfidence {
  const high = records.filter((record) => record.confidence === "high").length;
  const low = records.filter((record) => record.confidence === "low").length;

  if (low > records.length / 2) {
    return "low";
  }

  return high >= records.length / 2 ? "high" : "medium";
}

export function createMarketAreaMetrics(
  transactions: NormalizedTransaction[],
  rents: NormalizedRentRecord[],
  projects: NormalizedProject[]
): MarketAreaMetric[] {
  const areaNames = new Set<string>();
  transactions.forEach((item) => item.areaName && areaNames.add(item.areaName));
  rents.forEach((item) => item.areaName && areaNames.add(item.areaName));
  projects.forEach((item) => item.areaName && areaNames.add(item.areaName));

  const maxTransactionCount = Math.max(1, ...Array.from(areaNames).map((areaName) => transactions.filter((item) => item.areaName === areaName).length));
  const maxRentalCount = Math.max(1, ...Array.from(areaNames).map((areaName) => rents.filter((item) => item.areaName === areaName).length));
  const maxProjectCount = Math.max(1, ...Array.from(areaNames).map((areaName) => projects.filter((item) => item.areaName === areaName).length));

  return Array.from(areaNames).sort().map((areaName) => {
    const areaTransactions = transactions.filter((item) => item.areaName === areaName);
    const areaRents = rents.filter((item) => item.areaName === areaName);
    const areaProjects = projects.filter((item) => item.areaName === areaName);
    const pricePerSqm = areaTransactions.map((item) => item.pricePerSqm).filter((value): value is number => value !== null);
    const rentPerSqm = areaRents.map((item) => item.rentPerSqm).filter((value): value is number => value !== null);
    const allDates = [
      ...areaTransactions.map((item) => item.transactionDate),
      ...areaRents.map((item) => item.contractStartDate)
    ].filter((value): value is string => value !== null).sort();

    const rawLiquidityIndex = normalizeIndex(areaTransactions.length, maxTransactionCount);
    const rawRentalDemandProxy = normalizeIndex(areaRents.length, maxRentalCount);
    const liquidityIndex = capSmallSampleIndex(rawLiquidityIndex, areaTransactions.length, 55);
    const rentalDemandProxy = capSmallSampleIndex(rawRentalDemandProxy, areaRents.length, 58);
    const dataConfidence = sampleAwareConfidence(areaTransactions.length);

    return {
      areaName,
      periodStart: allDates[0] ?? null,
      periodEnd: allDates[allDates.length - 1] ?? null,
      transactionCount: areaTransactions.length,
      transactionValueAed: areaTransactions.reduce((sum, item) => sum + (item.amountAed ?? 0), 0),
      medianPricePerSqm: median(pricePerSqm),
      averagePricePerSqm: average(pricePerSqm),
      rentalRecordCount: areaRents.length,
      medianRentPerSqm: median(rentPerSqm),
      projectCount: areaProjects.length,
      pipelineProxy: normalizeIndex(areaProjects.length, maxProjectCount),
      liquidityIndex,
      rentalDemandProxy,
      dataConfidence,
      sourceSummary: areaTransactions.length < 5
        ? "Derived from a tiny synthetic sample CSV fixture; liquidity and demand proxies are capped and require official DLD / Dubai Pulse validation."
        : `Derived from synthetic sample CSV fixtures for DLD / Dubai Pulse ingestion prototype. Record confidence: ${confidenceForArea([...areaTransactions, ...areaRents, ...areaProjects])}.`
    };
  });
}

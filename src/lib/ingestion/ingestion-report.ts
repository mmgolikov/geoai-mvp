import { countMissingFields } from "@/src/lib/ingestion/validators";
import type {
  DatasetValidationSummary,
  IngestionConfidence,
  IngestionReport,
  IngestionWarning
} from "@/src/lib/ingestion/types";

export function summarizeDataset(records: Record<string, unknown>[], requiredFields: string[], warningRows: number): DatasetValidationSummary {
  const confidenceDistribution: Record<IngestionConfidence, number> = {
    high: 0,
    medium: 0,
    low: 0
  };

  records.forEach((record) => {
    const confidence = record.confidence as IngestionConfidence | undefined;
    if (confidence) {
      confidenceDistribution[confidence] += 1;
    }
  });

  return {
    totalRows: records.length,
    validRows: records.filter((record) => record.confidence !== "low").length,
    skippedRows: 0,
    warningRows,
    missingRequiredFieldCounts: countMissingFields(requiredFields, records),
    confidenceDistribution
  };
}

export function createIngestionReport(input: {
  transactionCount: number;
  rentCount: number;
  projectCount: number;
  marketMetricCount: number;
  warnings: IngestionWarning[];
  supabaseMode: IngestionReport["supabaseMode"];
  outputs: string[];
  transactions: Record<string, unknown>[];
  rents: Record<string, unknown>[];
  projects: Record<string, unknown>[];
}): IngestionReport {
  return {
    generatedAt: new Date().toISOString(),
    sourceMode: "sample_fixture",
    liveApiConnected: false,
    supabaseMode: input.supabaseMode,
    outputs: input.outputs,
    datasets: {
      transactions: summarizeDataset(input.transactions, ["transactionDate", "areaName", "amountAed", "propertyType"], input.warnings.filter((item) => item.dataset === "transactions").length),
      rents: summarizeDataset(input.rents, ["contractStartDate", "areaName", "annualRentAed", "propertyType"], input.warnings.filter((item) => item.dataset === "rents").length),
      projects: summarizeDataset(input.projects, ["projectName", "areaName", "projectStatus"], input.warnings.filter((item) => item.dataset === "projects").length)
    },
    marketMetricCount: input.marketMetricCount,
    warnings: input.warnings,
    notes: [
      "Sample fixtures are synthetic parser tests, not official DLD or Dubai Pulse records.",
      "No live API calls, scraping, credentials, geometry enrichment, or decision-grade validation are performed in v0.1.",
      "Imported metrics are available for validation workflow and conservative matched scoring."
    ]
  };
}

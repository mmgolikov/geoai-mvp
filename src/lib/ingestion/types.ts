export type CsvRow = Record<string, string>;

export type IngestionDatasetFamily = "transactions" | "rents" | "projects";

export type IngestionConfidence = "high" | "medium" | "low";

export type NormalizedTransaction = {
  id: string;
  source: "sample_fixture" | "imported_official_csv";
  sourceDataset: string;
  transactionDate: string | null;
  transactionType: string | null;
  areaName: string | null;
  projectName: string | null;
  masterProjectName: string | null;
  propertyType: string | null;
  propertySubType: string | null;
  propertyUsage: string | null;
  amountAed: number | null;
  sizeSqm: number | null;
  pricePerSqm: number | null;
  rooms: string | null;
  freehold: boolean | null;
  latitude: number | null;
  longitude: number | null;
  confidence: IngestionConfidence;
  raw: CsvRow;
};

export type NormalizedRentRecord = {
  id: string;
  source: "sample_fixture" | "imported_official_csv";
  sourceDataset: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  areaName: string | null;
  propertyType: string | null;
  propertySubType: string | null;
  annualRentAed: number | null;
  sizeSqm: number | null;
  rentPerSqm: number | null;
  rooms: string | null;
  confidence: IngestionConfidence;
  raw: CsvRow;
};

export type NormalizedProject = {
  id: string;
  source: "sample_fixture" | "imported_official_csv";
  sourceDataset: string;
  projectName: string | null;
  developerName: string | null;
  areaName: string | null;
  projectStatus: string | null;
  completionDate: string | null;
  projectType: string | null;
  units: number | null;
  confidence: IngestionConfidence;
  raw: CsvRow;
};

export type MarketAreaMetric = {
  areaName: string;
  periodStart: string | null;
  periodEnd: string | null;
  transactionCount: number;
  transactionValueAed: number;
  medianPricePerSqm: number | null;
  averagePricePerSqm: number | null;
  rentalRecordCount: number;
  medianRentPerSqm: number | null;
  projectCount: number;
  pipelineProxy: number;
  liquidityIndex: number;
  rentalDemandProxy: number;
  dataConfidence: IngestionConfidence;
  sourceSummary: string;
};

export type IngestionWarning = {
  dataset: IngestionDatasetFamily;
  rowNumber?: number;
  field?: string;
  message: string;
};

export type DatasetValidationSummary = {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  warningRows: number;
  missingRequiredFieldCounts: Record<string, number>;
  confidenceDistribution: Record<IngestionConfidence, number>;
};

export type IngestionReport = {
  generatedAt: string;
  sourceMode: "sample_fixture" | "imported_official_csv";
  liveApiConnected: false;
  supabaseMode: "not_configured" | "configured_attempted" | "write_failed" | "write_succeeded";
  outputs: string[];
  datasets: Record<IngestionDatasetFamily, DatasetValidationSummary>;
  marketMetricCount: number;
  warnings: IngestionWarning[];
  notes: string[];
};

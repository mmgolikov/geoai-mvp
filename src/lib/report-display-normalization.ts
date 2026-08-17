import type {
  AnalysisReportDeliverable,
  ComparisonReportDeliverable
} from "@/src/lib/report-deliverables";
import type { SourceLineageSnapshot } from "@/src/lib/project-workspace-types";

const canonicalCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const scenarioLabels: Record<string, string> = {
  investmentSiteSelection: "Investment Site Selection",
  realEstateDevelopment: "Real Estate Development",
  constructionMonitoring: "Construction Monitoring",
  infrastructureUrbanPlanning: "Infrastructure Planning",
  climateRisk: "Climate Risk Screening",
  customQuery: "Custom Query Analysis"
};

const projectScenarioLabels: Record<string, string> = {
  "dubai-investment-screening-demo": "Investment Site Selection",
  "developer-land-pipeline-demo": "Real Estate Development",
  "bank-asset-review-demo": "Asset Portfolio Intelligence",
  "home-buyer-neighborhood-demo": "Custom Query Analysis",
  "family-relocation-area-demo": "Climate Risk Screening"
};

export type CompactReportMetadataInput = {
  scenario?: string | null;
  targetLabel?: string | null;
  reportType?: "analysis" | "comparison";
  projectKey?: string | null;
};

function comparableMetadataValue(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeCompactReportMetadata(input: CompactReportMetadataInput) {
  const targetLabel = input.targetLabel?.trim() ?? "";
  const currentScenario = input.scenario?.trim() ?? "";
  const scenarioFromProject = input.projectKey ? projectScenarioLabels[input.projectKey] : undefined;
  let scenario = scenarioLabels[currentScenario] ?? currentScenario;

  if (!scenario || ["analysis", "report", "unknown"].includes(scenario.toLowerCase())) {
    scenario = scenarioFromProject ?? (input.reportType === "comparison" ? "Screening Comparison" : "Screening Analysis");
  } else if (input.reportType === "comparison" && scenario.toLowerCase() === "comparison") {
    scenario = "Screening Comparison";
  }

  if (targetLabel && comparableMetadataValue(scenario) === comparableMetadataValue(targetLabel)) {
    scenario = scenarioFromProject ?? (input.reportType === "comparison" ? "Screening Comparison" : "Screening Analysis");
  }

  const seen = new Set<string>();
  return [scenario, targetLabel].filter((value) => {
    const key = comparableMetadataValue(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const normalized = boundedString(item, 2_000);
        return normalized ? [normalized] : [];
      })
    : [];
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedString(value: unknown, maximum = 320) {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function optionalString(value: unknown, maximum = 320) {
  if (value === undefined || value === null || value === "") return undefined;
  return boundedString(value, maximum) ?? undefined;
}

function normalizeDemoSources(value: unknown): SourceLineageSnapshot["demoSources"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const id = boundedString(source?.id);
    const name = boundedString(source?.name);
    const note = boundedString(source?.note, 2_000);
    return id && name && note ? [{ id, name, note }] : [];
  });
}

function normalizeUploadedSources(value: unknown): SourceLineageSnapshot["uploadedSources"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const id = boundedString(source?.id);
    const name = boundedString(source?.name);
    const type = boundedString(source?.type);
    const note = boundedString(source?.note, 2_000);
    return id && name && type && note ? [{ id, name, type, note }] : [];
  });
}

function normalizeExternalSources(value: unknown): SourceLineageSnapshot["externalSources"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const id = boundedString(source?.id);
    const name = boundedString(source?.name);
    const status = boundedString(source?.status);
    const disclaimer = boundedString(source?.disclaimer, 2_000);
    if (!id || !name || !status || !disclaimer) return [];
    return [{
      id,
      name,
      status,
      disclaimer,
      dataMode: optionalString(source?.dataMode),
      confidence: optionalString(source?.confidence),
      validationStatus: optionalString(source?.validationStatus),
      nextValidationStep: optionalString(source?.nextValidationStep, 2_000),
      queriedAt: source?.queriedAt === null ? null : optionalString(source?.queriedAt),
      sourceObservedAt: source?.sourceObservedAt === null ? null : optionalString(source?.sourceObservedAt),
      queryFingerprint: optionalString(source?.queryFingerprint),
      fallbackReason: source?.fallbackReason === null ? null : optionalString(source?.fallbackReason, 2_000)
    }];
  });
}

function normalizePlannedSources(value: unknown): SourceLineageSnapshot["plannedValidationSources"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    const id = boundedString(source?.id);
    const name = boundedString(source?.name);
    const disclaimer = boundedString(source?.disclaimer, 2_000);
    if (!id || !name || !disclaimer) return [];
    return [{
      id,
      name,
      disclaimer,
      status: optionalString(source?.status),
      dataMode: optionalString(source?.dataMode),
      confidence: optionalString(source?.confidence),
      validationStatus: optionalString(source?.validationStatus),
      nextValidationStep: optionalString(source?.nextValidationStep, 2_000)
    }];
  });
}

function dedupeDisclaimers(value: unknown) {
  const seen = new Set<string>();
  return [canonicalCaveat, ...strings(value)].filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeSourceLineageForDisplay(
  value: unknown,
  fallbackCapturedAt = new Date(0).toISOString()
): SourceLineageSnapshot {
  const lineage = record(value);
  return {
    capturedAt: boundedString(lineage?.capturedAt) ?? fallbackCapturedAt,
    demoSources: normalizeDemoSources(lineage?.demoSources),
    uploadedSources: normalizeUploadedSources(lineage?.uploadedSources),
    externalSources: normalizeExternalSources(lineage?.externalSources),
    plannedValidationSources: normalizePlannedSources(lineage?.plannedValidationSources),
    disclaimers: dedupeDisclaimers(lineage?.disclaimers)
  };
}

function normalizeScenario(report: AnalysisReportDeliverable | ComparisonReportDeliverable) {
  if (report.reportType === "analysis") {
    const scenarioId = report.analysis?.scenarioId;
    if (scenarioId && scenarioLabels[scenarioId]) return scenarioLabels[scenarioId];
  }

  const current = report.scenario?.trim();
  if (current && !["analysis", "comparison", "report", "unknown"].includes(current.toLowerCase())) {
    return scenarioLabels[current] ?? current;
  }
  if (report.projectKey && projectScenarioLabels[report.projectKey]) {
    return projectScenarioLabels[report.projectKey];
  }
  return report.reportType === "comparison" ? "Screening Comparison" : "Screening Analysis";
}

export function normalizeReportForDisplay(
  report: AnalysisReportDeliverable | ComparisonReportDeliverable
): AnalysisReportDeliverable | ComparisonReportDeliverable {
  const base = {
    ...report,
    scenario: normalizeScenario(report),
    keyFindings: strings(report.keyFindings),
    risks: strings(report.risks),
    nextActions: strings(report.nextActions),
    validationChecklist: strings(report.validationChecklist),
    sourceLineage: normalizeSourceLineageForDisplay(report.sourceLineage, report.createdAt),
    dataHonestyNote: canonicalCaveat
  };

  if (report.reportType === "analysis") {
    return {
      ...base,
      reportType: "analysis",
      opportunities: strings(report.opportunities),
      limitations: strings(report.limitations)
    } as AnalysisReportDeliverable;
  }

  return {
    ...base,
    reportType: "comparison",
    comparedItems: Array.isArray(report.comparedItems) ? report.comparedItems : [],
    sharedOpportunities: strings(report.sharedOpportunities),
    differentiatedRisks: strings(report.differentiatedRisks)
  } as ComparisonReportDeliverable;
}

export const reportDisplayCaveat = canonicalCaveat;

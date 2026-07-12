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

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
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

function normalizeSourceLineage(
  report: AnalysisReportDeliverable | ComparisonReportDeliverable
): SourceLineageSnapshot {
  const lineage = report.sourceLineage as Partial<SourceLineageSnapshot> | null | undefined;
  return {
    capturedAt: typeof lineage?.capturedAt === "string" ? lineage.capturedAt : report.createdAt,
    demoSources: Array.isArray(lineage?.demoSources) ? lineage.demoSources : [],
    uploadedSources: Array.isArray(lineage?.uploadedSources) ? lineage.uploadedSources : [],
    externalSources: Array.isArray(lineage?.externalSources) ? lineage.externalSources : [],
    plannedValidationSources: Array.isArray(lineage?.plannedValidationSources) ? lineage.plannedValidationSources : [],
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
    sourceLineage: normalizeSourceLineage(report),
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

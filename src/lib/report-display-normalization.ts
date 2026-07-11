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
  assetPortfolioIntelligence: "Asset Portfolio Intelligence",
  climateRisk: "Climate Risk Screening",
  agricultureSuitability: "Agriculture Suitability",
  infrastructurePlanning: "Infrastructure Planning",
  customQuery: "Custom Query Analysis"
};

const projectScenarioLabels: Record<string, string> = {
  "dubai-investment-screening-demo": "Investment Site Selection",
  "developer-land-pipeline-demo": "Real Estate Development",
  "bank-asset-review-demo": "Asset Portfolio Intelligence",
  "home-buyer-neighborhood-demo": "Custom Query Analysis",
  "family-relocation-area-demo": "Climate Risk Screening"
};

function dedupeDisclaimers(items: string[]) {
  const seen = new Set<string>();
  return [canonicalCaveat, ...items]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSourceLineage(report: AnalysisReportDeliverable | ComparisonReportDeliverable): SourceLineageSnapshot {
  const lineage = report.sourceLineage as Partial<SourceLineageSnapshot> | null | undefined;
  return {
    capturedAt: typeof lineage?.capturedAt === "string" ? lineage.capturedAt : report.createdAt,
    demoSources: Array.isArray(lineage?.demoSources) ? lineage.demoSources : [],
    uploadedSources: Array.isArray(lineage?.uploadedSources) ? lineage.uploadedSources : [],
    externalSources: Array.isArray(lineage?.externalSources) ? lineage.externalSources : [],
    plannedValidationSources: Array.isArray(lineage?.plannedValidationSources) ? lineage.plannedValidationSources : [],
    disclaimers: dedupeDisclaimers(Array.isArray(lineage?.disclaimers) ? lineage.disclaimers : [])
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

  const title = `${report.title} ${report.subtitle}`.toLowerCase();
  if (title.includes("investment")) return "Investment Site Selection";
  if (title.includes("development")) return "Real Estate Development";
  if (title.includes("portfolio") || title.includes("asset review")) return "Asset Portfolio Intelligence";
  if (title.includes("climate") || title.includes("relocation")) return "Climate Risk Screening";

  return report.reportType === "comparison" ? "Screening Comparison" : "Screening Analysis";
}

/**
 * Applies the presentation-level report contract without changing stored
 * report payloads. This keeps complete, legacy and partial demo records
 * printable while enforcing canonical scenario, caveat and lineage labels.
 */
export function normalizeReportForDisplay(
  report: AnalysisReportDeliverable | ComparisonReportDeliverable
): AnalysisReportDeliverable | ComparisonReportDeliverable {
  const base = {
    ...report,
    scenario: normalizeScenario(report),
    sourceLineage: normalizeSourceLineage(report),
    dataHonestyNote:
      "Browser print/save as PDF output based on MVP screening context. This is not production-ready or pilot-ready evidence."
  };

  if (report.reportType === "analysis") {
    return {
      ...base,
      reportType: "analysis"
    } as AnalysisReportDeliverable;
  }

  return {
    ...base,
    reportType: "comparison"
  } as ComparisonReportDeliverable;
}

export const reportDisplayCaveat = canonicalCaveat;

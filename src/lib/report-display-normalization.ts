import type {
  AnalysisReportDeliverable,
  ComparisonReportDeliverable
} from "@/src/lib/report-deliverables";

const canonicalCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const scenarioLabels: Record<string, string> = {
  investmentSiteSelection: "Investment Site Selection",
  realEstateDevelopment: "Real Estate Development",
  climateRisk: "Climate Risk Screening",
  agricultureSuitability: "Agriculture Suitability",
  infrastructurePlanning: "Infrastructure Planning",
  customQuery: "Custom Query Analysis"
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

/**
 * Applies the presentation-level report contract without changing stored
 * report payloads. This keeps legacy/demo records readable while ensuring the
 * printable surface uses canonical scenario, caveat and source-lineage labels.
 */
export function normalizeReportForDisplay(
  report: AnalysisReportDeliverable | ComparisonReportDeliverable
): AnalysisReportDeliverable | ComparisonReportDeliverable {
  const sourceLineage = {
    ...report.sourceLineage,
    disclaimers: dedupeDisclaimers(report.sourceLineage.disclaimers ?? [])
  };

  const base = {
    ...report,
    sourceLineage,
    dataHonestyNote:
      "Browser print/save as PDF output based on MVP screening context. This is not production-ready or pilot-ready evidence."
  };

  if (report.reportType === "analysis") {
    const scenarioId = report.analysis?.scenarioId;
    return {
      ...base,
      reportType: "analysis",
      scenario: scenarioId ? scenarioLabels[scenarioId] ?? report.scenario : report.scenario
    } as AnalysisReportDeliverable;
  }

  return base as ComparisonReportDeliverable;
}

export const reportDisplayCaveat = canonicalCaveat;

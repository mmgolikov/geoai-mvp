import type { ReportPackageType } from "@/src/types/report-package";

const seededAt = "2026-06-21T10:00:00.000Z";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type SeededReportPackageDefinition = {
  projectKey: string;
  projectName: string;
  packageType: ReportPackageType;
  reportId: string;
};

export const seededReportPackageDefinitions: SeededReportPackageDefinition[] = [
  {
    projectKey: "dubai-investment-screening-demo",
    projectName: "Dubai Investment Screening",
    packageType: "investment_screening",
    reportId: "seeded-analysis-dubai-marina-report"
  },
  {
    projectKey: "developer-land-pipeline-demo",
    projectName: "Developer Land Pipeline",
    packageType: "development_feasibility",
    reportId: "seeded-analysis-dubai-south-development-report"
  },
  {
    projectKey: "bank-asset-review-demo",
    projectName: "Bank Asset Review",
    packageType: "bank_asset_review",
    reportId: "seeded-analysis-mbr-collateral-report"
  },
  {
    projectKey: "home-buyer-neighborhood-demo",
    projectName: "Home Buyer Neighborhood Fit",
    packageType: "investment_screening",
    reportId: "seeded-analysis-dubai-hills-home-fit-report"
  },
  {
    projectKey: "family-relocation-area-demo",
    projectName: "Family Relocation Area Review",
    packageType: "investment_screening",
    reportId: "seeded-analysis-town-square-relocation-report"
  }
];

function seedSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "package";
}

export function seededReportPackageKey(definition: SeededReportPackageDefinition) {
  return `report-package-${seedSlug(definition.projectKey)}-${seedSlug(definition.packageType)}-${seedSlug(definition.reportId)}`;
}

export const publicSeedReportPackageSummaries = seededReportPackageDefinitions.map((definition) => {
  const packageKey = seededReportPackageKey(definition);
  return {
    id: packageKey,
    packageKey,
    projectKey: definition.projectKey,
    title: `${definition.projectName} Enterprise Report Pack`,
    packageType: definition.packageType,
    status: "validation_required" as const,
    version: "v2.8",
    generatedAt: seededAt,
    caveat
  };
});

import type { ReportPackage, ReportPackageStatus, ReportPackageType } from "@/src/types/report-package";

export const publicReportPackageListMaxBytes = 16 * 1024;
export const publicReportPackageListMaxItems = 10;

const collectionCaveat = "Report packages are decision-support deliverables; official validation required.";

function boundedText(value: string, maximumLength: number) {
  return value.length <= maximumLength ? value : value.slice(0, maximumLength);
}

export type DashboardReportPackageInput = Pick<
  ReportPackage,
  "id" | "packageKey" | "projectKey" | "title" | "packageType" | "status" | "version" | "generatedAt" | "caveat"
> | {
  id: string;
  packageKey: string;
  projectKey: string;
  title: string;
  packageType: ReportPackageType;
  status: ReportPackageStatus;
  version: string;
  generatedAt: string;
  caveat: string;
};

export function toDashboardReportPackageSummary(pkg: DashboardReportPackageInput) {
  const packageKey = boundedText(pkg.packageKey, 240);

  return {
    id: boundedText(pkg.id, 240),
    packageKey,
    projectKey: boundedText(pkg.projectKey, 160),
    title: boundedText(pkg.title, 300),
    packageType: pkg.packageType,
    status: pkg.status,
    version: boundedText(pkg.version, 32),
    generatedAt: boundedText(pkg.generatedAt, 64),
    printablePath: `/report-packages/${encodeURIComponent(packageKey)}/print`,
    jsonPath: `/api/report-packages/${encodeURIComponent(packageKey)}/json`,
    caveat: boundedText(pkg.caveat, 1_000)
  };
}

export function createReportPackageListProjection(input: {
  packages: DashboardReportPackageInput[];
  projectKey: string | null;
  staticSeedOnly: boolean;
  ok: boolean;
  mode: string;
  storageCaveat: string;
  error: string | null;
}) {
  const maximumItems = input.staticSeedOnly ? publicReportPackageListMaxItems : 50;
  const summaries = input.packages.slice(0, maximumItems).map(toDashboardReportPackageSummary);

  return {
    ok: input.ok && input.error === null,
    contractVersion: input.staticSeedOnly ? "compact_public_v1" as const : "project_summary_v1" as const,
    projection: "dashboard_summaries_v1" as const,
    sourceMode: input.staticSeedOnly ? "demo_seed" as const : "authorized_repository" as const,
    dynamicStoredStateIncluded: !input.staticSeedOnly,
    mode: input.mode,
    storageCaveat: input.storageCaveat,
    projectKey: input.projectKey,
    count: summaries.length,
    summaries,
    error: input.error,
    caveat: collectionCaveat
  };
}

import Link from "next/link";
import { AnalysisReportPrint } from "@/components/reports/analysis-report-print";
import { ComparisonReportPrint } from "@/components/reports/comparison-report-print";
import { PrintButton } from "@/components/reports/print-button";
import { PrintReportFallback } from "@/components/reports/print-report-fallback";
import { getReport } from "@/src/lib/db/repositories/reports";
import { normalizeReportDeliverable } from "@/src/lib/report-deliverables";
import { normalizeReportForDisplay } from "@/src/lib/report-display-normalization";
import { getSeededDemoReportRecord } from "@/src/data/demo-report-seeds";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { hasRequestIdentityKernelEvidence, hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import { isCanonicalReportId } from "@/src/lib/report-id";

type PrintableReportPageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export default async function PrintableReportPage({ params }: PrintableReportPageProps) {
  const { id } = await params;
  if (!isCanonicalReportId(id)) {
    return <PrintReportFallback reportId="invalid-report-id" />;
  }
  const seededRecord = getSeededDemoReportRecord(id);
  const result = seededRecord
    ? { data: seededRecord }
    : hasRequestIdentityKernelEvidence()
      ? await getReport(id)
      : { data: null };
  const projectKey = (result.data as { projectKey?: string | null; project_key?: string | null } | null)?.projectKey
    ?? (result.data as { project_key?: string | null } | null)?.project_key
    ?? null;
  const access = requireProjectAccess({ projectKey, action: "export", mode: "soft" });
  const publicSeed = Boolean(seededRecord);
  if (!access.allowed || (!publicSeed && !hasVerifiedRequestIdentity(access))) {
    return <PrintReportFallback reportId={id} />;
  }
  const normalized = result.data ? normalizeReportDeliverable(result.data) : null;
  const report = normalized ? normalizeReportForDisplay(normalized) : null;

  if (!report) {
    return <PrintReportFallback reportId={id} />;
  }

  return (
    <main className="min-h-screen bg-[#eef2f5] px-4 py-6 text-ink print:bg-white print:px-0 print:py-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-[920px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Printable deliverable</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{report.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/projects"
            className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
          >
            Back
          </Link>
          <PrintButton />
        </div>
      </div>
      <div className="mx-auto max-w-[920px] print:max-w-none">
        {report.reportType === "analysis" ? (
          <AnalysisReportPrint report={report} />
        ) : (
          <ComparisonReportPrint report={report} />
        )}
      </div>
    </main>
  );
}

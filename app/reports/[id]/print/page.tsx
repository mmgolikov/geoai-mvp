import Link from "next/link";
import { AnalysisReportPrint } from "@/components/reports/analysis-report-print";
import { ComparisonReportPrint } from "@/components/reports/comparison-report-print";
import { PrintButton } from "@/components/reports/print-button";
import { PrintReportFallback } from "@/components/reports/print-report-fallback";
import { getReport } from "@/src/lib/db/repositories/reports";
import { normalizeReportDeliverable } from "@/src/lib/report-deliverables";
import { normalizeReportForDisplay } from "@/src/lib/report-display-normalization";

type PrintableReportPageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export default async function PrintableReportPage({ params }: PrintableReportPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReport(decodedId);
  const normalized = result.data ? normalizeReportDeliverable(result.data) : null;
  const report = normalized ? normalizeReportForDisplay(normalized) : null;

  if (!report) {
    return <PrintReportFallback reportId={decodedId} />;
  }

  return (
    <main className="min-h-screen bg-[#eef2f5] px-4 py-6 text-ink print:bg-white print:px-0 print:py-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-[920px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Printable deliverable</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{report.title}</h1>
          <p className="mt-1 text-xs leading-5 text-muted">Review-ready screening memo preview</p>
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

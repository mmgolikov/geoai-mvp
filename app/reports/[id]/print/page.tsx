import Link from "next/link";
import { AnalysisReportPrint } from "@/components/reports/analysis-report-print";
import { ComparisonReportPrint } from "@/components/reports/comparison-report-print";
import { PrintButton } from "@/components/reports/print-button";
import { getReport } from "@/src/lib/db/repositories/reports";
import { normalizeReportDeliverable } from "@/src/lib/report-deliverables";

type PrintableReportPageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export default async function PrintableReportPage({ params }: PrintableReportPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReport(decodedId);
  const report = result.data ? normalizeReportDeliverable(result.data) : null;

  if (!report) {
    return (
      <main className="min-h-screen bg-[#f4f7f9] px-4 py-8 text-ink">
        <section className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">GeoAI</p>
          <h1 className="mt-3 text-3xl font-semibold">Report not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Generate or save a report first. Local fallback reports are stored only in this development workspace unless Supabase persistence is configured.
          </p>
          <Link
            href="/workspace"
            className="mt-6 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
          >
            Open workspace
          </Link>
        </section>
      </main>
    );
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
            Project library
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

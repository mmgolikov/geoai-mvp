import Link from "next/link";
import { PrintButton } from "@/components/reports/print-button";
import { getReportPackage } from "@/src/lib/repositories/report-package-repository";
import type { ReportPackageSection } from "@/src/types/report-package";

type ReportPackagePrintPageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "Not available") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SmallMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-[#d9e1e7] bg-[#f8fafb] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5e7180]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#162c38]">{String(value ?? "Not available")}</p>
    </div>
  );
}

function BulletList({ items }: { items: unknown[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-[#5e7180]">No item recorded.</p>;
  }

  return (
    <ul className="grid gap-1.5 text-sm leading-6 text-[#263f4d]">
      {items.slice(0, 8).map((item, index) => (
        <li key={`report-package-print-item-${index}-${String(item).slice(0, 32)}`}>{String(item)}</li>
      ))}
    </ul>
  );
}

function SectionContent({ section }: { section: ReportPackageSection }) {
  const content = section.content;

  if (section.type === "executive_memo") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <SmallMetric label="Decision question" value={content.decisionQuestion} />
          <SmallMetric label="Recommended posture" value={content.recommendedPosture} />
          <SmallMetric label="Scenario" value={content.scenario} />
          <SmallMetric label="Selected area" value={content.selectedArea} />
        </div>
        <p className="text-sm leading-6 text-[#263f4d]">{text(content.summary)}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Top drivers</p>
            <BulletList items={asList(content.topDrivers)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Top risks</p>
            <BulletList items={asList(content.topRisks)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Validation requirements</p>
            <BulletList items={asList(content.validationRequirements)} />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "deterministic_scoring") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {asList(content.scores).slice(0, 9).map((item, index) => {
          const score = asRecord(item);
          return (
            <SmallMetric
              key={`package-score-${index}-${text(score.label, "score")}`}
              label={text(score.label, "Score")}
              value={score.value ?? "Not available"}
            />
          );
        })}
      </div>
    );
  }

  if (section.type === "source_lineage" || section.type === "market_context") {
    const sources = asList(content.lineage ?? content.sources);
    return (
      <div className="grid gap-3">
        {sources.slice(0, 8).map((item, index) => {
          const source = asRecord(item);
          return (
            <div key={`package-source-${index}-${text(source.id, "source")}`} className="rounded-md border border-[#d9e1e7] bg-[#f8fafb] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#162c38]">{text(source.name, "Source")}</p>
                  <p className="mt-1 text-xs leading-5 text-[#5e7180]">{text(source.limitation, "Validation required.")}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#195266]">
                  {text(source.mode, "source")}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-[#5e7180]">{text(source.caveat, section.caveat)}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (section.type === "validation_appendix") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SmallMetric label="Evidence" value={content.totalEvidence} />
          <SmallMetric label="Official validated" value={content.officialValidatedCount} />
          <SmallMetric label="Client validated" value={content.clientValidatedCount} />
          <SmallMetric label="Claim level" value={content.highestAllowedClaimLevel} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Blockers</p>
            <BulletList items={asList(content.blockers)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Next actions</p>
            <BulletList items={asList(content.nextActions)} />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "evidence_review") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SmallMetric label="Reviews tracked" value={content.totalReviews} />
          <SmallMetric label="Reviewed evidence" value={content.reviewedEvidenceCount} />
          <SmallMetric label="Blockers" value={content.blockerCount} />
        </div>
        <div className="grid gap-2">
          {asList(content.files).slice(0, 6).map((item, index) => {
            const file = asRecord(item);
            return (
              <div key={`package-file-${index}-${text(file.id, "file")}`} className="rounded-md border border-[#d9e1e7] bg-[#f8fafb] p-3">
                <p className="font-semibold text-[#162c38]">{text(file.fileName, "Evidence file metadata")}</p>
                <p className="mt-1 text-xs leading-5 text-[#5e7180]">
                  {text(file.storageProvider, "storage")} / {text(file.objectStatus, "status")} / signed URL: {text(file.signedUrlAvailability, "not exported")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (section.type === "data_room_summary") {
    const counts = asRecord(content.counts);
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(counts).slice(0, 8).map(([label, value]) => (
            <SmallMetric key={`package-data-room-${label}`} label={formatLabel(label)} value={value} />
          ))}
        </div>
        <p className="text-sm leading-6 text-[#5e7180]">{text(content.storageNote)}</p>
      </div>
    );
  }

  if (section.type === "pilot_workflow") {
    const readiness = asRecord(content.readiness);
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SmallMetric label="Stage" value={content.stage} />
          <SmallMetric label="Readiness" value={readiness.score ?? "Not available"} />
          <SmallMetric label="Label" value={readiness.label ?? "Validation required"} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Client inputs</p>
            <BulletList items={asList(content.clientInputs).map((item) => text(asRecord(item).title, "Input"))} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e7180]">Deliverables</p>
            <BulletList items={asList(content.deliverables).map((item) => text(asRecord(item).title, "Deliverable"))} />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "limitations") {
    return (
      <div className="grid gap-2">
        {asList(content.limitations).slice(0, 8).map((item, index) => {
          const limitation = asRecord(item);
          return (
            <div key={`package-limitation-${index}-${text(limitation.id, "limitation")}`} className="rounded-md border border-[#d9e1e7] bg-[#f8fafb] p-3">
              <p className="font-semibold text-[#162c38]">{text(limitation.title, "Known limitation")}</p>
              <p className="mt-1 text-xs leading-5 text-[#5e7180]">{text(limitation.whatIsMissing, "Validation required.")}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#5e7180]">{text(limitation.caveat, section.caveat)}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (section.type === "export_manifest") {
    const artifacts = asList(content.artifacts);
    return (
      <div className="grid gap-2">
        {artifacts.slice(0, 10).map((item, index) => {
          const artifact = asRecord(item);
          return (
            <SmallMetric
              key={`package-artifact-${index}-${text(artifact.label, "artifact")}`}
              label={text(artifact.type, "artifact")}
              value={artifact.route ?? artifact.label}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(content).slice(0, 8).map(([label, value]) => (
        <SmallMetric key={`package-generic-${section.id}-${label}`} label={formatLabel(label)} value={typeof value === "object" ? "See package metadata" : value} />
      ))}
    </div>
  );
}

export default async function ReportPackagePrintPage({ params }: ReportPackagePrintPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReportPackage(decodedId);
  const pkg = result.data;

  if (!pkg) {
    return (
      <main className="min-h-screen bg-[#eef2f5] px-4 py-6 text-[#162c38]">
        <div className="mx-auto max-w-[920px] rounded-lg border border-[#d9e1e7] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#195266]">Report package</p>
          <h1 className="mt-2 text-2xl font-semibold">Report package not found</h1>
          <p className="mt-2 text-sm leading-6 text-[#5e7180]">Create a report package from Projects or Workspace, then reopen this print route.</p>
          <Link href="/projects" className="mt-4 inline-flex h-10 items-center rounded-md border border-[#d9e1e7] bg-white px-4 text-sm font-semibold">
            Back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2f5] px-4 py-6 text-[#162c38] print:bg-white print:px-0 print:py-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-[980px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#195266]">Enterprise report package</p>
          <h1 className="mt-1 text-xl font-semibold text-[#162c38]">{pkg.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/projects"
            className="inline-flex h-10 items-center rounded-md border border-[#d9e1e7] bg-white px-4 text-sm font-semibold text-[#162c38] transition hover:border-[#195266]"
          >
            Back
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-[980px] bg-white p-8 shadow-sm print:max-w-none print:p-8 print:shadow-none">
        <header className="border-b border-[#d9e1e7] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#195266]">GeoAI</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#162c38]">{pkg.title}</h1>
              <p className="mt-2 text-sm leading-6 text-[#5e7180]">
                {formatLabel(pkg.packageType)} / {formatLabel(pkg.status)} / generated {new Date(pkg.generatedAt).toUTCString()}
              </p>
            </div>
            <span className="rounded-full bg-[#e7f2f0] px-3 py-1 text-xs font-semibold text-[#195266]">
              {pkg.version}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#263f4d]">{pkg.caveat}</p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SmallMetric label="Project" value={pkg.projectKey} />
          <SmallMetric label="Package key" value={pkg.packageKey} />
          <SmallMetric label="Reports linked" value={pkg.linkedReportIds.length} />
          <SmallMetric label="Validation evidence" value={pkg.linkedValidationEvidenceIds.length} />
        </div>

        <div className="mt-8 grid gap-6">
          {pkg.sections.sort((a, b) => a.order - b.order).map((section) => (
            <section key={section.id} className="break-inside-avoid rounded-lg border border-[#d9e1e7] bg-white p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5e7180]">
                    {String(section.order).padStart(2, "0")} / {formatLabel(section.type)}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#162c38]">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5e7180]">{section.summary}</p>
                </div>
                <span className="rounded-full bg-[#f8fafb] px-2 py-1 text-[11px] font-semibold text-[#195266]">
                  {formatLabel(section.status)}
                </span>
              </div>
              <SectionContent section={section} />
              <p className="mt-4 border-t border-[#d9e1e7] pt-3 text-[11px] leading-4 text-[#5e7180]">{section.caveat}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

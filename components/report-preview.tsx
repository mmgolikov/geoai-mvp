"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { EvidenceSourceCards } from "@/components/evidence-source-cards";
import ingestionReport from "@/data/normalized/ingestion_report.json";
import { MapContextCard } from "@/components/map-context-card";
import { PrintableReport } from "@/components/printable-report";
import { ValidationGovernanceAppendix } from "@/components/validation-governance-appendix";
import { getDemoNarrativeByProjectKey } from "@/src/data/demo-narratives";
import { getClientPilotPackageForProject } from "@/src/data/pilot-packages";
import { externalDataSources } from "@/src/lib/external-data/source-registry";
import { sourceStatusToLabel } from "@/src/lib/external-data/source-status";
import { deriveDecisionPosture, deriveDecisionRationale } from "@/src/lib/decision-posture";
import { userDrawnAoiSourceCode, userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { formatArea, formatPerimeter } from "@/src/lib/polygon-aoi";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { ComparisonResult, ExpressAnalysis, ScoreKey } from "@/src/types/geo";
import type { EvidenceFileAsset } from "@/src/types/storage";
import type { EvidenceReviewSummary } from "@/src/types/evidence-review";

type ReportPreviewProps =
  | {
      mode: "analysis";
      analysis: ExpressAnalysis;
      onBack: () => void;
    }
  | {
      mode: "comparison";
      comparison: ComparisonResult;
      onBack: () => void;
    };

const scoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development Potential",
  investmentAttractiveness: "Investment Attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure Readiness",
  climateHeatRisk: "Climate / Heat Risk",
  overallRisk: "Overall Risk"
};

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

const requiredDataCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

type SourceLineageQualityRow = {
  sourceGroupId: string;
  sourceGroupName: string;
  status: string;
  dataMode?: string;
  recordCount?: number | null;
  confidence?: string;
  sourceQuality?: {
    validationStatus?: string;
    confidence?: string;
    dataMode?: string;
    nextValidationStep?: string;
  };
  caveat?: string;
  nextValidationStep?: string;
};

type SourceLineageQualityResponse = {
  lineage?: SourceLineageQualityRow[];
  caveat?: string;
  generatedAt?: string;
};

type PrintableReportOpenResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      error: string;
    };

function formatDate() {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date());
}

function formatDateValue(value?: string) {
  if (!value) {
    return formatDate();
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function formatDataModeLabel(value?: string | null, separator = " ") {
  return (value ?? "sample_open")
    .replace(/_/g, separator)
    .replace(/\bdemo normalized\b/gi, "sample/open")
    .replace(/\bdemo-normalized\b/gi, "sample/open");
}

function formatSourceQualityLabel(value?: string | null) {
  return (value ?? "validation required").replace(/[-_]/g, " ");
}

function createStableKey(section: string, value: unknown, index: number): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "item");
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${section}-${index}-${slug || "item"}`;
}

function dedupeTextList(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalized = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function sourceById(id: string) {
  return externalDataSources.find((source) => source.id === id);
}

function ExternalDataLineageSection({
  analysis,
  comparison
}: {
  analysis?: ExpressAnalysis;
  comparison?: ComparisonResult;
}) {
  const [sourceQualityRows, setSourceQualityRows] = useState<SourceLineageQualityRow[]>([]);
  const [sourceQualityCaveat, setSourceQualityCaveat] = useState(requiredDataCaveat);
  const isClimateScenario = analysis?.scenarioId === "climateRisk";
  const evidenceSourceIds = new Set([
    ...(analysis?.evidence.map((item) => item.sourceId) ?? []),
    ...(comparison?.evidence.map((item) => item.sourceId) ?? [])
  ]);
  const marketBasis = analysis?.marketMetricsMatch?.importedMetricsUsed || analysis?.marketContext?.importedMarketMetrics?.importedMetricsUsed
    ? "sample/manual market metrics matched; validate against DLD / Dubai Pulse snapshot or official exports"
    : "sample fallback unless a local/public DLD / Dubai Pulse snapshot is loaded";
  const usedRows = [
    {
      source: sourceById("dld-dubai-pulse-transactions"),
      note: `Market basis: ${marketBasis}. Not a live transactional feed.`
    },
    {
      source: sourceById("osm-geofabrik-baseline"),
      note: evidenceSourceIds.has("open-geodata-baseline-sample")
        ? "Access/context basis: existing OSM-style sample baseline; real OSM / Geofabrik prepared baseline can replace it when loaded."
        : "Access/context basis: open geospatial baseline when available; otherwise demo open-geodata fallback."
    },
    isClimateScenario
      ? {
          source: sourceById("open-meteo-climate"),
          note: "Climate basis: Open-Meteo reanalysis context can support climate scenario interpretation when queried; not engineering or insurance-grade."
        }
      : null
  ].filter((item): item is { source: NonNullable<ReturnType<typeof sourceById>>; note: string } => Boolean(item?.source));
  const availableRows = [
    {
      source: sourceById("copernicus-sentinel-catalog"),
      note: "Available as optional connector status only; credentials and imagery analytics pipeline are not configured by default."
    }
  ].filter((item): item is { source: NonNullable<ReturnType<typeof sourceById>>; note: string } => Boolean(item.source));
  const plannedRows = [
    {
      source: sourceById("geodubai-municipality-validation"),
      note: "Planned official GIS/planning validation source; not connected in this demo."
    },
    {
      source: sourceById("dld-api-gateway-validation"),
      note: "Planned enterprise validation path for official DLD workflows; not connected in this demo."
    }
  ].filter((item): item is { source: NonNullable<ReturnType<typeof sourceById>>; note: string } => Boolean(item.source));

  useEffect(() => {
    let mounted = true;

    fetch("/api/source-lineage")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SourceLineageQualityResponse | null) => {
        if (!mounted) return;
        setSourceQualityRows(Array.isArray(payload?.lineage) ? payload.lineage.slice(0, 5) : []);
        setSourceQualityCaveat(payload?.caveat ?? requiredDataCaveat);
      })
      .catch(() => {
        if (!mounted) return;
        setSourceQualityRows([]);
        setSourceQualityCaveat(requiredDataCaveat);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const renderRows = (rows: Array<{ source: NonNullable<ReturnType<typeof sourceById>>; note: string }>) => (
    <div className="grid gap-3">
      {rows.map(({ source, note }) => (
        <div key={source.id} className="rounded-md border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{source.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{source.provider}</p>
            </div>
            <span className="rounded-full bg-surface px-2 py-1 text-xs font-semibold text-brand">
              {sourceStatusToLabel(source.status)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{note}</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Source quality: {formatSourceQualityLabel(source.validationStatus)} / confidence {formatSourceQualityLabel(source.confidence)}.
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">{source.disclaimer}</p>
        </div>
      ))}
    </div>
  );

  return (
    <Section title="External Data Used In This Memo">
      <div className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Source quality / next validation</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(sourceQualityRows.length > 0 ? sourceQualityRows : []).map((row) => (
              <div key={row.sourceGroupId} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-semibold text-ink">{row.sourceGroupName}</p>
                  <span className="rounded-full bg-surface px-2 py-1 text-xs font-semibold text-brand">
                    {sourceStatusToLabel(row.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.1em] text-muted">
                  {formatDataModeLabel(row.dataMode)} / {formatSourceQualityLabel(row.sourceQuality?.validationStatus)} / {formatSourceQualityLabel(row.confidence ?? row.sourceQuality?.confidence)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {row.nextValidationStep ?? row.sourceQuality?.nextValidationStep ?? "Validate source lineage with official/client-approved evidence."}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{sourceQualityCaveat}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Used / source basis</h3>
          <div className="mt-3">{renderRows(usedRows)}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Available but not used</h3>
            <div className="mt-3">{renderRows(availableRows)}</div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Planned validation</h3>
            <div className="mt-3">{renderRows(plannedRows)}</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function UploadedDataReportSection({ analysis }: { analysis: ExpressAnalysis }) {
  const context = analysis.uploadedDataContext;

  if (!context || context.uploadedDatasets.length === 0) {
    return null;
  }

  return (
    <Section title="Source Lineage / Uploaded Data Used">
      <div className="grid gap-3 md:grid-cols-2">
        {context.uploadedDatasets.map((dataset) => {
          const applied = context.appliedMetrics.find((match) => match.datasetId === dataset.id);
          const available = context.availableButNotApplied.find((match) => match.datasetId === dataset.id);

          return (
            <div key={dataset.id} className="rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{dataset.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted">
                    {dataset.type} / {dataset.sourceMode.replace(/-/g, " ")}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-muted">
                  {applied ? "Applied" : available ? "Not applied" : "Visible"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {applied?.note ?? available?.note ?? dataset.notes ?? "Local upload available as validation-required context."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Confidence: {dataset.confidence.replace(/-/g, " ")}. Official status: {dataset.officialStatus.replace(/-/g, " ")}.
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ReportShell({
  children,
  onBack,
  printableHref,
  printableReportRecord
}: {
  children: React.ReactNode;
  onBack: () => void;
  printableHref?: string;
  printableReportRecord?: unknown;
}) {
  const isPreparingPrintableReportRef = useRef(false);
  const [isPreparingPrintableReport, setIsPreparingPrintableReport] = useState(false);
  const [printableReportError, setPrintableReportError] = useState<string | null>(null);

  function prepareAndOpenPrintableReport(): PrintableReportOpenResult {
    if (!printableHref) {
      return { ok: false, error: "Printable report route is not available yet." };
    }

    try {
      const reportId = printableHref.split("/reports/")[1]?.split("/print")[0];
      if (!reportId) {
        return { ok: false, error: "Printable report id is missing." };
      }

      if (printableReportRecord) {
        const serializedReport = JSON.stringify(printableReportRecord);
        const storageKey = `geoai-print-report:${decodeURIComponent(reportId)}`;
        window.sessionStorage.setItem(storageKey, serializedReport);
        window.localStorage.setItem(storageKey, serializedReport);
      }
    } catch {
      return { ok: false, error: "Printable report could not be prepared. Please retry." };
    }

    return { ok: true, url: printableHref };
  }

  async function handleOpenPrintableReport(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isPreparingPrintableReportRef.current) {
      return;
    }

    isPreparingPrintableReportRef.current = true;
    setIsPreparingPrintableReport(true);
    setPrintableReportError(null);

    try {
      const result = prepareAndOpenPrintableReport();
      if (!result.ok) {
        setPrintableReportError(result.error);
        return;
      }

      window.location.assign(result.url);
    } finally {
      isPreparingPrintableReportRef.current = false;
      setIsPreparingPrintableReport(false);
    }
  }

  return (
    <section className="screen-only h-[calc(100vh-72px)] overflow-y-auto bg-[#eef2f5] p-6">
      <div className="mx-auto max-w-5xl print:max-w-none">
        <div className="mb-4 flex flex-wrap justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
          >
            Back to dashboard
          </button>
          {printableHref ? (
            <button
              type="button"
              disabled={isPreparingPrintableReport}
              onClick={handleOpenPrintableReport}
              className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
            >
              {isPreparingPrintableReport ? "Preparing report..." : "Open printable report"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
          >
            Print / Save as PDF
          </button>
        </div>
        {printableReportError ? (
          <div className="mb-4 rounded-md border border-[#f2c6bd] bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#9f3412] print:hidden">
            {printableReportError}
          </div>
        ) : null}
        <article className="report-page rounded-lg bg-white p-8 shadow-soft print:rounded-none print:p-0 print:shadow-none">
          {children}
        </article>
      </div>
    </section>
  );
}

function createPrintableAnalysisRecord(analysis: ExpressAnalysis) {
  const id = `analysis-report-${analysis.id}`;

  return {
    id,
    projectId: analysis.project?.id ?? null,
    projectKey: analysis.project?.projectKey ?? null,
    reportType: "analysis",
    title: "Express Analysis / Investment Memo",
    scenario: analysis.title,
    targetLabel: analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map selection",
    reportPayload: {
      title: "Express Analysis / Investment Memo",
      scenario: analysis.title,
      selectedSite: analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map selection",
      selectedObject: analysis.selectedObject ?? null,
      selectedAoi: analysis.selectedAoi ?? null,
      coordinates: analysis.point,
      memoJson: analysis,
      customQuery: analysis.customQuery ?? null,
      customQueryIntent: analysis.customQueryIntent ?? null,
      customQueryAnswer: analysis.customQueryAnswer ?? null,
      decisionPosture: deriveDecisionPosture(analysis),
      scoreOverview: analysis.scores,
      keyValueDrivers: analysis.keyFactors,
      criticalConstraints: analysis.risks,
      dueDiligenceChecklist: analysis.nextActions,
      evidenceSourceReadiness: analysis.evidence,
      uploadedDataContext: analysis.uploadedDataContext ?? null,
      limitations: analysis.limitations ?? [],
      generatedAt: analysis.generatedAt ?? new Date().toISOString()
    },
    sourceLineage: createSourceLineageSnapshot({
      evidence: analysis.evidence,
      uploadedDatasets: analysis.uploadedDataContext?.uploadedDatasets ?? []
    }),
    createdAt: analysis.generatedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createPrintableComparisonRecord(comparison: ComparisonResult) {
  const id = `comparison-report-${comparison.id}`;

  return {
    id,
    projectId: comparison.project?.id ?? null,
    projectKey: comparison.project?.projectKey ?? null,
    reportType: "comparison",
    title: "Site Comparison Investment Memo",
    scenario: "Comparison",
    targetLabel: comparison.items.map((item) => item.item.name).join(", "),
    reportPayload: {
      title: "Site Comparison Investment Memo",
      scenario: "Comparison",
      comparisonJson: comparison,
      customQuery: comparison.customQuery ?? null,
      customQueryIntent: comparison.customQueryIntent ?? null,
      customQueryAnswer: comparison.customQueryAnswer ?? null,
      decisionPosture: `Best option: ${comparison.winner.item.name}`,
      scoreOverview: comparison.items.map((item) => ({
        itemName: item.item.name,
        scores: item.scores,
        overallScore: item.overallScore
      })),
      keyValueDrivers: comparison.sharedOpportunities,
      criticalConstraints: comparison.differentiatedRisks,
      dueDiligenceChecklist: comparison.nextActions,
      evidenceSourceReadiness: comparison.evidence,
      limitations: [
        "Comparison uses deterministic sample scoring and structured evidence readiness, not a validated underwriting model."
      ],
      generatedAt: new Date().toISOString()
    },
    sourceLineage: createSourceLineageSnapshot({
      evidence: comparison.evidence
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section border-t border-line pt-6">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AnalysisReport({ analysis, onBack }: { analysis: ExpressAnalysis; onBack: () => void }) {
  const analysisBadge = analysis.analysisMode === "openai" ? "AI analysis" : "Sample/open fallback";
  const analysisModeLabel = analysis.analysisMode === "openai" ? "AI-generated" : "Sample/open fallback";
  const dataLimitation = analysis.limitations?.[0] ?? "Structured evidence context with deterministic sample scoring.";
  const decisionPosture = deriveDecisionPosture(analysis);
  const decisionRationale = deriveDecisionRationale(analysis);
  const marketMetricsMatch = analysis.marketContext?.importedMarketMetrics ?? analysis.marketMetricsMatch;
  const importedMetric = marketMetricsMatch?.metrics;
  const demoNarrative = getDemoNarrativeByProjectKey(analysis.project?.projectKey);
  const clientPilotPackage = getClientPilotPackageForProject(analysis.project?.projectKey, analysis.project?.clientType);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileAsset[]>([]);
  const [reviewSummaries, setReviewSummaries] = useState<EvidenceReviewSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    const projectKey = analysis.project?.projectKey;
    if (!projectKey) return undefined;
    Promise.all([
      fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(projectKey)}`).then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/validation?projectKey=${encodeURIComponent(projectKey)}`).then((response) => (response.ok ? response.json() : null))
    ])
      .then(([filesPayload, validationPayload]: [{ items?: EvidenceFileAsset[] } | null, { reviewSummaries?: EvidenceReviewSummary[] } | null]) => {
        if (!mounted) return;
        setEvidenceFiles(Array.isArray(filesPayload?.items) ? filesPayload.items : []);
        setReviewSummaries(Array.isArray(validationPayload?.reviewSummaries) ? validationPayload.reviewSummaries : []);
      })
      .catch(() => {
        if (mounted) {
          setEvidenceFiles([]);
          setReviewSummaries([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [analysis.project?.projectKey]);

  return (
    <>
      <ReportShell
        onBack={onBack}
        printableHref={`/reports/${encodeURIComponent(`analysis-report-${analysis.id}`)}/print`}
        printableReportRecord={createPrintableAnalysisRecord(analysis)}
      >
        <div className="flex flex-col gap-8">
          <header className="border-b border-line pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">GeoAI</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink">Express Analysis Report</h1>
              <p className="mt-3 text-base leading-7 text-muted">{analysis.title}</p>
            </div>
            <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
              {analysisBadge}
            </span>
          </div>
          <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Selected site</dt>
              <dd className="mt-1 text-ink">{analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map point"}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Coordinates</dt>
              <dd className="mt-1 text-ink">{formatCoordinate(analysis.point.latitude, analysis.point.longitude)}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Scenario</dt>
              <dd className="mt-1 text-ink">{analysis.title}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Generated</dt>
              <dd className="mt-1 text-ink">{formatDateValue(analysis.generatedAt)}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Project</dt>
              <dd className="mt-1 text-ink">{analysis.project?.name ?? "Dubai Investment Screening"}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Project data mode</dt>
              <dd className="mt-1 capitalize text-ink">
                {formatDataModeLabel(analysis.project?.dataMode)}
              </dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Analysis mode</dt>
              <dd className="mt-1 text-ink">{analysisModeLabel}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Confidence</dt>
              <dd className="mt-1 capitalize text-ink">{analysis.confidenceLevel ?? "medium"}</dd>
            </div>
          </dl>
        </header>

        <Section title="Decision Posture">
          <div className="rounded-md border border-[#d6c391] bg-[#fff9e8] p-5">
            <p className="text-xl font-semibold text-ink">{decisionPosture}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{decisionRationale}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1 capitalize text-brand">
                Confidence: {analysis.confidenceLevel ?? "medium"}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-muted">
                {formatDataModeLabel(analysis.project?.dataMode, "-")}
              </span>
            </div>
          </div>
        </Section>

        {demoNarrative ? (
          <Section title="Decision Question & Validation Next Action">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Decision question</span>
                <p className="mt-2 leading-6 text-ink">{demoNarrative.decisionQuestion}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Validation next action</span>
                <p className="mt-2 leading-6 text-ink">{clientPilotPackage.validationRequirements[0]}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4 md:col-span-2">
                <span className="font-semibold text-muted">Workflow bridge</span>
                <p className="mt-2 leading-6 text-ink">{demoNarrative.pilotBridge}</p>
                <p className="mt-3 text-xs leading-5 text-muted">{demoNarrative.caveat}</p>
              </div>
            </div>
          </Section>
        ) : null}

        <Section title="Executive Summary">
          <p className="text-base leading-8 text-muted">{analysis.summary}</p>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md bg-surface p-4">
              <span className="font-semibold text-muted">Analysis mode</span>
              <p className="mt-1 text-ink">
                {analysisModeLabel}
                {analysis.analysisNotice ? ` - ${analysis.analysisNotice}` : ""}
              </p>
            </div>
            <div className="rounded-md bg-surface p-4">
              <span className="font-semibold text-muted">Data confidence / limitation</span>
              <p className="mt-1 text-ink">{dataLimitation}</p>
            </div>
          </div>
        </Section>

        <Section title="Score Overview">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {scoreOrder.map((scoreKey) => (
              <div key={scoreKey} className="rounded-md border border-line p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm font-semibold text-ink">{analysis.scoreLabels[scoreKey]}</span>
                  <span className="text-lg font-semibold text-brand">{analysis.scores[scoreKey]}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${analysis.scores[scoreKey]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {analysis.aiDecisionScore ? (
          <Section title="AI Decision Memo">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Mode</span>
                <p className="mt-1 text-ink">{analysis.aiDecisionScore.mode === "openai" ? "OpenAI scoring" : "Deterministic fallback"}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Decision posture</span>
                <p className="mt-1 text-ink">{analysis.aiDecisionScore.decisionPosture.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Recommended use</span>
                <p className="mt-1 text-ink">{analysis.aiDecisionScore.recommendedUse.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Suitability / risk</span>
                <p className="mt-1 text-ink">{analysis.aiDecisionScore.suitabilityScore}/100 / {analysis.aiDecisionScore.riskScore}/100</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-line bg-white p-4">
                <p className="font-semibold text-ink">Drivers</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                  {analysis.aiDecisionScore.keyDrivers.slice(0, 3).map((item, index) => (
                    <li key={createStableKey("report-ai-driver", item, index)}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-line bg-white p-4">
                <p className="font-semibold text-ink">Risks</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                  {analysis.aiDecisionScore.keyRisks.slice(0, 3).map((item, index) => (
                    <li key={createStableKey("report-ai-risk", item, index)}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-line bg-white p-4">
                <p className="font-semibold text-ink">Validation</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                  {analysis.aiDecisionScore.validationRequired.slice(0, 3).map((item, index) => (
                    <li key={createStableKey("report-ai-validation", item, index)}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{analysis.aiDecisionScore.caveat}</p>
          </Section>
        ) : null}

        <Section title="Map Context">
          <MapContextCard
            title={analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map point"}
            subtitle={
              analysis.selectedAoi
                ? `${userDrawnAoiSourceLabel(analysis.selectedAoi)} / ${analysis.subtitle}`
                : analysis.analysisTarget?.type === "user-drawn-aoi"
                ? `User-drawn AOI / ${analysis.subtitle}`
                : analysis.analysisTarget?.type === "uploaded-feature"
                ? `Uploaded screening geometry / ${analysis.subtitle}`
                : `${analysis.selectedObject?.type ?? "Point selection"} / ${analysis.subtitle}`
            }
            selectedPoint={analysis.point}
            selectedObject={analysis.selectedObject ?? null}
            selectedAoi={analysis.selectedAoi ?? null}
            analysisTarget={analysis.analysisTarget ?? null}
            reportMode
          />
        </Section>

        {analysis.marketContext ? (
          <Section title="Market Context">
            <div className="rounded-md border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{analysis.marketContext.areaName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {analysis.marketContext.emirate} / {marketMetricsMatch?.sourceMode ?? analysis.marketContext.sourceMode ?? "seed_static"} / {marketMetricsMatch?.confidence ?? analysis.marketContext.confidenceLevel} confidence
                  </p>
                </div>
                {analysis.marketContext.matchDistanceKm !== null ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">
                    {analysis.marketContext.matchDistanceKm.toFixed(1)} km from seed centroid
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                {importedMetric ? (
                  <>
                    <div className="rounded-md bg-white p-4">
                      <span className="font-semibold text-muted">Matched imported area</span>
                      <p className="mt-1 text-ink">{marketMetricsMatch?.matchedAreaName ?? importedMetric.areaName}</p>
                      <p className="mt-2 leading-6 text-muted">{marketMetricsMatch?.matchType ?? "exact"} match from local CSV ingestion output.</p>
                    </div>
                    <div className="rounded-md bg-white p-4">
                      <span className="font-semibold text-muted">Imported transaction evidence</span>
                      <p className="mt-1 text-ink">
                        {importedMetric.transactionCount} records / AED {importedMetric.transactionValueAed.toLocaleString("en-US")}
                      </p>
                      <p className="mt-2 leading-6 text-muted">
                        Median price {importedMetric.medianPricePerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm.
                      </p>
                    </div>
                    <div className="rounded-md bg-white p-4">
                      <span className="font-semibold text-muted">Imported rent evidence</span>
                      <p className="mt-1 text-ink">
                        {importedMetric.rentalRecordCount} records / {importedMetric.medianRentPerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm
                      </p>
                      <p className="mt-2 leading-6 text-muted">Sample/manual import; not live official market data.</p>
                    </div>
                    <div className="rounded-md bg-white p-4">
                      <span className="font-semibold text-muted">Pipeline proxy</span>
                      <p className="mt-1 text-ink">{importedMetric.projectCount} projects / {importedMetric.pipelineProxy}/100</p>
                      <p className="mt-2 leading-6 text-muted">Pipeline pressure proxy from imported sample project rows.</p>
                    </div>
                  </>
                ) : null}
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Market activity</span>
                  <p className="mt-1 text-ink">
                    {analysis.marketContext.marketMetrics?.activityIndex ?? analysis.marketContext.marketActivityLevel.index}/100
                  </p>
                  <p className="mt-2 leading-6 text-muted">{analysis.marketContext.marketActivityLevel.note}</p>
                </div>
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Rental demand</span>
                  <p className="mt-1 text-ink">
                    {analysis.marketContext.marketMetrics?.rentalDemandIndex ?? analysis.marketContext.rentContext.index}/100
                  </p>
                  <p className="mt-2 leading-6 text-muted">{analysis.marketContext.rentContext.note}</p>
                </div>
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Liquidity</span>
                  <p className="mt-1 text-ink">
                    {analysis.marketContext.marketMetrics?.liquidityIndex ?? analysis.marketContext.transactionContext.index}/100
                  </p>
                  <p className="mt-2 leading-6 text-muted">{analysis.marketContext.transactionContext.note}</p>
                </div>
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Development pipeline</span>
                  <p className="mt-1 text-ink">
                    {analysis.marketContext.marketMetrics?.developmentPipelineIndex ?? analysis.marketContext.developmentPipelineContext.index}/100
                  </p>
                  <p className="mt-2 leading-6 text-muted">{analysis.marketContext.developmentPipelineContext.note}</p>
                </div>
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Risk index</span>
                  <p className="mt-1 text-ink">
                    {analysis.marketContext.marketMetrics?.riskIndex ?? analysis.marketContext.riskContext.index}/100
                  </p>
                  <p className="mt-2 leading-6 text-muted">{analysis.marketContext.riskContext.note}</p>
                </div>
                <div className="rounded-md bg-white p-4">
                  <span className="font-semibold text-muted">Trend</span>
                  <p className="mt-1 capitalize text-ink">
                    {analysis.marketContext.marketMetrics?.trend ?? analysis.marketContext.marketActivityLevel.trend}
                  </p>
                  <p className="mt-2 leading-6 text-muted">Directional market signal for the selected area.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">
                Note: {marketMetricsMatch?.note ?? analysis.marketContext.dataQualityNotes?.[0] ?? "Current values are sample/open screening indices and not official market data."}
                {" "}
                {marketMetricsMatch?.importedMetricsUsed
                  ? "Imported sample metrics are used to demonstrate the market-data workflow. Validate against official DLD / Dubai Pulse datasets before investment decisions."
                  : analysis.marketContext.dataQualityNotes?.[1] ?? analysis.marketContext.limitations[0]}
              </p>
            </div>
          </Section>
        ) : null}

        {analysis.selectedAoi ? (
          <Section title="Spatial Object Details">
            <div className="rounded-md border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{analysis.selectedAoi.name}</p>
                  <p className="mt-1 text-sm text-muted">{userDrawnAoiSourceLabel(analysis.selectedAoi)} / validation required</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">
                  user provided / not official
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Geometry type</dt>
                  <dd className="mt-1 text-ink">Polygon</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Approx. area</dt>
                  <dd className="mt-1 text-ink">{formatArea(analysis.selectedAoi.measurements.areaSqM)}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Approx. perimeter</dt>
                  <dd className="mt-1 text-ink">{formatPerimeter(analysis.selectedAoi.measurements.perimeterM)}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Vertices</dt>
                  <dd className="mt-1 text-ink">{analysis.selectedAoi.measurements.vertexCount}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Centroid</dt>
                  <dd className="mt-1 text-ink">
                    {formatCoordinate(analysis.selectedAoi.centroid.latitude, analysis.selectedAoi.centroid.longitude)}
                  </dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Source status</dt>
                  <dd className="mt-1 text-ink">{userDrawnAoiSourceCode(analysis.selectedAoi)} / validation required</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-muted">Note: {analysis.selectedAoi.limitations[0]}</p>
            </div>
          </Section>
        ) : null}

        {analysis.selectedObject?.spatialContext ? (
          <Section title="Spatial Object Details">
            <div className="rounded-md border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{analysis.selectedObject.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {analysis.selectedObject.spatialContext.category.replace(/_/g, " ")} / {analysis.selectedObject.spatialContext.subtype}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">
                  {analysis.selectedObject.spatialContext.geometryStatus} / {analysis.selectedObject.spatialContext.confidenceLevel}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Geometry type</dt>
                  <dd className="mt-1 text-ink">{analysis.selectedObject.spatialContext.geometryType}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Estimated area</dt>
                  <dd className="mt-1 text-ink">
                    {analysis.selectedObject.spatialContext.areaSqm
                      ? `${analysis.selectedObject.spatialContext.areaSqm.toLocaleString()} sqm`
                      : "Not available"}
                  </dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Source status</dt>
                  <dd className="mt-1 text-ink">{analysis.selectedObject.spatialContext.sourceStatus}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Dataset</dt>
                  <dd className="mt-1 text-ink">{analysis.selectedObject.spatialContext.datasetName}</dd>
                </div>
                <div className="rounded-md bg-white p-4">
                  <dt className="font-semibold text-muted">Scenario relevance</dt>
                  <dd className="mt-1 text-ink">{analysis.selectedObject.spatialContext.scenarioRelevance.join(", ")}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-muted">Note: {analysis.selectedObject.spatialContext.limitations[0]}</p>
            </div>
          </Section>
        ) : null}

        <Section title="Key Factors">
          <ul className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {analysis.keyFactors.map((item, index) => (
              <li key={createStableKey("analysis-key-factor", item, index)} className="rounded-md bg-surface p-4">
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Evidence / Data Used">
          <EvidenceSourceCards evidence={analysis.evidence} />
          <div className="mt-4 rounded-md border border-line bg-surface p-4 text-sm leading-6 text-muted">
            <span className="font-semibold text-ink">DLD / Dubai Pulse ingestion readiness:</span>{" "}
            {ingestionReport.marketMetricCount} imported sample market areas are available for validation workflow.
            These sample/manual CSV metrics support conservative scoring when matched and are not a live official data connection.
          </div>
        </Section>

        <ExternalDataLineageSection analysis={analysis} />

        <UploadedDataReportSection analysis={analysis} />

        <Section title="Validation Governance Appendix">
          <ValidationGovernanceAppendix projectName={analysis.project?.name} evidenceFiles={evidenceFiles} reviewSummaries={reviewSummaries} compact />
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Opportunities">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.opportunities.map((item, index) => (
                <li key={createStableKey("analysis-opportunity", item, index)}>{item}</li>
              ))}
            </ul>
          </Section>
          <Section title="Risks & Constraints">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.risks.map((item, index) => (
                <li key={createStableKey("analysis-risk", item, index)}>{item}</li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Recommended Next Actions">
          <ol className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {analysis.nextActions.map((item, index) => (
              <li key={createStableKey("analysis-next-action", item, index)} className="rounded-md bg-surface p-4">
                <span className="font-semibold text-brand">{index + 1}. </span>{item}
              </li>
            ))}
          </ol>
        </Section>

        {analysis.limitations?.length ? (
          <Section title="Limitations">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {analysis.limitations.map((item, index) => (
                <li key={createStableKey("analysis-limitation", item, index)}>{item}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Data Honesty">
          <p className="text-sm leading-6 text-muted">{requiredDataCaveat}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            This report is an MVP screening output using sample/open, local snapshot, uploaded or validation-required context. It does not claim live official integration, production readiness or pilot readiness.
          </p>
        </Section>
        </div>
      </ReportShell>
      <PrintableReport mode="analysis" analysis={analysis} />
    </>
  );
}

function ComparisonReport({ comparison, onBack }: { comparison: ComparisonResult; onBack: () => void }) {
  const sharedOpportunities = dedupeTextList(comparison.sharedOpportunities);
  const differentiatedRisks = dedupeTextList(comparison.differentiatedRisks);
  const nextActions = dedupeTextList(comparison.nextActions);
  const demoNarrative = getDemoNarrativeByProjectKey(comparison.project?.projectKey);
  const clientPilotPackage = getClientPilotPackageForProject(comparison.project?.projectKey, comparison.project?.clientType);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileAsset[]>([]);
  const [reviewSummaries, setReviewSummaries] = useState<EvidenceReviewSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    const projectKey = comparison.project?.projectKey;
    if (!projectKey) return undefined;
    Promise.all([
      fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(projectKey)}`).then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/validation?projectKey=${encodeURIComponent(projectKey)}`).then((response) => (response.ok ? response.json() : null))
    ])
      .then(([filesPayload, validationPayload]: [{ items?: EvidenceFileAsset[] } | null, { reviewSummaries?: EvidenceReviewSummary[] } | null]) => {
        if (!mounted) return;
        setEvidenceFiles(Array.isArray(filesPayload?.items) ? filesPayload.items : []);
        setReviewSummaries(Array.isArray(validationPayload?.reviewSummaries) ? validationPayload.reviewSummaries : []);
      })
      .catch(() => {
        if (mounted) {
          setEvidenceFiles([]);
          setReviewSummaries([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [comparison.project?.projectKey]);

  return (
    <>
      <ReportShell
        onBack={onBack}
        printableHref={`/reports/${encodeURIComponent(`comparison-report-${comparison.id}`)}/print`}
        printableReportRecord={createPrintableComparisonRecord(comparison)}
      >
        <div className="flex flex-col gap-8">
        <header className="border-b border-line pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">GeoAI</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink">Site Comparison Report</h1>
              <p className="mt-3 text-base leading-7 text-muted">
                Comparing {comparison.items.length} selected locations / assets
              </p>
              <p className="mt-2 text-sm font-semibold text-muted">
                Project: {comparison.project?.name ?? "Dubai Investment Screening"}
              </p>
            </div>
            <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold text-brand">
              Screening comparison
            </span>
          </div>
          <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Compared items</dt>
              <dd className="mt-1 text-ink">{comparison.items.map((item) => item.item.name).join(", ")}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Generated</dt>
              <dd className="mt-1 text-ink">{formatDate()}</dd>
            </div>
            <div className="rounded-md bg-surface p-4">
              <dt className="font-semibold text-muted">Project data mode</dt>
              <dd className="mt-1 capitalize text-ink">
                {formatDataModeLabel(comparison.project?.dataMode)}
              </dd>
            </div>
          </dl>
        </header>

        <Section title="Best Option Recommendation">
          <div className="rounded-md border border-line bg-surface p-5">
            <p className="text-lg font-semibold text-ink">{comparison.winner.item.name}</p>
            <p className="mt-3 text-base leading-7 text-muted">{comparison.whyPreferred}</p>
            <p className="mt-4 text-sm leading-6 text-muted">{comparison.whenAnotherMayBeBetter}</p>
          </div>
        </Section>

        {demoNarrative ? (
          <Section title="Decision Question & Validation Next Action">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Decision question</span>
                <p className="mt-2 leading-6 text-ink">{demoNarrative.decisionQuestion}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4">
                <span className="font-semibold text-muted">Validation next action</span>
                <p className="mt-2 leading-6 text-ink">{clientPilotPackage.validationRequirements[0]}</p>
              </div>
              <div className="rounded-md border border-line bg-surface p-4 md:col-span-2">
                <span className="font-semibold text-muted">Workflow bridge</span>
                <p className="mt-2 leading-6 text-ink">{demoNarrative.pilotBridge}</p>
                <p className="mt-3 text-xs leading-5 text-muted">{demoNarrative.caveat}</p>
              </div>
            </div>
          </Section>
        ) : null}

        <Section title="Map Context">
          <MapContextCard
            title="Comparison Map Context"
            subtitle="Selected locations / assets in synthetic Dubai context"
            comparison={comparison}
            reportMode
          />
        </Section>

        <Section title="Comparison Table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line px-3 py-3 font-semibold text-muted">Metric</th>
                  {comparison.items.map((scorecard, index) => (
                    <th key={createStableKey("comparison-report-head", scorecard.item.id, index)} className="border-b border-line px-3 py-3 font-semibold text-ink">
                      {scorecard.item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreOrder.map((scoreKey) => (
                  <tr key={scoreKey}>
                    <td className="border-b border-line px-3 py-3 text-muted">{scoreLabels[scoreKey]}</td>
                    {comparison.items.map((scorecard, index) => (
                      <td key={createStableKey(`${scoreKey}-report-score`, scorecard.item.id, index)} className="border-b border-line px-3 py-3 font-semibold text-ink">
                        {scorecard.scores[scoreKey]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="border-b border-line px-3 py-3 text-muted">Recommended Use</td>
                  {comparison.items.map((scorecard, index) => (
                    <td key={createStableKey("comparison-report-use", scorecard.item.id, index)} className="border-b border-line px-3 py-3 text-muted">
                      {scorecard.recommendedUse}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Score Cards">
          <div className="grid gap-4 md:grid-cols-3">
            {comparison.items.map((scorecard, index) => (
              <div key={createStableKey("comparison-report-card", scorecard.item.id, index)} className="rounded-md border border-line p-4">
                <p className="text-sm font-semibold text-ink">{scorecard.item.name}</p>
                <p className="mt-2 text-3xl font-semibold text-brand">{scorecard.overallScore}</p>
                <p className="mt-2 text-sm text-muted">{scorecard.riskLevel} risk</p>
                <p className="mt-3 text-sm leading-6 text-muted">{scorecard.recommendedUse}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Key Risks By Option">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {comparison.items.map((item, index) => (
                <li key={createStableKey("comparison-report-key-risk", item.item.id, index)}>{item.item.name}: {item.keyConcern}</li>
              ))}
            </ul>
          </Section>
          <Section title="Evidence / Data Used">
            <EvidenceSourceCards evidence={comparison.evidence} compact />
          </Section>
        </div>

        <ExternalDataLineageSection comparison={comparison} />

        <Section title="Validation Governance Appendix">
          <ValidationGovernanceAppendix projectName={comparison.project?.name} evidenceFiles={evidenceFiles} reviewSummaries={reviewSummaries} compact />
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Shared Opportunities">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {sharedOpportunities.map((item, index) => (
                <li key={createStableKey("comparison-report-shared-opportunity", item, index)}>{item}</li>
              ))}
            </ul>
          </Section>
          <Section title="Differentiated Risks">
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {differentiatedRisks.map((item, index) => (
                <li key={createStableKey("comparison-report-differentiated-risk", item, index)}>{item}</li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Recommended Next Actions">
          <ol className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {nextActions.map((item, index) => (
              <li key={createStableKey("comparison-report-next-action", item, index)} className="rounded-md bg-surface p-4">
                <span className="font-semibold text-brand">{index + 1}. </span>{item}
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Data Honesty">
          <p className="text-sm leading-6 text-muted">{requiredDataCaveat}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            This comparison is an MVP screening output using sample/open, local snapshot, uploaded or validation-required context. It does not claim live official integration, production readiness or pilot readiness.
          </p>
        </Section>
        </div>
      </ReportShell>
      <PrintableReport mode="comparison" comparison={comparison} />
    </>
  );
}

export function ReportPreview(props: ReportPreviewProps) {
  if (props.mode === "analysis") {
    return <AnalysisReport analysis={props.analysis} onBack={props.onBack} />;
  }

  return <ComparisonReport comparison={props.comparison} onBack={props.onBack} />;
}

import { ReportPrintMap } from "@/components/reports/report-print-map";
import { ReportMapSnapshot as ReportMapSnapshotView } from "@/components/reports/report-map-snapshot";
import {
  PrintCard,
  PrintList,
  PrintPage,
  PrintSection,
  ReportHeader,
  SourceLineagePrintSection
} from "@/components/reports/report-print-primitives";
import { userDrawnAoiSourceCode, userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import {
  buildAnalysisReportDecisionResult,
  DECISION_RESULT_CAVEAT
} from "@/src/lib/dashboard/dashboard-model";
import type { ReportMapSnapshot } from "@/src/lib/report-map-snapshot";
import { scoreSummaryRows, type AnalysisReportDeliverable } from "@/src/lib/report-deliverables";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function formatCoordinate(point: AnalysisReportDeliverable["coordinates"]) {
  if (!point) return "Coordinates unavailable";
  return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
}

function formatArea(areaSqM?: number) {
  if (!areaSqM && areaSqM !== 0) return "Not available";
  return areaSqM >= 1_000_000
    ? `${(areaSqM / 1_000_000).toFixed(2)} sq km`
    : `${Math.round(areaSqM).toLocaleString()} sq m`;
}

function formatPerimeter(perimeterM?: number) {
  if (!perimeterM && perimeterM !== 0) return "Not available";
  return perimeterM >= 1_000
    ? `${(perimeterM / 1_000).toFixed(2)} km`
    : `${Math.round(perimeterM).toLocaleString()} m`;
}

function prepareMapSnapshot(snapshot: ReportMapSnapshot, targetLabel: string): ReportMapSnapshot {
  const attribution = snapshot.attribution;
  if (!attribution) return { ...snapshot, targetLabel };

  return {
    ...snapshot,
    targetLabel,
    attribution: {
      ...attribution,
      compactLabel: "Map and screening context",
      overlayAttributions: attribution.overlayAttributions.map((record) => ({
        ...record,
        sourceName: record.kind === "user_data" ? record.sourceName : "Illustrative local screening geometry",
        notice: record.kind === "user_data"
          ? record.notice
          : "Illustrative local screening geometry; source and boundary validation required before decision use."
      })),
      caveat: DECISION_RESULT_CAVEAT
    }
  };
}

export function AnalysisReportPrint({ report }: { report: AnalysisReportDeliverable }) {
  const scoreRows = scoreSummaryRows(report.scoreSummary);
  const spatialContext = report.selectedObject?.spatialContext;
  const decisionResult = buildAnalysisReportDecisionResult(report);
  const targetLabel = decisionResult.target.label;
  const scenarioLabel = decisionResult.scenario.label;
  const decisionPosture = decisionResult.decision.posture;
  const decisionSummary = decisionResult.decision.rationale;
  const decisionDetail = decisionResult.decision.detail;
  const confidenceLabel = decisionResult.confidence.label;
  const suitabilityScore = decisionResult.primaryScore !== null ? `${decisionResult.primaryScore}/100` : "Not available";
  const hasIllustrativeSourceBasis =
    decisionResult.sourceBasis.label.toLowerCase().includes("illustrative") ||
    decisionResult.sourceBasis.items.some((item) => item.toLowerCase().includes("illustrative"));
  const marketContextLabel = hasIllustrativeSourceBasis
    ? "Illustrative local market screening context"
    : "Screening market context";
  const recommendedNextAction = decisionResult.nextAction.label;
  const dashboardDrivers = decisionResult.drivers.map((item) => item.detail);
  const dashboardRisks = decisionResult.risks.map((item) => item.detail);

  return (
    <article className="geoai-print-report" data-decision-contract-version={decisionResult.contractVersion}>
      <PrintPage className="geoai-print-cover-page">
        <ReportHeader
          title="GeoAI Analysis Report"
          subtitle={report.subtitle}
          badge="Screening decision brief"
        />

        <div className="geoai-print-top-grid">
          <PrintSection title="Site Context Map">
            {report.mapSnapshot ? (
              <>
            <ReportMapSnapshotView snapshot={prepareMapSnapshot(report.mapSnapshot, targetLabel)} className="geoai-print-map-snapshot" />
                <p className="geoai-print-note">Captured from the saved GeoAI workspace context. Review the recorded attribution and capture timestamp before distribution.</p>
              </>
            ) : (
              <>
                <ReportPrintMap
                  title={targetLabel}
                  subtitle="Illustrative site / AOI screening context"
                  coordinates={formatCoordinate(report.coordinates)}
                  geometryLabel={report.analysisTarget?.geometry?.type ?? spatialContext?.geometryType ?? "Point selection"}
                />
                <p className="geoai-print-note">Illustrative schematic context only; no rendered basemap capture was stored with this report. Official map, planning and cadastral validation required.</p>
              </>
            )}
          </PrintSection>

          <section className="geoai-print-executive avoid-break" data-report-section="Executive Decision">
            <h2>Executive Decision</h2>
            <p data-report-field="rationale">{decisionSummary}</p>
            {decisionDetail !== decisionSummary ? <p className="geoai-print-note">{decisionDetail}</p> : null}
            <div className="geoai-print-action-callout" data-report-field="next-action">
              <span>Recommended next action: </span>
              <strong>{recommendedNextAction}</strong>
            </div>
            <div className="geoai-print-mini-grid">
              <PrintCard label="Suitability" value={suitabilityScore} field="suitability" />
              <PrintCard label="Confidence" value={confidenceLabel} field="confidence" />
              <PrintCard label="Validation" value={decisionResult.validation.status} field="validation" />
              <PrintCard label="Source basis" value={decisionResult.sourceBasis.label} />
            </div>
          </section>
        </div>

        <div className="geoai-print-meta-grid">
          <PrintCard label="Selected target" value={targetLabel} field="target" />
          <PrintCard label="Scenario" value={scenarioLabel} field="scenario" />
          <PrintCard label="Decision posture" value={decisionPosture} field="decision-posture" />
          <PrintCard label="Coordinates" value={decisionResult.coordinates?.label ?? formatCoordinate(report.coordinates)} field="coordinates" />
          <PrintCard label="Result generated" value={formatDate(decisionResult.generatedAt)} field="generated-at" />
          <PrintCard label="Generated by" value="GeoAI" />
        </div>

        <div className="geoai-print-provenance-strip avoid-break">
          <PrintCard label="Project" value={report.analysis?.project?.name ?? report.title} />
          <PrintCard label="Evidence state" value={decisionResult.sourceBasis.label} />
          <PrintCard label="Distribution boundary" value="Review caveats and source lineage before external use" />
        </div>

        <div className="geoai-print-two-col">
          <PrintSection title="Decision Question">
            <p data-report-field="decision-question">{decisionResult.decisionQuestion}</p>
          </PrintSection>
          <PrintSection title="Validation Next Action">
            <p>{decisionResult.nextAction.detail}</p>
            <p className="geoai-print-note">{decisionResult.caveat}</p>
          </PrintSection>
        </div>
      </PrintPage>

      <PrintPage>
        <PrintSection title="Score Overview">
          <div className="geoai-print-score-grid">
            {scoreRows.map((score) => (
              <PrintCard key={score.label} label={score.label} value={`${score.value}/100`} />
            ))}
          </div>
        </PrintSection>

        <div className="geoai-print-two-col">
          <PrintSection title="Key Decision Drivers">
            <PrintList items={dashboardDrivers.slice(0, 4)} />
          </PrintSection>
          <PrintSection title="Risk & Constraints">
            <PrintList items={dashboardRisks.slice(0, 4)} />
          </PrintSection>
        </div>

        <div className="geoai-print-two-col">
          <PrintSection title="Validation Gaps">
            <PrintList items={decisionResult.validation.gaps.map((item) => item.detail).slice(0, 4)} />
          </PrintSection>
          <PrintSection title="Market / Spatial Context">
            <div className="geoai-print-mini-grid">
              <PrintCard label="Market context" value={marketContextLabel} />
              <PrintCard label="Source mode" value={decisionResult.sourceBasis.label} />
              <PrintCard label="Object type" value={decisionResult.target.type} />
              <PrintCard label="Geometry status" value={decisionResult.validation.status} />
            </div>
          </PrintSection>
        </div>

        {report.selectedAoi ? (
          <PrintSection title={`${userDrawnAoiSourceLabel(report.selectedAoi)} Details`}>
            <div className="geoai-print-score-grid">
              <PrintCard label="Geometry" value="Polygon" />
              <PrintCard label="Area" value={formatArea(report.selectedAoi.measurements.areaSqM)} />
              <PrintCard label="Perimeter" value={formatPerimeter(report.selectedAoi.measurements.perimeterM)} />
              <PrintCard label="Vertices" value={String(report.selectedAoi.measurements.vertexCount)} />
              <PrintCard label="Source" value={userDrawnAoiSourceCode(report.selectedAoi)} />
              <PrintCard label="Status" value="Official validation required" />
            </div>
            <p className="geoai-print-note">{report.selectedAoi.limitations[0]}</p>
          </PrintSection>
        ) : null}

      </PrintPage>

      <PrintPage>
        <PrintSection title="Evidence / Source Basis">
          <p><strong>{decisionResult.sourceBasis.label}</strong></p>
          <PrintList items={[...decisionResult.sourceBasis.items]} />
        </PrintSection>

        <SourceLineagePrintSection lineage={report.sourceLineage} />

        <div className="geoai-print-two-col">
          <PrintSection title="Validation Checklist">
            <PrintList items={decisionResult.validation.gaps.map((item) => item.detail)} />
          </PrintSection>
          <PrintSection title="Recommended Next Actions">
            <PrintList items={[decisionResult.nextAction.detail]} ordered />
          </PrintSection>
        </div>

        <PrintSection title="Data Honesty Disclaimer">
          <p data-report-field="caveat">{DECISION_RESULT_CAVEAT}</p>
          <p>Engineering and insurance-grade assessment, where relevant, remains outside this screening result.</p>
        </PrintSection>
      </PrintPage>
    </article>
  );
}

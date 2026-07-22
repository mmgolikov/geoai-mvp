import { ReportPrintMap } from "@/components/reports/report-print-map";
import { ReportMapSnapshot } from "@/components/reports/report-map-snapshot";
import { ValidationGovernanceAppendix } from "@/components/validation-governance-appendix";
import {
  PrintCard,
  PrintList,
  PrintPage,
  PrintSection,
  ReportHeader,
  SourceLineagePrintSection
} from "@/components/reports/report-print-primitives";
import { getDemoNarrativeByProjectKey } from "@/src/data/demo-narratives";
import { getClientPilotPackageForProject } from "@/src/data/pilot-packages";
import { userDrawnAoiSourceCode, userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { buildDashboardModel } from "@/src/lib/dashboard/dashboard-model";
import { scoreSummaryRows, type AnalysisReportDeliverable } from "@/src/lib/report-deliverables";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
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

const requiredDataCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning, engineering, insurance or valuation conclusion.";

export function AnalysisReportPrint({ report }: { report: AnalysisReportDeliverable }) {
  const scoreRows = scoreSummaryRows(report.scoreSummary);
  const spatialContext = report.selectedObject?.spatialContext;
  const demoNarrative = getDemoNarrativeByProjectKey(report.projectKey);
  const clientPilotPackage = getClientPilotPackageForProject(report.projectKey);
  const dashboardModel = report.analysis ? buildDashboardModel(report.analysis) : null;
  const targetLabel = dashboardModel?.targetLabel ?? report.targetLabel;
  const scenarioLabel = dashboardModel?.scenarioLabel ?? report.scenario;
  const decisionPosture = dashboardModel?.decisionPosture ?? report.decisionPosture;
  const decisionSummary = dashboardModel?.decisionSummary ?? report.executiveMemo;
  const decisionDetail = dashboardModel?.decisionDetail ?? report.executiveMemo;
  const confidenceLabel = dashboardModel?.confidenceLabel ?? report.analysis?.confidenceLevel ?? "Medium";
  const suitabilityScore = dashboardModel ? `${dashboardModel.primaryScore}/100` : "Not available";
  const recommendedNextAction = dashboardModel?.recommendedNextAction ?? report.nextActions[0] ?? "Validate sources";
  const analysisModeLabel = report.analysis?.analysisMode === "openai" ? "AI-generated" : "Sample/open fallback";
  const dashboardDrivers = dashboardModel?.drivers.map((item) => item.detail) ?? report.keyFindings;
  const dashboardRisks = dashboardModel?.risks.map((item) => item.detail) ?? report.risks;
  const distinctLimitations = report.limitations.filter((item, index, items) =>
    item.trim().toLowerCase() !== requiredDataCaveat.toLowerCase() && items.indexOf(item) === index
  );
  const validationRequirement = clientPilotPackage?.validationRequirements[0]
    ?? "Validate market, planning and site evidence against agreed official or client-approved sources.";

  return (
    <article className="geoai-print-report">
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
                <ReportMapSnapshot snapshot={report.mapSnapshot} />
                <p className="geoai-print-note">Captured from the saved GeoAI workspace context. Review the recorded attribution and capture timestamp before distribution.</p>
              </>
            ) : (
              <>
                <ReportPrintMap
                  title={targetLabel}
                  subtitle="Site / AOI screening context"
                  coordinates={formatCoordinate(report.coordinates)}
                  geometryLabel={report.analysisTarget?.geometry?.type ?? spatialContext?.geometryType ?? "Point selection"}
                />
                <p className="geoai-print-note">Schematic context only; no rendered basemap capture was stored with this report. Official map, planning and cadastral validation required.</p>
              </>
            )}
          </PrintSection>

          <section className="geoai-print-executive avoid-break" data-report-section="Executive Decision">
            <h2>Executive Decision</h2>
            <p data-report-field="rationale">{decisionSummary}</p>
            {decisionDetail !== decisionSummary ? <p className="geoai-print-note">{decisionDetail}</p> : null}
            <div className="geoai-print-action-callout" data-report-field="next-action">
              <span>Recommended next action</span>
              <strong>{recommendedNextAction}</strong>
            </div>
            <div className="geoai-print-mini-grid">
              <PrintCard label="Suitability" value={suitabilityScore} field="suitability" />
              <PrintCard label="Confidence" value={confidenceLabel} field="confidence" />
              <PrintCard label="Validation" value="Required" field="validation" />
              <PrintCard label="Analysis mode" value={analysisModeLabel} />
            </div>
          </section>
        </div>

        <div className="geoai-print-meta-grid">
          <PrintCard label="Selected target" value={targetLabel} field="target" />
          <PrintCard label="Scenario" value={scenarioLabel} field="scenario" />
          <PrintCard label="Decision posture" value={decisionPosture} field="decision-posture" />
          <PrintCard label="Coordinates" value={formatCoordinate(report.coordinates)} field="coordinates" />
          <PrintCard label="Saved report timestamp" value={formatDate(report.createdAt)} />
          <PrintCard label="Generated by" value={report.generatedBy} />
        </div>

        <div className="geoai-print-provenance-strip avoid-break">
          <div>
            <span>Project</span>
            <strong>{report.analysis?.project?.name ?? report.projectKey}</strong>
          </div>
          <div>
            <span>Evidence state</span>
            <strong>Screening evidence; source validation remains open</strong>
          </div>
          <div>
            <span>Distribution boundary</span>
            <strong>Review caveats and source lineage before external use</strong>
          </div>
        </div>

        {demoNarrative ? (
          <div className="geoai-print-two-col">
            <PrintSection title="Decision Question">
              <p>{demoNarrative.decisionQuestion}</p>
            </PrintSection>
            <PrintSection title="Validation Next Action">
              <p>{validationRequirement}</p>
              <p className="geoai-print-note">{demoNarrative.caveat}</p>
            </PrintSection>
          </div>
        ) : null}
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
          <PrintSection title="Opportunities">
            <PrintList items={(report.opportunities.length > 0 ? report.opportunities : report.keyFindings).slice(0, 4)} />
          </PrintSection>
          <PrintSection title="Market / Spatial Context">
            <div className="geoai-print-mini-grid">
              <PrintCard label="Market basis" value={report.analysis?.marketContext?.areaName ?? "Sample/open context"} />
              <PrintCard label="Data mode" value={report.analysis?.project?.dataMode?.replace(/_/g, " ") ?? "sample/open"} />
              <PrintCard label="Object type" value={report.selectedAoi ? userDrawnAoiSourceLabel(report.selectedAoi) : spatialContext?.subtype ?? report.selectedObject?.type ?? "point / site"} />
              <PrintCard label="Geometry confidence" value={report.selectedAoi?.confidence ?? spatialContext?.confidenceLevel ?? "validation required"} />
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

        <PrintSection title="Screening Signals / Source Basis">
          <PrintList
            items={[
              "Screening output uses deterministic scores and Data Foundation source-readiness fields.",
              "Source basis must be reviewed by group, data mode, confidence and next validation step.",
              "Market signals require validation against agreed market snapshots or client-approved data.",
              "Spatial and geometry context remains screening-level unless validated by authorized sources."
            ]}
          />
        </PrintSection>
      </PrintPage>

      <PrintPage>
        <SourceLineagePrintSection lineage={report.sourceLineage} />

        <div className="geoai-print-two-col">
          <PrintSection title="Validation Checklist">
            <PrintList items={report.validationChecklist} />
          </PrintSection>
          <PrintSection title="Recommended Next Actions">
            <PrintList items={report.nextActions.slice(0, 6)} ordered />
          </PrintSection>
        </div>

        <PrintSection title="Validation Governance Appendix">
          <ValidationGovernanceAppendix projectName={report.analysis?.project?.name ?? report.title} compact printMode />
        </PrintSection>

        <PrintSection title="Data Honesty Disclaimer">
          <p>{requiredDataCaveat}</p>
          {report.dataHonestyNote.trim().toLowerCase() !== requiredDataCaveat.toLowerCase() ? <p>{report.dataHonestyNote}</p> : null}
          {distinctLimitations.slice(0, 4).map((item, index) => (
            <p key={`analysis-print-limitation-${index}`}>{item}</p>
          ))}
        </PrintSection>
      </PrintPage>
    </article>
  );
}

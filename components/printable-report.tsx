"use client";

import { getDataSourceById } from "@/src/data/data-source-registry";
import ingestionReport from "@/data/normalized/ingestion_report.json";
import { ValidationGovernanceAppendix } from "@/components/validation-governance-appendix";
import { deriveDataConfidenceLevel } from "@/src/data/data-maturity";
import { deriveDecisionPosture, deriveDecisionRationale } from "@/src/lib/decision-posture";
import { userDrawnAoiSourceCode, userDrawnAoiSourceLabel } from "@/src/lib/aoi-library";
import { formatArea, formatPerimeter } from "@/src/lib/polygon-aoi";
import type { ComparisonResult, ExpressAnalysis, ScoreKey } from "@/src/types/geo";

type PrintableReportProps =
  | {
      mode: "analysis";
      analysis: ExpressAnalysis;
    }
  | {
      mode: "comparison";
      comparison: ComparisonResult;
    };

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

const comparisonScoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development Potential",
  investmentAttractiveness: "Investment Attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure Readiness",
  climateHeatRisk: "Climate / Heat Risk",
  overallRisk: "Overall Risk"
};

function formatDate(value?: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(value ? new Date(value) : new Date());
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-memo-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function PrintCard({ children }: { children: React.ReactNode }) {
  return <div className="print-memo-card">{children}</div>;
}

function PrintList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="print-memo-card">
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => (
          <li key={createStableKey(title, item, index)}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PrintMapBlock({
  title,
  coordinates,
  note
}: {
  title: string;
  coordinates: string;
  note: string;
}) {
  return (
    <div className="print-map-block">
      <div className="print-map-grid" />
      <div className="print-map-zone zone-a" />
      <div className="print-map-zone zone-b" />
      <div className="print-map-zone zone-c" />
      <div className="print-map-marker">
        <span />
        <strong>{title}</strong>
      </div>
      <div className="print-map-caption">
        <strong>{coordinates}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}

function EvidenceTable({ evidence }: { evidence: ExpressAnalysis["evidence"] | ComparisonResult["evidence"] }) {
  return (
    <div className="print-evidence-grid">
      {evidence.map((item) => {
        const source = getDataSourceById(item.sourceId);

        return (
          <PrintCard key={item.id}>
            <div className="print-evidence-head">
              <strong>{item.label}</strong>
              <span>{item.sourceStatus}</span>
            </div>
            <p>{item.description}</p>
            <small>
              {source?.name ?? item.sourceId} / {source?.provider ?? "Provider unavailable"} / {source?.reliabilityLevel ?? item.confidence} reliability
            </small>
          </PrintCard>
        );
      })}
    </div>
  );
}

function UploadedDataPrintBlock({ analysis }: { analysis: ExpressAnalysis }) {
  const context = analysis.uploadedDataContext;

  if (!context || context.uploadedDatasets.length === 0) {
    return null;
  }

  return (
    <PrintSection title="Source Lineage / Uploaded Data Used">
      <div className="print-score-grid">
        {context.uploadedDatasets.map((dataset) => {
          const applied = context.appliedMetrics.find((match) => match.datasetId === dataset.id);
          const available = context.availableButNotApplied.find((match) => match.datasetId === dataset.id);

          return (
            <PrintCard key={dataset.id}>
              <strong>{dataset.name}</strong>
              <span>{dataset.type} / {dataset.sourceMode.replace(/-/g, " ")}</span>
              <small>{applied?.note ?? available?.note ?? dataset.notes ?? "Local upload available as validation-required context."}</small>
              <small>Official status: {dataset.officialStatus.replace(/-/g, " ")} / confidence: {dataset.confidence.replace(/-/g, " ")}</small>
            </PrintCard>
          );
        })}
      </div>
    </PrintSection>
  );
}

function AnalysisPrintable({ analysis }: { analysis: ExpressAnalysis }) {
  const analysisMode = analysis.analysisMode === "openai" ? "AI-generated" : "Demo fallback";
  const siteName = analysis.selectedAoi?.name ?? analysis.selectedObject?.name ?? "Custom map point";
  const coordinates = formatCoordinate(analysis.point.latitude, analysis.point.longitude);
  const constraints = analysis.risks.slice(0, 4);
  const valueDrivers = analysis.keyFactors.slice(0, 6);
  const dataConfidence = deriveDataConfidenceLevel(analysis.evidence);
  const decisionPosture = deriveDecisionPosture(analysis);
  const decisionRationale = deriveDecisionRationale(analysis);
  const marketMetricsMatch = analysis.marketContext?.importedMarketMetrics ?? analysis.marketMetricsMatch;
  const importedMetric = marketMetricsMatch?.metrics;

  return (
    <article className="print-memo">
      <header className="print-memo-header">
        <div>
          <p className="print-brand">GeoAI</p>
          <h1>Express Analysis / Investment Memo</h1>
          <p>{analysis.title}</p>
        </div>
        <div className="print-status">{analysisMode}</div>
      </header>

      <section className="print-memo-meta">
        <PrintCard><strong>Selected site</strong><span>{siteName}</span></PrintCard>
        <PrintCard><strong>Coordinates</strong><span>{coordinates}</span></PrintCard>
        <PrintCard><strong>Scenario</strong><span>{analysis.title}</span></PrintCard>
        <PrintCard><strong>Project</strong><span>{analysis.project?.name ?? "Dubai Investment Screening Demo"}</span></PrintCard>
        <PrintCard><strong>Client type</strong><span>{analysis.project?.clientType?.replace(/_/g, " ") ?? "fund"}</span></PrintCard>
        <PrintCard><strong>Data mode</strong><span>{analysis.project?.dataMode?.replace(/_/g, " ") ?? "demo normalized"}</span></PrintCard>
        <PrintCard><strong>Generated</strong><span>{formatDate(analysis.generatedAt)}</span></PrintCard>
        <PrintCard><strong>Confidence</strong><span>{analysis.confidenceLevel ?? "medium"}</span></PrintCard>
        <PrintCard><strong>Data confidence</strong><span>{dataConfidence}</span></PrintCard>
        <PrintCard><strong>Decision posture</strong><span>{decisionPosture}</span></PrintCard>
      </section>

      <PrintSection title="Decision Posture">
        <PrintCard>
          <strong>{decisionPosture}</strong>
          <p>{decisionRationale}</p>
        </PrintCard>
      </PrintSection>

      <PrintSection title="Executive Summary">
        <p>{analysis.summary}</p>
      </PrintSection>

      <PrintSection title="Score Overview">
        <div className="print-score-grid">
          {scoreOrder.map((scoreKey) => (
            <PrintCard key={scoreKey}>
              <strong>{analysis.scoreLabels[scoreKey]}</strong>
              <span className="print-score">{analysis.scores[scoreKey]}</span>
            </PrintCard>
          ))}
        </div>
      </PrintSection>

      {analysis.aiDecisionScore ? (
        <PrintSection title="AI Decision Memo">
          <div className="print-score-grid">
            <PrintCard><strong>Mode</strong><span>{analysis.aiDecisionScore.mode === "openai" ? "OpenAI scoring" : "Deterministic fallback"}</span></PrintCard>
            <PrintCard><strong>Decision posture</strong><span>{analysis.aiDecisionScore.decisionPosture.replace(/_/g, " ")}</span></PrintCard>
            <PrintCard><strong>Recommended use</strong><span>{analysis.aiDecisionScore.recommendedUse.replace(/_/g, " ")}</span></PrintCard>
            <PrintCard><strong>Suitability / risk</strong><span>{analysis.aiDecisionScore.suitabilityScore}/100 / {analysis.aiDecisionScore.riskScore}/100</span></PrintCard>
          </div>
          <PrintList title="Key drivers" items={analysis.aiDecisionScore.keyDrivers.slice(0, 3)} />
          <PrintList title="Validation required" items={analysis.aiDecisionScore.validationRequired.slice(0, 3)} />
          <p>{analysis.aiDecisionScore.caveat}</p>
        </PrintSection>
      ) : null}

      <PrintSection title="Map Context">
        <PrintMapBlock
          title={siteName}
          coordinates={coordinates}
          note="Print-safe synthetic map context. Live Mapbox controls are hidden in print."
        />
      </PrintSection>

      {analysis.marketContext ? (
        <PrintSection title="Market Data Basis">
          <div className="print-score-grid">
            <PrintCard><strong>Matched area</strong><span>{marketMetricsMatch?.matchedAreaName ?? analysis.marketContext.areaName}</span></PrintCard>
            <PrintCard><strong>Source mode</strong><span>{marketMetricsMatch?.sourceMode ?? analysis.marketContext.sourceMode ?? "seed_static"}</span></PrintCard>
            <PrintCard><strong>Match confidence</strong><span>{marketMetricsMatch?.confidence ?? analysis.marketContext.confidenceLevel}</span></PrintCard>
            <PrintCard><strong>Imported metrics used</strong><span>{marketMetricsMatch?.importedMetricsUsed ? "yes" : "no"}</span></PrintCard>
            {importedMetric ? (
              <>
                <PrintCard><strong>Transactions</strong><span>{importedMetric.transactionCount} / AED {importedMetric.transactionValueAed.toLocaleString("en-US")}</span></PrintCard>
                <PrintCard><strong>Median price</strong><span>{importedMetric.medianPricePerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm</span></PrintCard>
                <PrintCard><strong>Rental records</strong><span>{importedMetric.rentalRecordCount}</span></PrintCard>
                <PrintCard><strong>Median rent</strong><span>{importedMetric.medianRentPerSqm?.toLocaleString("en-US") ?? "-"} AED/sqm</span></PrintCard>
              </>
            ) : null}
            <PrintCard><strong>Market activity</strong><span>{analysis.marketContext.marketActivityLevel.index}/100</span></PrintCard>
            <PrintCard><strong>Rental demand</strong><span>{analysis.marketContext.rentContext.index}/100</span></PrintCard>
            <PrintCard><strong>Liquidity</strong><span>{analysis.marketContext.transactionContext.index}/100</span></PrintCard>
          </div>
          <p>
            {marketMetricsMatch?.importedMetricsUsed
              ? "Imported sample metrics demonstrate the market-data workflow and require official DLD / Dubai Pulse validation before investment decisions."
              : "Seed_static demo metrics used because imported market metrics did not match this selection."}
          </p>
        </PrintSection>
      ) : null}

      {analysis.selectedObject?.spatialContext ? (
        <PrintSection title="Spatial Object Details">
          <div className="print-score-grid">
            <PrintCard><strong>Category</strong><span>{analysis.selectedObject.spatialContext.category.replace(/_/g, " ")}</span></PrintCard>
            <PrintCard><strong>Subtype</strong><span>{analysis.selectedObject.spatialContext.subtype}</span></PrintCard>
            <PrintCard><strong>Geometry</strong><span>{analysis.selectedObject.spatialContext.geometryType}</span></PrintCard>
            <PrintCard><strong>Source status</strong><span>{analysis.selectedObject.spatialContext.sourceStatus}</span></PrintCard>
          </div>
        </PrintSection>
      ) : null}

      {analysis.selectedAoi ? (
        <PrintSection title={`${userDrawnAoiSourceLabel(analysis.selectedAoi)} Details`}>
          <div className="print-score-grid">
            <PrintCard><strong>Geometry</strong><span>Polygon AOI</span></PrintCard>
            <PrintCard><strong>Area</strong><span>{formatArea(analysis.selectedAoi.measurements.areaSqM)}</span></PrintCard>
            <PrintCard><strong>Perimeter</strong><span>{formatPerimeter(analysis.selectedAoi.measurements.perimeterM)}</span></PrintCard>
            <PrintCard><strong>Vertices</strong><span>{analysis.selectedAoi.measurements.vertexCount}</span></PrintCard>
            <PrintCard><strong>Source</strong><span>{userDrawnAoiSourceCode(analysis.selectedAoi)}</span></PrintCard>
            <PrintCard><strong>Status</strong><span>official validation required</span></PrintCard>
          </div>
          <p>{analysis.selectedAoi.limitations[0]}</p>
        </PrintSection>
      ) : null}

      <PrintSection title="Key Value Drivers">
        <ul className="print-two-col-list">
          {valueDrivers.map((item, index) => <li key={createStableKey("print-value-driver", item, index)}>{item}</li>)}
        </ul>
      </PrintSection>

      <PrintSection title="Critical Constraints">
        <ul className="print-two-col-list">
          {constraints.map((item, index) => <li key={createStableKey("print-constraint", item, index)}>{item}</li>)}
        </ul>
      </PrintSection>

      <PrintSection title="Data Gaps / Validation Required">
        <ul className="print-two-col-list">
          <li>Official DLD transaction and ownership validation.</li>
          <li>Dubai Municipality / GeoDubai planning and land-use confirmation.</li>
          <li>Infrastructure, transport and utility capacity checks.</li>
          <li>Customer or licensed commercial evidence before underwriting.</li>
        </ul>
      </PrintSection>

      <PrintSection title="Data Confidence / Validation Path">
        <div className="print-score-grid">
          <PrintCard><strong>Used in prototype</strong><span>Synthetic demo layers, seed_static context and deterministic scoring.</span></PrintCard>
          <PrintCard><strong>Official validation</strong><span>DLD, Dubai Pulse and Dubai Municipality / GeoDubai should validate conclusions.</span></PrintCard>
          <PrintCard><strong>DLD / Dubai Pulse ingestion</strong><span>{ingestionReport.marketMetricCount} sample market areas available for validation workflow and conservative matched scoring.</span></PrintCard>
          <PrintCard><strong>Pilot integration</strong><span>Adapter stubs define the next path for permitted official, open, licensed and customer data.</span></PrintCard>
        </div>
      </PrintSection>

      <PrintSection title="Evidence / Data Used">
        <EvidenceTable evidence={analysis.evidence} />
      </PrintSection>

      <PrintSection title="Validation Governance Appendix">
        <ValidationGovernanceAppendix projectName={analysis.project?.name} compact printMode />
      </PrintSection>

      <UploadedDataPrintBlock analysis={analysis} />

      <PrintSection title="Recommended Due Diligence Actions">
        <ol className="print-two-col-list">
          {analysis.nextActions.map((item, index) => <li key={createStableKey("print-analysis-action", item, index)}>{item}</li>)}
        </ol>
      </PrintSection>

      <PrintSection title="Limitations">
        <p>
          Current prototype output demonstrates the decision workflow using demo-normalized indicators. Pilot deployments should validate conclusions against official DLD, Dubai Pulse, Dubai Municipality / GeoDubai, customer and/or licensed datasets.
        </p>
        {analysis.limitations?.map((item, index) => <p key={createStableKey("print-analysis-limitation", item, index)}>{item}</p>)}
      </PrintSection>
    </article>
  );
}

function ComparisonPrintable({ comparison }: { comparison: ComparisonResult }) {
  return (
    <article className="print-memo">
      <header className="print-memo-header">
        <div>
          <p className="print-brand">GeoAI</p>
          <h1>Site Comparison Investment Memo</h1>
          <p>Comparing {comparison.items.length} selected locations / assets</p>
          <p>Project: {comparison.project?.name ?? "Dubai Investment Screening Demo"}</p>
        </div>
        <div className="print-status">Demo comparison</div>
      </header>

      <PrintSection title="Best Option Recommendation">
        <PrintCard>
          <strong>{comparison.winner.item.name}</strong>
          <p>{comparison.whyPreferred}</p>
          <p>{comparison.whenAnotherMayBeBetter}</p>
        </PrintCard>
      </PrintSection>

      <PrintSection title="Score Overview">
        <table className="print-table">
          <thead>
            <tr>
              <th>Metric</th>
              {comparison.items.map((item, index) => <th key={createStableKey("print-comparison-head", item.item.id, index)}>{item.item.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {scoreOrder.map((scoreKey) => (
              <tr key={scoreKey}>
                <td>{comparisonScoreLabels[scoreKey]}</td>
                {comparison.items.map((item, index) => <td key={createStableKey(`${scoreKey}-print-score`, item.item.id, index)}>{item.scores[scoreKey]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title="Map Context">
        <PrintMapBlock
          title={`${comparison.items.length} compared sites`}
          coordinates={comparison.items.map((item) => formatCoordinate(item.item.point.latitude, item.item.point.longitude)).join(" / ")}
          note="Print-safe comparison context using selected coordinates."
        />
      </PrintSection>

      <PrintSection title="Recommended Use And Key Concerns">
        <div className="print-score-grid">
          {comparison.items.map((item, index) => (
            <PrintCard key={createStableKey("print-comparison-card", item.item.id, index)}>
              <strong>{item.item.name}</strong>
              <span className="print-score">{item.overallScore}</span>
              <p>{item.recommendedUse}</p>
              <small>{item.keyConcern}</small>
            </PrintCard>
          ))}
        </div>
      </PrintSection>

      <PrintSection title="Evidence / Data Used">
        <EvidenceTable evidence={comparison.evidence} />
      </PrintSection>

      <PrintSection title="Validation Governance Appendix">
        <ValidationGovernanceAppendix projectName={comparison.project?.name} compact printMode />
      </PrintSection>

      <PrintSection title="Recommended Due Diligence Actions">
        <ol className="print-two-col-list">
          {comparison.nextActions.map((item, index) => <li key={createStableKey("print-comparison-action", item, index)}>{item}</li>)}
        </ol>
      </PrintSection>

      <PrintSection title="Limitations">
        <p>
          Current prototype output demonstrates the decision workflow using demo-normalized indicators. Pilot deployments should validate conclusions against official DLD, Dubai Pulse, Dubai Municipality / GeoDubai, customer and/or licensed datasets.
        </p>
      </PrintSection>
    </article>
  );
}

export function PrintableReport(props: PrintableReportProps) {
  return (
    <div className="print-only">
      {props.mode === "analysis" ? (
        <AnalysisPrintable analysis={props.analysis} />
      ) : (
        <ComparisonPrintable comparison={props.comparison} />
      )}
    </div>
  );
}

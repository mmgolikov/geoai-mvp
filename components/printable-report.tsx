"use client";

import { getDataSourceById } from "@/src/data/data-source-registry";
import { deriveDataConfidenceLevel } from "@/src/data/data-maturity";
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
    minute: "2-digit"
  }).format(value ? new Date(value) : new Date());
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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

function AnalysisPrintable({ analysis }: { analysis: ExpressAnalysis }) {
  const analysisMode = analysis.analysisMode === "openai" ? "AI-generated" : "Demo fallback";
  const siteName = analysis.selectedObject?.name ?? "Custom map point";
  const coordinates = formatCoordinate(analysis.point.latitude, analysis.point.longitude);
  const constraints = analysis.risks.slice(0, 4);
  const valueDrivers = analysis.keyFactors.slice(0, 6);
  const dataConfidence = deriveDataConfidenceLevel(analysis.evidence);

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
        <PrintCard><strong>Decision posture</strong><span>{analysis.nextActions[0] ?? "Proceed to validation"}</span></PrintCard>
      </section>

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

      <PrintSection title="Map Context">
        <PrintMapBlock
          title={siteName}
          coordinates={coordinates}
          note="Print-safe synthetic map context. Live Mapbox controls are hidden in print."
        />
      </PrintSection>

      {analysis.marketContext ? (
        <PrintSection title="Market Context">
          <div className="print-score-grid">
            <PrintCard><strong>Area</strong><span>{analysis.marketContext.areaName}</span></PrintCard>
            <PrintCard><strong>Market activity</strong><span>{analysis.marketContext.marketActivityLevel.index}/100</span></PrintCard>
            <PrintCard><strong>Rental demand</strong><span>{analysis.marketContext.rentContext.index}/100</span></PrintCard>
            <PrintCard><strong>Liquidity</strong><span>{analysis.marketContext.transactionContext.index}/100</span></PrintCard>
          </div>
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

      <PrintSection title="Key Value Drivers">
        <ul className="print-two-col-list">{valueDrivers.map((item) => <li key={item}>{item}</li>)}</ul>
      </PrintSection>

      <PrintSection title="Critical Constraints">
        <ul className="print-two-col-list">{constraints.map((item) => <li key={item}>{item}</li>)}</ul>
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
          <PrintCard><strong>Pilot integration</strong><span>Adapter stubs define the next path for permitted official, open, licensed and customer data.</span></PrintCard>
        </div>
      </PrintSection>

      <PrintSection title="Evidence / Data Used">
        <EvidenceTable evidence={analysis.evidence} />
      </PrintSection>

      <PrintSection title="Recommended Due Diligence Actions">
        <ol className="print-two-col-list">{analysis.nextActions.map((item) => <li key={item}>{item}</li>)}</ol>
      </PrintSection>

      <PrintSection title="Limitations">
        <p>
          Current prototype output demonstrates the decision workflow using demo-normalized indicators. Pilot deployments should validate conclusions against official DLD, Dubai Pulse, Dubai Municipality / GeoDubai, customer and/or licensed datasets.
        </p>
        {analysis.limitations?.map((item) => <p key={item}>{item}</p>)}
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
              {comparison.items.map((item) => <th key={item.item.id}>{item.item.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {scoreOrder.map((scoreKey) => (
              <tr key={scoreKey}>
                <td>{comparisonScoreLabels[scoreKey]}</td>
                {comparison.items.map((item) => <td key={item.item.id}>{item.scores[scoreKey]}</td>)}
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
          {comparison.items.map((item) => (
            <PrintCard key={item.item.id}>
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

      <PrintSection title="Recommended Due Diligence Actions">
        <ol className="print-two-col-list">{comparison.nextActions.map((item) => <li key={item}>{item}</li>)}</ol>
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

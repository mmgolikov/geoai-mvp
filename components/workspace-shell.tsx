"use client";

import { useEffect, useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { ReportPreview } from "@/components/report-preview";
import {
  createEvidenceItem,
  getDataSourceById,
  getScenarioDataSources
} from "@/src/data/data-source-registry";
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type { StructuredAnalysisResult } from "@/src/types/analysis";
import type {
  AnalysisScenarioId,
  AnalysisHistoryItem,
  ComparisonItem,
  ComparisonResult,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";
import type { MarketContext } from "@/src/types/market-context";

const analysisHistoryStorageKey = "geoai-analysis-history-v1";
const maxAnalysisHistoryItems = 8;

type BackendStatus = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "local_only";
  message: string;
  sources_count: number | null;
};

type AnalysisRunsResponse = {
  ok: boolean;
  mode: "db" | "local_only";
  items: unknown[];
  error: string | null;
};

type PersistedAnalysisRun = {
  id?: string;
  run_key?: string;
  scenario_id?: AnalysisScenarioId;
  selected_name?: string;
  selected_type?: string;
  selected_point?: SelectedPoint;
  selected_object?: SelectedDemoObject | null;
  result_json?: ExpressAnalysis;
  result_payload?: ExpressAnalysis;
  decision_posture?: string | null;
  confidence_level?: ExpressAnalysis["confidenceLevel"];
  data_confidence_level?: string | null;
  analysis_mode?: ExpressAnalysis["analysisMode"];
  created_at?: string;
};

function titledText(title: string, description: string) {
  return title ? `${title}: ${description}` : description;
}

function mergeNarrativeAnalysis(
  deterministicAnalysis: ExpressAnalysis,
  narrative: StructuredAnalysisResult
): ExpressAnalysis {
  return {
    ...deterministicAnalysis,
    summary: narrative.executive_summary || deterministicAnalysis.summary,
    keyFactors:
      narrative.key_factors.length > 0
        ? narrative.key_factors.map((item) => titledText(item.title, item.description))
        : deterministicAnalysis.keyFactors,
    opportunities:
      narrative.opportunities.length > 0
        ? narrative.opportunities.map((item) => titledText(item.title, item.description))
        : deterministicAnalysis.opportunities,
    risks:
      narrative.risks.length > 0
        ? narrative.risks.map((item) => titledText(item.title, item.description))
        : deterministicAnalysis.risks,
    nextActions:
      narrative.recommended_actions.length > 0
        ? narrative.recommended_actions.map((item) => titledText(item.title, item.description))
        : deterministicAnalysis.nextActions,
    analysisMode: narrative.mode,
    confidenceLevel: narrative.confidence_level,
    limitations: narrative.limitations,
    analysisNotice: narrative.notice,
    generatedAt: new Date().toISOString()
  };
}

function withMarketContext(analysis: ExpressAnalysis, marketContext: MarketContext | null): ExpressAnalysis {
  if (!marketContext) {
    return analysis;
  }

  const areaSlug = marketContext.areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const marketEvidence = marketContext.sourceIds.slice(0, 6).map((sourceId, index) => {
    const source = getDataSourceById(sourceId);

    return createEvidenceItem(
      `market-context-${areaSlug}-${sourceId}`,
      sourceId,
      index === 0
        ? `Market context: ${marketContext.areaName}`
        : `Market validation source: ${source?.name ?? sourceId}`,
      index === 0
        ? `${marketContext.sourceMode ?? "seed_static"} market context matched to ${marketContext.areaName}. ${marketContext.dataQualityNotes?.[0] ?? "Current values are demo-normalized indices, not official market data."}`
        : `Planned validation source for market, planning, infrastructure, or geospatial context related to ${marketContext.areaName}.`,
      index === 0 ? "demo" : "medium"
    );
  });

  return {
    ...analysis,
    marketContext,
    evidence: [
      ...marketEvidence.filter(
        (marketItem) => !analysis.evidence.some((item) => item.id === marketItem.id)
      ),
      ...analysis.evidence
    ]
  };
}

function formatLocationLabel(analysis: ExpressAnalysis) {
  return analysis.selectedObject?.name ?? `${analysis.point.latitude.toFixed(5)}, ${analysis.point.longitude.toFixed(5)}`;
}

function createHistoryItem(
  analysis: ExpressAnalysis,
  scenarioLabel: string,
  source: AnalysisHistoryItem["source"] = "local"
): AnalysisHistoryItem {
  return {
    id: `${analysis.id}-${analysis.generatedAt ?? Date.now()}`,
    title: analysis.selectedObject?.name ?? analysis.title,
    scenarioId: analysis.scenarioId,
    scenarioLabel,
    timestamp: analysis.generatedAt ?? new Date().toISOString(),
    locationLabel: formatLocationLabel(analysis),
    analysisMode: analysis.analysisMode,
    confidenceLevel: analysis.confidenceLevel,
    dataConfidenceLevel: analysis.marketContext?.confidenceLevel,
    source,
    recommendation: analysis.nextActions[0] ?? "Review evidence and validate constraints.",
    analysis
  };
}

function readAnalysisHistory() {
  try {
    const storedHistory = window.localStorage.getItem(analysisHistoryStorageKey);
    if (!storedHistory) {
      return [];
    }

    const parsed = JSON.parse(storedHistory) as AnalysisHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, maxAnalysisHistoryItems) : [];
  } catch {
    return [];
  }
}

function writeAnalysisHistory(items: AnalysisHistoryItem[]) {
  try {
    window.localStorage.setItem(analysisHistoryStorageKey, JSON.stringify(items.slice(0, maxAnalysisHistoryItems)));
  } catch {
    // Local history is a convenience feature; storage failures should not affect analysis.
  }
}

function isPersistedAnalysisRun(value: unknown): value is PersistedAnalysisRun {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function historyItemFromPersistedRun(value: unknown): AnalysisHistoryItem | null {
  if (!isPersistedAnalysisRun(value)) {
    return null;
  }

  const analysis = value.result_json ?? value.result_payload;
  if (!analysis?.id || !analysis.point || !analysis.scenarioId) {
    return null;
  }

  const scenario = analysisScenarios.find((item) => item.id === analysis.scenarioId);

  return {
    id: value.id ?? value.run_key ?? analysis.id,
    title: value.selected_name ?? analysis.selectedObject?.name ?? analysis.title,
    scenarioId: analysis.scenarioId,
    scenarioLabel: scenario?.label ?? analysis.title,
    timestamp: value.created_at ?? analysis.generatedAt ?? new Date().toISOString(),
    locationLabel: formatLocationLabel(analysis),
    analysisMode: value.analysis_mode ?? analysis.analysisMode,
    confidenceLevel: value.confidence_level ?? analysis.confidenceLevel,
    dataConfidenceLevel: value.data_confidence_level ?? analysis.marketContext?.confidenceLevel,
    source: "DB",
    recommendation: value.decision_posture ?? analysis.nextActions[0] ?? "Review evidence and validate constraints.",
    analysis
  };
}

export function WorkspaceShell() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedDemoObject | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<AnalysisScenarioId>("realEstateDevelopment");
  const [customQuery, setCustomQuery] = useState("");
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [reportPreview, setReportPreview] = useState<"analysis" | "comparison" | null>(null);
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [isMarketContextLoading, setIsMarketContextLoading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [analysisHistorySource, setAnalysisHistorySource] = useState<"DB" | "local">("local");
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    const localHistory = readAnalysisHistory();
    setAnalysisHistory(localHistory);

    let isMounted = true;

    fetch("/api/analysis-runs?limit=10")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AnalysisRunsResponse | null) => {
        if (!isMounted || !payload) {
          return;
        }

        if (payload.mode !== "db") {
          setAnalysisHistorySource("local");
          return;
        }

        const dbHistory = payload.items
          .map((item) => historyItemFromPersistedRun(item))
          .filter((item): item is AnalysisHistoryItem => item !== null);

        setAnalysisHistory(dbHistory);
        setAnalysisHistorySource("DB");
      })
      .catch(() => {
        if (isMounted) {
          setAnalysisHistorySource("local");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/db/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((status: BackendStatus | null) => {
        if (isMounted) {
          setBackendStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendStatus(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPoint) {
      setMarketContext(null);
      setIsMarketContextLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsMarketContextLoading(true);

    fetch("/api/context/market", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        point: selectedPoint,
        selectedObject,
        scenarioId: selectedScenario
      }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Market context unavailable");
        }

        return response.json() as Promise<MarketContext>;
      })
      .then((context) => setMarketContext(context))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setMarketContext(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsMarketContextLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedPoint, selectedObject, selectedScenario]);

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setSelectedObject(null);
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function handleObjectSelect(object: SelectedDemoObject) {
    setSelectedObject(object);
    setSelectedPoint(object.center);
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(null);
  }

  function addSelectionToComparison() {
    if (!selectedPoint) {
      return;
    }

    const comparisonItem = createComparisonItem(
      selectedPoint,
      selectedObject,
      selectedScenario
    );

    if (comparisonItems.some((item) => item.id === comparisonItem.id)) {
      setComparisonMessage("This selection is already in the comparison set.");
      return;
    }

    if (comparisonItems.length >= 3) {
      setComparisonMessage("Comparison set is limited to 3 items.");
      return;
    }

    setComparisonItems((items) => [...items, comparisonItem]);
    setComparisonMessage("Selection added to comparison.");
  }

  function removeComparisonItem(itemId: string) {
    setComparisonItems((items) => items.filter((item) => item.id !== itemId));
    setComparison(null);
    setReportPreview(null);
    setComparisonMessage(null);
  }

  function runComparison() {
    if (comparisonItems.length < 2) {
      setComparisonMessage("Add at least 2 items before comparing.");
      return;
    }

    setAnalysis(null);
    setAnalysisError(null);
    setComparisonMessage(null);
    setComparison(createMockComparison(comparisonItems));
    setReportPreview(null);
  }

  function backToMap() {
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
  }

  function saveAnalysisHistory(analysisResult: ExpressAnalysis, scenarioLabel: string) {
    const historyItem = createHistoryItem(analysisResult, scenarioLabel, analysisHistorySource);

    setAnalysisHistory((items) => {
      const nextItems = [
        historyItem,
        ...items.filter((item) => item.analysis.id !== analysisResult.id)
      ].slice(0, maxAnalysisHistoryItems);

      writeAnalysisHistory(nextItems);
      return nextItems;
    });
  }

  async function persistAnalysisRun(analysisResult: ExpressAnalysis, scenarioLabel: string) {
    try {
      await fetch("/api/analysis-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          runKey: analysisResult.id,
          scenarioId: analysisResult.scenarioId,
          selectedName: analysisResult.selectedObject?.name ?? "Custom map selection",
          selectedType: analysisResult.selectedObject ? "object" : "point",
          selectedPoint: analysisResult.point,
          selectedFeatureKey: analysisResult.selectedObject?.spatialContext?.featureId ?? analysisResult.selectedObject?.id ?? null,
          inputContext: {
            scenarioLabel,
            selectedPoint: analysisResult.point,
            selectedObject: analysisResult.selectedObject ?? null,
            marketContext: analysisResult.marketContext ?? null,
            evidence: analysisResult.evidence
          },
          selectedObject: analysisResult.selectedObject ?? null,
          resultJson: analysisResult,
          decisionPosture: analysisResult.nextActions[0] ?? null,
          confidenceLevel: analysisResult.confidenceLevel ?? null,
          dataConfidenceLevel: analysisResult.marketContext?.confidenceLevel ?? null,
          analysisMode: analysisResult.analysisMode ?? null,
          createdAt: analysisResult.generatedAt ?? new Date().toISOString()
        })
      });
    } catch {
      // Persistence is optional in v0.1; local history remains the source of truth.
    }
  }

  function createAnalysisReportPayload(analysisResult: ExpressAnalysis) {
    return {
      analysisRunId: analysisResult.id,
      runKey: analysisResult.id,
      title: "Express Analysis / Investment Memo",
      selectedSite: analysisResult.selectedObject?.name ?? "Custom map selection",
      selectedObject: analysisResult.selectedObject ?? null,
      coordinates: analysisResult.point,
      scenario: analysisResult.title,
      memoJson: analysisResult,
      decisionPosture: analysisResult.nextActions[0] ?? "Proceed to validation",
      scoreOverview: analysisResult.scores,
      keyValueDrivers: analysisResult.keyFactors,
      criticalConstraints: analysisResult.risks,
      dataGaps: analysisResult.limitations ?? [
        "Official parcel, transaction, planning, imagery, and customer evidence are not connected yet."
      ],
      dueDiligenceChecklist: analysisResult.nextActions,
      evidenceSourceReadiness: analysisResult.evidence,
      limitations: analysisResult.limitations ?? [],
      generatedAt: new Date().toISOString()
    };
  }

  function createComparisonReportPayload(comparisonResult: ComparisonResult) {
    return {
      title: "Site Comparison Investment Memo",
      comparedItems: comparisonResult.items.map((item) => ({
        name: item.item.name,
        type: item.item.itemType,
        coordinates: item.item.point,
        scenario: item.item.scenarioLabel,
        overallScore: item.overallScore,
        riskLevel: item.riskLevel,
        recommendedUse: item.recommendedUse,
        keyConcern: item.keyConcern
      })),
      scenario: "Comparison",
      comparisonJson: comparisonResult,
      decisionPosture: `Best option: ${comparisonResult.winner.item.name}`,
      scoreOverview: comparisonResult.items.map((item) => ({
        itemName: item.item.name,
        scores: item.scores,
        overallScore: item.overallScore
      })),
      keyValueDrivers: comparisonResult.sharedOpportunities,
      criticalConstraints: comparisonResult.differentiatedRisks,
      dataGaps: [
        "Financial assumptions, official land-use validation, and customer requirements are not persisted yet."
      ],
      dueDiligenceChecklist: comparisonResult.nextActions,
      evidenceSourceReadiness: comparisonResult.evidence,
      limitations: [
        "Comparison uses deterministic demo scoring and structured evidence readiness, not a validated underwriting model."
      ],
      generatedAt: new Date().toISOString()
    };
  }

  async function persistReport(mode: "analysis" | "comparison") {
    try {
      if (mode === "analysis" && analysis) {
        const reportJson = createAnalysisReportPayload(analysis);
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportKey: `analysis-report-${analysis.id}`,
            runKey: analysis.id,
            reportType: "analysis",
            title: reportJson.title,
            reportJson,
            decisionPosture: reportJson.decisionPosture,
            generatedAt: reportJson.generatedAt
          })
        });
      }

      if (mode === "comparison" && comparison) {
        const reportJson = createComparisonReportPayload(comparison);
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportKey: `comparison-report-${comparison.id}`,
            reportType: "comparison",
            title: reportJson.title,
            reportJson,
            decisionPosture: reportJson.decisionPosture,
            generatedAt: reportJson.generatedAt
          })
        });
      }
    } catch {
      // Export remains print/screen-first; DB persistence is optional.
    }
  }

  function openAnalysisReport() {
    void persistReport("analysis");
    setReportPreview("analysis");
  }

  function openComparisonReport() {
    void persistReport("comparison");
    setReportPreview("comparison");
  }

  function openHistoryItem(item: AnalysisHistoryItem) {
    setSelectedPoint(item.analysis.point);
    setSelectedObject(item.analysis.selectedObject ?? null);
    setSelectedScenario(item.scenarioId);
    setAnalysis(item.analysis);
    setComparison(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setMarketContext(item.analysis.marketContext ?? null);
  }

  function clearAnalysisHistory() {
    setAnalysisHistory([]);
    writeAnalysisHistory([]);
  }

  async function runExpressAnalysis() {
    if (!selectedPoint || isAnalyzing) {
      return;
    }

    if (selectedScenario === "customQuery" && customQuery.trim().length === 0) {
      setAnalysis(null);
      setAnalysisError("Enter a custom question before running Custom Query analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setComparison(null);
    setReportPreview(null);

    const deterministicAnalysis = withMarketContext(
      createMockExpressAnalysis(
        selectedPoint,
        selectedScenario,
        customQuery,
        selectedObject
      ),
      marketContext
    );
    const scenario = analysisScenarios.find((item) => item.id === selectedScenario) ?? analysisScenarios[0];

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          point: selectedPoint,
          selectedObject,
          scenarioId: selectedScenario,
          scenarioLabel: scenario.label,
          customQuery,
          deterministicScores: deterministicAnalysis.scores,
          evidence: deterministicAnalysis.evidence,
          dataSources: getScenarioDataSources(selectedScenario),
          marketContext
        })
      });

      if (!response.ok) {
        throw new Error("Analysis API unavailable");
      }

      const narrative = (await response.json()) as StructuredAnalysisResult;
      const finalAnalysis = mergeNarrativeAnalysis(deterministicAnalysis, narrative);
      setAnalysis(finalAnalysis);
      saveAnalysisHistory(finalAnalysis, scenario.label);
      void persistAnalysisRun(finalAnalysis, scenario.label);
    } catch {
      const fallbackAnalysis: ExpressAnalysis = {
        ...deterministicAnalysis,
        analysisMode: "mock_fallback",
        confidenceLevel: "medium",
        analysisNotice: "AI analysis is unavailable. Using deterministic demo fallback.",
        limitations: [
          "Narrative content is generated from deterministic demo context.",
          "Official parcel, planning, transaction, imagery, and risk data are not connected yet."
        ],
        generatedAt: new Date().toISOString()
      };

      setAnalysis(fallbackAnalysis);
      saveAnalysisHistory(fallbackAnalysis, scenario.label);
      void persistAnalysisRun(fallbackAnalysis, scenario.label);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
      {reportPreview === "analysis" && analysis ? (
        <ReportPreview key={`report-${analysis.id}`} mode="analysis" analysis={analysis} onBack={() => setReportPreview(null)} />
      ) : reportPreview === "comparison" && comparison ? (
        <ReportPreview key={`report-${comparison.id}`} mode="comparison" comparison={comparison} onBack={() => setReportPreview(null)} />
      ) : comparison ? (
        <ComparisonDashboard
          key={comparison.id}
          comparison={comparison}
          onBackToMap={backToMap}
          onExportComparison={openComparisonReport}
        />
      ) : analysis ? (
        <ExpressDashboard
          key={analysis.id}
          analysis={analysis}
          onBackToMap={backToMap}
          onExportReport={openAnalysisReport}
        />
      ) : (
        <MapWorkspace
          key="map-workspace"
          selectedPoint={selectedPoint}
          selectedObject={selectedObject}
          onPointSelect={handlePointSelect}
          onObjectSelect={handleObjectSelect}
        />
      )}
      <AnalysisPanel
        selectedPoint={selectedPoint}
        selectedObject={selectedObject}
        scenarios={analysisScenarios}
        selectedScenario={selectedScenario}
        customQuery={customQuery}
        isAnalyzing={isAnalyzing}
        analysisError={analysisError}
        comparisonItems={comparisonItems}
        comparisonMessage={comparisonMessage}
        analysisHistory={analysisHistory}
        analysisHistorySource={analysisHistorySource}
        hasResult={analysis !== null || comparison !== null}
        analysisMode={analysis?.analysisMode}
        analysisGeneratedAt={analysis?.generatedAt}
        backendStatus={backendStatus}
        marketContext={marketContext}
        isMarketContextLoading={isMarketContextLoading}
        onScenarioChange={(scenario) => {
          setSelectedScenario(scenario);
          setAnalysisError(null);
          setComparisonMessage(null);
        }}
        onCustomQueryChange={(query) => {
          setCustomQuery(query);
          setAnalysisError(null);
        }}
        onRunAnalysis={runExpressAnalysis}
        onAddToComparison={addSelectionToComparison}
        onRemoveComparisonItem={removeComparisonItem}
        onRunComparison={runComparison}
        onOpenHistoryItem={openHistoryItem}
        onClearAnalysisHistory={clearAnalysisHistory}
        onExportCurrentResult={() => {
          if (comparison) {
            openComparisonReport();
            return;
          }

          if (analysis) {
            openAnalysisReport();
          }
        }}
      />
    </div>
  );
}

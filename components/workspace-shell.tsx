"use client";

import { useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { ReportPreview } from "@/components/report-preview";
import { getScenarioDataSources } from "@/src/data/data-source-registry";
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type { StructuredAnalysisResult } from "@/src/types/analysis";
import type {
  AnalysisScenarioId,
  ComparisonItem,
  ComparisonResult,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

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
    analysisNotice: narrative.notice
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

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setSelectedObject(null);
    setAnalysis(null);
    setComparison(null);
    setReportPreview(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
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

    const deterministicAnalysis = createMockExpressAnalysis(
      selectedPoint,
      selectedScenario,
      customQuery,
      selectedObject
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
          dataSources: getScenarioDataSources(selectedScenario)
        })
      });

      if (!response.ok) {
        throw new Error("Analysis API unavailable");
      }

      const narrative = (await response.json()) as StructuredAnalysisResult;
      setAnalysis(mergeNarrativeAnalysis(deterministicAnalysis, narrative));
    } catch {
      setAnalysis({
        ...deterministicAnalysis,
        analysisMode: "mock_fallback",
        confidenceLevel: "medium",
        analysisNotice: "AI analysis is unavailable. Using deterministic demo fallback.",
        limitations: [
          "Narrative content is generated from deterministic demo context.",
          "Official parcel, planning, transaction, imagery, and risk data are not connected yet."
        ]
      });
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
          onExportComparison={() => setReportPreview("comparison")}
        />
      ) : analysis ? (
        <ExpressDashboard
          key={analysis.id}
          analysis={analysis}
          onBackToMap={backToMap}
          onExportReport={() => setReportPreview("analysis")}
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
        hasResult={analysis !== null || comparison !== null}
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
        onExportCurrentResult={() => {
          if (comparison) {
            setReportPreview("comparison");
            return;
          }

          if (analysis) {
            setReportPreview("analysis");
          }
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { createComparisonItem, createMockComparison } from "@/src/lib/mock-comparison";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type {
  AnalysisScenarioId,
  ComparisonItem,
  ComparisonResult,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

export function WorkspaceShell() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedDemoObject | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<AnalysisScenarioId>("realEstateDevelopment");
  const [customQuery, setCustomQuery] = useState("");
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setSelectedObject(null);
    setAnalysis(null);
    setComparison(null);
    setComparisonMessage(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }

  function handleObjectSelect(object: SelectedDemoObject) {
    setSelectedObject(object);
    setSelectedPoint(object.center);
    setAnalysis(null);
    setComparison(null);
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
  }

  function backToMap() {
    setAnalysis(null);
    setComparison(null);
  }

  function runExpressAnalysis() {
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

    window.setTimeout(() => {
      try {
        setAnalysis(createMockExpressAnalysis(selectedPoint, selectedScenario, customQuery, selectedObject));
      } catch {
        setAnalysis(null);
        setAnalysisError("Express analysis could not be generated. Please select the point again and retry.");
      } finally {
        setIsAnalyzing(false);
      }
    }, 700);
  }

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
      {comparison ? (
        <ComparisonDashboard comparison={comparison} onBackToMap={backToMap} />
      ) : analysis ? (
        <ExpressDashboard analysis={analysis} onBackToMap={backToMap} />
      ) : (
        <MapWorkspace
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
      />
    </div>
  );
}

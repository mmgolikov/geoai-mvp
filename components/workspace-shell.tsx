"use client";

import { useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { analysisScenarios, createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type { AnalysisScenarioId, ExpressAnalysis, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

export function WorkspaceShell() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedDemoObject | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<AnalysisScenarioId>("realEstateDevelopment");
  const [customQuery, setCustomQuery] = useState("");
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setSelectedObject(null);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }

  function handleObjectSelect(object: SelectedDemoObject) {
    setSelectedObject(object);
    setSelectedPoint(object.center);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
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
      {analysis ? (
        <ExpressDashboard analysis={analysis} onBackToMap={() => setAnalysis(null)} />
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
        onScenarioChange={(scenario) => {
          setSelectedScenario(scenario);
          setAnalysisError(null);
        }}
        onCustomQueryChange={(query) => {
          setCustomQuery(query);
          setAnalysisError(null);
        }}
        onRunAnalysis={runExpressAnalysis}
      />
    </div>
  );
}

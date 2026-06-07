"use client";

import { useState } from "react";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ExpressDashboard } from "@/components/express-dashboard";
import { MapWorkspace } from "@/components/map-workspace";
import { createMockExpressAnalysis } from "@/src/lib/mock-express-analysis";
import type { ExpressAnalysis, SelectedPoint } from "@/src/types/geo";

export function WorkspaceShell() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [analysis, setAnalysis] = useState<ExpressAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  function handlePointSelect(point: SelectedPoint) {
    setSelectedPoint(point);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }

  function runExpressAnalysis() {
    if (!selectedPoint || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    window.setTimeout(() => {
      try {
        setAnalysis(createMockExpressAnalysis(selectedPoint));
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
        <MapWorkspace selectedPoint={selectedPoint} onPointSelect={handlePointSelect} />
      )}
      <AnalysisPanel
        selectedPoint={selectedPoint}
        isAnalyzing={isAnalyzing}
        analysisError={analysisError}
        onRunAnalysis={runExpressAnalysis}
      />
    </div>
  );
}

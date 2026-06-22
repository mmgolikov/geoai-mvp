import { createMockComparison, createComparisonItem } from "@/src/lib/mock-comparison";
import { createMockExpressAnalysis, analysisScenarios } from "@/src/lib/mock-express-analysis";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import { demoProjects } from "@/src/data/demo-projects";
import type { ComparisonResult, ExpressAnalysis } from "@/src/types/geo";

const createdAt = "2026-06-21T10:00:00.000Z";
const project = demoProjects[0];
const marinaPoint = { latitude: 25.0822, longitude: 55.1431 };
const businessBayPoint = { latitude: 25.1853, longitude: 55.2685 };
const dubaiSouthPoint = { latitude: 24.8887, longitude: 55.1542 };

function scenarioLabel(id: ExpressAnalysis["scenarioId"]) {
  return analysisScenarios.find((scenario) => scenario.id === id)?.label ?? "Investment Site Selection";
}

export const seededDemoAnalysis: ExpressAnalysis = {
  ...createMockExpressAnalysis(marinaPoint, "investmentSiteSelection", "Prepared investor walkthrough for Dubai Marina screening.", undefined),
  id: "seeded-analysis-dubai-marina",
  project,
  generatedAt: createdAt,
  analysisMode: "mock_fallback",
  confidenceLevel: "medium"
};

const comparisonItems = [
  createComparisonItem(marinaPoint, null, "investmentSiteSelection"),
  createComparisonItem(businessBayPoint, null, "investmentSiteSelection"),
  createComparisonItem(dubaiSouthPoint, null, "investmentSiteSelection")
];

export const seededDemoComparison: ComparisonResult = {
  ...createMockComparison(comparisonItems, "Rank investor-ready Dubai alternatives for a controlled demo."),
  id: "seeded-comparison-dubai-shortlist",
  project
};

function analysisReportPayload(analysis: ExpressAnalysis) {
  return {
    analysisRunId: analysis.id,
    runKey: analysis.id,
    project,
    title: "Express Analysis / Investment Memo",
    selectedSite: analysis.selectedObject?.name ?? "Dubai Marina Demo Site",
    selectedObject: analysis.selectedObject ?? null,
    coordinates: analysis.point,
    scenario: analysis.title,
    memoJson: analysis,
    decisionPosture: "Proceed with conditions",
    scoreOverview: analysis.scores,
    keyValueDrivers: analysis.keyFactors,
    criticalConstraints: analysis.risks,
    dataGaps: analysis.limitations ?? [],
    dueDiligenceChecklist: analysis.nextActions,
    evidenceSourceReadiness: analysis.evidence,
    uploadedDataContext: analysis.uploadedDataContext ?? null,
    limitations: analysis.limitations ?? [],
    generatedAt: createdAt
  };
}

function comparisonReportPayload(comparison: ComparisonResult) {
  return {
    title: "Site Comparison Investment Memo",
    project,
    comparedItems: comparison.items.map((item) => ({
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
    comparisonJson: comparison,
    decisionPosture: `Best option: ${comparison.winner.item.name}`,
    scoreOverview: comparison.items.map((item) => ({
      itemName: item.item.name,
      scores: item.scores,
      overallScore: item.overallScore
    })),
    keyValueDrivers: comparison.sharedOpportunities,
    criticalConstraints: comparison.differentiatedRisks,
    dataGaps: [
      "Financial assumptions, official land-use validation, and customer requirements are not connected in the seeded demo."
    ],
    dueDiligenceChecklist: comparison.nextActions,
    evidenceSourceReadiness: comparison.evidence,
    limitations: [
      "Seeded comparison uses deterministic demo scoring and structured evidence readiness, not a validated underwriting model."
    ],
    generatedAt: createdAt
  };
}

export const seededDemoReportRecords = [
  {
    id: "seeded-analysis-dubai-marina-report",
    projectId: null,
    projectKey: project.projectKey,
    reportType: "analysis" as const,
    title: "Dubai Marina Investment Screening Memo",
    scenario: seededDemoAnalysis.title,
    targetLabel: "Dubai Marina Demo Site",
    reportPayload: analysisReportPayload(seededDemoAnalysis),
    sourceLineage: createSourceLineageSnapshot({
      evidence: seededDemoAnalysis.evidence,
      uploadedDatasets: []
    }),
    createdAt,
    sourceSummary: "Demo example / sample-offline evidence; official validation required."
  },
  {
    id: "seeded-comparison-dubai-shortlist-report",
    projectId: null,
    projectKey: project.projectKey,
    reportType: "comparison" as const,
    title: "Dubai Shortlist Comparison Memo",
    scenario: "Comparison",
    targetLabel: seededDemoComparison.items.map((item) => item.item.name).join(", "),
    reportPayload: comparisonReportPayload(seededDemoComparison),
    sourceLineage: createSourceLineageSnapshot({
      evidence: seededDemoComparison.evidence,
      uploadedDatasets: []
    }),
    createdAt,
    sourceSummary: "Demo comparison example / sample-offline evidence; official validation required."
  }
];

export function getSeededDemoReportRecord(reportId: string) {
  return seededDemoReportRecords.find((record) => record.id === reportId) ?? null;
}

export const seededDemoRecentAnalyses = [
  {
    id: "seeded-recent-analysis-marina",
    title: "Dubai Marina Demo Site",
    scenarioLabel: scenarioLabel(seededDemoAnalysis.scenarioId),
    timestamp: createdAt,
    decisionPosture: "Proceed with conditions",
    confidence: "medium",
    dataConfidence: "Demo example / sample-offline",
    source: "local" as const,
    analysis: seededDemoAnalysis
  },
  {
    id: "seeded-recent-analysis-dubai-south",
    title: "Dubai South Growth Node",
    scenarioLabel: "Real Estate Development",
    timestamp: createdAt,
    decisionPosture: "Validation required before decisions",
    confidence: "medium",
    dataConfidence: "Demo example / sample-offline",
    source: "local" as const,
    analysis: {
      ...createMockExpressAnalysis(dubaiSouthPoint, "realEstateDevelopment", "Demo development pipeline screening.", undefined),
      id: "seeded-analysis-dubai-south",
      project,
      generatedAt: createdAt,
      analysisMode: "mock_fallback" as const,
      confidenceLevel: "medium" as const
    }
  }
];

export const seededDemoComparisonSummaries = [
  {
    id: "seeded-comparison-dubai-shortlist",
    title: "Dubai Shortlist Comparison",
    createdAt,
    sourceSummary: `Best option: ${seededDemoComparison.winner.item.name}. Demo example / official validation required.`
  }
];

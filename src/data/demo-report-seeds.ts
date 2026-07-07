import { createMockComparison, createComparisonItem } from "@/src/lib/mock-comparison";
import { createMockExpressAnalysis, analysisScenarios } from "@/src/lib/mock-express-analysis";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import { demoProjects } from "@/src/data/demo-projects";
import type { AnalysisScenarioId, ComparisonResult, ExpressAnalysis, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

const createdAt = "2026-06-21T10:00:00.000Z";

const investmentProject = demoProjects.find((project) => project.projectKey === "dubai-investment-screening-demo") ?? demoProjects[0];
const developerProject = demoProjects.find((project) => project.projectKey === "developer-land-pipeline-demo") ?? demoProjects[0];
const bankProject = demoProjects.find((project) => project.projectKey === "bank-asset-review-demo") ?? demoProjects[0];
const homeBuyerProject = demoProjects.find((project) => project.projectKey === "home-buyer-neighborhood-demo") ?? demoProjects[0];
const familyRelocationProject = demoProjects.find((project) => project.projectKey === "family-relocation-area-demo") ?? demoProjects[0];

const points = {
  marina: { latitude: 25.0822, longitude: 55.1431 },
  businessBay: { latitude: 25.1853, longitude: 55.2685 },
  dubaiSouth: { latitude: 24.8887, longitude: 55.1542 },
  jvcJvt: { latitude: 25.0618, longitude: 55.2035 },
  mbrCity: { latitude: 25.1646, longitude: 55.3156 },
  meydan: { latitude: 25.1569, longitude: 55.3008 },
  dubaiHills: { latitude: 25.1036, longitude: 55.2547 },
  creekHarbour: { latitude: 25.1972, longitude: 55.3478 },
  townSquare: { latitude: 25.0056, longitude: 55.2862 }
} satisfies Record<string, SelectedPoint>;

function scenarioLabel(id: ExpressAnalysis["scenarioId"]) {
  return analysisScenarios.find((scenario) => scenario.id === id)?.label ?? "Scenario analysis";
}

function demoObject(id: string, name: string, layerName: string, layerId: SelectedDemoObject["layerId"], center: SelectedPoint): SelectedDemoObject {
  return {
    id,
    name,
    type: "Sample project asset",
    layerId,
    layerName,
    geometryType: "polygon",
    center
  };
}

function makeAnalysis(input: {
  id: string;
  title: string;
  point: SelectedPoint;
  scenarioId: AnalysisScenarioId;
  project: typeof demoProjects[number];
  customQuery?: string;
  selectedObject?: SelectedDemoObject;
}) {
  return {
    ...createMockExpressAnalysis(input.point, input.scenarioId, input.customQuery ?? "", input.selectedObject),
    id: input.id,
    title: input.title,
    project: input.project,
    generatedAt: createdAt,
    analysisMode: "mock_fallback" as const,
    confidenceLevel: "medium" as const
  };
}

const marinaObject = demoObject("seed-marina-jbr", "Dubai Marina / JBR Market Signal", "Premium Real Estate Areas", "premiumRealEstateAreas", points.marina);
const businessBayObject = demoObject("seed-business-bay", "Business Bay Infill Opportunity", "Premium Real Estate Areas", "premiumRealEstateAreas", points.businessBay);
const dubaiSouthObject = demoObject("seed-dubai-south-growth", "Dubai South Growth Node", "Development Zones", "developmentZones", points.dubaiSouth);
const jvcJvtObject = demoObject("seed-jvc-jvt", "JVC / JVT Residential Pipeline Signal", "Development Zones", "developmentZones", points.jvcJvt);
const mbrCityObject = demoObject("seed-mbr-city", "Meydan / MBR City Collateral Review", "Asset Parcel Objects", "assetParcelObjects", points.mbrCity);
const dubaiHillsObject = demoObject("seed-dubai-hills-family-fit", "Dubai Hills Family Fit Signal", "Premium Real Estate Areas", "premiumRealEstateAreas", points.dubaiHills);
const creekHarbourObject = demoObject("seed-creek-harbour-waterfront-fit", "Creek Harbour Waterfront Fit Signal", "Premium Real Estate Areas", "premiumRealEstateAreas", points.creekHarbour);
const townSquareObject = demoObject("seed-town-square-relocation-fit", "Town Square Relocation Context", "Development Zones", "developmentZones", points.townSquare);

export const seededDemoAnalysis: ExpressAnalysis = makeAnalysis({
  id: "seeded-analysis-dubai-marina",
  title: "Dubai Marina / JBR Market Signal",
  point: points.marina,
  scenarioId: "investmentSiteSelection",
  project: investmentProject,
  customQuery: "Prepared investor walkthrough for Dubai Marina screening.",
  selectedObject: marinaObject
});

const investmentBusinessBayAnalysis = makeAnalysis({
  id: "seeded-analysis-business-bay-infill",
  title: "Business Bay Infill Opportunity",
  point: points.businessBay,
  scenarioId: "investmentSiteSelection",
  project: investmentProject,
  selectedObject: businessBayObject
});

const developerDubaiSouthAnalysis = makeAnalysis({
  id: "seeded-analysis-dubai-south-growth",
  title: "Dubai South Growth Node",
  point: points.dubaiSouth,
  scenarioId: "realEstateDevelopment",
  project: developerProject,
  selectedObject: dubaiSouthObject
});

const developerJvcAnalysis = makeAnalysis({
  id: "seeded-analysis-jvc-jvt-pipeline",
  title: "JVC / JVT Residential Pipeline Signal",
  point: points.jvcJvt,
  scenarioId: "realEstateDevelopment",
  project: developerProject,
  selectedObject: jvcJvtObject
});

const bankMbrAnalysis = makeAnalysis({
  id: "seeded-analysis-mbr-collateral",
  title: "Meydan / MBR City Collateral Review",
  point: points.mbrCity,
  scenarioId: "customQuery",
  project: bankProject,
  customQuery: "Review collateral context, evidence confidence and lender-facing gaps.",
  selectedObject: mbrCityObject
});

const bankBusinessBayAnalysis = makeAnalysis({
  id: "seeded-analysis-business-bay-asset-gap",
  title: "Business Bay Asset Evidence Gap",
  point: points.businessBay,
  scenarioId: "customQuery",
  project: bankProject,
  customQuery: "Identify source gaps before using this asset context in a credit memo.",
  selectedObject: businessBayObject
});

const homeBuyerDubaiHillsAnalysis = makeAnalysis({
  id: "seeded-analysis-dubai-hills-home-fit",
  title: "Dubai Hills Home Buyer Fit",
  point: points.dubaiHills,
  scenarioId: "customQuery",
  project: homeBuyerProject,
  customQuery: "Compare family lifestyle fit, access, heat context and validation gaps before shortlisting homes.",
  selectedObject: dubaiHillsObject
});

const homeBuyerCreekHarbourAnalysis = makeAnalysis({
  id: "seeded-analysis-creek-harbour-home-fit",
  title: "Creek Harbour Waterfront Fit",
  point: points.creekHarbour,
  scenarioId: "investmentSiteSelection",
  project: homeBuyerProject,
  customQuery: "Review neighborhood fit and source limitations for a household shortlist.",
  selectedObject: creekHarbourObject
});

const familyRelocationTownSquareAnalysis = makeAnalysis({
  id: "seeded-analysis-town-square-relocation",
  title: "Town Square Family Relocation Context",
  point: points.townSquare,
  scenarioId: "climateRisk",
  project: familyRelocationProject,
  customQuery: "Review commute, comfort, amenities and validation steps for a family relocation shortlist.",
  selectedObject: townSquareObject
});

const familyRelocationDubaiHillsAnalysis = makeAnalysis({
  id: "seeded-analysis-dubai-hills-relocation",
  title: "Dubai Hills Relocation Context",
  point: points.dubaiHills,
  scenarioId: "customQuery",
  project: familyRelocationProject,
  customQuery: "Compare family relocation fit using sample/open context and explicit official-validation gaps.",
  selectedObject: dubaiHillsObject
});

const investmentComparisonItems = [
  createComparisonItem(points.marina, marinaObject, "investmentSiteSelection"),
  createComparisonItem(points.businessBay, businessBayObject, "investmentSiteSelection"),
  createComparisonItem(points.dubaiSouth, dubaiSouthObject, "investmentSiteSelection")
];

const developerComparisonItems = [
  createComparisonItem(points.dubaiSouth, dubaiSouthObject, "realEstateDevelopment"),
  createComparisonItem(points.jvcJvt, jvcJvtObject, "realEstateDevelopment"),
  createComparisonItem(points.mbrCity, mbrCityObject, "realEstateDevelopment")
];

const bankComparisonItems = [
  createComparisonItem(points.mbrCity, mbrCityObject, "customQuery"),
  createComparisonItem(points.businessBay, businessBayObject, "customQuery")
];

const homeBuyerComparisonItems = [
  createComparisonItem(points.dubaiHills, dubaiHillsObject, "customQuery"),
  createComparisonItem(points.creekHarbour, creekHarbourObject, "investmentSiteSelection"),
  createComparisonItem(points.jvcJvt, jvcJvtObject, "customQuery")
];

const familyRelocationComparisonItems = [
  createComparisonItem(points.townSquare, townSquareObject, "climateRisk"),
  createComparisonItem(points.dubaiHills, dubaiHillsObject, "customQuery"),
  createComparisonItem(points.creekHarbour, creekHarbourObject, "customQuery")
];

export const seededDemoComparison: ComparisonResult = {
  ...createMockComparison(investmentComparisonItems, "Dubai Marina vs Business Bay vs Dubai South investor shortlist."),
  id: "seeded-comparison-dubai-shortlist",
  project: investmentProject
};

const developerComparison: ComparisonResult = {
  ...createMockComparison(developerComparisonItems, "Dubai South vs JVC/JVT vs MBR City development pipeline."),
  id: "seeded-comparison-developer-pipeline",
  project: developerProject
};

const bankComparison: ComparisonResult = {
  ...createMockComparison(bankComparisonItems, "MBR City vs Business Bay collateral evidence context."),
  id: "seeded-comparison-bank-collateral",
  project: bankProject
};

const homeBuyerComparison: ComparisonResult = {
  ...createMockComparison(homeBuyerComparisonItems, "Dubai Hills vs Creek Harbour vs JVC/JVT home-buyer neighborhood fit."),
  id: "seeded-comparison-home-buyer-neighborhoods",
  project: homeBuyerProject
};

const familyRelocationComparison: ComparisonResult = {
  ...createMockComparison(familyRelocationComparisonItems, "Town Square vs Dubai Hills vs Creek Harbour family relocation context."),
  id: "seeded-comparison-family-relocation-areas",
  project: familyRelocationProject
};

function analysisReportPayload(analysis: ExpressAnalysis, title: string) {
  return {
    analysisRunId: analysis.id,
    runKey: analysis.id,
    project: analysis.project,
    title,
    selectedSite: analysis.selectedObject?.name ?? "Sample selected site",
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

function comparisonReportPayload(comparison: ComparisonResult, title: string) {
  return {
    title,
    project: comparison.project,
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
      "Seeded comparison uses deterministic sample scoring and structured evidence readiness, not a validated underwriting model."
    ],
    generatedAt: createdAt
  };
}

function analysisReportRecord(id: string, analysis: ExpressAnalysis, title: string, sourceSummary: string) {
  return {
    id,
    projectId: analysis.project?.id ?? null,
    projectKey: analysis.project?.projectKey ?? null,
    reportType: "analysis" as const,
    title,
    scenario: analysis.title,
    targetLabel: analysis.selectedObject?.name ?? analysis.title,
    reportPayload: analysisReportPayload(analysis, title),
    sourceLineage: createSourceLineageSnapshot({
      evidence: analysis.evidence,
      uploadedDatasets: []
    }),
    createdAt,
    sourceSummary
  };
}

function comparisonReportRecord(id: string, comparison: ComparisonResult, title: string, sourceSummary: string) {
  return {
    id,
    projectId: comparison.project?.id ?? null,
    projectKey: comparison.project?.projectKey ?? null,
    reportType: "comparison" as const,
    title,
    scenario: "Comparison",
    targetLabel: comparison.items.map((item) => item.item.name).join(", "),
    reportPayload: comparisonReportPayload(comparison, title),
    sourceLineage: createSourceLineageSnapshot({
      evidence: comparison.evidence,
      uploadedDatasets: []
    }),
    createdAt,
    sourceSummary
  };
}

export const seededDemoReportRecords = [
  analysisReportRecord(
    "seeded-analysis-dubai-marina-report",
    seededDemoAnalysis,
    "Investment Screening Memo",
    "Dubai Investment Screening / sample-offline evidence; official validation required."
  ),
  comparisonReportRecord(
    "seeded-comparison-dubai-shortlist-report",
    seededDemoComparison,
    "Dubai Marina vs Business Bay vs Dubai South Comparison Memo",
    "Investment shortlist comparison / sample-offline evidence; official validation required."
  ),
  analysisReportRecord(
    "seeded-analysis-dubai-south-development-report",
    developerDubaiSouthAnalysis,
    "Development Screening Memo",
    "Developer Land Pipeline / sample planning context; official validation required."
  ),
  comparisonReportRecord(
    "seeded-comparison-developer-pipeline-report",
    developerComparison,
    "Dubai South vs JVC/JVT vs MBR City Development Memo",
    "Developer pipeline comparison / sample evidence; official validation required."
  ),
  analysisReportRecord(
    "seeded-analysis-mbr-collateral-report",
    bankMbrAnalysis,
    "Collateral Context Memo",
    "Bank Asset Review / evidence confidence review; official validation required."
  ),
  comparisonReportRecord(
    "seeded-comparison-bank-collateral-report",
    bankComparison,
    "MBR City vs Business Bay Collateral Context Memo",
    "Bank collateral context comparison / source confidence review; official validation required."
  ),
  analysisReportRecord(
    "seeded-analysis-dubai-hills-home-fit-report",
    homeBuyerDubaiHillsAnalysis,
    "Home Buyer Neighborhood Fit Memo",
    "Home Buyer Neighborhood Fit / sample-open context; official validation required."
  ),
  comparisonReportRecord(
    "seeded-comparison-home-buyer-neighborhoods-report",
    homeBuyerComparison,
    "Dubai Hills vs Creek Harbour vs JVC/JVT Neighborhood Fit Memo",
    "B2C home-buyer comparison / sample-open context; official validation required."
  ),
  analysisReportRecord(
    "seeded-analysis-town-square-relocation-report",
    familyRelocationTownSquareAnalysis,
    "Family Relocation Area Review Memo",
    "Family Relocation Area Review / sample-open context; official validation required."
  ),
  comparisonReportRecord(
    "seeded-comparison-family-relocation-areas-report",
    familyRelocationComparison,
    "Town Square vs Dubai Hills vs Creek Harbour Relocation Memo",
    "B2C relocation comparison / sample-open context; official validation required."
  )
];

export function getSeededDemoReportRecord(reportId: string) {
  return seededDemoReportRecords.find((record) => record.id === reportId) ?? null;
}

export const seededDemoRecentAnalyses = [
  seededDemoAnalysis,
  investmentBusinessBayAnalysis,
  developerDubaiSouthAnalysis,
  developerJvcAnalysis,
  bankMbrAnalysis,
  bankBusinessBayAnalysis,
  homeBuyerDubaiHillsAnalysis,
  homeBuyerCreekHarbourAnalysis,
  familyRelocationTownSquareAnalysis,
  familyRelocationDubaiHillsAnalysis
].map((analysis) => ({
  id: `seeded-recent-${analysis.id}`,
  title: analysis.title,
  scenarioLabel: analysis.scenarioId === "customQuery" && analysis.project?.projectKey === bankProject.projectKey
    ? "Asset Portfolio Intelligence"
    : analysis.scenarioId === "customQuery" && analysis.project?.metadata?.segment === "b2c"
      ? "Consumer Area Fit"
    : scenarioLabel(analysis.scenarioId),
  timestamp: createdAt,
  decisionPosture: analysis.project?.projectKey === bankProject.projectKey
    ? "Evidence validation required"
    : analysis.project?.metadata?.segment === "b2c"
      ? "Screening only; validate before decisions"
    : "Proceed with conditions",
  confidence: "medium" as const,
  dataConfidence: "Sample example / sample-offline",
  source: "local" as const,
  analysis
}));

export const seededDemoComparisonSummaries = [
  {
    id: seededDemoComparison.id,
    reportId: "seeded-comparison-dubai-shortlist-report",
    projectId: seededDemoComparison.project?.id ?? null,
    projectKey: seededDemoComparison.project?.projectKey ?? null,
    title: "Dubai Marina vs Business Bay vs Dubai South",
    createdAt,
    sourceSummary: `Best option: ${seededDemoComparison.winner.item.name}. Sample example / official validation required.`
  },
  {
    id: developerComparison.id,
    reportId: "seeded-comparison-developer-pipeline-report",
    projectId: developerComparison.project?.id ?? null,
    projectKey: developerComparison.project?.projectKey ?? null,
    title: "Dubai South vs JVC/JVT vs MBR City",
    createdAt,
    sourceSummary: `Best option: ${developerComparison.winner.item.name}. Sample example / official validation required.`
  },
  {
    id: bankComparison.id,
    reportId: "seeded-comparison-bank-collateral-report",
    projectId: bankComparison.project?.id ?? null,
    projectKey: bankComparison.project?.projectKey ?? null,
    title: "MBR City vs Business Bay Collateral Context",
    createdAt,
    sourceSummary: `Best option: ${bankComparison.winner.item.name}. Sample example / official validation required.`
  },
  {
    id: homeBuyerComparison.id,
    reportId: "seeded-comparison-home-buyer-neighborhoods-report",
    projectId: homeBuyerComparison.project?.id ?? null,
    projectKey: homeBuyerComparison.project?.projectKey ?? null,
    title: "Dubai Hills vs Creek Harbour vs JVC/JVT Neighborhood Fit",
    createdAt,
    sourceSummary: `Best option: ${homeBuyerComparison.winner.item.name}. Sample/open context only / official validation required.`
  },
  {
    id: familyRelocationComparison.id,
    reportId: "seeded-comparison-family-relocation-areas-report",
    projectId: familyRelocationComparison.project?.id ?? null,
    projectKey: familyRelocationComparison.project?.projectKey ?? null,
    title: "Town Square vs Dubai Hills vs Creek Harbour Relocation Context",
    createdAt,
    sourceSummary: `Best option: ${familyRelocationComparison.winner.item.name}. Sample/open context only / official validation required.`
  }
];

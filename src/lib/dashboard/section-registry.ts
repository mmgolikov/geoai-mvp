import type { AnalysisScenarioId } from "@/src/types/geo";

export type DashboardSectionId =
  | "redevelopment-hypothesis"
  | "recommended-use"
  | "current-use"
  | "infrastructure-access"
  | "market-context"
  | "hotel-demand"
  | "competition-proxy"
  | "commercial-format"
  | "catchment-access"
  | "route-summary"
  | "residential-context"
  | "quality-of-life"
  | "monitoring-cadence"
  | "planning-dependencies"
  | "climate-exposure"
  | "risks-constraints"
  | "validation-gaps"
  | "next-actions"
  | "evidence-appendix";

export type DashboardSectionDefinition = {
  id: DashboardSectionId;
  title: string;
  summary: string;
};

const commonClosingSections: DashboardSectionDefinition[] = [
  {
    id: "risks-constraints",
    title: "Risks and constraints",
    summary: "Execution, market, climate, planning and evidence constraints."
  },
  {
    id: "validation-gaps",
    title: "Validation gaps",
    summary: "Official/client checks needed before decision-grade use."
  },
  {
    id: "next-actions",
    title: "Next actions",
    summary: "Concrete diligence steps for the current result."
  },
  {
    id: "evidence-appendix",
    title: "Evidence / source appendix",
    summary: "Source lineage, confidence and limitations."
  }
];

const sectionsByScenario: Record<AnalysisScenarioId, DashboardSectionDefinition[]> = {
  realEstateDevelopment: [
    {
      id: "redevelopment-hypothesis",
      title: "Redevelopment hypothesis",
      summary: "Best-use and intensity hypothesis for the selected site or AOI."
    },
    {
      id: "recommended-use",
      title: "Recommended use",
      summary: "Primary use direction and supporting rationale."
    },
    {
      id: "current-use",
      title: "Current use / underutilization signals",
      summary: "Signals that suggest reuse, intensification or review."
    },
    {
      id: "infrastructure-access",
      title: "Infrastructure and access",
      summary: "Mobility, utilities and surrounding access context."
    },
    {
      id: "market-context",
      title: "Market / development context",
      summary: "Demand, liquidity and pipeline context for screening."
    },
    ...commonClosingSections
  ],
  investmentSiteSelection: [
    {
      id: "recommended-use",
      title: "Recommended commercial or investment format",
      summary: "Primary investment thesis for the selected target."
    },
    {
      id: "catchment-access",
      title: "Catchment / access",
      summary: "Access, footfall proxy and surrounding demand context."
    },
    {
      id: "market-context",
      title: "Market context",
      summary: "Liquidity, demand and comparable-market proxy signals."
    },
    ...commonClosingSections
  ],
  constructionMonitoring: [
    {
      id: "monitoring-cadence",
      title: "Monitoring cadence",
      summary: "Suggested update rhythm and progress evidence needs."
    },
    {
      id: "current-use",
      title: "Current status signals",
      summary: "Observable site or project status indicators."
    },
    {
      id: "infrastructure-access",
      title: "Access and logistics",
      summary: "Connectivity, access and delivery constraints."
    },
    ...commonClosingSections
  ],
  infrastructureUrbanPlanning: [
    {
      id: "planning-dependencies",
      title: "Planning dependencies",
      summary: "Urban, infrastructure and public-realm dependencies."
    },
    {
      id: "infrastructure-access",
      title: "Infrastructure and access",
      summary: "Transport, utilities and corridor context."
    },
    {
      id: "market-context",
      title: "Development context",
      summary: "Nearby project and demand proxy context."
    },
    ...commonClosingSections
  ],
  climateRisk: [
    {
      id: "climate-exposure",
      title: "Climate exposure",
      summary: "Heat, coastal and resilience screening context."
    },
    {
      id: "infrastructure-access",
      title: "Mitigation and access",
      summary: "Infrastructure and resilience implications."
    },
    ...commonClosingSections
  ],
  customQuery: [
    {
      id: "recommended-use",
      title: "Scenario answer",
      summary: "Direct answer to the selected custom query."
    },
    {
      id: "market-context",
      title: "Relevant context",
      summary: "Spatial, market and evidence context used in the answer."
    },
    ...commonClosingSections
  ]
};

export function getDashboardSections(scenarioId: AnalysisScenarioId) {
  return sectionsByScenario[scenarioId] ?? sectionsByScenario.customQuery;
}

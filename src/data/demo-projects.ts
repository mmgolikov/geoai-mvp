import type { GeoAIProject } from "@/src/lib/db/types";

export const demoProjects: GeoAIProject[] = [
  {
    id: null,
    projectKey: "dubai-investment-screening-demo",
    name: "Dubai Investment Screening Demo",
    description: "Demo project for site screening, comparison and investment memo workflow.",
    geography: "Dubai / UAE",
    clientType: "fund",
    primaryScenario: "investmentSiteSelection",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: { default: true }
  },
  {
    id: null,
    projectKey: "developer-land-pipeline-demo",
    name: "Developer Land Pipeline Demo",
    description: "Demo project for development potential screening and due diligence planning.",
    geography: "Dubai / UAE",
    clientType: "developer",
    primaryScenario: "realEstateDevelopment",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {}
  },
  {
    id: null,
    projectKey: "bank-asset-review-demo",
    name: "Bank Asset Review Demo",
    description: "Demo project for portfolio, collateral and spatial risk review.",
    geography: "Dubai / UAE",
    clientType: "bank",
    primaryScenario: "assetPortfolioIntelligence",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {}
  }
];

export function getDemoProject(projectKey?: string | null) {
  return demoProjects.find((project) => project.projectKey === projectKey) ?? demoProjects[0];
}

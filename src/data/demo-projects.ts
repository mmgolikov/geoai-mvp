import type { GeoAIProject } from "@/src/lib/db/types";

export const demoProjects: GeoAIProject[] = [
  {
    id: null,
    projectKey: "dubai-investment-screening-demo",
    name: "Dubai Investment Screening",
    description: "Fund / family office pilot screening workspace for Dubai site screening, comparison, evidence confidence and investment memo workflow using sample/open data.",
    geography: "Dubai / UAE",
    clientType: "fund",
    primaryScenario: "investmentSiteSelection",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      default: true,
      demoPurpose: "Compare coastal and growth-area opportunities before underwriting.",
      dataStatus: "Local sample context and open-data style signals; official validation required.",
      recommendedNextAction: "Validate official market, parcel and planning evidence before investment decisions."
    }
  },
  {
    id: null,
    projectKey: "developer-land-pipeline-demo",
    name: "Developer Land Pipeline",
    description: "Developer / master developer pilot screening workspace for land pipeline screening, infrastructure context and planning validation checklist.",
    geography: "Dubai / UAE",
    clientType: "developer",
    primaryScenario: "realEstateDevelopment",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      demoPurpose: "Screen development potential and identify validation gaps.",
      dataStatus: "Local sample GeoJSON and CSV context; not official boundaries or planning data.",
      recommendedNextAction: "Request land-use, infrastructure and constraint confirmation from agreed validation sources."
    }
  },
  {
    id: null,
    projectKey: "bank-asset-review-demo",
    name: "Bank Asset Review",
    description: "Bank / lender pilot screening workspace for collateral context, market confidence, spatial exposure and evidence trail review.",
    geography: "Dubai / UAE",
    clientType: "bank",
    primaryScenario: "assetPortfolioIntelligence",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      demoPurpose: "Review collateral context and evidence gaps for a lender-ready summary.",
      dataStatus: "Sample/offline metrics and screening spatial context; no live official integration.",
      recommendedNextAction: "Validate source lineage and risk assumptions before credit or collateral decisions."
    }
  }
];

export function getDemoProject(projectKey?: string | null) {
  return demoProjects.find((project) => project.projectKey === projectKey) ?? demoProjects[0];
}

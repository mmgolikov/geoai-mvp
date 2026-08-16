import type { GeoAIProject } from "@/src/lib/db/types";

const dataHonestyCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const demoProjects: GeoAIProject[] = [
  {
    id: null,
    projectKey: "dubai-investment-screening-demo",
    name: "Dubai Investment Screening",
    description: "Fund and family office workspace for Dubai opportunity screening, comparison, evidence confidence and investment memo preparation.",
    geography: "Dubai / UAE",
    clientType: "fund",
    primaryScenario: "investmentSiteSelection",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      audience: "b2b",
      segment: "b2b",
      default: true,
      demoPurpose: "Compare coastal and growth-area opportunities before underwriting.",
      dataStatus: "Local screening context and public/open signals; official validation required.",
      recommendedNextAction: "Validate official market, parcel and planning evidence before investment decisions.",
      caveat: dataHonestyCaveat
    }
  },
  {
    id: null,
    projectKey: "developer-land-pipeline-demo",
    name: "Developer Land Pipeline",
    description: "Developer and master-developer workspace for land pipeline screening, infrastructure context and planning validation checklists.",
    geography: "Dubai / UAE",
    clientType: "developer",
    primaryScenario: "realEstateDevelopment",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      audience: "b2b",
      segment: "b2b",
      demoPurpose: "Screen development potential and identify validation gaps.",
      dataStatus: "Local screening GeoJSON and CSV context; not official boundaries or planning data.",
      recommendedNextAction: "Request land-use, infrastructure and constraint confirmation from agreed validation sources.",
      caveat: dataHonestyCaveat
    }
  },
  {
    id: null,
    projectKey: "bank-asset-review-demo",
    name: "Bank Asset Review",
    description: "Bank and lender workspace for collateral context, market confidence, spatial exposure and evidence-trail review.",
    geography: "Dubai / UAE",
    clientType: "bank",
    primaryScenario: "assetPortfolioIntelligence",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      audience: "b2b",
      segment: "b2b",
      demoPurpose: "Review collateral context and evidence gaps for a lender-ready summary.",
      dataStatus: "Local screening metrics and spatial context; no live official integration.",
      recommendedNextAction: "Validate source lineage and risk assumptions before credit or collateral decisions.",
      caveat: dataHonestyCaveat
    }
  },
  {
    id: null,
    projectKey: "home-buyer-neighborhood-demo",
    name: "Home Buyer Neighborhood Fit",
    description: "Household workspace for comparing Dubai neighborhood fit, access, comfort and validation gaps.",
    geography: "Dubai / UAE",
    clientType: "demo",
    primaryScenario: "customQuery",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      audience: "b2c",
      segment: "b2c",
      role: "home_buyer",
      demoPurpose: "Compare neighborhoods for lifestyle fit before personal due diligence.",
      dataStatus: "Local and public/open screening context only; not official property, parcel, ownership, zoning or valuation evidence.",
      recommendedNextAction: "Validate listings, legal/title, service charges, school/access needs and official planning context before decisions.",
      caveat: dataHonestyCaveat
    }
  },
  {
    id: null,
    projectKey: "family-relocation-area-demo",
    name: "Family Relocation Area Review",
    description: "Household relocation workspace for comparing commute, amenities, comfort and heat/climate context across Dubai areas.",
    geography: "Dubai / UAE",
    clientType: "demo",
    primaryScenario: "climateRisk",
    status: "demo",
    dataMode: "demo_normalized",
    metadata: {
      audience: "b2c",
      segment: "b2c",
      role: "family_relocation",
      demoPurpose: "Review neighborhood trade-offs for a family relocation shortlist.",
      dataStatus: "Local and public/open screening context only; not official planning, school catchment, legal, ownership or valuation evidence.",
      recommendedNextAction: "Validate commute, school, services, building/legal and official municipality context before household decisions.",
      caveat: dataHonestyCaveat
    }
  }
];

export function getDemoProject(projectKey?: string | null): GeoAIProject | null {
  if (!projectKey) return demoProjects[0] ?? null;
  return demoProjects.find((project) => project.projectKey === projectKey) ?? null;
}

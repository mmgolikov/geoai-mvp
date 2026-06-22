import { geoaiReleaseCaveat, type DemoNarrative } from "@/src/data/demo-narratives";

export type ClientPilotPackage = {
  id: DemoNarrative["id"];
  title: string;
  buyerType: string;
  linkedProjectKey: string;
  duration: string;
  objective: string;
  clientInputs: string[];
  geoaiDeliverables: string[];
  timeline: string[];
  validationRequirements: string[];
  outOfScope: string[];
  commercialPilotFraming: string;
  caveat: string;
};

export const clientPilotPackages: ClientPilotPackage[] = [
  {
    id: "fund-investment-screening",
    title: "Fund / Family Office Investment Screening Pilot",
    buyerType: "Fund / family office",
    linkedProjectKey: "dubai-investment-screening-demo",
    duration: "2-4 weeks",
    objective: "Help an investment team screen and compare Dubai target locations before deep underwriting.",
    clientInputs: [
      "Target location or asset shortlist",
      "Investment thesis and hold-period assumptions",
      "Preferred memo format or IC review criteria",
      "Customer-approved market or comparable evidence where available"
    ],
    geoaiDeliverables: [
      "Investment screening workspace configured for the client's shortlist",
      "Risk-adjusted comparison dashboard",
      "Investor memo preview with source lineage",
      "Validation checklist for market, planning and title diligence"
    ],
    timeline: [
      "Week 1: confirm shortlist, data rights and memo format",
      "Week 2: configure locations, scenarios and source registry",
      "Week 3-4: run screening sessions, iterate memo and compare alternatives"
    ],
    validationRequirements: [
      "Validate market evidence against agreed DLD / Dubai Pulse snapshots or client-approved data",
      "Validate parcel, ownership, zoning and planning assumptions outside GeoAI",
      "Confirm climate or insurance implications with specialist review where required"
    ],
    outOfScope: [
      "Certified valuation",
      "Final investment recommendation",
      "Legal, tax, ownership or title opinion",
      "Live official DLD or Dubai Pulse integration"
    ],
    commercialPilotFraming: "Position as a paid decision-screening pilot for investment teams that need a repeatable diligence starter pack before underwriting.",
    caveat: geoaiReleaseCaveat
  },
  {
    id: "developer-land-pipeline",
    title: "Developer Land Pipeline Pilot",
    buyerType: "Developer / master developer",
    linkedProjectKey: "developer-land-pipeline-demo",
    duration: "3-6 weeks",
    objective: "Help a developer screen candidate land areas for development potential, infrastructure assumptions and validation gaps.",
    clientInputs: [
      "Candidate land list with coordinates or GeoJSON boundaries",
      "Development intent, product mix assumptions or site thesis",
      "Customer-approved GIS, feasibility, utility or planning context",
      "Known constraints and preferred comparison areas"
    ],
    geoaiDeliverables: [
      "Land pipeline screening dashboard",
      "Development potential and constraint memo",
      "Comparison matrix for shortlisted land areas",
      "Planning, infrastructure and official validation checklist"
    ],
    timeline: [
      "Week 1: confirm candidate sites and data permissions",
      "Week 2-3: configure uploaded GIS/CSV context and screening scenarios",
      "Week 4-6: run shortlist reviews, refine outputs and prepare pilot summary"
    ],
    validationRequirements: [
      "Validate planning and land-use assumptions through authorized municipal or customer-approved sources",
      "Validate parcel/title information outside GeoAI",
      "Validate infrastructure capacity and utility assumptions with client or authority sources"
    ],
    outOfScope: [
      "Permitting decision or approval",
      "Official zoning determination",
      "Legal title confirmation",
      "Certified valuation"
    ],
    commercialPilotFraming: "Position as a land-pipeline operating pilot for teams deciding which sites deserve deeper feasibility and authority validation.",
    caveat: geoaiReleaseCaveat
  },
  {
    id: "bank-asset-review",
    title: "Bank / Lender Asset Review Pilot",
    buyerType: "Bank / lender",
    linkedProjectKey: "bank-asset-review-demo",
    duration: "3-5 weeks",
    objective: "Help a lender review priority asset locations using spatial context, market confidence and evidence-gap triage.",
    clientInputs: [
      "Asset or collateral location list",
      "Customer-approved asset metadata and loan segment context",
      "Preferred lender memo or review criteria",
      "Approved internal notes, monitoring records or inspection context"
    ],
    geoaiDeliverables: [
      "Asset review dashboard",
      "Collateral context memo",
      "Priority review shortlist",
      "Evidence and validation-gap summary"
    ],
    timeline: [
      "Week 1: confirm asset scope, confidentiality and review dimensions",
      "Week 2-3: configure assets, scenarios and approved evidence context",
      "Week 4-5: run lender review sessions and produce memo-ready outputs"
    ],
    validationRequirements: [
      "Validate collateral attributes with customer-approved records",
      "Validate market, planning, ownership and title evidence outside GeoAI",
      "Validate valuation, credit and regulatory implications through existing lender processes"
    ],
    outOfScope: [
      "Automated credit decisioning",
      "Certified appraisal",
      "Legal title opinion",
      "Regulatory capital calculation"
    ],
    commercialPilotFraming: "Position as an evidence-triage pilot for lenders who need location-aware collateral review before formal credit or valuation work.",
    caveat: geoaiReleaseCaveat
  }
];

export function getClientPilotPackageById(id?: string | null) {
  return clientPilotPackages.find((pilotPackage) => pilotPackage.id === id) ?? null;
}

export function getClientPilotPackageForProject(projectKey?: string | null, clientType?: string | null) {
  const byProject = clientPilotPackages.find((pilotPackage) => pilotPackage.linkedProjectKey === projectKey);
  if (byProject) return byProject;

  const normalizedClientType = (clientType ?? "").toLowerCase();
  if (!normalizedClientType) {
    return clientPilotPackages[0];
  }

  return clientPilotPackages.find((pilotPackage) => pilotPackage.buyerType.toLowerCase().includes(normalizedClientType)) ?? clientPilotPackages[0];
}

import type { GuidedDemoPresetId } from "@/src/data/guided-demo";

export const geoaiReleaseCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type DemoNarrativeStep = {
  number: number;
  screen: "landing" | "demo" | "workspace" | "projects" | "report";
  route: string;
  userAction: string;
  whatToSay: string;
  whatGeoAIProves: string;
  expectedVisibleResult: string;
};

export type DemoNarrative = {
  id: "fund-investment-screening" | "developer-land-pipeline" | "bank-asset-review";
  title: string;
  projectKey: string;
  projectName: string;
  guidedDemoPresetId: GuidedDemoPresetId;
  targetPersona: string;
  buyerType: string;
  decisionQuestion: string;
  painPoint: string;
  demoPromise: string;
  openingMessage: string;
  steps: DemoNarrativeStep[];
  dataStory: string[];
  managementOutput: string[];
  pilotBridge: string;
  caveat: string;
};

export const demoNarratives: DemoNarrative[] = [
  {
    id: "fund-investment-screening",
    title: "Fund / Family Office Investment Screening",
    projectKey: "dubai-investment-screening-demo",
    projectName: "Dubai Investment Screening Demo",
    guidedDemoPresetId: "dubai-marina-investment",
    targetPersona: "Investment principal, family office partner, or real estate fund analyst",
    buyerType: "Fund / family office",
    decisionQuestion: "Which Dubai locations deserve deeper underwriting before capital is committed?",
    painPoint: "Investment teams see attractive locations but lack a fast way to combine market signals, spatial context, risk posture and evidence confidence before underwriting.",
    demoPromise: "GeoAI turns selected sites into a defensible screening memo, comparison view and validation checklist for investment committee preparation.",
    openingMessage: "We are not replacing underwriting. We are helping the investment team reject weak sites earlier and focus diligence on locations with better spatial, market and evidence context.",
    steps: [
      {
        number: 1,
        screen: "demo",
        route: "/demo",
        userAction: "Start the fund narrative.",
        whatToSay: "This walkthrough is framed around a fund screening shortlisted Dubai locations.",
        whatGeoAIProves: "The product can package a specific buyer workflow, not just a generic map demo.",
        expectedVisibleResult: "Fund narrative card opens the prepared workspace."
      },
      {
        number: 2,
        screen: "workspace",
        route: "/workspace?demoNarrativeId=fund-investment-screening&projectId=dubai-investment-screening-demo",
        userAction: "Load the Dubai Marina guided demo and review the selected polygon.",
        whatToSay: "The first step is selecting an investable site or area and showing its evidence status.",
        whatGeoAIProves: "Map selection, source confidence and demo-normalized spatial context flow into the command panel.",
        expectedVisibleResult: "Dubai Marina site selected with scenario and command panel ready."
      },
      {
        number: 3,
        screen: "workspace",
        route: "/workspace",
        userAction: "Run Express Analysis.",
        whatToSay: "The memo is structured for investment screening: attractiveness, liquidity proxies, access, risk and validation needs.",
        whatGeoAIProves: "GeoAI creates a management-ready screening memo from the selected site and evidence context.",
        expectedVisibleResult: "Express Analysis dashboard with scores, evidence and validation caveat."
      },
      {
        number: 4,
        screen: "workspace",
        route: "/workspace",
        userAction: "Add demo sites and compare.",
        whatToSay: "The decision is rarely one site in isolation; comparison makes trade-offs visible.",
        whatGeoAIProves: "GeoAI can rank 2-3 candidate sites with consistent scoring and a clear recommendation.",
        expectedVisibleResult: "Comparison dashboard with winner, risks and next actions."
      },
      {
        number: 5,
        screen: "report",
        route: "/reports/seeded-analysis-dubai-marina-report/print",
        userAction: "Open the printable memo.",
        whatToSay: "The output is a diligence starter pack, not a final investment conclusion.",
        whatGeoAIProves: "The demo produces a shareable memo with source lineage and validation checklist.",
        expectedVisibleResult: "Printable report with Back, Print / Save as PDF and no report-not-found state."
      }
    ],
    dataStory: [
      "DLD / Dubai Pulse snapshot is represented as sample market-area records for workflow demonstration.",
      "OSM / Geofabrik-style snapshot provides open baseline context.",
      "Open-Meteo climate context is screening-level and fallback-safe.",
      "Official ownership, parcel, zoning, planning and valuation validation remains outside the demo."
    ],
    managementOutput: [
      "Investment screening memo",
      "Risk-adjusted comparison table",
      "Evidence confidence summary",
      "Next due diligence checklist"
    ],
    pilotBridge: "A 2-4 week pilot can load the client's target locations, agreed market snapshots and investment memo template to test screening discipline before underwriting.",
    caveat: geoaiReleaseCaveat
  },
  {
    id: "developer-land-pipeline",
    title: "Developer Land Pipeline",
    projectKey: "developer-land-pipeline-demo",
    projectName: "Developer Land Pipeline Demo",
    guidedDemoPresetId: "dubai-south-development",
    targetPersona: "Developer strategy, land acquisition, master planning or feasibility team",
    buyerType: "Developer / master developer",
    decisionQuestion: "Which candidate land areas should move into deeper feasibility, planning and infrastructure validation?",
    painPoint: "Developer teams need to compare early land opportunities before they have complete planning, utility and official GIS evidence.",
    demoPromise: "GeoAI turns candidate land areas into a development screening memo with infrastructure assumptions, maturity signals and validation gaps.",
    openingMessage: "This is the land-pipeline version of GeoAI: it helps a developer qualify early opportunities and know what to validate next.",
    steps: [
      {
        number: 1,
        screen: "demo",
        route: "/demo",
        userAction: "Start the developer narrative.",
        whatToSay: "We are viewing GeoAI as a land pipeline screening workspace.",
        whatGeoAIProves: "The product can be positioned around developer land decisions.",
        expectedVisibleResult: "Developer narrative opens with Dubai South prepared."
      },
      {
        number: 2,
        screen: "workspace",
        route: "/workspace?demoNarrativeId=developer-land-pipeline&projectId=developer-land-pipeline-demo",
        userAction: "Review the selected Dubai South growth node.",
        whatToSay: "This polygon is a synthetic growth-area fixture, not an official parcel or zoning boundary.",
        whatGeoAIProves: "GeoAI keeps geometry confidence and limitations visible while still supporting screening.",
        expectedVisibleResult: "Selected growth node with scenario set to real estate development."
      },
      {
        number: 3,
        screen: "workspace",
        route: "/workspace",
        userAction: "Run Express Analysis.",
        whatToSay: "The memo focuses on development potential, access, infrastructure readiness and validation needs.",
        whatGeoAIProves: "The dashboard converts spatial context into a feasibility conversation.",
        expectedVisibleResult: "Development memo with scores, object details and evidence cards."
      },
      {
        number: 4,
        screen: "projects",
        route: "/projects?projectKey=developer-land-pipeline-demo",
        userAction: "Open the project dashboard.",
        whatToSay: "A pilot would use the client's candidate site list and validation workflow.",
        whatGeoAIProves: "GeoAI can frame a client pilot package around active project state.",
        expectedVisibleResult: "Developer project dashboard with pilot bridge and data readiness."
      }
    ],
    dataStory: [
      "Demo geometries are synthetic and show workflow readiness only.",
      "Open baseline context supports access and surrounding-area discussion.",
      "Official planning, utility and parcel evidence must be validated by authorized sources.",
      "Customer-uploaded GIS or feasibility files can become pilot inputs."
    ],
    managementOutput: [
      "Development potential memo",
      "Land pipeline shortlist",
      "Infrastructure and planning validation checklist",
      "Comparison view for alternative land areas"
    ],
    pilotBridge: "A 3-6 week pilot can ingest a developer's candidate land list, customer-approved GIS layers and planning assumptions to produce a repeatable site-screening workflow.",
    caveat: geoaiReleaseCaveat
  },
  {
    id: "bank-asset-review",
    title: "Bank / Lender Asset Review",
    projectKey: "bank-asset-review-demo",
    projectName: "Bank Asset Review Demo",
    guidedDemoPresetId: "bank-asset-review",
    targetPersona: "Credit risk, collateral review, portfolio monitoring or real estate finance team",
    buyerType: "Bank / lender",
    decisionQuestion: "Which financed assets need priority validation, monitoring or collateral review attention?",
    painPoint: "Lenders often review real estate exposure without enough spatial context, market confidence, climate screening or source-lineage visibility.",
    demoPromise: "GeoAI turns selected assets or collateral locations into a lender-friendly review memo with risks, evidence gaps and next actions.",
    openingMessage: "For a bank, GeoAI is not making a credit decision. It is helping the lender see location, exposure and validation gaps earlier.",
    steps: [
      {
        number: 1,
        screen: "demo",
        route: "/demo",
        userAction: "Start the lender narrative.",
        whatToSay: "This story demonstrates a collateral or financed-asset review workflow.",
        whatGeoAIProves: "GeoAI can support risk triage and memo preparation for lender teams.",
        expectedVisibleResult: "Bank narrative card opens the prepared asset review workspace."
      },
      {
        number: 2,
        screen: "workspace",
        route: "/workspace?demoNarrativeId=bank-asset-review&projectId=bank-asset-review-demo",
        userAction: "Review the selected Business Bay asset area.",
        whatToSay: "The selected object is a demo screening geometry and its evidence confidence is visible.",
        whatGeoAIProves: "GeoAI keeps collateral context separate from validated legal or valuation evidence.",
        expectedVisibleResult: "Selected asset review object and command panel context."
      },
      {
        number: 3,
        screen: "workspace",
        route: "/workspace",
        userAction: "Run Express Analysis.",
        whatToSay: "The report highlights risk posture, market confidence, evidence gaps and follow-up checks.",
        whatGeoAIProves: "A lender can generate a consistent review memo without claiming final valuation or credit approval.",
        expectedVisibleResult: "Asset review dashboard with memo-style summary and validation list."
      },
      {
        number: 4,
        screen: "report",
        route: "/reports/seeded-analysis-mbr-collateral-report/print",
        userAction: "Open the printable lender memo if available from project activity.",
        whatToSay: "The memo is a review package for discussion, not an automated credit decision.",
        whatGeoAIProves: "GeoAI can package a conservative evidence trail for bank stakeholders.",
        expectedVisibleResult: "Printable report with source lineage and validation caveat."
      }
    ],
    dataStory: [
      "Sample/offline market and geospatial context supports only screening-level interpretation.",
      "Customer-approved asset metadata is expected for a real pilot.",
      "Legal title, ownership, valuation and regulatory review stay outside the MVP.",
      "Source lineage distinguishes demo/open context from planned official validation."
    ],
    managementOutput: [
      "Collateral context memo",
      "Priority review shortlist",
      "Evidence-gap register",
      "Recommended validation and monitoring actions"
    ],
    pilotBridge: "A 3-5 week pilot can load selected asset locations, customer-approved collateral metadata and lender memo requirements to test review triage.",
    caveat: geoaiReleaseCaveat
  }
];

export const demoNarrativeByProjectKey: Record<string, DemoNarrative["id"]> = Object.fromEntries(
  demoNarratives.map((narrative) => [narrative.projectKey, narrative.id])
) as Record<string, DemoNarrative["id"]>;

export function getDemoNarrativeById(id?: string | null) {
  return demoNarratives.find((narrative) => narrative.id === id) ?? null;
}

export function getDemoNarrativeByProjectKey(projectKey?: string | null) {
  const narrativeId = projectKey ? demoNarrativeByProjectKey[projectKey] : null;
  return narrativeId ? getDemoNarrativeById(narrativeId) : null;
}

export function getDemoNarrativeForGuidedDemo(presetId?: string | null) {
  return demoNarratives.find((narrative) => narrative.guidedDemoPresetId === presetId) ?? null;
}

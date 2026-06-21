export type PilotClientType = "developer" | "fund" | "bank" | "government";

export type PilotPackage = {
  id: string;
  title: string;
  clientType: PilotClientType;
  objective: string;
  pilotDuration: string;
  inputDataRequired: string[];
  optionalData: string[];
  workflowSteps: string[];
  deliverables: string[];
  successCriteria: string[];
  validationSources: string[];
  notIncluded: string[];
  dataHonestyNote: string;
};

export const pilotPackages: PilotPackage[] = [
  {
    id: "developer-site-screening",
    title: "Developer / Master Developer Site Screening Pilot",
    clientType: "developer",
    objective: "Screen 3-10 candidate land parcels or development areas for investment, planning and infrastructure readiness.",
    pilotDuration: "2-4 weeks",
    inputDataRequired: [
      "Candidate site list with coordinates or GeoJSON boundaries",
      "Client development intent or asset thesis",
      "Known land-use assumptions or planning questions",
      "Preferred comparison areas or benchmark sites"
    ],
    optionalData: [
      "Internal feasibility assumptions",
      "Infrastructure capacity notes",
      "Customer-approved planning documents",
      "Existing GIS layers or CAD exports"
    ],
    workflowSteps: [
      "Load candidate sites and customer-approved spatial context",
      "Run scenario analysis for development potential and constraints",
      "Compare shortlisted alternatives",
      "Generate memo-ready outputs with evidence gaps",
      "Validate planning, infrastructure and title assumptions with official sources"
    ],
    deliverables: [
      "Site screening dashboard",
      "Ranked opportunity and risk summary",
      "Development due diligence memo",
      "Comparison matrix for shortlisted sites",
      "Validation checklist for official follow-up"
    ],
    successCriteria: [
      "Client can screen 3-10 candidate sites in one workflow",
      "Each site has clear evidence lineage and validation gaps",
      "Shortlist recommendation is explainable to investment and planning teams"
    ],
    validationSources: [
      "Dubai Municipality / GeoDubai planning layers",
      "Dubai Land Department or customer-approved land records",
      "Customer infrastructure and utility notes",
      "OpenStreetMap baseline context"
    ],
    notIncluded: [
      "Official zoning determination",
      "Legal title confirmation",
      "Certified valuation",
      "Permitting decision or approval"
    ],
    dataHonestyNote: "Pilot outputs combine uploaded/customer-approved data and open/demo context. Official planning and title validation remains required."
  },
  {
    id: "fund-investment-screening",
    title: "Fund / Family Office Investment Screening Pilot",
    clientType: "fund",
    objective: "Compare investable Dubai locations or assets using market context, spatial evidence and risk-adjusted recommendation logic.",
    pilotDuration: "2-4 weeks",
    inputDataRequired: [
      "Target asset or site list",
      "Investment thesis and hold-period assumptions",
      "Preferred geographies or excluded areas",
      "Minimum evidence requirements for investment committee review"
    ],
    optionalData: [
      "Internal underwriting model extracts",
      "Broker or advisor notes approved by the client",
      "Comparable transaction snapshots",
      "Existing investment memo template"
    ],
    workflowSteps: [
      "Load target assets or locations",
      "Run investment scenario analysis",
      "Compare 2-3 shortlisted alternatives",
      "Generate investment memo preview",
      "Flag market and official evidence requiring validation"
    ],
    deliverables: [
      "Investment screening dashboard",
      "Risk-adjusted comparison table",
      "Investment memo preview",
      "Evidence and data confidence summary",
      "Next due diligence action list"
    ],
    successCriteria: [
      "Investment team can compare shortlisted locations consistently",
      "Recommendation includes evidence confidence and limitations",
      "Memo output supports a go/no-go diligence conversation"
    ],
    validationSources: [
      "DLD / Dubai Pulse market snapshots where available",
      "Customer-approved comparable evidence",
      "OpenStreetMap and transport context",
      "Official planning validation sources identified by client"
    ],
    notIncluded: [
      "Certified valuation",
      "Live transaction feed",
      "Final investment recommendation",
      "Legal or tax advice"
    ],
    dataHonestyNote: "Pilot analysis is investment-screening support only. Market, ownership and planning claims must be validated before capital decisions."
  },
  {
    id: "bank-asset-review",
    title: "Bank / Lender Asset Review Pilot",
    clientType: "bank",
    objective: "Review collateral or financed asset locations for spatial risk, market context, evidence gaps and lender-ready reporting.",
    pilotDuration: "2-4 weeks",
    inputDataRequired: [
      "Asset list with coordinates, addresses or GeoJSON",
      "Collateral category or loan segment",
      "Required lender risk dimensions",
      "Customer-approved asset metadata"
    ],
    optionalData: [
      "Loan exposure bands",
      "Internal collateral review notes",
      "Inspection or monitoring records",
      "Preferred credit memo structure"
    ],
    workflowSteps: [
      "Load asset list and customer-approved metadata",
      "Run asset review analysis for spatial and market context",
      "Compare collateral clusters or shortlisted assets",
      "Generate lender memo preview",
      "Identify official/customer validation gaps"
    ],
    deliverables: [
      "Asset review dashboard",
      "Collateral context summary",
      "Risk and validation gap memo",
      "Shortlist comparison for priority assets",
      "Evidence lineage summary"
    ],
    successCriteria: [
      "Lender can review priority assets with consistent spatial evidence",
      "Risk notes distinguish demo/open context from validated data",
      "Outputs can support a credit review discussion without replacing valuation"
    ],
    validationSources: [
      "Customer-approved loan or asset metadata",
      "DLD / Dubai Pulse snapshots where available",
      "Official planning and title validation sources",
      "Open spatial context and risk datasets"
    ],
    notIncluded: [
      "Automated credit decisioning",
      "Certified appraisal",
      "Legal title opinion",
      "Regulatory capital calculation"
    ],
    dataHonestyNote: "Pilot outputs support lender review workflows and evidence triage. They are not credit decisions or certified valuations."
  },
  {
    id: "government-land-monitoring",
    title: "Government / Free Zone Land Monitoring Pilot",
    clientType: "government",
    objective: "Monitor selected land, district or free zone assets with transparent evidence lineage, change context and validation workflow.",
    pilotDuration: "3-4 weeks",
    inputDataRequired: [
      "Priority land or asset areas",
      "Monitoring questions and reporting cadence",
      "Customer-approved boundary or asset layers",
      "Known official validation workflow"
    ],
    optionalData: [
      "Inspection notes",
      "Permit or project status snapshots approved for pilot use",
      "Remote sensing requirements",
      "Stakeholder reporting format"
    ],
    workflowSteps: [
      "Load selected land or free zone assets",
      "Run urban planning, infrastructure or monitoring scenario analysis",
      "Compare selected districts or monitored objects",
      "Generate monitoring memo preview",
      "Document validation responsibilities and official data gaps"
    ],
    deliverables: [
      "Land monitoring dashboard",
      "Selected object evidence summary",
      "Planning and infrastructure context memo",
      "Comparison view for monitored assets",
      "Validation and escalation checklist"
    ],
    successCriteria: [
      "Stakeholders can review selected land objects with transparent evidence status",
      "Demo/open layers are clearly separated from official validation sources",
      "Monitoring workflow can be evaluated before production integration"
    ],
    validationSources: [
      "Customer-approved official GIS layers",
      "Dubai Municipality / GeoDubai validation sources",
      "OpenStreetMap baseline context",
      "Remote sensing catalog metadata where licensed"
    ],
    notIncluded: [
      "Official regulatory determination",
      "Enforcement action",
      "Certified cadastral record",
      "Live government system integration"
    ],
    dataHonestyNote: "Pilot monitoring is a workflow demonstration until official/customer-approved datasets are connected and validated."
  }
];

export const pilotPackageByProjectKey: Record<string, string> = {
  "dubai-investment-screening-demo": "fund-investment-screening",
  "developer-land-pipeline-demo": "developer-site-screening",
  "bank-asset-review-demo": "bank-asset-review",
  "government-free-zone-monitoring-demo": "government-land-monitoring"
};

export function getPilotPackageById(id?: string | null) {
  return pilotPackages.find((pilotPackage) => pilotPackage.id === id) ?? pilotPackages[0];
}

export function getPilotPackageForProject(projectKey?: string | null, clientType?: string | null) {
  const mappedId = projectKey ? pilotPackageByProjectKey[projectKey] : null;
  if (mappedId) return getPilotPackageById(mappedId);

  const normalizedClientType = clientType === "developer" || clientType === "fund" || clientType === "bank" || clientType === "government"
    ? clientType
    : null;

  return pilotPackages.find((pilotPackage) => pilotPackage.clientType === normalizedClientType) ?? pilotPackages[0];
}

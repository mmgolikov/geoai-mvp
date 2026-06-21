import type { PilotClientType } from "@/src/lib/pilot/pilot-packages";

export type PilotDataRequirementSet = {
  clientType: PilotClientType;
  required: string[];
  recommended: string[];
  notRequiredForDemo: string[];
};

export const pilotDataRequirements: Record<PilotClientType, PilotDataRequirementSet> = {
  developer: {
    clientType: "developer",
    required: [
      "Candidate site coordinates or GeoJSON boundaries",
      "Development intent or asset thesis",
      "Known planning questions",
      "Client-approved site metadata"
    ],
    recommended: [
      "Infrastructure capacity notes",
      "Customer planning documents",
      "Comparable project list",
      "Known constraints or easements"
    ],
    notRequiredForDemo: [
      "Live cadastral feed",
      "Certified zoning decision",
      "Legal title opinion"
    ]
  },
  fund: {
    clientType: "fund",
    required: [
      "Target asset or site list",
      "Investment thesis",
      "Preferred comparison geography",
      "Required investment committee evidence fields"
    ],
    recommended: [
      "Comparable transaction snapshots",
      "Internal underwriting assumptions",
      "Advisor notes approved for pilot use",
      "Target hold-period assumptions"
    ],
    notRequiredForDemo: [
      "Live market feed",
      "Certified valuation",
      "Final investment approval model"
    ]
  },
  bank: {
    clientType: "bank",
    required: [
      "Collateral or asset list",
      "Coordinates, addresses or boundaries",
      "Asset category / loan segment",
      "Required lender risk dimensions"
    ],
    recommended: [
      "Exposure bands",
      "Inspection notes",
      "Internal collateral review fields",
      "Credit memo format"
    ],
    notRequiredForDemo: [
      "Automated credit decision engine",
      "Certified appraisal",
      "Regulatory capital model"
    ]
  },
  government: {
    clientType: "government",
    required: [
      "Priority land or monitored asset areas",
      "Customer-approved boundary layers",
      "Monitoring questions",
      "Validation workflow owner"
    ],
    recommended: [
      "Inspection or permit snapshots",
      "Reporting cadence",
      "Remote sensing requirements",
      "Stakeholder escalation rules"
    ],
    notRequiredForDemo: [
      "Live official GIS integration",
      "Regulatory enforcement workflow",
      "Certified cadastral record"
    ]
  }
};

export function getPilotDataRequirements(clientType: PilotClientType) {
  return pilotDataRequirements[clientType];
}

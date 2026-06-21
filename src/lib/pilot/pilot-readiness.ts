export type PilotReadinessLabel =
  | "Demo-ready"
  | "Pilot setup in progress"
  | "Pilot data required"
  | "Validation required before decisions";

export type PilotReadinessInput = {
  targetSitesProvided: boolean;
  geometryAvailable: boolean;
  marketDataAvailable: boolean;
  externalOpenDataAvailable: boolean;
  validationSourcesIdentified: boolean;
  reportsGenerated: boolean;
  comparisonGenerated: boolean;
  officialCustomerValidationPending: boolean;
};

export type PilotReadinessResult = {
  score: number;
  readinessLabel: PilotReadinessLabel;
  missingItems: string[];
  nextActions: string[];
  dimensions: Array<{
    label: string;
    complete: boolean;
  }>;
};

export function calculatePilotReadiness(input: PilotReadinessInput): PilotReadinessResult {
  const dimensions = [
    { label: "Target sites/assets provided", complete: input.targetSitesProvided },
    { label: "Geometry available", complete: input.geometryAvailable },
    { label: "Market data available", complete: input.marketDataAvailable },
    { label: "External/open data available", complete: input.externalOpenDataAvailable },
    { label: "Validation sources identified", complete: input.validationSourcesIdentified },
    { label: "Reports generated", complete: input.reportsGenerated },
    { label: "Comparison generated", complete: input.comparisonGenerated },
    { label: "Official/customer validation pending", complete: !input.officialCustomerValidationPending }
  ];

  const completed = dimensions.filter((dimension) => dimension.complete).length;
  const score = Math.round((completed / dimensions.length) * 100);
  const missingItems = dimensions
    .filter((dimension) => !dimension.complete)
    .map((dimension) => dimension.label);

  let readinessLabel: PilotReadinessLabel = "Pilot data required";
  if (input.officialCustomerValidationPending && score >= 70) {
    readinessLabel = "Validation required before decisions";
  } else if (score >= 75) {
    readinessLabel = "Demo-ready";
  } else if (score >= 45) {
    readinessLabel = "Pilot setup in progress";
  }

  const nextActions = [
    !input.targetSitesProvided ? "Upload or confirm 3-10 target sites/assets." : null,
    !input.geometryAvailable ? "Provide coordinates or GeoJSON boundaries for pilot assets." : null,
    !input.marketDataAvailable ? "Load customer-approved market snapshots or sample metrics." : null,
    !input.validationSourcesIdentified ? "Agree official/customer validation sources before decision use." : null,
    !input.reportsGenerated ? "Generate at least one memo/report preview." : null,
    !input.comparisonGenerated ? "Compare shortlisted sites or assets." : null,
    input.officialCustomerValidationPending ? "Complete official/customer validation before decisions." : null
  ].filter((action): action is string => Boolean(action));

  return {
    score,
    readinessLabel,
    missingItems,
    nextActions: nextActions.length > 0 ? nextActions : ["Review pilot outputs with the client and confirm validation sign-off."],
    dimensions
  };
}

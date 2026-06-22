import { createEvidenceItem } from "@/src/data/data-source-registry";
import type {
  AnalysisScenario,
  AnalysisScenarioId,
  ExpressAnalysis,
  ScoreKey,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

export const analysisScenarios: AnalysisScenario[] = [
  {
    id: "realEstateDevelopment",
    label: "Real Estate Development",
    description: "Development potential, land-use assumptions, access, infrastructure, and due diligence priorities."
  },
  {
    id: "investmentSiteSelection",
    label: "Investment Site Selection",
    description: "Location quality, demand drivers, risk-adjusted opportunity, and comparison readiness."
  },
  {
    id: "constructionMonitoring",
    label: "Construction Monitoring",
    description: "Readiness, progress evidence, satellite or drone monitoring workflow, and deviation risks."
  },
  {
    id: "infrastructureUrbanPlanning",
    label: "Infrastructure / Urban Planning",
    description: "Transport, utilities, urban integration, public infrastructure dependencies, and planning constraints."
  },
  {
    id: "climateRisk",
    label: "Climate & Risk",
    description: "Heat exposure, coastal assumptions, resilience needs, insurance implications, and mitigation actions."
  },
  {
    id: "customQuery",
    label: "Custom Query",
    description: "Ask a tailored site, investment, infrastructure, or risk question for a mock structured response."
  }
];

const scoreOrder: ScoreKey[] = [
  "developmentPotential",
  "investmentAttractiveness",
  "accessibility",
  "infrastructureReadiness",
  "climateHeatRisk",
  "overallRisk"
];

const defaultScoreLabels: Record<ScoreKey, string> = {
  developmentPotential: "Development Potential",
  investmentAttractiveness: "Investment Attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure Readiness",
  climateHeatRisk: "Climate / Heat Risk",
  overallRisk: "Overall Risk"
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function coordinateSeed(point: SelectedPoint) {
  const latSeed = Math.abs(Math.sin(point.latitude * 11.7));
  const lngSeed = Math.abs(Math.cos(point.longitude * 8.9));
  return (latSeed + lngSeed) / 2;
}

function scoreNear(value: number, target: number, spread: number) {
  return clampScore(100 - Math.abs(value - target) * spread);
}

function formatCoordinate(point: SelectedPoint) {
  return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
}

export function normalizeCustomQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function createQuerySlug(query: string) {
  const normalized = normalizeCustomQuery(query).toLowerCase();
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36).slice(0, 6) || "query";
}

export function classifyCustomQueryIntent(query: string) {
  const normalized = normalizeCustomQuery(query).toLowerCase();
  const checks: Array<[string, string[]]> = [
    ["use-class fit / development strategy", ["logistics", "residential", "land banking", "landbank", "use class", "better for"]],
    ["land use / zoning / planning constraints", ["zoning", "land use", "far", "density", "planning", "permission", "permit", "allowed use"]],
    ["climate / heat / coastal / flood risk", ["climate", "heat", "coastal", "flood", "drainage", "resilience", "insurance"]],
    ["investment / underwriting / liquidity", ["investment", "underwriting", "irr", "yield", "liquidity", "return", "exit", "cash flow"]],
    ["access / transport / catchment", ["access", "transport", "metro", "road", "catchment", "traffic", "commute", "connectivity"]],
    ["infrastructure / utilities / readiness", ["infrastructure", "utility", "utilities", "power", "water", "readiness", "capacity"]],
    ["construction monitoring / progress", ["construction", "progress", "monitoring", "drone", "satellite", "milestone", "delay"]],
    ["banking / collateral / lender review", ["bank validate", "bank check", "bank should", "lender", "financing", "collateral", "loan", "mortgage", "encumbrance", "title"]],
    ["insurance / risk review", ["insurer", "insurance", "premium", "risk review", "hazard", "exposure"]],
    ["government monitoring / compliance", ["government", "municipality", "compliance", "public", "authority", "free zone"]],
    ["retail / hospitality / business location", ["retail", "hotel", "hospitality", "restaurant", "business location", "footfall"]]
  ];

  return checks.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0] ?? "generic custom question";
}

function createCustomQueryOverlay(
  query: string,
  scenarioId: AnalysisScenarioId,
  selectedObject: SelectedDemoObject | null | undefined,
  point: SelectedPoint
) {
  const normalizedQuery = normalizeCustomQuery(query);
  const intent = classifyCustomQueryIntent(normalizedQuery);
  const targetName = selectedObject?.name ?? `the selected coordinate ${formatCoordinate(point)}`;
  const commonLimit = "This custom query is answered as demo screening intelligence only; official parcel, planning, title, market and risk evidence must be validated before decisions.";

  const byIntent: Record<string, {
    summary: string;
    keyFactors: string[];
    opportunities: string[];
    risks: string[];
    nextActions: string[];
  }> = {
    "land use / zoning / planning constraints": {
      summary: `The custom query adds a land-use and planning-constraint lens to ${targetName}, so the result prioritizes permitted-use validation, FAR/density assumptions and authority review before any development conclusion.`,
      keyFactors: [
        "Custom query lens: land-use, FAR, zoning and permission risk are now primary decision checks.",
        "Planning fit cannot be concluded until official Dubai Municipality / GeoDubai or customer-approved planning evidence is reviewed."
      ],
      opportunities: ["Use this query to turn the site screen into a planning validation checklist before feasibility spend."],
      risks: ["Permitted use, FAR, density, setbacks and ownership constraints are not validated in the demo context."],
      nextActions: [
        "Request official land-use, zoning, FAR and permitted-use confirmation.",
        "Compare the site against alternatives with clearer planning evidence."
      ]
    },
    "investment / underwriting / liquidity": {
      summary: `The custom query shifts the analysis toward underwriting quality for ${targetName}, emphasizing liquidity, risk-adjusted returns, exit depth and comparable evidence gaps.`,
      keyFactors: [
        "Custom query lens: investment underwriting requires pricing, liquidity, demand and exit assumptions to be tested.",
        "Current scores can frame the thesis, but do not replace transaction, rental, yield or ownership evidence."
      ],
      opportunities: ["Use the query to structure an IC memo around risk-adjusted upside and alternative-site comparison."],
      risks: ["IRR, yield, pricing, liquidity and exit depth cannot be validated from demo data alone."],
      nextActions: [
        "Validate transaction and rental comparables with official or customer-approved sources.",
        "Model conservative, base and upside underwriting cases."
      ]
    },
    "access / transport / catchment": {
      summary: `The custom query adds an access and catchment lens for ${targetName}, so transport corridors, travel-time assumptions and demand-generator proximity become more important in the result.`,
      keyFactors: [
        "Custom query lens: access, road hierarchy, public transport and catchment quality drive site suitability.",
        "Open-baseline roads and demo POIs are useful screening context but not official transport evidence."
      ],
      opportunities: ["Use this query to compare the site against alternatives by access quality and catchment strength."],
      risks: ["Traffic, travel time, transit access and catchment depth require validated transport and demand datasets."],
      nextActions: [
        "Validate transport accessibility with official network and travel-time data.",
        "Create a catchment comparison against 2-3 alternative sites."
      ]
    },
    "infrastructure / utilities / readiness": {
      summary: `The custom query reframes ${targetName} around infrastructure readiness, utility capacity, access works and delivery dependencies.`,
      keyFactors: [
        "Custom query lens: utility capacity, road access and delivery dependencies are treated as feasibility-critical.",
        "Infrastructure readiness is currently inferred from demo context and must be confirmed by utility and authority data."
      ],
      opportunities: ["Use the query to identify infrastructure dependencies that can be validated before acquisition or design lock-in."],
      risks: ["Utility capacity, access upgrades and service connections are not confirmed in the current evidence base."],
      nextActions: [
        "Request utility capacity and road-access confirmation.",
        "Map infrastructure dependencies and likely delivery sequencing."
      ]
    },
    "climate / heat / coastal / flood risk": {
      summary: `The custom query adds a climate and resilience lens to ${targetName}, emphasizing heat exposure, coastal/flood assumptions, drainage and underwriting implications.`,
      keyFactors: [
        "Custom query lens: heat, flood, coastal and drainage risk are now central to the decision frame.",
        "Climate screening is indicative only until official hazard, elevation, drainage and engineering evidence is reviewed."
      ],
      opportunities: ["Use the query to position resilience measures as value protection for lenders, insurers and long-term owners."],
      risks: ["Heat, coastal, flood and drainage exposure are not certified by official or engineering-grade sources in this MVP."],
      nextActions: [
        "Validate exposure with official hazard, elevation and drainage datasets.",
        "Request insurance and lender resilience requirements before underwriting."
      ]
    },
    "construction monitoring / progress": {
      summary: `The custom query changes the analysis for ${targetName} toward construction monitoring, progress evidence, schedule deviation and imagery/document cadence.`,
      keyFactors: [
        "Custom query lens: monitoring value depends on project boundary, baseline schedule, imagery cadence and site-report evidence.",
        "Progress interpretation cannot be operational without drawings, milestones and validated field or imagery data."
      ],
      opportunities: ["Use this query to define a repeatable lender or investor monitoring workflow."],
      risks: ["No live imagery, approved drawings or schedule baseline is connected for this demo analysis."],
      nextActions: [
        "Upload project boundary, schedule and baseline drawings when available.",
        "Define monitoring cadence and deviation categories."
      ]
    },
    "banking / collateral / lender review": {
      summary: `The custom query applies a lender and collateral-review lens to ${targetName}, focusing on title, ownership, encumbrances, liquidity, construction status and evidence gaps.`,
      keyFactors: [
        "Custom query lens: bank review requires title, ownership, encumbrance, collateral liquidity and borrower/project evidence.",
        "Spatial scores support screening, but credit decisions require legal, valuation and official collateral documentation."
      ],
      opportunities: ["Use the query to prepare a lender due-diligence checklist and collateral memo outline."],
      risks: ["Title, ownership, encumbrances, valuation, borrower risk and legal enforceability are not validated by this demo."],
      nextActions: [
        "Request title, ownership, encumbrance and valuation evidence.",
        "Validate collateral liquidity and project progress before financing approval."
      ]
    },
    "insurance / risk review": {
      summary: `The custom query reframes ${targetName} for insurance and risk review, emphasizing hazard exposure, resilience obligations and underwriting evidence gaps.`,
      keyFactors: [
        "Custom query lens: insurability depends on validated hazard exposure, mitigation measures and asset-use assumptions.",
        "Demo risk signals must be replaced with insurer-approved or engineering-grade evidence before pricing decisions."
      ],
      opportunities: ["Use this query to create an insurer-facing risk evidence checklist."],
      risks: ["Insurance pricing, exclusions and mitigation requirements cannot be inferred from demo data."],
      nextActions: [
        "Request hazard, resilience and engineering evidence required by insurers.",
        "Compare mitigation cost and risk posture against alternative sites."
      ]
    },
    "government monitoring / compliance": {
      summary: `The custom query applies a government or compliance-monitoring lens to ${targetName}, focusing on approved use, public infrastructure dependency and authority validation.`,
      keyFactors: [
        "Custom query lens: compliance depends on official planning status, authority approvals and public infrastructure interface.",
        "Demo geometry is not an official parcel, planning or compliance boundary."
      ],
      opportunities: ["Use the query to prepare a planning or compliance evidence request for public-sector review."],
      risks: ["Compliance status, public obligations and authority approvals are not validated in the current evidence base."],
      nextActions: [
        "Request official compliance, planning and approval evidence.",
        "Map authority dependencies and public infrastructure interfaces."
      ]
    },
    "retail / hospitality / business location": {
      summary: `The custom query adds a business-location lens for ${targetName}, emphasizing catchment, visibility, access, footfall proxies and demand-generator evidence.`,
      keyFactors: [
        "Custom query lens: retail or hospitality fit depends on catchment depth, access, visibility and surrounding demand generators.",
        "Footfall, spend, hotel demand and leasing assumptions are not connected as official/live sources."
      ],
      opportunities: ["Use the query to build a location-fit memo for tenant, hotel or business-use screening."],
      risks: ["Customer demand, footfall, trade area and leasing evidence require validated market datasets."],
      nextActions: [
        "Validate catchment, footfall and leasing assumptions.",
        "Compare the location against alternative business nodes."
      ]
    },
    "use-class fit / development strategy": {
      summary: `The custom query compares use-class fit for ${targetName} at screening level, contrasting logistics, residential development and land-banking potential without claiming permitted use.`,
      keyFactors: [
        "Custom query lens: logistics fit depends on access and corridor position, while residential fit depends on catchment, amenities and planning permission.",
        "Land-banking potential depends on infrastructure timing, holding cost, ownership and future planning clarity."
      ],
      opportunities: ["Use the query to compare logistics, residential and land-banking strategies using the same validation checklist."],
      risks: ["Permitted use, FAR, access rights and market absorption are not validated, so no use-class conclusion is final."],
      nextActions: [
        "Validate permitted use and planning envelope for each strategy.",
        "Compare logistics, residential and land-banking scenarios against 2-3 alternative sites."
      ]
    },
    "generic custom question": {
      summary: `The custom query adds a user-defined decision lens to ${targetName}: "${normalizedQuery}". The result highlights the evidence needed to answer it rigorously without treating demo context as official.`,
      keyFactors: [
        `Custom query lens: ${normalizedQuery}`,
        `The ${scenarioId} scenario is interpreted through the user's additional question and available demo evidence.`
      ],
      opportunities: ["Use the query to turn a broad spatial question into a repeatable site-screening checklist."],
      risks: ["The custom question may require official, customer-approved or live data that is not connected in this MVP."],
      nextActions: [
        "Define the measurable criteria needed to answer the custom question.",
        "List the official or customer-approved evidence required before decisions."
      ]
    }
  };

  return {
    intent,
    summary: byIntent[intent].summary,
    keyFactors: byIntent[intent].keyFactors,
    opportunities: byIntent[intent].opportunities,
    risks: byIntent[intent].risks,
    nextActions: byIntent[intent].nextActions,
    limitations: [commonLimit],
    evidenceNote: `Custom query "${normalizedQuery}" applied as a ${intent} lens. This is demo screening context and requires official validation.`
  };
}

function getBaseSignals(point: SelectedPoint) {
  const seed = coordinateSeed(point);
  const dubaiCoreProximity = scoreNear(point.longitude, 55.27, 105);
  const southCorridorFit = scoreNear(point.latitude, 24.93, 95);
  const coastalExposure = scoreNear(point.latitude, 25.12, 70);
  const isSouthLeaning = point.latitude < 25.05;
  const isCoreLeaning = point.longitude > 55.2 && point.latitude > 25.05;
  const districtTone = isCoreLeaning
    ? "an established Dubai urban node with stronger demand signals and higher execution complexity"
    : isSouthLeaning
      ? "a growth-corridor position where upside depends on infrastructure timing and land-use clarity"
      : "a transitional Dubai location with mixed investment signals and a need for deeper site validation";

  return {
    seed,
    dubaiCoreProximity,
    southCorridorFit,
    coastalExposure,
    districtTone
  };
}

function createScores(point: SelectedPoint, scenarioId: AnalysisScenarioId): Record<ScoreKey, number> {
  const signals = getBaseSignals(point);
  const baseScores: Record<ScoreKey, number> = {
    developmentPotential: clampScore(62 + signals.southCorridorFit * 0.24 + signals.seed * 10),
    investmentAttractiveness: clampScore(58 + signals.dubaiCoreProximity * 0.24 + signals.seed * 12),
    accessibility: clampScore(55 + signals.dubaiCoreProximity * 0.22 + signals.southCorridorFit * 0.12),
    infrastructureReadiness: clampScore(54 + signals.southCorridorFit * 0.18 + signals.seed * 16),
    climateHeatRisk: clampScore(42 + signals.coastalExposure * 0.24 + signals.seed * 12),
    overallRisk: clampScore(38 + (100 - signals.southCorridorFit) * 0.16 + signals.coastalExposure * 0.16)
  };

  const scenarioAdjustments: Record<AnalysisScenarioId, Partial<Record<ScoreKey, number>>> = {
    realEstateDevelopment: {
      developmentPotential: 6,
      accessibility: 3,
      infrastructureReadiness: 4,
      overallRisk: -2
    },
    investmentSiteSelection: {
      investmentAttractiveness: 8,
      accessibility: 4,
      overallRisk: 3
    },
    constructionMonitoring: {
      developmentPotential: -4,
      infrastructureReadiness: 10,
      climateHeatRisk: -3,
      overallRisk: -5
    },
    infrastructureUrbanPlanning: {
      accessibility: 7,
      infrastructureReadiness: 8,
      investmentAttractiveness: -2
    },
    climateRisk: {
      climateHeatRisk: 12,
      overallRisk: 9,
      infrastructureReadiness: -3
    },
    customQuery: {
      developmentPotential: 1,
      investmentAttractiveness: 1,
      accessibility: 1,
      infrastructureReadiness: 1
    }
  };

  const adjustments = scenarioAdjustments[scenarioId];

  return scoreOrder.reduce<Record<ScoreKey, number>>((scores, key) => {
    scores[key] = clampScore(baseScores[key] + (adjustments[key] ?? 0));
    return scores;
  }, {} as Record<ScoreKey, number>);
}

function commonEvidence(point: SelectedPoint, scenarioLabel: string, selectedObject?: SelectedDemoObject | null) {
  const evidence = [
    createEvidenceItem(
      "map-selection",
      "synthetic-demo-layers",
      "Map selection",
      `Selected coordinates: ${formatCoordinate(point)}`
    ),
    createEvidenceItem(
      "scenario-context",
      "synthetic-demo-layers",
      `${scenarioLabel} scenario`,
      "Scenario-specific mock context generated from deterministic demo assumptions."
    ),
    createEvidenceItem(
      "infrastructure-context",
      "osm-geofabrik",
      "Infrastructure context",
      "Planned future source for road, access, and infrastructure validation.",
      "medium"
    ),
    createEvidenceItem(
      "planning-context",
      "dubai-municipality-gis-planning",
      "Planning / GIS context",
      "Planned future source for zoning, land-use, and planning constraints.",
      "medium"
    ),
    createEvidenceItem(
      "mock-scoring-model",
      "synthetic-demo-layers",
      "Mock scoring model",
      "Deterministic local scoring model used for MVP demonstration."
    )
  ];

  if (selectedObject) {
    evidence.splice(
      2,
      0,
      createEvidenceItem(
        "selected-demo-object",
        selectedObject.spatialContext?.sourceId ?? "synthetic-demo-layers",
        `Spatial feature: ${selectedObject.name}`,
        selectedObject.spatialContext
          ? `${selectedObject.spatialContext.datasetName}; ${selectedObject.spatialContext.subtype} / ${selectedObject.spatialContext.geometryType}; source ${selectedObject.spatialContext.sourceStatus}, geometry status ${selectedObject.spatialContext.geometryStatus}, ${selectedObject.spatialContext.confidenceLevel} confidence. Scenario relevance: ${selectedObject.spatialContext.scenarioRelevance.join(", ")}. ${selectedObject.spatialContext.limitations[0]}`
          : `${selectedObject.type} from ${selectedObject.layerName}.`,
        selectedObject.spatialContext?.confidenceLevel ?? "demo"
      )
    );
  }

  return evidence;
}

export function createMockExpressAnalysis(
  point: SelectedPoint,
  scenarioId: AnalysisScenarioId,
  customQuery = "",
  selectedObject?: SelectedDemoObject | null
): ExpressAnalysis {
  const scenario = analysisScenarios.find((item) => item.id === scenarioId) ?? analysisScenarios[0];
  const normalizedCustomQuery = normalizeCustomQuery(customQuery);
  const queryOverlay = normalizedCustomQuery
    ? createCustomQueryOverlay(normalizedCustomQuery, scenario.id, selectedObject, point)
    : null;
  const signals = getBaseSignals(point);
  const scores = createScores(point, scenario.id);
  const id = `express-${scenario.id}-${point.latitude.toFixed(5)}-${point.longitude.toFixed(5)}${normalizedCustomQuery ? `-q-${createQuerySlug(normalizedCustomQuery)}` : ""}`;
  const objectContext = selectedObject
    ? `The selected demo object is ${selectedObject.name}, a synthetic ${selectedObject.type.toLowerCase()} from the ${selectedObject.layerName} layer. `
    : "";
  const subtitle = selectedObject
    ? `${selectedObject.type} / ${selectedObject.layerName} · ${formatCoordinate(point)}`
    : formatCoordinate(point);

  const scenarios: Record<
    AnalysisScenarioId,
    Omit<ExpressAnalysis, "id" | "scenarioId" | "point" | "selectedObject" | "subtitle" | "scores">
  > = {
    realEstateDevelopment: {
      title: "Real Estate Development Intelligence",
      summary:
        `${objectContext}This demo development analysis treats the selected coordinate as a candidate Dubai site with ${signals.districtTone}. ` +
        `The mock model emphasizes land-use assumptions, access, surrounding infrastructure, and commercial or residential potential. ` +
        `The location appears suitable for early-stage screening, but official zoning, ownership, utilities, density, and market absorption must be validated before any commitment. ` +
        `This is deterministic demo intelligence only, prepared to show the GeoAI workflow before official planning and parcel datasets are connected.`,
      scoreLabels: defaultScoreLabels,
      keyFactors: [
        "Indicative proximity to major road corridors and daily access routes",
        "Land-use suitability represented through demo Dubai growth-pattern assumptions",
        "Surrounding infrastructure maturity inferred from mock mobility and utility context",
        "Commercial and residential potential estimated from access and district positioning",
        "Execution constraints tied to zoning, ownership, density, and approvals",
        "Heat and public-realm exposure included as an early design risk signal"
      ],
      opportunities: [
        "Screen the point for mixed-use, residential support, logistics, or land-banking strategies.",
        "Use the site as a benchmark for nearby corridor alternatives.",
        "Prepare an early development brief with assumptions, score ranges, and diligence gaps.",
        "Prioritize land-use, access, and infrastructure confirmation before feasibility spend."
      ],
      risks: [
        "Land-use rights, permitted density, and ownership are not verified in this demo model.",
        "Utility capacity and access upgrades may change the development envelope.",
        "Market absorption and target segment depth require current transaction evidence.",
        "Outdoor comfort and heat mitigation may affect public-realm and operating assumptions."
      ],
      nextActions: [
        "Request land-use and zoning confirmation for the selected coordinate.",
        "Compare this point with two or three nearby development alternatives.",
        "Run a regulatory constraints check once official layers are available.",
        "Assess transport accessibility and infrastructure capacity with validated datasets.",
        "Prepare a concise development memo for investor or planning review."
      ],
      evidence: commonEvidence(point, scenario.label, selectedObject)
    },
    investmentSiteSelection: {
      title: "Investment Site Selection Intelligence",
      summary:
        `${objectContext}This demo investment analysis frames the selected coordinate as a candidate asset or land position in Dubai. ` +
        `The mock result focuses on location quality, surrounding demand drivers, liquidity assumptions, and risk-adjusted upside. ` +
        `The site shows useful early signals for comparison, but the recommendation should be tested against alternative parcels, pricing, lease demand, exit liquidity, and legal status. ` +
        `This is deterministic demo intelligence only and does not represent live market advice.`,
      scoreLabels: {
        developmentPotential: "Location Quality",
        investmentAttractiveness: "Investment Attractiveness",
        accessibility: "Demand Driver Access",
        infrastructureReadiness: "Execution Readiness",
        climateHeatRisk: "Climate Exposure",
        overallRisk: "Risk-Adjusted Concern"
      },
      keyFactors: [
        "Indicative access to demand generators and business corridors",
        "District liquidity assumptions based on mock Dubai market context",
        "Relative position versus alternative growth-corridor sites",
        "Infrastructure readiness as a proxy for holding-period risk",
        "Commercial catchment and end-user depth represented through demo demand signals",
        "Climate, regulatory, and execution uncertainty included in risk-adjusted scoring"
      ],
      opportunities: [
        "Use the point as one candidate in a ranked short-list of investment sites.",
        "Package the location into an investor memo with comparable-site assumptions.",
        "Test acquisition timing against infrastructure delivery and nearby demand drivers.",
        "Position the asset thesis around risk-adjusted upside rather than generic growth."
      ],
      risks: [
        "Pricing, ownership, encumbrances, and transaction liquidity are not verified.",
        "Exit depth may vary materially by use class and delivery timing.",
        "Alternative sites may offer better access, lower risk, or clearer land rights.",
        "Market demand assumptions require current broker, transaction, and leasing evidence."
      ],
      nextActions: [
        "Compare this point against at least three alternative investment sites.",
        "Request ownership, title, and encumbrance checks before underwriting.",
        "Benchmark land or asset pricing against recent market evidence.",
        "Model risk-adjusted returns under conservative, base, and upside scenarios.",
        "Prepare an investment committee snapshot with open diligence items."
      ],
      evidence: commonEvidence(point, scenario.label, selectedObject)
    },
    constructionMonitoring: {
      title: "Construction Monitoring Intelligence",
      summary:
        `${objectContext}This demo monitoring analysis treats the selected coordinate as a construction or project-control location. ` +
        `The mock assessment emphasizes readiness for satellite or drone monitoring, visible progress evidence, site access, and deviation risks. ` +
        `The area appears suitable for a repeatable monitoring workflow once project boundaries, baseline schedule, and approved drawings are available. ` +
        `This is deterministic demo intelligence only and does not use live imagery or field data yet.`,
      scoreLabels: {
        developmentPotential: "Monitoring Suitability",
        investmentAttractiveness: "Progress Signal Quality",
        accessibility: "Site Access",
        infrastructureReadiness: "Construction Readiness",
        climateHeatRisk: "Weather / Heat Disruption",
        overallRisk: "Deviation Risk"
      },
      keyFactors: [
        "Map-selected point can anchor a future project boundary or monitoring zone",
        "Site access and logistics inferred from demo road-context assumptions",
        "Construction readiness represented through mock infrastructure proximity",
        "Progress evidence workflow suitable for satellite, drone, and site-report comparison",
        "Deviation risk linked to schedule baseline, document gaps, and site constraints",
        "Heat exposure considered as a potential productivity and safety factor"
      ],
      opportunities: [
        "Set up a repeatable progress-monitoring cadence for investor or lender reporting.",
        "Use imagery change detection once live satellite or drone sources are connected.",
        "Compare planned milestones against observed site activity and document evidence.",
        "Create a lightweight exception report for delayed or high-risk project zones."
      ],
      risks: [
        "No live imagery, schedule baseline, or project boundary is connected yet.",
        "Visual progress signals may be ambiguous without drawings and site reports.",
        "Heat, access, and logistics constraints can distort expected productivity.",
        "Deviation alerts require calibrated thresholds before operational use."
      ],
      nextActions: [
        "Upload baseline drawings, schedule, and project boundary when document support is added.",
        "Define monitoring cadence: weekly, biweekly, or milestone-based.",
        "Connect satellite or drone imagery sources in a future integration step.",
        "Create deviation categories for progress, access, safety, and material staging.",
        "Prepare a sample lender or investor monitoring report."
      ],
      evidence: commonEvidence(point, scenario.label, selectedObject)
    },
    infrastructureUrbanPlanning: {
      title: "Infrastructure & Urban Planning Intelligence",
      summary:
        `${objectContext}This demo planning analysis evaluates the selected coordinate through an urban integration lens. ` +
        `The mock model focuses on transport context, utility dependency, public infrastructure requirements, and social or environmental constraints. ` +
        `The site can be used as an early planning-screening point, but authoritative mobility, utility, population, environmental, and land-use layers are required before recommendations become operational. ` +
        `This is deterministic demo intelligence only for prototype demonstration.`,
      scoreLabels: {
        developmentPotential: "Urban Integration",
        investmentAttractiveness: "Public Value Potential",
        accessibility: "Transport Connectivity",
        infrastructureReadiness: "Utility Readiness",
        climateHeatRisk: "Environmental Stress",
        overallRisk: "Planning Constraint Risk"
      },
      keyFactors: [
        "Transport connectivity inferred from demo road and corridor context",
        "Utility readiness represented through mock infrastructure maturity assumptions",
        "Urban integration potential assessed against surrounding development pattern",
        "Public infrastructure dependency considered for access, services, and capacity",
        "Social and environmental constraints included as early planning risk signals",
        "Coordination needs across mobility, land-use, and resilience planning"
      ],
      opportunities: [
        "Use the point as a seed for corridor, district, or service-area planning analysis.",
        "Identify where transport and utility upgrades may unlock development value.",
        "Frame early public-private coordination needs before detailed master planning.",
        "Prioritize sites that improve urban continuity and infrastructure efficiency."
      ],
      risks: [
        "Public infrastructure capacity is not validated with official utility or transport data.",
        "Planning recommendations may change once population, land-use, and environmental layers are added.",
        "Social impact and public-realm requirements require stakeholder and policy review.",
        "Climate resilience costs may affect infrastructure sequencing and funding."
      ],
      nextActions: [
        "Request transport network, utility capacity, and land-use layers.",
        "Compare the selected point against nearby corridor and service-area alternatives.",
        "Run a public infrastructure dependency screen when official layers are available.",
        "Assess environmental and social constraints before concept planning.",
        "Prepare a planning note for agency or developer coordination."
      ],
      evidence: commonEvidence(point, scenario.label, selectedObject)
    },
    climateRisk: {
      title: "Climate & Risk Intelligence",
      summary:
        `${objectContext}This demo climate analysis treats the selected coordinate as a spatial risk-screening location in Dubai. ` +
        `The mock assessment emphasizes heat exposure, coastal or flood assumptions, urban heat island effects, resilience requirements, and financing or insurance implications. ` +
        `The result is useful for early risk framing, but live hazard, elevation, drainage, insurance, and climate-projection datasets are required before formal decisions. ` +
        `This is deterministic demo intelligence only and is not a certified climate-risk assessment.`,
      scoreLabels: {
        developmentPotential: "Adaptation Potential",
        investmentAttractiveness: "Resilience Investment Case",
        accessibility: "Emergency / Access Resilience",
        infrastructureReadiness: "Resilience Readiness",
        climateHeatRisk: "Heat / Coastal Exposure",
        overallRisk: "Overall Climate Risk"
      },
      keyFactors: [
        "Heat exposure represented through demo outdoor-comfort and urban heat assumptions",
        "Coastal and drainage exposure approximated from selected map position",
        "Infrastructure resilience inferred from mock utility and road context",
        "Financing and insurance implications considered through risk-adjusted scoring",
        "Mitigation needs linked to shading, cooling, drainage, and material strategy",
        "Climate uncertainty flagged for formal hazard-layer integration"
      ],
      opportunities: [
        "Use climate screening to prioritize resilient design before feasibility locks in.",
        "Position adaptation measures as value protection for lenders and long-term owners.",
        "Compare exposure across alternative sites before land or asset commitment.",
        "Prepare an early resilience brief for investment, design, or insurance discussion."
      ],
      risks: [
        "Heat stress may affect outdoor comfort, mobility, construction, and operating costs.",
        "Coastal, flood, and drainage assumptions are not validated with official hazard data.",
        "Insurance and financing terms may change once formal risk studies are completed.",
        "Mitigation costs may materially affect feasibility if resilience is addressed late."
      ],
      nextActions: [
        "Run official heat, elevation, flood, and drainage checks when risk layers are connected.",
        "Compare climate exposure against alternative candidate sites.",
        "Define mitigation options for cooling, shade, drainage, and operational continuity.",
        "Request insurance and lender climate-risk requirements.",
        "Prepare a resilience memo with priority mitigations and data gaps."
      ],
      evidence: commonEvidence(point, scenario.label, selectedObject)
    },
    customQuery: {
      title: "Custom Spatial Intelligence",
      summary:
        `${objectContext}This demo custom analysis responds to the user question: "${customQuery.trim()}". ` +
        `For the selected Dubai coordinate, the mock response frames the question through location quality, infrastructure context, risk exposure, and next diligence steps. ` +
        `Because this is deterministic demo intelligence, it does not call OpenAI, search live sources, or use official parcel, planning, market, or risk datasets. ` +
        `The output is intended to show how GeoAI can turn a user-defined spatial question into a structured decision workflow.`,
      scoreLabels: {
        developmentPotential: "Question Fit",
        investmentAttractiveness: "Decision Relevance",
        accessibility: "Spatial Context",
        infrastructureReadiness: "Data Readiness",
        climateHeatRisk: "Risk Sensitivity",
        overallRisk: "Uncertainty Level"
      },
      keyFactors: [
        `User question: ${customQuery.trim()}`,
        "Selected coordinate anchors the mock spatial reasoning workflow",
        "Infrastructure and access are treated as first-pass context signals",
        "Risk, climate, and regulatory uncertainty are flagged as diligence inputs",
        "Output remains deterministic until AI, official data, and document context are connected"
      ],
      opportunities: [
        "Use the custom question to shape a targeted site memo or decision note.",
        "Convert the question into repeatable criteria for comparing alternative locations.",
        "Identify which external datasets or documents would improve confidence.",
        "Prepare a focused follow-up analysis once official layers are connected."
      ],
      risks: [
        "The custom answer is mock-only and not generated by OpenAI yet.",
        "Question-specific evidence is limited until documents, datasets, and integrations are added.",
        "Regulatory, market, title, and climate assumptions require validation.",
        "The result should be treated as a demo workflow, not a final recommendation."
      ],
      nextActions: [
        "Refine the custom question into measurable decision criteria.",
        "Compare the selected point against nearby alternatives using the same question.",
        "List the official data sources needed to answer the question rigorously.",
        "Prepare a short memo with assumptions, evidence gaps, and next checks."
      ],
      evidence: [
        ...commonEvidence(point, scenario.label, selectedObject),
        createEvidenceItem(
          "user-custom-question",
          "customer-uploaded-documents",
          "User custom question",
          "User-entered question captured as optional context for future AI/document workflows.",
          "low"
        )
      ]
    }
  };
  const scenarioAnalysis = scenarios[scenario.id];
  const evidence = queryOverlay
    ? [
        ...scenarioAnalysis.evidence,
        createEvidenceItem(
          "custom-query-lens",
          "customer-uploaded-documents",
          "Custom query lens",
          queryOverlay.evidenceNote,
          "low"
        )
      ]
    : scenarioAnalysis.evidence;

  return {
    id,
    scenarioId: scenario.id,
    title: selectedObject ? selectedObject.name : scenarioAnalysis.title,
    subtitle,
    point,
    selectedObject: selectedObject ?? undefined,
    scores,
    summary: queryOverlay
      ? `${scenarioAnalysis.summary} ${queryOverlay.summary}`
      : scenarioAnalysis.summary,
    scoreLabels: scenarioAnalysis.scoreLabels,
    keyFactors: queryOverlay
      ? [...queryOverlay.keyFactors, ...scenarioAnalysis.keyFactors]
      : scenarioAnalysis.keyFactors,
    opportunities: queryOverlay
      ? [...queryOverlay.opportunities, ...scenarioAnalysis.opportunities]
      : scenarioAnalysis.opportunities,
    risks: queryOverlay
      ? [...queryOverlay.risks, ...scenarioAnalysis.risks]
      : scenarioAnalysis.risks,
    nextActions: queryOverlay
      ? [...queryOverlay.nextActions, ...scenarioAnalysis.nextActions]
      : scenarioAnalysis.nextActions,
    evidence,
    limitations: queryOverlay?.limitations,
    customQuery: normalizedCustomQuery || undefined,
    customQueryIntent: queryOverlay?.intent,
    customQuerySummary: queryOverlay?.summary
  };
}

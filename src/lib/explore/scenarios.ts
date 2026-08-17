import type {
  B2BRole,
  B2CRole,
  ExploreAudience,
  ExploreFilterConfig,
  ExploreFilters,
  GccMarketDefinition,
  GccRealEstateDecisionDefinition,
  ExploreRole,
  ExploreRoleDefinition,
  ExploreScenario,
  ExploreScenarioId
} from "@/src/lib/explore/types";
import { exploreRequiredCaveat } from "@/src/lib/explore/types";

export const b2cRoles: ExploreRoleDefinition<B2CRole>[] = [
  {
    id: "home_buyer",
    audience: "b2c",
    label: "Ready-home buyer",
    description: "Area fit, access and due-diligence prompts for a completed home purchase."
  },
  {
    id: "investor_buyer",
    audience: "b2c",
    label: "Property investor",
    description: "Demand, price-context and evidence-gap screening for an investment property."
  },
  {
    id: "renter",
    audience: "b2c",
    label: "Renter / relocating resident",
    description: "Commute, services and neighborhood fit for rent or relocation."
  },
  {
    id: "resident_expat",
    audience: "b2c",
    label: "Resident / expat",
    description: "Lifestyle, access and neighborhood screening for a residential decision."
  },
  {
    id: "family_relocation",
    audience: "b2c",
    label: "Family relocation",
    description: "Family-oriented access, services and lifestyle checks."
  },
  {
    id: "overseas_buyer",
    audience: "b2c",
    label: "Overseas buyer",
    description: "Remote property shortlist and validation planning without ownership or legal conclusions."
  },
  {
    id: "tourist",
    audience: "b2c",
    label: "Tourism context",
    description: "Secondary routes, points of interest and short-stay context."
  }
];

export const b2bRoles: ExploreRoleDefinition<B2BRole>[] = [
  {
    id: "developer",
    audience: "b2b",
    label: "Developer",
    description: "Early development screening and pipeline strategy."
  },
  {
    id: "real_estate_fund",
    audience: "b2b",
    label: "Real estate fund",
    description: "Shortlisting, portfolio logic and evidence gaps."
  },
  {
    id: "bank_lender",
    audience: "b2b",
    label: "Bank / lender",
    description: "Collateral context and credit-review evidence needs."
  },
  {
    id: "insurer",
    audience: "b2b",
    label: "Insurer",
    description: "Risk exposure, resilience and validation checklist framing."
  },
  {
    id: "government_urban_authority",
    audience: "b2b",
    label: "Urban authority",
    description: "Planning-support hypotheses and source readiness."
  },
  {
    id: "infrastructure_operator",
    audience: "b2b",
    label: "Infrastructure operator",
    description: "Corridor, service-area and dependency screening."
  },
  {
    id: "consultant_broker",
    audience: "b2b",
    label: "Consultant / broker",
    description: "Client-ready shortlist narratives and due diligence prompts."
  },
  {
    id: "family_office",
    audience: "b2b",
    label: "Family office",
    description: "Private capital opportunity screening and risk posture."
  },
  {
    id: "asset_manager",
    audience: "b2b",
    label: "Asset manager",
    description: "Portfolio action priority and local context comparison."
  }
];

export const exploreRoles = [...b2cRoles, ...b2bRoles] as ExploreRoleDefinition[];

const exploreRoleScenarioIds: Record<ExploreRole, ExploreScenarioId[]> = {
  tourist: [
    "b2c_point_context",
    "b2c_tourist_objects_route",
    "b2c_interest_routes"
  ],
  resident_expat: [
    "b2c_residential_context",
    "b2c_point_context",
    "b2c_new_residential_projects"
  ],
  home_buyer: [
    "b2c_point_context",
    "b2c_residential_context",
    "b2c_new_residential_projects"
  ],
  renter: [
    "b2c_residential_context",
    "b2c_point_context",
    "b2c_new_residential_projects"
  ],
  investor_buyer: [
    "b2c_new_residential_projects",
    "b2c_residential_context",
    "b2c_point_context"
  ],
  family_relocation: [
    "b2c_residential_context",
    "b2c_point_context",
    "b2c_new_residential_projects"
  ],
  overseas_buyer: [
    "b2c_new_residential_projects",
    "b2c_residential_context",
    "b2c_point_context"
  ],
  developer: [
    "b2b_redevelopment_100ha",
    "b2b_redevelopment_selected_aoi",
    "b2b_lowrise_luxury_residential"
  ],
  real_estate_fund: [
    "b2b_lowrise_luxury_residential",
    "b2b_commercial_real_estate",
    "b2b_hotel_development",
    "b2b_redevelopment_100ha"
  ],
  bank_lender: [
    "b2b_commercial_real_estate",
    "b2b_redevelopment_selected_aoi",
    "b2b_redevelopment_100ha"
  ],
  insurer: [
    "b2b_redevelopment_selected_aoi",
    "b2b_commercial_real_estate",
    "b2b_hotel_development"
  ],
  government_urban_authority: [
    "b2b_redevelopment_100ha",
    "b2b_redevelopment_selected_aoi",
    "b2b_commercial_real_estate"
  ],
  infrastructure_operator: [
    "b2b_redevelopment_100ha",
    "b2b_commercial_real_estate",
    "b2b_redevelopment_selected_aoi"
  ],
  consultant_broker: [
    "b2b_commercial_real_estate",
    "b2b_hotel_development",
    "b2b_redevelopment_selected_aoi"
  ],
  family_office: [
    "b2b_lowrise_luxury_residential",
    "b2b_commercial_real_estate",
    "b2b_redevelopment_100ha"
  ],
  asset_manager: [
    "b2b_commercial_real_estate",
    "b2b_lowrise_luxury_residential",
    "b2b_hotel_development"
  ]
};

const validationCaveats = [
  exploreRequiredCaveat,
  "Illustrative local and public/open screening context only; customer-approved or authoritative source checks are required before decisions."
];

const b2cPropertyCaveat =
  "No legal, financial, rental, sale-price or amenity guarantee is provided; claimed amenities require validation.";

const b2bDevelopmentCaveat =
  "Development outputs are screening hypotheses only and do not establish land availability, permitted use or approval readiness.";

const uaeLocalContextStatement =
  "UAE screening uses bundled local context, user-selected geometry and registered public/open source metadata; it does not assert a live official integration.";

const metadataOnlyStatement =
  "Scenario metadata only; no country dataset, live source or screening result is available in this release.";

const gccApplicabilityStatement =
  "GCC market applicability is product metadata, not evidence of country data availability; consult the market readiness record before screening.";

export const gccMarkets: GccMarketDefinition[] = [
  {
    id: "ae",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    regions: ["Dubai", "Abu Dhabi"],
    sourceReadiness: "local_open_context_only",
    enabledForScreening: true,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "sa",
    countryCode: "SA",
    countryName: "Saudi Arabia",
    regions: [],
    sourceReadiness: "metadata_only_no_data",
    enabledForScreening: false,
    sourceStatement: metadataOnlyStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "qa",
    countryCode: "QA",
    countryName: "Qatar",
    regions: [],
    sourceReadiness: "metadata_only_no_data",
    enabledForScreening: false,
    sourceStatement: metadataOnlyStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "om",
    countryCode: "OM",
    countryName: "Oman",
    regions: [],
    sourceReadiness: "metadata_only_no_data",
    enabledForScreening: false,
    sourceStatement: metadataOnlyStatement,
    caveat: exploreRequiredCaveat
  }
];

const allGccMarketIds = gccMarkets.map((market) => market.id);

export const gccRealEstateDecisions: GccRealEstateDecisionDefinition[] = [
  {
    id: "b2b_development_site_screening",
    audience: "b2b",
    label: "Development site screening",
    description: "Shortlist candidate areas against project format, scale, access, constraints and validation burden.",
    priority: "primary",
    preferredScenarioId: "b2b_redevelopment_100ha",
    supportedRoleHints: ["developer", "real_estate_fund", "government_urban_authority"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2b_redevelopment_renovation",
    audience: "b2b",
    label: "Redevelopment and renovation",
    description: "Screen an existing object or AOI for reuse potential, constraints and next validation work.",
    priority: "primary",
    preferredScenarioId: "b2b_redevelopment_selected_aoi",
    supportedRoleHints: ["developer", "asset_manager", "consultant_broker"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2b_acquisition_investment",
    audience: "b2b",
    label: "Acquisition and investment screening",
    description: "Compare candidate opportunities, demand context, risks and evidence gaps before due diligence.",
    priority: "primary",
    preferredScenarioId: "b2b_lowrise_luxury_residential",
    supportedRoleHints: ["real_estate_fund", "family_office", "asset_manager"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2b_commercial_hospitality",
    audience: "b2b",
    label: "Commercial and hospitality development",
    description: "Screen development formats against demand anchors, access, competition and validation needs.",
    priority: "primary",
    preferredScenarioId: "b2b_hotel_development",
    supportedRoleHints: ["developer", "real_estate_fund", "consultant_broker"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2b_portfolio_asset_review",
    audience: "b2b",
    label: "Portfolio and asset review",
    description: "Prioritize review actions across assets using comparable context, risks and evidence completeness.",
    priority: "primary",
    preferredScenarioId: "b2b_commercial_real_estate",
    supportedRoleHints: ["asset_manager", "real_estate_fund", "bank_lender", "insurer"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_ready_home_purchase",
    audience: "b2c",
    label: "Ready-home purchase",
    description: "Compare neighborhood fit, access and validation questions for a completed-home shortlist.",
    priority: "primary",
    preferredScenarioId: "b2c_point_context",
    supportedRoleHints: ["home_buyer", "family_relocation"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_off_plan_purchase",
    audience: "b2c",
    label: "Off-plan purchase",
    description: "Structure project discovery and independent validation of status, delivery, amenities and price context.",
    priority: "primary",
    preferredScenarioId: "b2c_new_residential_projects",
    supportedRoleHints: ["home_buyer", "investor_buyer", "overseas_buyer"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_investment_property",
    audience: "b2c",
    label: "Investment property",
    description: "Screen demand drivers, cost and yield assumptions, risks and evidence gaps before professional review.",
    priority: "primary",
    preferredScenarioId: "b2c_new_residential_projects",
    supportedRoleHints: ["investor_buyer", "overseas_buyer"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_rent_relocation",
    audience: "b2c",
    label: "Rent and relocation",
    description: "Compare commute, daily services, household fit and validation tasks for a rental move.",
    priority: "primary",
    preferredScenarioId: "b2c_residential_context",
    supportedRoleHints: ["renter", "resident_expat", "family_relocation"],
    marketIds: allGccMarketIds,
    sourceStatement: gccApplicabilityStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_overseas_buyer",
    audience: "b2c",
    label: "Overseas buyer",
    description: "Prepare a remote shortlist and explicit legal, ownership, financing and site-validation work plan.",
    priority: "primary",
    preferredScenarioId: "b2c_new_residential_projects",
    supportedRoleHints: ["overseas_buyer"],
    marketIds: allGccMarketIds,
    sourceStatement: uaeLocalContextStatement,
    caveat: exploreRequiredCaveat
  },
  {
    id: "b2c_tourism_context",
    audience: "b2c",
    label: "Tourism context",
    description: "Optional place and route context that remains outside the primary real-estate decision journey.",
    priority: "secondary",
    preferredScenarioId: "b2c_tourist_objects_route",
    supportedRoleHints: ["tourist"],
    marketIds: ["ae"],
    sourceStatement: uaeLocalContextStatement,
    caveat: exploreRequiredCaveat
  }
];

function selectFilter(
  id: string,
  label: string,
  defaultValue: string,
  options: readonly string[]
): ExploreFilterConfig {
  return {
    id,
    label,
    type: "select",
    defaultValue,
    options: options.map((value) => ({ value, label: value }))
  };
}

function multiFilter(
  id: string,
  label: string,
  defaultValue: string[],
  options: readonly string[]
): ExploreFilterConfig {
  return {
    id,
    label,
    type: "multi_select",
    defaultValue,
    options: options.map((value) => ({ value, label: value }))
  };
}

function rangeFilter(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit?: string
): ExploreFilterConfig {
  return {
    id,
    label,
    type: "range",
    defaultValue,
    min,
    max,
    step,
    unit
  };
}

function toggleFilter(id: string, label: string, defaultValue = false): ExploreFilterConfig {
  return {
    id,
    label,
    type: "toggle",
    defaultValue
  };
}

export const exploreScenarios: ExploreScenario[] = [
  {
    id: "b2c_point_context",
    title: "Ready-home Location Context",
    subtitle: "Area access, daily-life context and validation questions around a selected home or point.",
    audience: "b2c",
    purpose: "Screen everyday context, nearby anchors and validation questions for a selected UAE home location.",
    defaultRoleHints: ["resident_expat", "home_buyer", "renter"],
    interactionModes: ["map_first", "criteria_first"],
    defaultInteractionMode: "map_first",
    inputSchema: [
      rangeFilter("radiusKm", "Context radius", 1, 0.5, 5, 0.5, "km"),
      multiFilter("contextSignals", "Context signals", ["transport", "daily services"], [
        "transport",
        "daily services",
        "waterfront",
        "schools",
        "open space"
      ]),
      toggleFilter("quietLifestyle", "Quiet lifestyle preference")
    ],
    candidateTypes: ["selected_point_context"],
    scoringModelLabel: "Lifestyle/access screening score",
    resultCardSchemaLabel: "Point context card",
    openAiPromptContextLabel: "B2C point context screening",
    caveats: [...validationCaveats, b2cPropertyCaveat],
    sampleQueries: [
      "What is around Dubai Marina within 1 km?",
      "Find a family-friendly area with metro access."
    ],
    primaryCTA: "Analyze point"
  },
  {
    id: "b2c_tourist_objects_route",
    title: "Optional Tourism Context",
    subtitle: "Nearby cultural or tourist objects with one to three route options.",
    audience: "b2c",
    purpose: "Create illustrative attraction and route cards from an interest, start area and travel mode.",
    defaultRoleHints: ["tourist", "resident_expat"],
    interactionModes: ["map_first", "criteria_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      selectFilter("startArea", "Start area", "Downtown Dubai", [
        "Downtown Dubai",
        "Dubai Marina",
        "Al Fahidi",
        "Palm Jumeirah"
      ]),
      rangeFilter("durationHours", "Duration", 3, 1, 8, 1, "hours"),
      selectFilter("transportMode", "Transport mode", "walking + taxi", [
        "walking",
        "walking + taxi",
        "metro",
        "car"
      ]),
      multiFilter("interests", "Interests", ["culture", "views"], [
        "culture",
        "views",
        "food",
        "family",
        "architecture"
      ])
    ],
    candidateTypes: ["tourist_poi", "tourist_route"],
    scoringModelLabel: "Route fit and access score",
    resultCardSchemaLabel: "Tourist route card",
    openAiPromptContextLabel: "Tourist itinerary screening",
    caveats: [...validationCaveats, "Opening hours, ticketing and access details must be checked with current providers."],
    sampleQueries: [
      "Plan a 3 hour culture route from Al Fahidi.",
      "Find views and food stops near Downtown."
    ],
    primaryCTA: "Create route"
  },
  {
    id: "b2c_residential_context",
    title: "Rent & Relocation Area Screening",
    subtitle: "Residential clusters, commute, nearby services and household-fit screening.",
    audience: "b2c",
    purpose: "Compare illustrative residential clusters by access, services, lifestyle and validation needs.",
    defaultRoleHints: ["resident_expat", "home_buyer", "renter", "family_relocation"],
    interactionModes: ["map_first", "criteria_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      selectFilter("householdType", "Household type", "family", ["single", "couple", "family", "shared"]),
      rangeFilter("commuteTolerance", "Commute tolerance", 30, 10, 75, 5, "min"),
      multiFilter("lifestyleSignals", "Lifestyle signals", ["schools", "parks"], [
        "schools",
        "parks",
        "metro",
        "waterfront",
        "quiet streets"
      ])
    ],
    candidateTypes: ["residential_cluster"],
    scoringModelLabel: "Residential fit score",
    resultCardSchemaLabel: "Residential cluster card",
    openAiPromptContextLabel: "Residential area screening",
    caveats: [...validationCaveats, b2cPropertyCaveat],
    sampleQueries: [
      "Screen a family relocation area with parks and schools.",
      "Compare residential clusters with metro access."
    ],
    primaryCTA: "Analyze area"
  },
  {
    id: "b2c_new_residential_projects",
    title: "Off-plan & Investment Property Discovery",
    subtitle: "Project discovery by delivery context, amenities, building scale and access filters.",
    audience: "b2c",
    purpose: "Explore demonstration project cards by declared filters without claiming verified inventory.",
    defaultRoleHints: ["home_buyer", "investor_buyer", "renter"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      rangeFilter("completionFrom", "Completion from", 2024, 2024, 2030, 1),
      multiFilter("amenities", "Amenities", ["parking", "gym"], [
        "pool",
        "gym",
        "parking",
        "waterfront",
        "metro proximity"
      ]),
      selectFilter("buildingScale", "Building scale", "mid-rise", ["low-rise", "mid-rise", "high-rise", "mixed"])
    ],
    candidateTypes: ["residential_project"],
    scoringModelLabel: "Project discovery fit score",
    resultCardSchemaLabel: "Residential project card",
    openAiPromptContextLabel: "B2C residential project discovery",
    caveats: [...validationCaveats, b2cPropertyCaveat, "Project status, handover timing and amenities are illustrative screening attributes, not provider-verified inventory."],
    sampleQueries: [
      "Find new waterfront residential projects with parking and gym.",
      "Show illustrative 2024+ project profiles near metro access."
    ],
    primaryCTA: "Find projects"
  },
  {
    id: "b2c_interest_routes",
    title: "Optional Interest-based Routes",
    subtitle: "Tourist route cards by interest, start area, duration and transport mode.",
    audience: "b2c",
    purpose: "Generate illustrative itinerary cards that can later connect to provider and live place data.",
    defaultRoleHints: ["tourist", "resident_expat"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      selectFilter("startArea", "Start area", "Dubai Creek", [
        "Dubai Creek",
        "Downtown Dubai",
        "Dubai Marina",
        "Jumeirah"
      ]),
      rangeFilter("durationHours", "Duration", 4, 1, 8, 1, "hours"),
      multiFilter("interests", "Interests", ["heritage", "food"], [
        "heritage",
        "food",
        "architecture",
        "beach",
        "family"
      ]),
      selectFilter("transportMode", "Transport mode", "walking + metro", [
        "walking",
        "walking + metro",
        "taxi",
        "car"
      ])
    ],
    candidateTypes: ["tourist_route"],
    scoringModelLabel: "Interest-route fit score",
    resultCardSchemaLabel: "Route itinerary card",
    openAiPromptContextLabel: "Interest-based itinerary screening",
    caveats: [...validationCaveats, "Timing, provider availability and access conditions require current checks."],
    sampleQueries: [
      "Create a heritage and food route from Dubai Creek.",
      "Plan a family beach route for four hours."
    ],
    primaryCTA: "Generate route cards"
  },
  {
    id: "b2b_redevelopment_selected_aoi",
    title: "Redevelopment & Renovation Screening",
    subtitle: "Evaluate a selected object, point or AOI as a redevelopment screening hypothesis.",
    audience: "b2b",
    purpose: "Frame redevelopment fit, blockers and validation tasks for a user-selected location.",
    defaultRoleHints: ["developer", "real_estate_fund", "consultant_broker"],
    interactionModes: ["map_first", "criteria_first"],
    defaultInteractionMode: "map_first",
    inputSchema: [
      selectFilter("assetStartingPoint", "Starting point", "selected AOI", ["selected AOI", "point", "object", "district"]),
      rangeFilter("minimumAreaHa", "Minimum area", 2, 1, 20, 1, "ha"),
      multiFilter("screeningSignals", "Screening signals", ["access", "underuse proxy"], [
        "access",
        "underuse proxy",
        "market adjacency",
        "infrastructure",
        "risk exposure"
      ])
    ],
    candidateTypes: ["redevelopment_zone"],
    scoringModelLabel: "Redevelopment screening score",
    resultCardSchemaLabel: "Redevelopment candidate card",
    openAiPromptContextLabel: "B2B redevelopment screening",
    caveats: [...validationCaveats, b2bDevelopmentCaveat],
    sampleQueries: [
      "Evaluate this AOI as a redevelopment hypothesis.",
      "Screen underused land near strong access corridors."
    ],
    primaryCTA: "Analyze redevelopment"
  },
  {
    id: "b2b_redevelopment_100ha",
    title: "Large Development Site Screening",
    subtitle: "Find large candidate areas by land-use proxy, access, growth drivers, risks and validation burden.",
    audience: "b2b",
    purpose: "Create a large-site shortlist hypothesis for development screening and validation planning.",
    defaultRoleHints: ["developer", "government_urban_authority", "infrastructure_operator", "real_estate_fund"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      rangeFilter("minimumAreaHa", "Minimum area", 100, 50, 250, 10, "ha"),
      multiFilter("growthDrivers", "Growth drivers", ["transport corridor", "district expansion"], [
        "transport corridor",
        "district expansion",
        "employment anchors",
        "logistics access",
        "waterfront adjacency"
      ]),
      selectFilter("riskTolerance", "Risk tolerance", "balanced", ["conservative", "balanced", "opportunistic"])
    ],
    candidateTypes: ["development_zone", "redevelopment_zone"],
    scoringModelLabel: "Large-zone opportunity score",
    resultCardSchemaLabel: "100+ ha zone card",
    openAiPromptContextLabel: "Large redevelopment zone screening",
    caveats: [...validationCaveats, b2bDevelopmentCaveat],
    sampleQueries: [
      "Find 100+ ha redevelopment hypotheses near growth corridors.",
      "Shortlist large zones with access and manageable risk."
    ],
    primaryCTA: "Find zones"
  },
  {
    id: "b2b_lowrise_luxury_residential",
    title: "Residential Acquisition & Investment Screening",
    subtitle: "Compare candidate areas for low-rise and premium residential investment hypotheses.",
    audience: "b2b",
    purpose: "Screen luxury residential fit by amenity adjacency, access, privacy and validation needs.",
    defaultRoleHints: ["developer", "family_office", "asset_manager", "real_estate_fund"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      multiFilter("premiumSignals", "Premium signals", ["privacy", "waterfront adjacency"], [
        "privacy",
        "waterfront adjacency",
        "golf adjacency",
        "school access",
        "low-density context"
      ]),
      rangeFilter("targetAreaHa", "Target area", 18, 5, 80, 1, "ha"),
      selectFilter("buyerLens", "Buyer lens", "family villa", ["family villa", "branded residences", "private estate", "boutique cluster"])
    ],
    candidateTypes: ["development_zone"],
    scoringModelLabel: "Premium residential fit score",
    resultCardSchemaLabel: "Luxury residential zone card",
    openAiPromptContextLabel: "Low-rise luxury residential screening",
    caveats: [...validationCaveats, b2bDevelopmentCaveat],
    sampleQueries: [
      "Find low-rise premium residential hypotheses near amenities.",
      "Screen villa-style zones with privacy and school access."
    ],
    primaryCTA: "Screen premium zones"
  },
  {
    id: "b2b_hotel_development",
    title: "Commercial & Hospitality Development",
    subtitle: "Find candidate zones for luxury, business, resort, serviced apartment or mid-market formats.",
    audience: "b2b",
    purpose: "Screen hotel-format fit by demand anchors, access and risk/validation workstreams.",
    defaultRoleHints: ["developer", "asset_manager", "consultant_broker", "real_estate_fund"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      selectFilter("hotelFormat", "Hotel format", "business", ["luxury", "business", "resort", "serviced apartment", "mid-market"]),
      multiFilter("demandAnchors", "Demand anchors", ["events", "business district"], [
        "events",
        "business district",
        "beach",
        "airport access",
        "tourist attractions"
      ]),
      rangeFilter("roomScale", "Room scale", 180, 60, 500, 20, "keys")
    ],
    candidateTypes: ["hotel_zone"],
    scoringModelLabel: "Hotel format fit score",
    resultCardSchemaLabel: "Hotel zone card",
    openAiPromptContextLabel: "Hotel development screening",
    caveats: [...validationCaveats, b2bDevelopmentCaveat, "Hospitality demand and operating assumptions are illustrative screening context only."],
    sampleQueries: [
      "Find business hotel hypotheses near events and offices.",
      "Screen resort-style zones with beach and tourist anchors."
    ],
    primaryCTA: "Find hotel zones"
  },
  {
    id: "b2b_commercial_real_estate",
    title: "Portfolio & Commercial Asset Review",
    subtitle: "Compare commercial locations and assets across retail, F&B, office, services or mixed-use formats.",
    audience: "b2b",
    purpose: "Screen commercial format fit by catchment proxy, access and activity anchors.",
    defaultRoleHints: ["developer", "asset_manager", "consultant_broker", "real_estate_fund"],
    interactionModes: ["criteria_first", "map_first"],
    defaultInteractionMode: "criteria_first",
    inputSchema: [
      selectFilter("commercialFormat", "Commercial format", "F&B", ["retail", "F&B", "office", "services", "mixed-use"]),
      multiFilter("activitySignals", "Activity signals", ["footfall proxy", "metro"], [
        "footfall proxy",
        "metro",
        "residential catchment",
        "office catchment",
        "tourist traffic"
      ]),
      rangeFilter("catchmentMinutes", "Catchment", 15, 5, 45, 5, "min")
    ],
    candidateTypes: ["commercial_zone"],
    scoringModelLabel: "Commercial fit score",
    resultCardSchemaLabel: "Commercial zone card",
    openAiPromptContextLabel: "Commercial real estate screening",
    caveats: [...validationCaveats, b2bDevelopmentCaveat, "Footfall and catchment values are illustrative proxies until validated with approved evidence."],
    sampleQueries: [
      "Find F&B zones with residential and metro catchment.",
      "Screen service commercial nodes near office activity."
    ],
    primaryCTA: "Find commercial zones"
  }
];

export function getExploreScenariosByAudience(audience: ExploreAudience) {
  return exploreScenarios.filter((scenario) => scenario.audience === audience);
}

export function getExploreScenario(id: ExploreScenarioId) {
  return exploreScenarios.find((scenario) => scenario.id === id) ?? exploreScenarios[0];
}

export function getExploreRolesByAudience(audience: ExploreAudience) {
  return exploreRoles.filter((role) => role.audience === audience);
}

export function getExploreRole(id: ExploreRole) {
  return exploreRoles.find((role) => role.id === id) ?? exploreRoles[0];
}

export function isExploreRoleForAudience(audience: ExploreAudience, role: unknown): role is ExploreRole {
  return typeof role === "string" && exploreRoles.some((item) => item.id === role && item.audience === audience);
}

export function isExploreScenarioId(value: unknown): value is ExploreScenarioId {
  return typeof value === "string" && exploreScenarios.some((scenario) => scenario.id === value);
}

export function getExploreScenariosByRole(audience: ExploreAudience, role: ExploreRole) {
  const normalizedRole = isExploreRoleForAudience(audience, role)
    ? role
    : getDefaultRoleForAudience(audience);
  const scenarioById = new Map(exploreScenarios.map((scenario) => [scenario.id, scenario]));
  const mappedScenarios = (exploreRoleScenarioIds[normalizedRole] ?? [])
    .map((scenarioId) => scenarioById.get(scenarioId))
    .filter((scenario): scenario is ExploreScenario => Boolean(scenario && scenario.audience === audience));

  return mappedScenarios.length > 0 ? mappedScenarios : getExploreScenariosByAudience(audience);
}

export function isExploreScenarioForRole(
  audience: ExploreAudience,
  role: ExploreRole,
  scenarioId: unknown
): scenarioId is ExploreScenarioId {
  return isExploreScenarioId(scenarioId) &&
    getExploreScenariosByRole(audience, role).some((scenario) => scenario.id === scenarioId);
}

export function getDefaultRoleForAudience(audience: ExploreAudience): ExploreRole {
  return audience === "b2c" ? b2cRoles[0].id : b2bRoles[0].id;
}

export function getDefaultScenarioForAudience(audience: ExploreAudience): ExploreScenarioId {
  return getDefaultScenarioForRole(audience, getDefaultRoleForAudience(audience));
}

export function getDefaultScenarioForRole(
  audience: ExploreAudience,
  role: ExploreRole
): ExploreScenarioId {
  return getExploreScenariosByRole(audience, role)[0].id;
}

export function getDefaultFilters(inputSchema: ExploreFilterConfig[]): ExploreFilters {
  return inputSchema.reduce<ExploreFilters>((filters, config) => {
    filters[config.id] = Array.isArray(config.defaultValue)
      ? [...config.defaultValue]
      : config.defaultValue;
    return filters;
  }, {});
}

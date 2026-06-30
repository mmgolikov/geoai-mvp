import { getExploreScenario } from "@/src/lib/explore/scenarios";
import type {
  CandidateSourceType,
  ExploreAudience,
  ExploreCandidate,
  ExploreCandidateGeometry,
  ExploreCoordinate,
  ExploreEvidenceItem,
  ExploreFilters,
  ExploreRole,
  ExploreScenario,
  ExploreScenarioId,
  InteractionMode
} from "@/src/lib/explore/types";
import { exploreRequiredCaveat } from "@/src/lib/explore/types";

const deterministicCreatedAt = "2026-06-30T00:00:00.000Z";

type CandidateConfidence = ExploreCandidate["confidence"];

type ExploreCandidateSeed = Omit<ExploreCandidate, "score" | "confidence" | "createdAt"> & {
  baseScore: number;
  baseConfidence: CandidateConfidence;
};

export type GenerateExploreCandidatesInput = {
  audience: ExploreAudience;
  role: ExploreRole;
  scenarioId: ExploreScenarioId;
  interactionMode: InteractionMode;
  naturalLanguageQuery: string;
  filters: ExploreFilters;
  selectedPointOrArea?: {
    label: string;
    coordinates?: ExploreCoordinate;
    areaHint?: string;
  } | null;
};

function evidence(
  label: string,
  sourceType: CandidateSourceType,
  description: string,
  confidence: ExploreEvidenceItem["confidence"] = "medium"
): ExploreEvidenceItem {
  return {
    label,
    sourceType,
    description,
    confidence
  };
}

function point(point: ExploreCoordinate): ExploreCandidateGeometry {
  return { type: "point", point };
}

function polygon(coordinates: ExploreCoordinate[]): ExploreCandidateGeometry {
  return { type: "polygon", coordinates };
}

function route(coordinates: ExploreCoordinate[]): ExploreCandidateGeometry {
  return { type: "route", coordinates };
}

const sharedCaveats = [
  exploreRequiredCaveat,
  "Demo seed and open-context placeholders are intended for workflow demonstration only."
];

const propertyCaveats = [
  ...sharedCaveats,
  "Buying, renting, sale, price, yield and amenity decisions require independent legal, financial and provider validation."
];

const developmentCaveats = [
  ...sharedCaveats,
  "Development screening does not establish developability, entitlement, permitted use, land availability or approval readiness."
];

const baseSeeds: Record<ExploreScenarioId, ExploreCandidateSeed[]> = {
  b2c_point_context: [
    {
      id: "b2c-point-dubai-marina",
      scenarioId: "b2c_point_context",
      audience: "b2c",
      candidateType: "selected_point_context",
      title: "Dubai Marina daily-life context",
      subtitle: "Walkable waterfront and transit-oriented sample context.",
      locationLabel: "Dubai Marina",
      geometry: point([55.1412, 25.0781]),
      baseScore: 84,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Access proxy", value: 86, note: "Metro/tram and arterial road proximity sample." },
        { label: "Amenity proxy", value: 88, note: "Retail, waterfront and leisure anchors in open/demo context." },
        { label: "Validation burden", value: 58, note: "Amenity and building-level claims require current checks." }
      ],
      evidence: [
        evidence("Demo point seed", "demo_seed", "Curated Dubai Marina sample point for Explore v1."),
        evidence("Open context placeholder", "open_context", "Nearby POI and access context is illustrative, not live provider data.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Current building/service checks", "Commute verification", "Amenity/provider validation"],
      tags: ["waterfront", "metro", "daily services", "walking", "resident"],
      recommendedNextAction: "Open the point in Workspace and validate the service catchment with user-approved evidence.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-point-downtown",
      scenarioId: "b2c_point_context",
      audience: "b2c",
      candidateType: "selected_point_context",
      title: "Downtown mixed-use context",
      subtitle: "High-activity urban core sample around landmarks and services.",
      locationLabel: "Downtown Dubai",
      geometry: point([55.2744, 25.1972]),
      baseScore: 81,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Access proxy", value: 80, note: "Central road and metro-adjacent screening context." },
        { label: "Amenity proxy", value: 91, note: "Dense mixed-use anchors in demo/open context." },
        { label: "Validation burden", value: 52, note: "Crowding, cost and exact services require field/current checks." }
      ],
      evidence: [
        evidence("Demo point seed", "demo_seed", "Curated Downtown Dubai sample point."),
        evidence("Open context placeholder", "open_context", "Landmark and activity context is illustrative.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Current transport timing", "Building-level due diligence", "Lifestyle fit review"],
      tags: ["views", "metro", "urban core", "services", "tourist"],
      recommendedNextAction: "Compare with a quieter cluster before using this as a relocation or purchase shortlist item.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-point-jvc",
      scenarioId: "b2c_point_context",
      audience: "b2c",
      candidateType: "selected_point_context",
      title: "JVC residential services context",
      subtitle: "Sample neighborhood context for everyday services and family-oriented screening.",
      locationLabel: "Jumeirah Village Circle",
      geometry: point([55.2069, 25.0553]),
      baseScore: 76,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Access proxy", value: 70, note: "Road access is favorable; rail access needs verification." },
        { label: "Amenity proxy", value: 79, note: "Residential services are represented as sample context." },
        { label: "Validation burden", value: 60, note: "School, traffic and building conditions need current checks." }
      ],
      evidence: [
        evidence("Demo point seed", "demo_seed", "Curated residential sample point."),
        evidence("User criteria lens", "sample", "Family and resident filters adjust ranking deterministically.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["School/provider validation", "Peak-hour access check", "Building-specific evidence"],
      tags: ["family", "daily services", "quiet lifestyle", "residential", "parks"],
      recommendedNextAction: "Use Workspace comparison against a transit-oriented area before deeper due diligence.",
      sourceType: "demo_seed"
    }
  ],
  b2c_tourist_objects_route: [
    {
      id: "b2c-tourist-al-fahidi-creek",
      scenarioId: "b2c_tourist_objects_route",
      audience: "b2c",
      candidateType: "tourist_route",
      title: "Al Fahidi to Creek heritage walk",
      subtitle: "Culture-focused route seed with short walking segments.",
      locationLabel: "Al Fahidi / Dubai Creek",
      geometry: route([
        [55.2992, 25.2635],
        [55.3007, 25.2664],
        [55.3075, 25.2697],
        [55.3164, 25.2676]
      ]),
      baseScore: 88,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 90, note: "Heritage and culture tags match the route." },
        { label: "Route simplicity", value: 84, note: "Compact geometry with easy segmenting." },
        { label: "Validation burden", value: 55, note: "Opening hours and access require current checks." }
      ],
      evidence: [
        evidence("Route demo seed", "demo_seed", "Curated route geometry for Explore v1."),
        evidence("Open context placeholder", "open_context", "Cultural anchors are illustrative and need current provider checks.")
      ],
      caveats: [...sharedCaveats, "Opening hours, accessibility and ticketing are not live-verified."],
      validationRequired: ["Opening hours", "Ticketing/access rules", "Transport time check"],
      tags: ["culture", "heritage", "walking", "food", "creek"],
      recommendedNextAction: "Validate live opening hours and use the route as an itinerary hypothesis.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-tourist-downtown-views",
      scenarioId: "b2c_tourist_objects_route",
      audience: "b2c",
      candidateType: "tourist_route",
      title: "Downtown views and food loop",
      subtitle: "Sample route around skyline views, mall access and dining anchors.",
      locationLabel: "Downtown Dubai",
      geometry: route([
        [55.2771, 25.1975],
        [55.2794, 25.1972],
        [55.2812, 25.1951],
        [55.2744, 25.1937]
      ]),
      baseScore: 82,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 87, note: "Views, food and architecture tags match the route." },
        { label: "Route simplicity", value: 78, note: "Dense activity zone with crowding risk." },
        { label: "Validation burden", value: 57, note: "Timing and reservation checks remain external." }
      ],
      evidence: [
        evidence("Route demo seed", "demo_seed", "Curated Downtown route geometry."),
        evidence("Sample activity context", "sample", "Activity anchors are demonstration records.")
      ],
      caveats: [...sharedCaveats, "Provider availability, crowding and current access conditions require checks."],
      validationRequired: ["Crowding/timing check", "Provider availability", "Transport routing validation"],
      tags: ["views", "food", "architecture", "family", "walking"],
      recommendedNextAction: "Use the route card as a planning draft and verify current conditions before travel.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-tourist-alserkal-poi",
      scenarioId: "b2c_tourist_objects_route",
      audience: "b2c",
      candidateType: "tourist_poi",
      title: "Alserkal culture stop",
      subtitle: "Single-object culture stop with taxi-oriented access assumption.",
      locationLabel: "Al Quoz / Alserkal Avenue",
      geometry: point([55.2262, 25.1421]),
      baseScore: 75,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 82, note: "Culture and architecture tags align." },
        { label: "Access proxy", value: 66, note: "Taxi/car access likely stronger than walking routes." },
        { label: "Validation burden", value: 61, note: "Event calendars and opening hours change frequently." }
      ],
      evidence: [
        evidence("POI demo seed", "demo_seed", "Curated point for tourist-object workflow."),
        evidence("Open context placeholder", "open_context", "Event and gallery details are not live.")
      ],
      caveats: [...sharedCaveats, "Events, galleries and access details must be checked with current providers."],
      validationRequired: ["Event schedule", "Opening hours", "Transport timing"],
      tags: ["culture", "architecture", "art", "taxi", "indoor"],
      recommendedNextAction: "Pair with another route card and validate event/provider details.",
      sourceType: "demo_seed"
    }
  ],
  b2c_residential_context: [
    {
      id: "b2c-residential-dubai-hills",
      scenarioId: "b2c_residential_context",
      audience: "b2c",
      candidateType: "residential_cluster",
      title: "Dubai Hills family-context cluster",
      subtitle: "Parks, schools and villa/apartment mix screening hypothesis.",
      locationLabel: "Dubai Hills Estate",
      geometry: polygon([
        [55.239, 25.104],
        [55.273, 25.105],
        [55.278, 25.085],
        [55.246, 25.077],
        [55.239, 25.104]
      ]),
      baseScore: 86,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Family fit proxy", value: 89, note: "Park and school-access tags fit family screening." },
        { label: "Access proxy", value: 78, note: "Road access is strong; commute timing needs validation." },
        { label: "Validation burden", value: 57, note: "School, pricing and inventory claims are not verified." }
      ],
      evidence: [
        evidence("Residential demo seed", "demo_seed", "Curated sample cluster geometry."),
        evidence("User criteria lens", "sample", "Family and park filters adjust score.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["School availability", "Commute timing", "Property/provider evidence"],
      tags: ["family", "parks", "schools", "quiet streets", "residential"],
      recommendedNextAction: "Compare against JVC and Creek Harbour, then validate exact buildings and commute routes.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-residential-creek-harbour",
      scenarioId: "b2c_residential_context",
      audience: "b2c",
      candidateType: "residential_cluster",
      title: "Creek Harbour waterfront-context cluster",
      subtitle: "Waterfront lifestyle and growth-area screening hypothesis.",
      locationLabel: "Dubai Creek Harbour",
      geometry: polygon([
        [55.337, 25.213],
        [55.361, 25.215],
        [55.366, 25.196],
        [55.342, 25.19],
        [55.337, 25.213]
      ]),
      baseScore: 80,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Lifestyle fit proxy", value: 88, note: "Waterfront and open-space tags match." },
        { label: "Access proxy", value: 69, note: "Commute assumptions need route-time validation." },
        { label: "Validation burden", value: 56, note: "Project, service and completion facts require provider checks." }
      ],
      evidence: [
        evidence("Residential demo seed", "demo_seed", "Curated waterfront cluster geometry."),
        evidence("Open context placeholder", "open_context", "Amenity context is sample/open, not provider-verified.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Commute validation", "Provider amenity confirmation", "Building-level checks"],
      tags: ["waterfront", "parks", "family", "views", "growth area"],
      recommendedNextAction: "Validate commute and building-specific evidence before treating this as a shortlist.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-residential-jvc",
      scenarioId: "b2c_residential_context",
      audience: "b2c",
      candidateType: "residential_cluster",
      title: "JVC everyday-services cluster",
      subtitle: "Daily services and affordability-positioned sample screening cluster.",
      locationLabel: "Jumeirah Village Circle",
      geometry: polygon([
        [55.1905, 25.071],
        [55.224, 25.066],
        [55.225, 25.042],
        [55.194, 25.041],
        [55.1905, 25.071]
      ]),
      baseScore: 77,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Service fit proxy", value: 81, note: "Daily-services tags fit renter/resident filters." },
        { label: "Access proxy", value: 68, note: "Road access requires peak-hour validation." },
        { label: "Validation burden", value: 62, note: "Building-specific quality varies and needs checks." }
      ],
      evidence: [
        evidence("Residential demo seed", "demo_seed", "Curated sample cluster geometry."),
        evidence("Sample criteria lens", "sample", "Commute and service filters adjust score deterministically.")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Peak traffic review", "Building quality checks", "Current amenity verification"],
      tags: ["daily services", "renter", "family", "quiet streets", "residential"],
      recommendedNextAction: "Compare with a rail-adjacent cluster and validate daily commute assumptions.",
      sourceType: "demo_seed"
    }
  ],
  b2c_new_residential_projects: [
    {
      id: "b2c-project-creek-sample",
      scenarioId: "b2c_new_residential_projects",
      audience: "b2c",
      candidateType: "residential_project",
      title: "Creekside 2026 sample project",
      subtitle: "Waterfront and gym/parking amenity match in demo project inventory.",
      locationLabel: "Dubai Creek Harbour",
      geometry: point([55.3512, 25.2043]),
      baseScore: 83,
      baseConfidence: "low",
      scoreBreakdown: [
        { label: "Filter fit", value: 88, note: "Matches waterfront, gym and parking sample filters." },
        { label: "Access proxy", value: 72, note: "Access timing needs independent validation." },
        { label: "Validation burden", value: 48, note: "Project fields are sample/demo, not provider-confirmed." }
      ],
      evidence: [
        evidence("Demo project seed", "demo_seed", "Synthetic 2024+ project-style record."),
        evidence("User criteria lens", "sample", "Amenity filters are matched against demo attributes.", "low")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Developer/provider confirmation", "Amenity evidence", "Delivery and service-charge checks"],
      tags: ["waterfront", "gym", "parking", "2026", "mid-rise", "investor"],
      recommendedNextAction: "Save the card, then validate project facts with provider/customer-approved evidence.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-project-business-bay-sample",
      scenarioId: "b2c_new_residential_projects",
      audience: "b2c",
      candidateType: "residential_project",
      title: "Canal urban-living sample project",
      subtitle: "Metro-proximity and high-rise sample context for buyer screening.",
      locationLabel: "Business Bay",
      geometry: point([55.2667, 25.1842]),
      baseScore: 79,
      baseConfidence: "low",
      scoreBreakdown: [
        { label: "Filter fit", value: 80, note: "High-rise, metro and parking filters align." },
        { label: "Demand-driver proxy", value: 83, note: "Urban-core adjacency is a sample demand signal." },
        { label: "Validation burden", value: 46, note: "Inventory and amenity facts are not live-verified." }
      ],
      evidence: [
        evidence("Demo project seed", "demo_seed", "Synthetic residential project-style record."),
        evidence("Open context placeholder", "open_context", "Transit and urban-core context is illustrative.", "low")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Inventory validation", "Payment and legal checks", "Amenity/provider confirmation"],
      tags: ["metro proximity", "parking", "high-rise", "2025", "urban core"],
      recommendedNextAction: "Treat as a discovery sample and validate project inventory before buyer decisions.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-project-dubai-south-sample",
      scenarioId: "b2c_new_residential_projects",
      audience: "b2c",
      candidateType: "residential_project",
      title: "South corridor townhouse sample",
      subtitle: "Low-rise, parking and family-space demo project hypothesis.",
      locationLabel: "Dubai South",
      geometry: point([55.1617, 24.9186]),
      baseScore: 74,
      baseConfidence: "low",
      scoreBreakdown: [
        { label: "Filter fit", value: 76, note: "Low-rise and parking filters align." },
        { label: "Growth-context proxy", value: 79, note: "Corridor growth context is sample-only." },
        { label: "Validation burden", value: 50, note: "Transport timing and project facts need validation." }
      ],
      evidence: [
        evidence("Demo project seed", "demo_seed", "Synthetic townhouse-style project record."),
        evidence("Sample corridor context", "sample", "Growth corridor assumptions are demonstrative.", "low")
      ],
      caveats: propertyCaveats,
      validationRequired: ["Transport timing", "Provider confirmation", "Community services validation"],
      tags: ["low-rise", "parking", "family", "2027", "growth area"],
      recommendedNextAction: "Compare with established areas to separate lifestyle fit from growth assumptions.",
      sourceType: "demo_seed"
    }
  ],
  b2c_interest_routes: [
    {
      id: "b2c-route-creek-food-heritage",
      scenarioId: "b2c_interest_routes",
      audience: "b2c",
      candidateType: "tourist_route",
      title: "Creek heritage and food route",
      subtitle: "Four-hour route hypothesis for heritage, souks and food stops.",
      locationLabel: "Dubai Creek / Deira",
      geometry: route([
        [55.2992, 25.2635],
        [55.3075, 25.2697],
        [55.316, 25.2712],
        [55.3245, 25.269]
      ]),
      baseScore: 89,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 93, note: "Heritage and food tags strongly match." },
        { label: "Duration fit", value: 86, note: "Compact route suits a four-hour lens." },
        { label: "Validation burden", value: 54, note: "Opening hours and crowding require current checks." }
      ],
      evidence: [
        evidence("Route demo seed", "demo_seed", "Curated route for interest-based workflow."),
        evidence("Open context placeholder", "open_context", "POI and food-stop context requires current validation.")
      ],
      caveats: [...sharedCaveats, "Route timing, provider availability and access conditions are not live-verified."],
      validationRequired: ["Opening hours", "Transport mode check", "Provider availability"],
      tags: ["heritage", "food", "walking + metro", "family", "creek"],
      recommendedNextAction: "Use as an itinerary draft and verify timing/provider details.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-route-marina-beach-family",
      scenarioId: "b2c_interest_routes",
      audience: "b2c",
      candidateType: "tourist_route",
      title: "Marina beach family route",
      subtitle: "Waterfront route card for beach, family and dining interests.",
      locationLabel: "Dubai Marina / JBR",
      geometry: route([
        [55.1352, 25.0775],
        [55.131, 25.0809],
        [55.1262, 25.0781],
        [55.1389, 25.0737]
      ]),
      baseScore: 82,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 88, note: "Beach, family and food tags align." },
        { label: "Access fit", value: 80, note: "Walking route is compact but crowding-prone." },
        { label: "Validation burden", value: 57, note: "Weather, crowding and provider details need checks." }
      ],
      evidence: [
        evidence("Route demo seed", "demo_seed", "Curated family waterfront route geometry."),
        evidence("Sample leisure context", "sample", "Leisure context is illustrative.")
      ],
      caveats: [...sharedCaveats, "Weather, crowding and current access conditions require validation."],
      validationRequired: ["Weather/crowding check", "Current access", "Provider availability"],
      tags: ["beach", "family", "food", "walking", "waterfront"],
      recommendedNextAction: "Validate weather and crowding before using this route operationally.",
      sourceType: "demo_seed"
    },
    {
      id: "b2c-route-downtown-architecture",
      scenarioId: "b2c_interest_routes",
      audience: "b2c",
      candidateType: "tourist_route",
      title: "Downtown architecture route",
      subtitle: "Architecture and skyline route with short segments.",
      locationLabel: "Downtown Dubai",
      geometry: route([
        [55.2694, 25.192],
        [55.2744, 25.1972],
        [55.2794, 25.1972],
        [55.2836, 25.1934]
      ]),
      baseScore: 80,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Interest fit", value: 86, note: "Architecture and views tags align." },
        { label: "Duration fit", value: 78, note: "Works as a short route but timing varies." },
        { label: "Validation burden", value: 55, note: "Access and crowding need current checks." }
      ],
      evidence: [
        evidence("Route demo seed", "demo_seed", "Curated Downtown route geometry."),
        evidence("Open context placeholder", "open_context", "Architecture and landmark context is illustrative.")
      ],
      caveats: [...sharedCaveats, "Route timing and access are sample assumptions."],
      validationRequired: ["Current access", "Timing check", "Transport validation"],
      tags: ["architecture", "views", "walking", "family", "downtown"],
      recommendedNextAction: "Pair with current access and crowding checks before travel planning.",
      sourceType: "demo_seed"
    }
  ],
  b2b_redevelopment_selected_aoi: [
    {
      id: "b2b-redev-al-quoz-edge",
      scenarioId: "b2b_redevelopment_selected_aoi",
      audience: "b2b",
      candidateType: "redevelopment_zone",
      title: "Al Quoz edge redevelopment hypothesis",
      subtitle: "Industrial-edge sample AOI with access and mixed-use adjacency signals.",
      locationLabel: "Al Quoz",
      geometry: polygon([
        [55.219, 25.161],
        [55.252, 25.16],
        [55.251, 25.138],
        [55.222, 25.137],
        [55.219, 25.161]
      ]),
      baseScore: 82,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Access proxy", value: 83, note: "Arterial-road adjacency in sample context." },
        { label: "Underuse proxy", value: 78, note: "Industrial-edge context used as demonstration signal." },
        { label: "Validation burden", value: 42, note: "Ownership, legal, planning and utility evidence is not connected." }
      ],
      evidence: [
        evidence("Demo zone seed", "demo_seed", "Curated polygon for redevelopment screening workflow."),
        evidence("Open context placeholder", "open_context", "Road/access context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Land/control validation", "Planning and permitted-use validation", "Utilities and constraints evidence"],
      tags: ["redevelopment", "underuse proxy", "access", "market adjacency", "industrial edge"],
      recommendedNextAction: "Create a validation checklist before moving this beyond screening.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-redev-ras-al-khor",
      scenarioId: "b2b_redevelopment_selected_aoi",
      audience: "b2b",
      candidateType: "redevelopment_zone",
      title: "Ras Al Khor transition hypothesis",
      subtitle: "Sample transitional area screen with growth and risk questions.",
      locationLabel: "Ras Al Khor",
      geometry: polygon([
        [55.329, 25.201],
        [55.364, 25.2],
        [55.363, 25.177],
        [55.331, 25.176],
        [55.329, 25.201]
      ]),
      baseScore: 77,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Growth adjacency", value: 81, note: "Nearby growth context represented as demo signal." },
        { label: "Access proxy", value: 74, note: "Road-network context needs deeper validation." },
        { label: "Validation burden", value: 44, note: "Environmental, planning and control checks are required." }
      ],
      evidence: [
        evidence("Demo zone seed", "demo_seed", "Curated polygon for transitional-zone screening."),
        evidence("Sample growth context", "sample", "Growth adjacency is a demo proxy.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Environmental constraints review", "Planning validation", "Land/control due diligence"],
      tags: ["redevelopment", "growth area", "risk exposure", "access", "underuse proxy"],
      recommendedNextAction: "Run a risk-first validation memo before comparing against lower-complexity zones.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-redev-port-saeed",
      scenarioId: "b2b_redevelopment_selected_aoi",
      audience: "b2b",
      candidateType: "redevelopment_zone",
      title: "Port Saeed infill hypothesis",
      subtitle: "Urban infill sample with access strengths and assembly complexity.",
      locationLabel: "Port Saeed / Deira",
      geometry: polygon([
        [55.319, 25.258],
        [55.338, 25.259],
        [55.339, 25.245],
        [55.318, 25.244],
        [55.319, 25.258]
      ]),
      baseScore: 74,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Access proxy", value: 86, note: "Urban access and activity context are strong demo signals." },
        { label: "Assembly complexity", value: 48, note: "Fragmentation and control are unresolved validation tasks." },
        { label: "Validation burden", value: 39, note: "Legal/control evidence is not connected." }
      ],
      evidence: [
        evidence("Demo zone seed", "demo_seed", "Curated infill polygon."),
        evidence("Open context placeholder", "open_context", "Urban access context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Control/assembly due diligence", "Planning validation", "Existing-use review"],
      tags: ["infill", "urban core", "access", "redevelopment", "commercial adjacency"],
      recommendedNextAction: "Use only as an infill-screening hypothesis until assembly/control evidence exists.",
      sourceType: "demo_seed"
    }
  ],
  b2b_redevelopment_100ha: [
    {
      id: "b2b-100ha-dubai-south",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Dubai South large-zone hypothesis",
      subtitle: "Strategic corridor sample with logistics and district-expansion signals.",
      locationLabel: "Dubai South",
      geometry: polygon([
        [55.105, 24.952],
        [55.205, 24.956],
        [55.21, 24.875],
        [55.116, 24.868],
        [55.105, 24.952]
      ]),
      baseScore: 84,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Scale fit", value: 92, note: "Large-zone geometry suits 100+ ha screening." },
        { label: "Growth driver proxy", value: 86, note: "Logistics and corridor context represented as sample signals." },
        { label: "Validation burden", value: 45, note: "Control, planning and infrastructure timing are unresolved." }
      ],
      evidence: [
        evidence("Demo large-zone seed", "demo_seed", "Curated large polygon for strategic screening."),
        evidence("Sample corridor context", "sample", "Corridor growth signal is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Land/control evidence", "Infrastructure timing", "Planning/permitted-use validation"],
      tags: ["100ha", "logistics access", "transport corridor", "district expansion", "growth area"],
      recommendedNextAction: "Build a source validation plan before any strategic recommendation.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-100ha-expo-jebel-ali",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "redevelopment_zone",
      title: "Expo to Jebel Ali transition hypothesis",
      subtitle: "Large-zone redevelopment screen near employment and logistics anchors.",
      locationLabel: "Expo / Jebel Ali corridor",
      geometry: polygon([
        [55.002, 24.999],
        [55.094, 25.004],
        [55.101, 24.927],
        [55.009, 24.921],
        [55.002, 24.999]
      ]),
      baseScore: 80,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Scale fit", value: 89, note: "Large geometry matches strategic-zone screening." },
        { label: "Anchor adjacency", value: 82, note: "Employment/logistics anchors are sample context." },
        { label: "Validation burden", value: 43, note: "Timing, controls and constraints require deep validation." }
      ],
      evidence: [
        evidence("Demo large-zone seed", "demo_seed", "Curated corridor polygon."),
        evidence("Sample anchor context", "sample", "Employment/logistics adjacency is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Planning/permitted-use validation", "Infrastructure capacity", "Land/control review"],
      tags: ["100ha", "employment anchors", "logistics access", "transport corridor", "redevelopment"],
      recommendedNextAction: "Compare against Dubai South and rank validation blockers before fieldwork.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-100ha-al-warsan",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Al Warsan expansion hypothesis",
      subtitle: "Large-zone sample with growth adjacency and infrastructure questions.",
      locationLabel: "Al Warsan",
      geometry: polygon([
        [55.392, 25.19],
        [55.481, 25.191],
        [55.482, 25.113],
        [55.397, 25.112],
        [55.392, 25.19]
      ]),
      baseScore: 76,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Scale fit", value: 88, note: "Meets large-zone screening form factor." },
        { label: "Growth driver proxy", value: 75, note: "District-expansion signal is sample context." },
        { label: "Validation burden", value: 44, note: "Infrastructure and constraints are not validated." }
      ],
      evidence: [
        evidence("Demo large-zone seed", "demo_seed", "Curated large polygon."),
        evidence("Open context placeholder", "open_context", "Access and district context are illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Infrastructure capacity", "Environmental/constraint review", "Planning validation"],
      tags: ["100ha", "district expansion", "infrastructure", "growth area", "risk exposure"],
      recommendedNextAction: "Run an infrastructure-readiness evidence checklist before ranking higher.",
      sourceType: "demo_seed"
    }
  ],
  b2b_lowrise_luxury_residential: [
    {
      id: "b2b-luxury-meydan-edge",
      scenarioId: "b2b_lowrise_luxury_residential",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Meydan edge low-rise hypothesis",
      subtitle: "Premium residential sample around privacy, access and amenity adjacency.",
      locationLabel: "Meydan / Nad Al Sheba",
      geometry: polygon([
        [55.286, 25.153],
        [55.323, 25.154],
        [55.325, 25.126],
        [55.289, 25.124],
        [55.286, 25.153]
      ]),
      baseScore: 85,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Premium fit proxy", value: 88, note: "Privacy and low-density tags align." },
        { label: "Access proxy", value: 80, note: "Central access context is sample/open." },
        { label: "Validation burden", value: 46, note: "Permitted use and control are unresolved." }
      ],
      evidence: [
        evidence("Demo premium-zone seed", "demo_seed", "Curated polygon for luxury residential screening."),
        evidence("Sample amenity context", "sample", "Amenity adjacency is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Planning/permitted-use validation", "Land/control evidence", "Premium buyer evidence"],
      tags: ["privacy", "low-density context", "school access", "family villa", "premium"],
      recommendedNextAction: "Validate land/control and permitted-use evidence before treating the zone as feasible.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-luxury-jumeirah-islands-edge",
      scenarioId: "b2b_lowrise_luxury_residential",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Jumeirah Islands edge hypothesis",
      subtitle: "Low-rise premium adjacency screen with water/green context.",
      locationLabel: "Jumeirah Islands / JLT edge",
      geometry: polygon([
        [55.147, 25.061],
        [55.179, 25.063],
        [55.18, 25.039],
        [55.15, 25.038],
        [55.147, 25.061]
      ]),
      baseScore: 81,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Premium fit proxy", value: 84, note: "Water/green adjacency tags match." },
        { label: "Access proxy", value: 76, note: "Established area access is a sample signal." },
        { label: "Validation burden", value: 44, note: "Control, constraints and exact land facts are not validated." }
      ],
      evidence: [
        evidence("Demo premium-zone seed", "demo_seed", "Curated low-rise sample polygon."),
        evidence("Open context placeholder", "open_context", "Water/green context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Constraints review", "Planning/permitted-use validation", "Control evidence"],
      tags: ["waterfront adjacency", "low-density context", "privacy", "private estate", "premium"],
      recommendedNextAction: "Compare against Meydan and validate constraints before any land-use assumption.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-luxury-dubai-hills-edge",
      scenarioId: "b2b_lowrise_luxury_residential",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Dubai Hills edge boutique cluster hypothesis",
      subtitle: "Boutique low-rise residential sample near park and school signals.",
      locationLabel: "Dubai Hills edge",
      geometry: polygon([
        [55.218, 25.089],
        [55.247, 25.091],
        [55.249, 25.069],
        [55.221, 25.067],
        [55.218, 25.089]
      ]),
      baseScore: 79,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Premium fit proxy", value: 80, note: "School/park and boutique-cluster tags align." },
        { label: "Access proxy", value: 78, note: "Road access context is illustrative." },
        { label: "Validation burden", value: 45, note: "Entitlement and control evidence is not connected." }
      ],
      evidence: [
        evidence("Demo premium-zone seed", "demo_seed", "Curated sample polygon."),
        evidence("Sample amenity context", "sample", "School/park context is a demo screening signal.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Planning/permitted-use validation", "School/amenity evidence", "Land/control review"],
      tags: ["school access", "low-density context", "boutique cluster", "family villa", "parks"],
      recommendedNextAction: "Treat as a product-market-fit hypothesis, then validate source evidence.",
      sourceType: "demo_seed"
    }
  ],
  b2b_hotel_development: [
    {
      id: "b2b-hotel-business-bay",
      scenarioId: "b2b_hotel_development",
      audience: "b2b",
      candidateType: "hotel_zone",
      title: "Business Bay business-hotel hypothesis",
      subtitle: "Business and events demand-anchor sample for hotel screening.",
      locationLabel: "Business Bay",
      geometry: polygon([
        [55.254, 25.193],
        [55.285, 25.195],
        [55.286, 25.173],
        [55.257, 25.17],
        [55.254, 25.193]
      ]),
      baseScore: 84,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Format fit", value: 88, note: "Business and office catchment tags align." },
        { label: "Access proxy", value: 82, note: "Central access context is illustrative." },
        { label: "Validation burden", value: 47, note: "Hospitality demand and approvals are not validated." }
      ],
      evidence: [
        evidence("Demo hotel-zone seed", "demo_seed", "Curated polygon for hotel-format screening."),
        evidence("Sample demand anchors", "sample", "Business and event anchors are demonstration signals.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Hospitality demand evidence", "Planning/permitted-use validation", "Operator feasibility review"],
      tags: ["business", "events", "business district", "serviced apartment", "office catchment"],
      recommendedNextAction: "Create a hotel-demand evidence checklist before comparing formats.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-hotel-palm-resort",
      scenarioId: "b2b_hotel_development",
      audience: "b2b",
      candidateType: "hotel_zone",
      title: "Palm resort-format hypothesis",
      subtitle: "Luxury/resort sample near beach and tourist anchors.",
      locationLabel: "Palm Jumeirah",
      geometry: polygon([
        [55.121, 25.124],
        [55.158, 25.126],
        [55.159, 25.101],
        [55.124, 25.099],
        [55.121, 25.124]
      ]),
      baseScore: 82,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Format fit", value: 90, note: "Luxury, resort and beach tags strongly align." },
        { label: "Access proxy", value: 72, note: "Access and congestion require current validation." },
        { label: "Validation burden", value: 43, note: "Land/control, permits and operator evidence are unresolved." }
      ],
      evidence: [
        evidence("Demo hotel-zone seed", "demo_seed", "Curated resort-format polygon."),
        evidence("Sample tourism context", "sample", "Tourist anchor context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Operator/demand evidence", "Planning/permitted-use validation", "Access and congestion study"],
      tags: ["luxury", "resort", "beach", "tourist attractions", "waterfront"],
      recommendedNextAction: "Validate demand, access and permitted-use evidence before ranking as feasible.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-hotel-airport-midmarket",
      scenarioId: "b2b_hotel_development",
      audience: "b2b",
      candidateType: "hotel_zone",
      title: "Airport mid-market hotel hypothesis",
      subtitle: "Airport-access sample for business and mid-market format screening.",
      locationLabel: "Garhoud / Airport edge",
      geometry: polygon([
        [55.337, 25.258],
        [55.373, 25.258],
        [55.373, 25.238],
        [55.339, 25.237],
        [55.337, 25.258]
      ]),
      baseScore: 78,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Format fit", value: 82, note: "Airport and business tags fit mid-market screening." },
        { label: "Access proxy", value: 84, note: "Airport/road access context is illustrative." },
        { label: "Validation burden", value: 45, note: "Competition and approvals require validation." }
      ],
      evidence: [
        evidence("Demo hotel-zone seed", "demo_seed", "Curated airport-edge polygon."),
        evidence("Open context placeholder", "open_context", "Airport access context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Hotel demand/competition evidence", "Planning/permitted-use validation", "Operator feasibility"],
      tags: ["mid-market", "airport access", "business", "serviced apartment", "events"],
      recommendedNextAction: "Compare business and serviced-apartment formats with validated demand evidence.",
      sourceType: "demo_seed"
    }
  ],
  b2b_commercial_real_estate: [
    {
      id: "b2b-commercial-jvc-services",
      scenarioId: "b2b_commercial_real_estate",
      audience: "b2b",
      candidateType: "commercial_zone",
      title: "JVC neighborhood-services hypothesis",
      subtitle: "Service commercial sample with residential catchment proxy.",
      locationLabel: "Jumeirah Village Circle",
      geometry: polygon([
        [55.195, 25.066],
        [55.222, 25.065],
        [55.224, 25.046],
        [55.198, 25.044],
        [55.195, 25.066]
      ]),
      baseScore: 83,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Catchment proxy", value: 87, note: "Residential catchment and services tags align." },
        { label: "Access proxy", value: 73, note: "Road access context needs current validation." },
        { label: "Validation burden", value: 52, note: "Footfall and lease evidence are not connected." }
      ],
      evidence: [
        evidence("Demo commercial-zone seed", "demo_seed", "Curated neighborhood commercial polygon."),
        evidence("Sample catchment proxy", "sample", "Residential catchment is a demo proxy.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Footfall evidence", "Lease/competition review", "Planning/permitted-use validation"],
      tags: ["services", "residential catchment", "footfall proxy", "F&B", "retail"],
      recommendedNextAction: "Validate catchment and competition before treating this as a leasing strategy.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-commercial-business-bay-fnb",
      scenarioId: "b2b_commercial_real_estate",
      audience: "b2b",
      candidateType: "commercial_zone",
      title: "Business Bay F&B/office catchment hypothesis",
      subtitle: "Commercial sample near office and canal activity signals.",
      locationLabel: "Business Bay",
      geometry: polygon([
        [55.259, 25.188],
        [55.284, 25.189],
        [55.285, 25.173],
        [55.261, 25.171],
        [55.259, 25.188]
      ]),
      baseScore: 81,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Activity proxy", value: 86, note: "Office catchment and F&B tags align." },
        { label: "Access proxy", value: 80, note: "Central access context is illustrative." },
        { label: "Validation burden", value: 50, note: "Footfall and occupancy evidence are not connected." }
      ],
      evidence: [
        evidence("Demo commercial-zone seed", "demo_seed", "Curated F&B/commercial polygon."),
        evidence("Sample activity proxy", "sample", "Office and tourist activity signals are illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Footfall validation", "Occupancy and lease evidence", "Planning/permitted-use validation"],
      tags: ["F&B", "office catchment", "footfall proxy", "tourist traffic", "metro"],
      recommendedNextAction: "Run a competition and footfall evidence checklist before commercial assumptions.",
      sourceType: "demo_seed"
    },
    {
      id: "b2b-commercial-deira-retail",
      scenarioId: "b2b_commercial_real_estate",
      audience: "b2b",
      candidateType: "commercial_zone",
      title: "Deira retail-services hypothesis",
      subtitle: "Established activity-node sample with tourist and resident catchment proxies.",
      locationLabel: "Deira",
      geometry: polygon([
        [55.304, 25.277],
        [55.337, 25.278],
        [55.338, 25.256],
        [55.307, 25.254],
        [55.304, 25.277]
      ]),
      baseScore: 78,
      baseConfidence: "medium",
      scoreBreakdown: [
        { label: "Activity proxy", value: 84, note: "Retail and tourist traffic tags align." },
        { label: "Access proxy", value: 82, note: "Metro/road context is illustrative." },
        { label: "Validation burden", value: 48, note: "Competition and exact footfall are not connected." }
      ],
      evidence: [
        evidence("Demo commercial-zone seed", "demo_seed", "Curated retail/services polygon."),
        evidence("Open context placeholder", "open_context", "Tourist and resident activity context is illustrative.")
      ],
      caveats: developmentCaveats,
      validationRequired: ["Footfall validation", "Competition review", "Lease and use validation"],
      tags: ["retail", "services", "tourist traffic", "metro", "footfall proxy"],
      recommendedNextAction: "Validate footfall, competition and permitted-use evidence before ranking higher.",
      sourceType: "demo_seed"
    }
  ]
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hashToAdjustment(value: string, range = 3) {
  const hash = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (hash % (range * 2 + 1)) - range;
}

function flattenFilterValue(value: ExploreFilters[string]) {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return String(value);
}

function getQueryBoost(seed: ExploreCandidateSeed, query: string, filters: ExploreFilters) {
  const searchText = [
    seed.title,
    seed.subtitle,
    seed.locationLabel,
    seed.candidateType,
    ...seed.tags,
    ...Object.values(filters).map(flattenFilterValue)
  ].join(" ").toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length >= 3);
  const matches = tokens.filter((token) => searchText.includes(token)).length;

  return Math.min(8, matches * 2);
}

function getFilterBoost(seed: ExploreCandidateSeed, filters: ExploreFilters) {
  const filterTokens = Object.values(filters)
    .flatMap((value) => flattenFilterValue(value).toLowerCase().split(/[^a-z0-9+]+/))
    .filter((token) => token.length >= 3);
  const tagText = seed.tags.join(" ").toLowerCase();

  return Math.min(7, filterTokens.filter((token) => tagText.includes(token)).length);
}

function getModeBoost(seed: ExploreCandidateSeed, interactionMode: InteractionMode) {
  if (interactionMode === "map_first") {
    return seed.geometry.type === "point" || seed.geometry.type === "polygon" ? 2 : 0;
  }

  return seed.tags.length >= 5 ? 2 : 1;
}

function getSelectedAreaBoost(seed: ExploreCandidateSeed, selectedPointOrArea: GenerateExploreCandidatesInput["selectedPointOrArea"]) {
  if (!selectedPointOrArea?.label) {
    return 0;
  }

  const label = selectedPointOrArea.label.toLowerCase();
  const searchText = `${seed.title} ${seed.locationLabel} ${seed.tags.join(" ")}`.toLowerCase();
  return label
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && searchText.includes(token)).length * 2;
}

function adjustBreakdown(
  scoreBreakdown: ExploreCandidate["scoreBreakdown"],
  adjustment: number
): ExploreCandidate["scoreBreakdown"] {
  return scoreBreakdown.map((item, index) => ({
    ...item,
    value: clampScore(item.value + (index === 2 ? -Math.floor(adjustment / 2) : Math.ceil(adjustment / 3)))
  }));
}

function confidenceForScore(score: number, baseConfidence: CandidateConfidence): CandidateConfidence {
  if (baseConfidence === "low") {
    return score >= 88 ? "medium" : "low";
  }

  if (score < 68) {
    return "low";
  }

  return baseConfidence;
}

export function generateExploreCandidates(input: GenerateExploreCandidatesInput): ExploreCandidate[] {
  const scenario: ExploreScenario = getExploreScenario(input.scenarioId);
  const seeds = baseSeeds[input.scenarioId] ?? [];
  const roleBoost = scenario.defaultRoleHints.includes(input.role) ? 4 : 1;

  return seeds
    .map((seed) => {
      const queryBoost = getQueryBoost(seed, input.naturalLanguageQuery, input.filters);
      const filterBoost = getFilterBoost(seed, input.filters);
      const modeBoost = getModeBoost(seed, input.interactionMode);
      const selectedAreaBoost = getSelectedAreaBoost(seed, input.selectedPointOrArea);
      const deterministicJitter = hashToAdjustment(`${seed.id}:${input.role}:${input.interactionMode}`, 2);
      const adjustment = roleBoost + queryBoost + filterBoost + modeBoost + selectedAreaBoost + deterministicJitter;
      const score = clampScore(seed.baseScore + adjustment);

      return {
        ...seed,
        score,
        confidence: confidenceForScore(score, seed.baseConfidence),
        scoreBreakdown: adjustBreakdown(seed.scoreBreakdown, adjustment),
        createdAt: deterministicCreatedAt,
        caveats: Array.from(new Set([...seed.caveats, ...scenario.caveats, exploreRequiredCaveat]))
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function getCandidateCoordinates(candidate: ExploreCandidate): ExploreCoordinate[] {
  if (candidate.geometry.type === "point") {
    return [candidate.geometry.point];
  }

  return candidate.geometry.coordinates;
}

export function getCandidateAnchor(candidate: ExploreCandidate): ExploreCoordinate {
  const coordinates = getCandidateCoordinates(candidate);
  const uniqueCoordinates =
    coordinates.length > 1 &&
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1]
      ? coordinates.slice(0, -1)
      : coordinates;
  const totals = uniqueCoordinates.reduce(
    (sum, coordinate) => ({
      lng: sum.lng + coordinate[0],
      lat: sum.lat + coordinate[1]
    }),
    { lng: 0, lat: 0 }
  );

  return [
    Number((totals.lng / uniqueCoordinates.length).toFixed(6)),
    Number((totals.lat / uniqueCoordinates.length).toFixed(6))
  ];
}

export function getSourceTypeLabel(sourceType: CandidateSourceType) {
  const labels: Record<CandidateSourceType, string> = {
    sample: "Sample",
    open_context: "Open context",
    user_provided: "User provided",
    demo_seed: "Demo seed",
    fallback: "Fallback"
  };

  return labels[sourceType];
}

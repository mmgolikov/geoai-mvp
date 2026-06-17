import type { MarketArea, MarketMetric } from "@/src/types/market-context";

// Synthetic seed/demo-normalized market context for GeoAI MVP.
// These are qualitative indices for product demonstration only.
// They are not official Dubai transaction, rent, zoning, parcel, or valuation data.

function metric(
  label: string,
  level: MarketMetric["level"],
  index: number,
  trend: MarketMetric["trend"],
  note: string
): MarketMetric {
  return {
    label,
    level,
    index,
    trend,
    confidence: "demo",
    note
  };
}

const commonSourceIds = [
  "synthetic-demo-layers",
  "dubai-land-department-real-estate",
  "dubai-pulse-dld-apis",
  "dubai-municipality-gis-planning",
  "dubai-2040-urban-master-plan",
  "osm-geofabrik"
];

const commonLimitations = [
  "Market context is seed/demo-normalized and not official market evidence.",
  "Exact transactions, rents, ownership, zoning, density, and approvals are not validated.",
  "Future adapters should connect DLD, Dubai Pulse, Dubai Municipality, and licensed market datasets."
];

export const dubaiMarketAreas: MarketArea[] = [
  {
    id: "downtown-dubai",
    name: "Downtown Dubai",
    emirate: "Dubai",
    centroid: { latitude: 25.1972, longitude: 55.2744 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 91, "stable", "Prime mixed-use district with strong demo demand signal."),
    transactionContext: metric("Transaction context", "high", 88, "stable", "Seed context indicates high liquidity assumptions, pending official DLD validation."),
    rentContext: metric("Rent context", "high", 86, "stable", "Premium rental positioning is represented qualitatively only."),
    developmentPipelineContext: metric("Development pipeline", "medium", 64, "stable", "Mature district with selective redevelopment and repositioning potential."),
    accessibilityContext: metric("Accessibility", "high", 90, "stable", "Central access and transit context are represented as strong demo signals."),
    planningContext: metric("Planning context", "medium", 68, "stable", "Planning assumptions require official zoning and parcel confirmation."),
    riskContext: metric("Risk context", "medium", 56, "stable", "Execution risk is driven by maturity, cost, and approvals complexity."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "business-bay",
    name: "Business Bay",
    emirate: "Dubai",
    centroid: { latitude: 25.1851, longitude: 55.2639 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 86, "rising", "Dense commercial and residential context with active demo investor interest."),
    transactionContext: metric("Transaction context", "high", 82, "stable", "High turnover assumption requires DLD-backed validation."),
    rentContext: metric("Rent context", "high", 80, "stable", "Rental depth is treated as strong but qualitative."),
    developmentPipelineContext: metric("Development pipeline", "high", 78, "rising", "Continued infill and repositioning potential in seed context."),
    accessibilityContext: metric("Accessibility", "high", 84, "stable", "Central road and metro-adjacent context represented as favorable."),
    planningContext: metric("Planning context", "medium", 67, "stable", "Use mix and density need official confirmation at parcel level."),
    riskContext: metric("Risk context", "medium", 60, "stable", "Competitive supply and execution complexity remain diligence items."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "dubai-marina",
    name: "Dubai Marina",
    emirate: "Dubai",
    centroid: { latitude: 25.0800, longitude: 55.1400 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 84, "stable", "Established waterfront market with strong demo end-user and rental signal."),
    transactionContext: metric("Transaction context", "high", 81, "stable", "Liquidity is assumed strong, not verified with live transaction feeds."),
    rentContext: metric("Rent context", "high", 83, "stable", "Premium rental context is qualitative and requires market evidence."),
    developmentPipelineContext: metric("Development pipeline", "medium", 58, "cooling", "Mature cluster with limited new land and more asset-management focus."),
    accessibilityContext: metric("Accessibility", "high", 78, "stable", "Metro, tram, road, and waterfront access represented as favorable."),
    planningContext: metric("Planning context", "medium", 63, "stable", "Redevelopment and conversion constraints require official review."),
    riskContext: metric("Risk context", "medium", 62, "stable", "Supply maturity, service charges, and coastal exposure are diligence topics."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "jvc",
    name: "Jumeirah Village Circle",
    emirate: "Dubai",
    centroid: { latitude: 25.0600, longitude: 55.2050 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 79, "rising", "Growth-area residential activity is represented as strong in the seed model."),
    transactionContext: metric("Transaction context", "medium", 73, "rising", "Affordable-to-midmarket liquidity assumption needs DLD validation."),
    rentContext: metric("Rent context", "medium", 72, "rising", "Rental appeal is qualitative and linked to family/residential demand."),
    developmentPipelineContext: metric("Development pipeline", "high", 82, "rising", "Seed context assumes active pipeline and remaining development capacity."),
    accessibilityContext: metric("Accessibility", "medium", 67, "stable", "Road access is favorable, while transit assumptions need validation."),
    planningContext: metric("Planning context", "medium", 66, "stable", "Density, infrastructure capacity, and phasing require official checks."),
    riskContext: metric("Risk context", "medium", 64, "stable", "Pipeline volume and delivery timing are key risk items."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "palm-jumeirah",
    name: "Palm Jumeirah",
    emirate: "Dubai",
    centroid: { latitude: 25.1124, longitude: 55.1390 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 87, "stable", "Prime branded and waterfront positioning is strong in seed context."),
    transactionContext: metric("Transaction context", "high", 85, "stable", "Luxury liquidity assumptions require validated transaction evidence."),
    rentContext: metric("Rent context", "high", 88, "stable", "Premium rental positioning is qualitative and not price-specific."),
    developmentPipelineContext: metric("Development pipeline", "medium", 55, "stable", "Limited land availability shifts focus to asset enhancement and selective projects."),
    accessibilityContext: metric("Accessibility", "medium", 62, "stable", "Access is destination-led and requires congestion/transport validation."),
    planningContext: metric("Planning context", "medium", 60, "stable", "Waterfront, design, and approvals constraints require official checks."),
    riskContext: metric("Risk context", "medium", 68, "stable", "Coastal exposure and premium-market cyclicality are key diligence items."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "dubai-hills",
    name: "Dubai Hills Estate",
    emirate: "Dubai",
    centroid: { latitude: 25.1180, longitude: 55.2470 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 82, "rising", "Master-planned residential demand is represented as strong in seed context."),
    transactionContext: metric("Transaction context", "high", 78, "rising", "Transaction depth is assumed but not connected to live DLD evidence."),
    rentContext: metric("Rent context", "medium", 74, "rising", "Family-oriented rental demand is qualitative."),
    developmentPipelineContext: metric("Development pipeline", "medium", 70, "stable", "Pipeline context reflects continued master-plan delivery."),
    accessibilityContext: metric("Accessibility", "medium", 72, "stable", "Road access and district amenities are positive demo signals."),
    planningContext: metric("Planning context", "medium", 69, "stable", "Master-plan and parcel-level constraints need official confirmation."),
    riskContext: metric("Risk context", "medium", 55, "stable", "Timing, product mix, and infrastructure delivery are main watch items."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "dubai-creek-harbour",
    name: "Dubai Creek Harbour",
    emirate: "Dubai",
    centroid: { latitude: 25.2048, longitude: 55.3451 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "medium", 73, "rising", "Waterfront master-plan context suggests growth potential in the seed model."),
    transactionContext: metric("Transaction context", "medium", 68, "rising", "Liquidity assumptions require current DLD and developer evidence."),
    rentContext: metric("Rent context", "medium", 65, "rising", "Rental depth is modeled qualitatively pending delivered community maturity."),
    developmentPipelineContext: metric("Development pipeline", "high", 84, "rising", "Pipeline and phasing are strong demo context signals."),
    accessibilityContext: metric("Accessibility", "medium", 66, "stable", "Connectivity assumptions require transport and phasing validation."),
    planningContext: metric("Planning context", "medium", 72, "stable", "Master-plan context is promising but not parcel-specific evidence."),
    riskContext: metric("Risk context", "medium", 63, "stable", "Delivery timing and market absorption are key diligence gaps."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "dubai-south",
    name: "Dubai South",
    emirate: "Dubai",
    centroid: { latitude: 24.8870, longitude: 55.1600 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "medium", 66, "rising", "Growth-corridor context with airport, logistics, and future demand assumptions."),
    transactionContext: metric("Transaction context", "medium", 58, "rising", "Market liquidity is less mature and requires official validation."),
    rentContext: metric("Rent context", "medium", 57, "rising", "Rental context is tied to logistics, workforce, and residential growth assumptions."),
    developmentPipelineContext: metric("Development pipeline", "high", 86, "rising", "Large-scale pipeline and land availability are key seed signals."),
    accessibilityContext: metric("Accessibility", "medium", 70, "rising", "Airport and corridor access are positive, with transit timing to validate."),
    planningContext: metric("Planning context", "high", 78, "stable", "Planning potential is strong but parcel rights and phasing need confirmation."),
    riskContext: metric("Risk context", "medium", 66, "stable", "Infrastructure timing and absorption depth are principal risks."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "difc",
    name: "DIFC",
    emirate: "Dubai",
    centroid: { latitude: 25.2138, longitude: 55.2812 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 89, "stable", "Prime financial district context with strong occupier signal."),
    transactionContext: metric("Transaction context", "high", 83, "stable", "Premium commercial and mixed-use liquidity requires validated evidence."),
    rentContext: metric("Rent context", "high", 87, "stable", "Rent context is premium but qualitative only."),
    developmentPipelineContext: metric("Development pipeline", "medium", 60, "stable", "Mature district favors asset repositioning and selective expansion."),
    accessibilityContext: metric("Accessibility", "high", 88, "stable", "Central metro and road access are represented as strong signals."),
    planningContext: metric("Planning context", "medium", 65, "stable", "Development control and regulatory context need official checks."),
    riskContext: metric("Risk context", "medium", 57, "stable", "Premium pricing, competition, and approvals complexity require diligence."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "deira-creek",
    name: "Deira / Dubai Creek",
    emirate: "Dubai",
    centroid: { latitude: 25.2697, longitude: 55.3095 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "high", 77, "stable", "Historic trade and mixed-use context with active local demand assumptions."),
    transactionContext: metric("Transaction context", "medium", 70, "stable", "Liquidity and ownership structure require official validation."),
    rentContext: metric("Rent context", "medium", 69, "stable", "Rent context is broad and product-specific evidence is needed."),
    developmentPipelineContext: metric("Development pipeline", "medium", 63, "stable", "Redevelopment and adaptive reuse potential are represented qualitatively."),
    accessibilityContext: metric("Accessibility", "high", 82, "stable", "Transit, creek, port, and road context are strong demo signals."),
    planningContext: metric("Planning context", "medium", 67, "stable", "Heritage, planning, and parcel constraints require authority review."),
    riskContext: metric("Risk context", "medium", 65, "stable", "Fragmented ownership and redevelopment complexity are key diligence items."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "jebel-ali-expo",
    name: "Jebel Ali / Expo corridor",
    emirate: "Dubai",
    centroid: { latitude: 24.9850, longitude: 55.0750 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "medium", 64, "rising", "Logistics, industrial, and Expo corridor context supports growth assumptions."),
    transactionContext: metric("Transaction context", "medium", 60, "rising", "Transaction context is product-specific and requires official evidence."),
    rentContext: metric("Rent context", "medium", 61, "rising", "Rental demand assumptions are tied to logistics, industrial, and workforce demand."),
    developmentPipelineContext: metric("Development pipeline", "high", 80, "rising", "Corridor development and infrastructure potential are strong demo signals."),
    accessibilityContext: metric("Accessibility", "high", 81, "stable", "Port, highway, logistics, and Expo access are favorable context signals."),
    planningContext: metric("Planning context", "high", 76, "stable", "Industrial and corridor planning assumptions need authority confirmation."),
    riskContext: metric("Risk context", "medium", 62, "stable", "Absorption, infrastructure timing, and use-class fit require diligence."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  },
  {
    id: "meydan-mbr-city",
    name: "Meydan / MBR City",
    emirate: "Dubai",
    centroid: { latitude: 25.1580, longitude: 55.3000 },
    source: "seed_demo",
    marketActivityLevel: metric("Market activity", "medium", 74, "rising", "Master-planned growth context with residential and mixed-use demand assumptions."),
    transactionContext: metric("Transaction context", "medium", 69, "rising", "Market evidence is assumed qualitatively and not connected live."),
    rentContext: metric("Rent context", "medium", 68, "rising", "Rental context depends on delivery, amenities, and access maturity."),
    developmentPipelineContext: metric("Development pipeline", "high", 83, "rising", "Pipeline and master-plan delivery are core seed signals."),
    accessibilityContext: metric("Accessibility", "medium", 70, "stable", "Central proximity is favorable; last-mile and phasing need validation."),
    planningContext: metric("Planning context", "medium", 72, "stable", "Planning potential must be checked against official master-plan and parcel data."),
    riskContext: metric("Risk context", "medium", 61, "stable", "Pipeline timing and absorption are principal risks."),
    sourceIds: commonSourceIds,
    limitations: commonLimitations
  }
];

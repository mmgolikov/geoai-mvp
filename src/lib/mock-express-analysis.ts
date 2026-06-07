import type { ExpressAnalysis, SelectedPoint } from "@/src/types/geo";

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

export function createMockExpressAnalysis(point: SelectedPoint): ExpressAnalysis {
  const seed = coordinateSeed(point);
  const dubaiCoreProximity = scoreNear(point.longitude, 55.27, 105);
  const southCorridorFit = scoreNear(point.latitude, 24.93, 95);
  const coastalExposure = scoreNear(point.latitude, 25.12, 70);

  const scores = {
    developmentPotential: clampScore(62 + southCorridorFit * 0.24 + seed * 10),
    investmentAttractiveness: clampScore(58 + dubaiCoreProximity * 0.24 + seed * 12),
    accessibility: clampScore(55 + dubaiCoreProximity * 0.22 + southCorridorFit * 0.12),
    infrastructureReadiness: clampScore(54 + southCorridorFit * 0.18 + seed * 16),
    climateHeatRisk: clampScore(42 + coastalExposure * 0.24 + seed * 12),
    overallRisk: clampScore(38 + (100 - southCorridorFit) * 0.16 + coastalExposure * 0.16)
  };

  const isSouthLeaning = point.latitude < 25.05;
  const isCoreLeaning = point.longitude > 55.2 && point.latitude > 25.05;
  const districtTone = isCoreLeaning
    ? "an established Dubai urban node with stronger demand signals and higher execution complexity"
    : isSouthLeaning
      ? "a growth-corridor position where development upside depends on infrastructure timing and land-use clarity"
      : "a transitional Dubai location with mixed investment signals and a need for deeper site validation";

  return {
    id: `express-${point.latitude.toFixed(5)}-${point.longitude.toFixed(5)}`,
    point,
    summary:
      `This demo analysis treats the selected coordinate as a candidate Dubai real estate or development site. ` +
      `Based on mock spatial context, the point reads as ${districtTone}. ` +
      `The strongest signals are accessibility, surrounding infrastructure maturity, and commercial catchment potential, while the main uncertainties are regulatory confirmation and climate or heat exposure. ` +
      `This is deterministic demo intelligence only, intended to show the GeoAI decision workflow before official parcel, planning, market, and risk datasets are connected.`,
    scores,
    keyFactors: [
      "Indicative proximity to major road corridors and business access routes",
      "Urban context inferred from selected Dubai map position",
      "Development maturity estimated from demo growth-corridor patterns",
      "Surrounding infrastructure readiness based on mock utility and mobility context",
      "Coastal, heat, and outdoor-comfort exposure represented through demo risk signals",
      "Commercial potential inferred from accessibility and catchment assumptions"
    ],
    opportunities: [
      "Screen as a candidate site for mixed-use, logistics, residential support, or land-banking scenarios.",
      "Use the coordinate as a starting point for comparing alternative sites in the same investment corridor.",
      "Package the location into an early investment memo with assumptions, score ranges, and open diligence items.",
      "Prioritize market and mobility validation before moving into detailed feasibility."
    ],
    risks: [
      "Land-use rights, permitted density, and ownership status are not verified in this demo model.",
      "Infrastructure capacity and connection timing require official utility and transport data.",
      "Heat exposure and outdoor comfort may affect public realm, mobility, and operating assumptions.",
      "Commercial demand and exit liquidity must be benchmarked against current market evidence."
    ],
    nextActions: [
      "Request land-use and zoning confirmation for the selected coordinate.",
      "Compare this point with two or three nearby alternative sites.",
      "Run a regulatory and constraints check once official layers are available.",
      "Assess transport accessibility and infrastructure capacity with validated datasets.",
      "Prepare a short investment memo summarizing assumptions, risks, and diligence priorities."
    ],
    evidence: [
      "Map selection",
      `Coordinates: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`,
      "Demo infrastructure context",
      "Demo risk context",
      "Mock scoring model"
    ]
  };
}

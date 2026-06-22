import { dubaiMarketAreas } from "@/src/data/dubai-market-areas";
import { findDldMarketSnapshotForArea } from "@/src/lib/external-data/dld-snapshot";
import { getMarketAggregateForArea } from "@/src/lib/market-data-ingestion";
import type {
  AreaMatchResult,
  MarketArea,
  MarketContext,
  MarketContextAdapter,
  MarketContextAdapterRequest,
  MarketMetric
} from "@/src/types/market-context";
import type { SelectedPoint } from "@/src/types/geo";

const maxAreaMatchDistanceKm = 12;

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
    confidence: "low",
    note
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(pointA: SelectedPoint, pointB: SelectedPoint) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(pointB.latitude - pointA.latitude);
  const lngDelta = toRadians(pointB.longitude - pointA.longitude);
  const latA = toRadians(pointA.latitude);
  const latB = toRadians(pointB.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function matchNearestDubaiMarketArea(point: SelectedPoint): AreaMatchResult {
  const nearest = dubaiMarketAreas.reduce<{ area: MarketArea; distanceKm: number } | null>(
    (current, area) => {
      const distance = distanceKm(point, area.centroid);
      if (!current || distance < current.distanceKm) {
        return { area, distanceKm: distance };
      }

      return current;
    },
    null
  );

  if (!nearest) {
    return {
      area: null,
      distanceKm: null,
      confidenceLevel: "low",
      limitation: "No Dubai market seed areas are available for matching."
    };
  }

  if (nearest.distanceKm > maxAreaMatchDistanceKm) {
    return {
      area: null,
      distanceKm: nearest.distanceKm,
      confidenceLevel: "low",
      limitation:
        "Selected coordinate is outside the validated seed-area threshold, so only general Dubai context is shown."
    };
  }

  return {
    area: nearest.area,
    distanceKm: nearest.distanceKm,
    confidenceLevel: nearest.distanceKm <= 5 ? "demo" : "low"
  };
}

function createGeneralDubaiContext(match: AreaMatchResult): MarketContext {
  const limitations = [
    "Precise district matching is not yet validated for this coordinate.",
    "General Dubai context is seed/demo-normalized and not official market evidence.",
    "Future adapters should connect DLD, Dubai Pulse, Dubai Municipality, and licensed market datasets."
  ];

  if (match.limitation) {
    limitations.unshift(match.limitation);
  }

  return {
    areaName: "Dubai general context",
    emirate: "Dubai",
    centroid: { latitude: 25.2048, longitude: 55.2708 },
    matchDistanceKm: match.distanceKm,
    isGeneralContext: true,
    marketActivityLevel: metric("Market activity", "medium", 58, "stable", "General Dubai market screening context only."),
    transactionContext: metric("Transaction context", "medium", 54, "stable", "No area-specific transaction context is validated yet."),
    rentContext: metric("Rent context", "medium", 53, "stable", "No area-specific rent context is validated yet."),
    developmentPipelineContext: metric("Development pipeline", "medium", 60, "rising", "Dubai-wide development pipeline assumptions are qualitative."),
    accessibilityContext: metric("Accessibility", "medium", 56, "stable", "Access context requires district-level transport validation."),
    planningContext: metric("Planning context", "medium", 52, "stable", "Planning assumptions require official GIS and land-use confirmation."),
    riskContext: metric("Risk context", "medium", 59, "stable", "Risk context remains general until district and parcel evidence are connected."),
    sourceMode: "seed_static",
    dataQualityNotes: [
      "No strong area match; general Dubai fallback uses deterministic seed defaults.",
      "Current values are demo-normalized indices, not official market data."
    ],
    confidenceLevel: "low",
    sourceIds: [
      "synthetic-demo-layers",
      "dubai-land-department-real-estate",
      "dubai-pulse-dld-apis",
      "dubai-municipality-gis-planning",
      "dubai-2040-urban-master-plan",
      "osm-geofabrik"
    ],
    limitations
  };
}

function createAreaContext(area: MarketArea, match: AreaMatchResult): MarketContext {
  const snapshotAggregate = findDldMarketSnapshotForArea(area.name);
  const aggregate = snapshotAggregate ?? getMarketAggregateForArea(area.name);
  const sourceLabel = aggregate?.sourceMode === "dld_dubai_pulse_snapshot"
    ? "DLD / Dubai Pulse snapshot"
    : "Seed_static";
  const marketActivityLevel = aggregate
    ? metric(
        "Market activity",
        aggregate.activityIndex >= 75 ? "high" : aggregate.activityIndex >= 55 ? "medium" : "low",
        aggregate.activityIndex,
        aggregate.trend,
        `${sourceLabel} activity index for ${area.name}; official validation is still required.`
      )
    : area.marketActivityLevel;
  const rentContext = aggregate
    ? metric(
        "Rental demand",
        aggregate.rentalDemandIndex >= 75 ? "high" : aggregate.rentalDemandIndex >= 55 ? "medium" : "low",
        aggregate.rentalDemandIndex,
        aggregate.trend,
        `${sourceLabel} rental demand index for ${area.name}; requires official and licensed validation.`
      )
    : area.rentContext;
  const transactionContext = aggregate
    ? metric(
        "Liquidity",
        aggregate.liquidityIndex >= 75 ? "high" : aggregate.liquidityIndex >= 55 ? "medium" : "low",
        aggregate.liquidityIndex,
        aggregate.trend,
        `${sourceLabel} liquidity index for ${area.name}; no legal, valuation or transaction conclusion is made.`
      )
    : area.transactionContext;
  const developmentPipelineContext = aggregate
    ? metric(
        "Development pipeline",
        aggregate.developmentPipelineIndex >= 75 ? "high" : aggregate.developmentPipelineIndex >= 55 ? "medium" : "low",
        aggregate.developmentPipelineIndex,
        aggregate.trend,
        `${sourceLabel} development pipeline index for ${area.name}; phasing must be validated.`
      )
    : area.developmentPipelineContext;
  const riskContext = aggregate
    ? metric(
        "Risk index",
        aggregate.riskIndex >= 70 ? "high" : aggregate.riskIndex >= 50 ? "medium" : "low",
        aggregate.riskIndex,
        aggregate.trend,
        `${sourceLabel} risk index for ${area.name}; due diligence is still required.`
      )
    : area.riskContext;

  return {
    areaName: area.name,
    emirate: area.emirate,
    centroid: area.centroid,
    matchDistanceKm: match.distanceKm,
    isGeneralContext: false,
    marketActivityLevel,
    transactionContext,
    rentContext,
    developmentPipelineContext,
    accessibilityContext: area.accessibilityContext,
    planningContext: area.planningContext,
    riskContext,
    marketMetrics: aggregate ?? undefined,
    sourceMode: aggregate?.sourceMode ?? "seed_static",
    dataQualityNotes: aggregate?.dataQualityNotes ?? [
      "No normalized seed record matched this area; static area metadata was used."
    ],
    confidenceLevel: aggregate?.confidence ?? match.confidenceLevel,
    sourceIds: Array.from(new Set([...(aggregate?.sourceIds ?? []), ...area.sourceIds])),
    limitations: [
      ...area.limitations,
      ...(aggregate?.dataQualityNotes ?? [])
    ]
  };
}

export const seedDubaiMarketContextAdapter: MarketContextAdapter = {
  id: "dubai-market-seed-v0-1",
  name: "Dubai Market Context Seed Adapter v0.1",
  source: "seed_demo",
  getContext(request: MarketContextAdapterRequest) {
    const match = matchNearestDubaiMarketArea(request.point);
    if (!match.area) {
      return createGeneralDubaiContext(match);
    }

    return createAreaContext(match.area, match);
  }
};

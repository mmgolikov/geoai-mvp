import { dubaiMarketAreas } from "@/src/data/dubai-market-areas";
import {
  getMarketMetricsByArea,
  listImportedMarketMetrics,
  normalizeAreaName
} from "@/src/lib/market-metrics/loader";
import type {
  MarketMetricSelectionContext,
  MarketMetricsMatch
} from "@/src/lib/market-metrics/types";

const aliases: Record<string, string> = {
  "jumeirah village circle": "JVC",
  jvc: "JVC",
  "mbr city": "Meydan / MBR City",
  meydan: "Meydan / MBR City",
  marina: "Dubai Marina",
  "dubai marina": "Dubai Marina",
  downtown: "Downtown Dubai",
  "downtown dubai": "Downtown Dubai",
  "dubai south": "Dubai South",
  "business bay": "Business Bay"
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(pointA: NonNullable<MarketMetricSelectionContext["point"]>, pointB: NonNullable<MarketMetricSelectionContext["point"]>) {
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

function candidateText(context: MarketMetricSelectionContext) {
  return [
    context.candidateAreaName,
    context.marketContext?.areaName,
    context.selectedObject?.name,
    context.selectedObject?.layerName,
    context.selectedObject?.spatialContext?.datasetName,
    context.selectedObject?.spatialContext?.subtype
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function metricMatch(metricAreaName: string, matchType: MarketMetricsMatch["matchType"], confidence: MarketMetricsMatch["confidence"], note: string): MarketMetricsMatch {
  return {
    matchedAreaName: metricAreaName,
    matchType,
    confidence,
    sourceMode: "imported_sample",
    importedMetricsUsed: true,
    metrics: getMarketMetricsByArea(metricAreaName),
    note
  };
}

function fallbackMatch(context: MarketMetricSelectionContext): MarketMetricsMatch {
  const seedAreaName = context.marketContext?.areaName;
  if (seedAreaName && !context.marketContext?.isGeneralContext) {
    return {
      matchedAreaName: seedAreaName,
      matchType: "seed_fallback",
      confidence: "medium",
      sourceMode: "seed_static",
      importedMetricsUsed: false,
      metrics: null,
      note: "Seed_static demo metrics used because imported market metrics did not match this selection."
    };
  }

  return {
    matchedAreaName: "Dubai general context",
    matchType: "generic_fallback",
    confidence: "low",
    sourceMode: "fallback_demo",
    importedMetricsUsed: false,
    metrics: null,
    note: "No imported market metrics were matched to this selection; general Dubai fallback context is used."
  };
}

export function findBestMarketMetricMatch(context: MarketMetricSelectionContext): MarketMetricsMatch {
  const metrics = listImportedMarketMetrics();
  if (metrics.length === 0) {
    return fallbackMatch(context);
  }

  const exactCandidate = context.candidateAreaName ?? context.marketContext?.areaName;
  if (exactCandidate) {
    const exact = getMarketMetricsByArea(exactCandidate);
    if (exact) {
      return metricMatch(exact.areaName, "exact", "high", `Imported sample metrics matched exactly to ${exact.areaName}.`);
    }
  }

  const normalizedText = normalizeAreaName(candidateText(context));
  for (const [alias, areaName] of Object.entries(aliases)) {
    if (normalizedText.includes(normalizeAreaName(alias))) {
      const metric = getMarketMetricsByArea(areaName);
      if (metric) {
        return metricMatch(metric.areaName, "alias", "medium", `Imported sample metrics matched by alias to ${metric.areaName}.`);
      }
    }
  }

  const partial = metrics.find((metric) => {
    const area = normalizeAreaName(metric.areaName);
    return normalizedText.includes(area) || area.split(" ").some((part) => part.length > 4 && normalizedText.includes(part));
  });
  if (partial) {
    return metricMatch(partial.areaName, "partial", "medium", `Imported sample metrics partially matched to ${partial.areaName}.`);
  }

  if (context.point) {
    const nearest = dubaiMarketAreas.reduce<{ name: string; distance: number } | null>((current, area) => {
      const distance = distanceKm(context.point as NonNullable<MarketMetricSelectionContext["point"]>, area.centroid);
      return !current || distance < current.distance ? { name: area.name, distance } : current;
    }, null);

    if (nearest && nearest.distance <= 12) {
      const metric = getMarketMetricsByArea(nearest.name);
      if (metric) {
        return metricMatch(metric.areaName, "partial", nearest.distance <= 5 ? "medium" : "low", `Imported sample metrics matched by nearest seed area to ${metric.areaName}.`);
      }
    }
  }

  return fallbackMatch(context);
}

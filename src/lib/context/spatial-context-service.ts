import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getNearbyOpenPoi,
  getNearestAccessibilityMetric,
  getNearestOpenRoad
} from "@/src/lib/open-geodata/baseline-loader";
import { haversineKm } from "@/src/lib/open-geodata/accessibility-metrics";
import { buildContextLineage, validationRequiredNote } from "@/src/lib/context/source-lineage-builder";
import type { SelectedPoint } from "@/src/types/geo";

function readJson<T>(relativePath: string): T | null {
  try {
    const path = join(process.cwd(), relativePath);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function pointFromFeature(feature: { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }): SelectedPoint | null {
  if (feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
    const [longitude, latitude] = feature.geometry.coordinates;
    return typeof latitude === "number" && typeof longitude === "number" ? { latitude, longitude } : null;
  }
  return null;
}

export function getSpatialContext(point: SelectedPoint) {
  const nearestRoad = getNearestOpenRoad(point);
  const nearbyPoi = getNearbyOpenPoi(point, 7).slice(0, 6);
  const overtureBuildings = readJson<{ features?: Array<{ geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }> }>("data/normalized/overture_buildings_snapshot.json");
  const buildingFeatureCount = overtureBuildings?.features?.length ?? 0;

  return {
    status: "sample_fallback",
    point,
    openSpatial: {
      nearestRoad: nearestRoad
        ? {
            name: nearestRoad.road.name,
            distanceKm: Number(nearestRoad.distanceKm.toFixed(2)),
            source: "OSM / Geofabrik open snapshot"
          }
        : null,
      nearbyPoi: nearbyPoi.map((item) => ({
        name: item.item.name,
        category: item.item.category,
        distanceKm: Number(item.distanceKm.toFixed(2))
      })),
      buildingFeatureCount
    },
    sourceLineage: buildContextLineage([
      "osm-geofabrik-open-roads",
      "osm-geofabrik-open-pois",
      "overture-maps-open-buildings"
    ], "sample_fallback"),
    dataConfidenceSummary: "Open spatial context is sample/open snapshot context, not official municipal GIS.",
    validationRequired: validationRequiredNote()
  };
}

export function getAccessibilityContext(point: SelectedPoint) {
  const accessibility = getNearestAccessibilityMetric(point);
  const nearestRoad = getNearestOpenRoad(point);
  const nearbyPoi = getNearbyOpenPoi(point, 7);

  return {
    status: "sample_fallback",
    point,
    accessibilityContext: accessibility
      ? {
          areaName: accessibility.metric.areaName,
          index: accessibility.metric.accessibilityIndex,
          nearestMajorRoadKm: accessibility.metric.nearestMajorRoadKm,
          nearestAirportKm: accessibility.metric.nearestAirportKm,
          nearestMobilityAnchorKm: accessibility.metric.nearestMobilityAnchorKm,
          mobilityContext: accessibility.metric.mobilityContext,
          matchDistanceKm: Number(accessibility.distanceKm.toFixed(2))
        }
      : {
          areaName: "Dubai sample context",
          index: 58,
          nearestMajorRoadKm: nearestRoad ? Number(nearestRoad.distanceKm.toFixed(2)) : null,
          nearestAirportKm: null,
          nearestMobilityAnchorKm: null,
          mobilityContext: "Fallback accessibility context from open baseline."
        },
    poiCountNearby: nearbyPoi.length,
    sourceLineage: buildContextLineage(["osm-geofabrik-open-roads", "osm-geofabrik-open-pois"], "sample_fallback"),
    dataConfidenceSummary: "Accessibility is a screening proxy from open/sample roads and POIs.",
    validationRequired: validationRequiredNote()
  };
}

export function getDemographicContext(point: SelectedPoint) {
  const population = readJson<{ features?: Array<{ properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }> }>("data/normalized/worldpop_population_context.json");
  const candidates = (population?.features ?? [])
    .map((feature) => {
      const featurePoint = pointFromFeature(feature);
      return featurePoint
        ? {
            feature,
            distanceKm: haversineKm(point, featurePoint)
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const nearest = candidates[0];

  return {
    status: "sample_fallback",
    point,
    demographicContext: nearest
      ? {
          areaName: String(nearest.feature.properties?.areaName ?? "UAE sample area"),
          populationDensityProxy: nearest.feature.properties?.populationDensityProxy ?? "sample",
          distanceKm: Number(nearest.distanceKm.toFixed(2)),
          confidence: nearest.feature.properties?.confidence ?? "sample"
        }
      : {
          areaName: "No WorldPop sample match",
          populationDensityProxy: "unavailable"
        },
    sourceLineage: buildContextLineage(["worldpop-demographics"], "sample_fallback"),
    dataConfidenceSummary: "WorldPop context is a screening/catchment proxy and not official census validation.",
    validationRequired: validationRequiredNote()
  };
}

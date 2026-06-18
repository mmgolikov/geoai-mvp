import roadsJson from "@/data/normalized/open_geodata_roads.json";
import poiJson from "@/data/normalized/open_geodata_poi.json";
import landuseJson from "@/data/normalized/open_geodata_landuse.json";
import metricsJson from "@/data/normalized/open_geodata_accessibility_metrics.json";
import reportJson from "@/data/normalized/open_geodata_ingestion_report.json";
import { haversineKm } from "@/src/lib/open-geodata/accessibility-metrics";
import type {
  AccessibilityMetric,
  OpenGeodataBaseline,
  OpenLanduseFeature,
  OpenPoiFeature,
  OpenRoadFeature
} from "@/src/lib/open-geodata/types";
import type { SelectedPoint } from "@/src/types/geo";

export const openGeodataBaseline: OpenGeodataBaseline = {
  sourceMode: "open_geodata_sample",
  roads: roadsJson.features as unknown as OpenRoadFeature[],
  poi: poiJson.features as unknown as OpenPoiFeature[],
  landuse: landuseJson.features as unknown as OpenLanduseFeature[],
  accessibilityMetrics: metricsJson.items as unknown as AccessibilityMetric[],
  ingestionReport: reportJson as unknown as OpenGeodataBaseline["ingestionReport"]
};

export function getNearestAccessibilityMetric(point: SelectedPoint) {
  return openGeodataBaseline.accessibilityMetrics
    .map((metric) => ({
      metric,
      distanceKm: haversineKm(point, metric.coordinates)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
}

export function getNearbyOpenPoi(point: SelectedPoint, radiusKm = 7) {
  return openGeodataBaseline.poi
    .map((item) => ({
      item,
      distanceKm: haversineKm(point, item.coordinates)
    }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function getNearestOpenRoad(point: SelectedPoint) {
  return openGeodataBaseline.roads
    .map((road) => {
      const total = road.geometry.coordinates.reduce(
        (sum, coordinate) => ({
          longitude: sum.longitude + coordinate[0],
          latitude: sum.latitude + coordinate[1]
        }),
        { latitude: 0, longitude: 0 }
      );
      const centroid = {
        latitude: total.latitude / road.geometry.coordinates.length,
        longitude: total.longitude / road.geometry.coordinates.length
      };

      return {
        road,
        distanceKm: haversineKm(point, centroid)
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
}

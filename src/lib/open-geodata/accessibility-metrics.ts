import type { SelectedPoint } from "@/src/types/geo";
import type { AccessibilityMetric, OpenPoiFeature, OpenRoadFeature } from "@/src/lib/open-geodata/types";

type AreaSeed = {
  areaName: string;
  coordinates: SelectedPoint;
};

const areaSeeds: AreaSeed[] = [
  { areaName: "Dubai Marina", coordinates: { latitude: 25.0796, longitude: 55.1488 } },
  { areaName: "Downtown Dubai", coordinates: { latitude: 25.2015, longitude: 55.2797 } },
  { areaName: "Business Bay", coordinates: { latitude: 25.1854, longitude: 55.2659 } },
  { areaName: "JVC", coordinates: { latitude: 25.071, longitude: 55.205 } },
  { areaName: "Meydan / MBR City", coordinates: { latitude: 25.163, longitude: 55.319 } },
  { areaName: "Dubai South", coordinates: { latitude: 24.964, longitude: 55.172 } }
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: SelectedPoint, b: SelectedPoint) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function lineCentroid(road: OpenRoadFeature): SelectedPoint {
  const total = road.geometry.coordinates.reduce(
    (sum, coordinate) => ({
      longitude: sum.longitude + coordinate[0],
      latitude: sum.latitude + coordinate[1]
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: total.latitude / road.geometry.coordinates.length,
    longitude: total.longitude / road.geometry.coordinates.length
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createAccessibilityMetrics(roads: OpenRoadFeature[], poi: OpenPoiFeature[]): AccessibilityMetric[] {
  const majorRoads = roads.filter((road) => ["motorway", "trunk", "primary"].includes(road.roadClass));
  const airports = poi.filter((item) => item.category === "airport");
  const mobilityAnchors = poi.filter((item) => ["airport", "metro_mobility"].includes(item.category));
  const demandAnchors = poi.filter((item) => ["business", "tourism", "retail", "development_anchor"].includes(item.category));

  return areaSeeds.map((area) => {
    const nearestMajorRoadKm = Math.min(...majorRoads.map((road) => haversineKm(area.coordinates, lineCentroid(road))));
    const nearestAirportKm = Math.min(...airports.map((item) => haversineKm(area.coordinates, item.coordinates)));
    const nearestMobilityAnchorKm = Math.min(...mobilityAnchors.map((item) => haversineKm(area.coordinates, item.coordinates)));
    const poiCountNearby = poi.filter((item) => haversineKm(area.coordinates, item.coordinates) <= 6).length;
    const demandAnchorCountNearby = demandAnchors.filter((item) => haversineKm(area.coordinates, item.coordinates) <= 7).length;
    const accessibilityIndex = Math.round(clamp(
      92 - nearestMajorRoadKm * 2.3 - nearestMobilityAnchorKm * 1.5 + poiCountNearby * 2.4 + demandAnchorCountNearby * 1.8,
      35,
      95
    ));

    return {
      areaName: area.areaName,
      coordinates: area.coordinates,
      nearestMajorRoadKm: Number(nearestMajorRoadKm.toFixed(1)),
      nearestAirportKm: Number(nearestAirportKm.toFixed(1)),
      nearestMobilityAnchorKm: Number(nearestMobilityAnchorKm.toFixed(1)),
      poiCountNearby,
      demandAnchorCountNearby,
      accessibilityIndex,
      mobilityContext: `Sample open-baseline context: nearest major road ${nearestMajorRoadKm.toFixed(1)} km, nearest mobility anchor ${nearestMobilityAnchorKm.toFixed(1)} km, ${poiCountNearby} nearby POI anchors.`,
      sourceMode: "open_geodata_sample",
      confidence: "sample"
    };
  });
}

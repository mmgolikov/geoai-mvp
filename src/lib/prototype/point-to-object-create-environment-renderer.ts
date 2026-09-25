import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ConceptEnvironment } from "./point-to-object-create-environment";

export const CONCEPT_ENVIRONMENT_SOURCE = "geoai-concept-environment";
export const CONCEPT_ENVIRONMENT_LAYER = "geoai-concept-environment-fill";

export function ensureConceptEnvironmentLayers(map: MapLibreMap, beforeId?: string): void {
  if (!map.getSource(CONCEPT_ENVIRONMENT_SOURCE)) map.addSource(CONCEPT_ENVIRONMENT_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  if (!map.getLayer(CONCEPT_ENVIRONMENT_LAYER)) map.addLayer({ id: CONCEPT_ENVIRONMENT_LAYER, type: "fill", source: CONCEPT_ENVIRONMENT_SOURCE,
    paint: { "fill-color": ["match", ["get", "material"], "permeable_surface", "#d5d3c7", "#b9c5c1"],
      "fill-opacity": 0.95, "fill-outline-color": "#879c95" } }, beforeId);
}
export function setConceptEnvironmentVisibility(map: MapLibreMap, visible: boolean): void {
  if (map.getLayer(CONCEPT_ENVIRONMENT_LAYER) && map.getLayoutProperty(CONCEPT_ENVIRONMENT_LAYER, "visibility") !== (visible ? "visible" : "none")) {
    map.setLayoutProperty(CONCEPT_ENVIRONMENT_LAYER, "visibility", visible ? "visible" : "none");
  }
}
const applied = new WeakMap<MapLibreMap, { source: GeoJSONSource; key: string }>();
export function updateConceptEnvironment(map: MapLibreMap, environment: ConceptEnvironment | null, visible = true): void {
  const source = map.getSource(CONCEPT_ENVIRONMENT_SOURCE) as GeoJSONSource | undefined;
  const key = environment?.key ?? "empty";
  const prior = applied.get(map);
  map.getContainer().dataset.conceptEnvironmentKey = key;
  map.getContainer().dataset.conceptEnvironmentStatus = environment?.status ?? "unavailable";
  map.getContainer().dataset.conceptEnvironmentCount = String(environment?.featureCollection.features.length ?? 0);
  if (source && (prior?.source !== source || prior.key !== key)) {
    source.setData(environment?.featureCollection ?? { type: "FeatureCollection", features: [] });
    applied.set(map, { source, key });
  }
  setConceptEnvironmentVisibility(map, visible);
}

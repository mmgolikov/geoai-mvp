import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { FilterSpecification, GeoJSONSource, LayerSpecification, Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import { partitionPointObjectMapBuilding, pointObjectPreparedPartitionPredicate } from "./point-to-object-map-partition";
import { buildPointObjectBuildingReplacementFilter, restorePointObjectMapFilter, type PointObjectMapFilterSnapshot } from "./point-to-object-map-replacement";

type Building = Feature<Polygon | MultiPolygon>;
type SourcePlan = { originalSource: string; sourceId: string; data: FeatureCollection; predicates: FilterSpecification[] };
type RendererState = {
  signature: string;
  sourceIds: Set<string>;
  layerIds: Set<string>;
  listener?: (event: MapSourceDataEvent) => void;
};
const states = new WeakMap<MapLibreMap, RendererState>();
const SOURCE_PREFIX = "geoai-existing-partition-source:";
const LAYER_PREFIX = "geoai-existing-partition-layer:";

function setFilterIfChanged(map: MapLibreMap, id: string, filter: FilterSpecification | null) {
  if (JSON.stringify(map.getFilter(id) ?? null) !== JSON.stringify(filter)) map.setFilter(id, filter);
}

/** Cancel pending applies before a restore, source update or style replacement. */
export function clearPointObjectPartitionRenderer(map: MapLibreMap, reset = false) {
  const state = states.get(map);
  if (!state) return;
  if (state.listener) map.off("sourcedata", state.listener);
  state.listener = undefined;
  state.signature = "";
  for (const layerId of state.layerIds) if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
  if (reset) states.delete(map);
}

function sourcePlans(map: MapLibreMap, aoi: Polygon, layerIds: readonly string[]): SourcePlan[] {
  const sources = new Set(layerIds.flatMap(id => {
    const layer = map.getLayer(id);
    return layer && "source" in layer && typeof layer.source === "string" ? [layer.source] : [];
  }));
  const result: SourcePlan[] = [];
  let preparedPositions = 0;
  for (const source of sources) {
    const data: FeatureCollection = { type: "FeatureCollection", features: [] };
    const predicates: FilterSpecification[] = [];
    const seen = new Set<string>();
    let features;
    try {
      features = map.querySourceFeatures(source, { sourceLayer: "building", filter: ["==", ["distance", aoi], 0] });
    } catch { continue; }
    for (const feature of features) {
      if (feature.geometry.type !== "MultiPolygon") continue;
      const vertexCount = feature.geometry.coordinates.reduce((sum, polygon) => sum + polygon.reduce((n, ring) => n + ring.length, 0), 0);
      // Each skipped feature remains fully native. A render cap must never
      // silently remove its outside members or create fabricated geometry.
      if (predicates.length >= 32 || preparedPositions + vertexCount > 24_000) continue;
      const candidate: Building = { type: "Feature", ...(feature.id === undefined ? {} : { id: feature.id }), properties: feature.properties, geometry: feature.geometry };
      const signature = JSON.stringify(candidate);
      if (seen.has(signature)) continue;
      seen.add(signature);
      const partition = partitionPointObjectMapBuilding(candidate, aoi);
      if (!partition.valid || !partition.hiddenMembers || !partition.retained) continue;
      const predicate = pointObjectPreparedPartitionPredicate(candidate);
      if (!predicate) continue;
      preparedPositions += vertexCount;
      data.features.push(partition.retained);
      predicates.push(predicate);
    }
    if (predicates.length) result.push({ originalSource: source, sourceId: `${SOURCE_PREFIX}${source}`, data, predicates });
  }
  return result;
}

/**
 * Prepare exact retained Polygon members before masking the source feature.
 * Source data is device-memory render data only; no provider fetch or upload.
 * Ordinary all-inside masks are installed by the caller first. On each update
 * they restore mixed native features before a retained copy changes, preventing
 * outside buildings from disappearing while GeoJSON workers catch up.
 */
export function reconcilePointObjectPartitionRenderer(
  map: MapLibreMap,
  aoi: Polygon,
  layerIds: readonly string[],
  originals: ReadonlyMap<string, PointObjectMapFilterSnapshot>,
  force = false
) {
  const plans = sourcePlans(map, aoi, layerIds);
  const layers = (map.getStyle().layers ?? []).filter(layer => layerIds.includes(layer.id));
  const signature = JSON.stringify([aoi, plans, layers.map(layer => [layer.id, layer.layout, layer.paint])]);
  let state = states.get(map);
  const changed = !state || state.signature !== signature;
  if (!changed && !force) return;
  if (!state) {
    state = { signature: "", sourceIds: new Set(), layerIds: new Set() };
    states.set(map, state);
  }
  if (state.listener) map.off("sourcedata", state.listener);
  state.listener = undefined;
  const activeLayerIds = new Set<string>();
  const baseFilters = new Map(layerIds.map(id => [id, buildPointObjectBuildingReplacementFilter(originals.get(id)?.filter, aoi).filter]));
  // Restore the mixed originals before changing any retained source data.
  for (const [id, filter] of baseFilters) if (map.getLayer(id)) setFilterIfChanged(map, id, filter);
  for (const plan of plans) {
    if (!map.getSource(plan.sourceId)) {
      map.addSource(plan.sourceId, { type: "geojson", data: plan.data, maxzoom: 22, tolerance: 0, buffer: 64 });
      state.sourceIds.add(plan.sourceId);
    } else if (changed) {
      (map.getSource(plan.sourceId) as GeoJSONSource).setData(plan.data);
    }
    for (const layer of layers) {
      if (!("source" in layer) || layer.source !== plan.originalSource) continue;
      const id = `${LAYER_PREFIX}${layer.id}`;
      activeLayerIds.add(id);
      if (!map.getLayer(id)) {
        const copy = structuredClone(layer) as LayerSpecification & { "source-layer"?: string; source?: string; filter?: FilterSpecification | null };
        copy.id = id;
        copy.source = plan.sourceId;
        delete copy["source-layer"];
        const original = originals.get(layer.id);
        const filter = original ? restorePointObjectMapFilter(original) : null;
        if (filter) copy.filter = filter;
        else delete copy.filter;
        map.addLayer(copy as LayerSpecification, layer.id);
        state.layerIds.add(id);
      }
      map.setLayoutProperty(id, "visibility", layer.layout?.visibility ?? "visible");
      // Native 2D/3D mode changes must apply to the retained copy too.
      for (const [name, value] of Object.entries(layer.paint ?? {})) map.setPaintProperty(id, name as Parameters<MapLibreMap["setPaintProperty"]>[1], value);
    }
  }
  for (const id of state.layerIds) if (!activeLayerIds.has(id) && map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  state.signature = signature;
  const current = state;
  const applyPrepared = () => {
    if (states.get(map) !== current || current.signature !== signature) return;
    for (const plan of plans) {
      if (!map.getSource(plan.sourceId) || !map.isSourceLoaded(plan.sourceId)) continue;
      for (const layer of layers) {
        if (!("source" in layer) || layer.source !== plan.originalSource || !map.getLayer(layer.id)) continue;
        const baseline = baseFilters.get(layer.id);
        setFilterIfChanged(map, layer.id, ["all", ...(baseline ? [baseline] : []), ["!", ["any", ...plan.predicates]]] as FilterSpecification);
      }
    }
  };
  const listener = (event: MapSourceDataEvent) => {
    if (plans.some(plan => plan.sourceId === event.sourceId)) applyPrepared();
  };
  current.listener = listener;
  map.on("sourcedata", listener);
  applyPrepared();
}

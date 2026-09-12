import type { FeatureCollection, Polygon } from "geojson";
import type { FilterSpecification, GeoJSONSource, LayerSpecification, Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import {
  planPointObjectBuildingReplacement,
  type PointObjectTileBackedBuildingFeature
} from "./point-to-object-map-partition";
import {
  buildPointObjectKnownFootprintFilter,
  restorePointObjectMapFilter,
  type PointObjectMapFilterSnapshot
} from "./point-to-object-map-replacement";

type SourcePlan = { originalSource: string; sourceId: string; data: FeatureCollection; predicates: FilterSpecification[] };
type RendererState = {
  signature: string;
  ready: boolean;
  sourceIds: Set<string>;
  layerIds: Set<string>;
  listener?: (event: MapSourceDataEvent) => void;
};
const states = new WeakMap<MapLibreMap, RendererState>();
type CompleteRendererState = {
  aoiSignature: string;
  filterSignature: string;
  result: PointObjectCompleteFootprintRendererResult;
};
const completeStates = new WeakMap<MapLibreMap, CompleteRendererState>();
const SOURCE_PREFIX = "geoai-existing-partition-source:";
const LAYER_PREFIX = "geoai-existing-partition-layer:";

function setFilterIfChanged(map: MapLibreMap, id: string, filter: FilterSpecification | null) {
  if (JSON.stringify(map.getFilter(id) ?? null) !== JSON.stringify(filter)) map.setFilter(id, filter);
}

/** Cancel pending applies before a restore, source update or style replacement. */
export function clearPointObjectPartitionRenderer(map: MapLibreMap, reset = false) {
  completeStates.delete(map);
  const state = states.get(map);
  if (!state) return;
  if (state.listener) map.off("sourcedata", state.listener);
  state.listener = undefined;
  state.signature = "";
  state.ready = false;
  for (const layerId of state.layerIds) if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
  if (reset) {
    states.delete(map);
  }
}

function sourcePlans(map: MapLibreMap, aoi: Polygon, layerIds: readonly string[]): SourcePlan[] {
  const sources = new Set(layerIds.flatMap(id => {
    const layer = map.getLayer(id);
    return layer && "source" in layer && typeof layer.source === "string" ? [layer.source] : [];
  }));
  const result: SourcePlan[] = [];
  for (const source of sources) {
    const features = map.querySourceFeatures(source, { sourceLayer: "building", filter: ["==", ["distance", aoi], 0] });
    const plan = planPointObjectBuildingReplacement(features as PointObjectTileBackedBuildingFeature[], aoi);
    if (plan.predicates.length) result.push({
      originalSource: source,
      sourceId: `${SOURCE_PREFIX}${source}`,
      data: plan.retained,
      predicates: plan.predicates
    });
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
  force = false,
  preparedPlans?: readonly SourcePlan[]
): boolean {
  const plans = preparedPlans ? [...preparedPlans] : sourcePlans(map, aoi, layerIds);
  const layers = (map.getStyle().layers ?? []).filter(layer => layerIds.includes(layer.id));
  const signature = JSON.stringify([aoi, plans, layers.map(layer => [layer.id, layer.layout, layer.paint])]);
  let state = states.get(map);
  const changed = !state || state.signature !== signature;
  if (!changed && !force) return state?.ready ?? false;
  if (!state) {
    state = { signature: "", ready: false, sourceIds: new Set(), layerIds: new Set() };
    states.set(map, state);
  }
  if (state.listener) map.off("sourcedata", state.listener);
  state.listener = undefined;
  const activeLayerIds = new Set<string>();
  const baseFilters = new Map(layerIds.map(id => [
    id,
    originals.has(id) ? restorePointObjectMapFilter(originals.get(id)!) : null
  ]));
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
    if (states.get(map) !== current || current.signature !== signature) return false;
    let ready = true;
    for (const plan of plans) {
      if (!map.getSource(plan.sourceId) || !map.isSourceLoaded(plan.sourceId)) {
        ready = false;
        continue;
      }
      for (const layer of layers) {
        if (!("source" in layer) || layer.source !== plan.originalSource || !map.getLayer(layer.id)) continue;
        const baseline = baseFilters.get(layer.id) ?? null;
        // Basemap styles may still use the legacy property-filter syntax.
        // The shared builder converts it before composing expression-backed
        // geometry predicates; mixing the two syntaxes can reject a whole layer.
        const composed = buildPointObjectKnownFootprintFilter(baseline, plan.predicates);
        setFilterIfChanged(map, layer.id, composed.applied ? composed.filter : baseline);
      }
    }
    current.ready = ready;
    return ready;
  };
  const listener = (event: MapSourceDataEvent) => {
    if (plans.some(plan => plan.sourceId === event.sourceId) && applyPrepared()) {
      // The retained worker can become ready after MapLibre's last natural
      // idle event. Schedule one render so the map-level idle reconciler can
      // publish applied/partial instead of leaving the UI on "preparing".
      map.triggerRepaint();
    }
  };
  current.listener = listener;
  map.on("sourcedata", listener);
  return applyPrepared();
}

export type PointObjectCompleteFootprintRendererResult = {
  coverage: "complete" | "partial" | "pending" | "error";
  examinedFeatures: number;
  completeParents: number;
  hiddenParents: number;
  tileMatchedParents: number;
  unknownFeatures: number;
  reason: string | null;
};

const pendingResult = (reason: string): PointObjectCompleteFootprintRendererResult => ({
  coverage: "pending",
  examinedFeatures: 0,
  completeParents: 0,
  hiddenParents: 0,
  tileMatchedParents: 0,
  unknownFeatures: 0,
  reason
});

/**
 * Replace positive-overlap Polygon members from the current source tiles while
 * retaining non-overlap siblings. Tile-fragment matches remain explicitly
 * partial and this path does not consume the separately capped context sample.
 */
export function reconcilePointObjectCompleteFootprintRenderer(
  map: MapLibreMap,
  aoi: Polygon,
  layerIds: readonly string[],
  originals: ReadonlyMap<string, PointObjectMapFilterSnapshot>,
  force = false
): PointObjectCompleteFootprintRendererResult {
  const aoiSignature = JSON.stringify(aoi);
  const layers = layerIds.flatMap((id) => {
    const layer = map.getLayer(id);
    return layer && "source" in layer && typeof layer.source === "string" ? [{ id, source: layer.source }] : [];
  });
  const sources = [...new Set(layers.map(({ source }) => source))];
  if (!layers.length || layers.some(({ id }) => !originals.has(id))) {
    clearPointObjectPartitionRenderer(map);
    return { ...pendingResult("building_layers_unavailable"), coverage: "error" };
  }
  if (sources.some((source) => !map.isSourceLoaded(source))) {
    clearPointObjectPartitionRenderer(map);
    for (const { id } of layers) setFilterIfChanged(map, id, restorePointObjectMapFilter(originals.get(id)!));
    return pendingResult("building_source_loading");
  }

  const plans = new Map<string, ReturnType<typeof planPointObjectBuildingReplacement>>();
  try {
    for (const source of sources) {
      const features = map.querySourceFeatures(source, {
        sourceLayer: "building",
        filter: ["==", ["distance", aoi], 0]
      }) as PointObjectTileBackedBuildingFeature[];
      plans.set(source, planPointObjectBuildingReplacement(features, aoi));
    }
  } catch {
    clearPointObjectPartitionRenderer(map);
    for (const { id } of layers) setFilterIfChanged(map, id, restorePointObjectMapFilter(originals.get(id)!));
    return {
      coverage: "error", examinedFeatures: 0, completeParents: 0, hiddenParents: 0, tileMatchedParents: 0,
      unknownFeatures: 0, reason: "building_source_query_failed"
    };
  }

  const result: PointObjectCompleteFootprintRendererResult = {
    coverage: [...plans.values()].some((plan) => plan.coverage === "partial") ? "partial" : "complete",
    examinedFeatures: [...plans.values()].reduce((sum, plan) => sum + plan.examinedFeatures, 0),
    completeParents: [...plans.values()].reduce((sum, plan) => sum + plan.completeParents, 0),
    hiddenParents: [...plans.values()].reduce((sum, plan) => sum + plan.hiddenParents, 0),
    tileMatchedParents: [...plans.values()].reduce((sum, plan) => sum + plan.tileMatchedParents, 0),
    unknownFeatures: [...plans.values()].reduce((sum, plan) => sum + plan.unknownFeatures, 0),
    reason: [...plans.values()].find((plan) => plan.reason)?.reason ?? null
  };
  const filterSignature = JSON.stringify([...plans.entries()].map(([source, plan]) => [
    source, plan.predicates, plan.retained
  ]));
  const current = completeStates.get(map);
  const preparedSourcePlans: SourcePlan[] = [...plans.entries()].flatMap(([source, plan]) => plan.predicates.length ? [{
    originalSource: source,
    sourceId: `${SOURCE_PREFIX}${source}`,
    data: plan.retained,
    predicates: plan.predicates
  }] : []);
  let partitionReady = states.get(map)?.ready ?? false;
  if (force || !current || current.aoiSignature !== aoiSignature || current.filterSignature !== filterSignature) {
    try {
      partitionReady = reconcilePointObjectPartitionRenderer(map, aoi, layerIds, originals, force, preparedSourcePlans);
    } catch {
      clearPointObjectPartitionRenderer(map);
      for (const { id } of layers) if (map.getLayer(id)) setFilterIfChanged(map, id, restorePointObjectMapFilter(originals.get(id)!));
      return { ...result, coverage: "error", reason: "building_partition_apply_failed" };
    }
  }
  const reportedResult: PointObjectCompleteFootprintRendererResult = partitionReady
    ? result
    : { ...result, coverage: "pending", reason: "retained_source_loading" };
  completeStates.set(map, { aoiSignature, filterSignature, result: reportedResult });
  return reportedResult;
}

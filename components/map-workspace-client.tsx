"use client";

import { useEffect, useRef, useState } from "react";
import { demoLayers, getDemoFeatureById, getLayerSourceModeLabel, getSelectedDemoObject } from "@/src/data/demo-layers";
import type { DemoLayer, DemoLayerFeature } from "@/src/data/demo-layers";
import { openGeodataBaseline } from "@/src/lib/open-geodata";
import type { OpenLanduseFeature, OpenPoiFeature, OpenRoadFeature } from "@/src/lib/open-geodata";
import type { GeoJSONSource, Map as MapboxMap, MapboxGeoJSONFeature, Marker as MapboxMarker, Popup as MapboxPopup } from "mapbox-gl";
import type { DemoLayerId, DemoLayerType, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { UploadedDataset } from "@/src/types/uploaded-data";

const defaultCenter: [number, number] = [55.235, 25.12];
const defaultZoom = 9.75;
const basemapOptions = [
  { id: "streets", label: "Streets", styleUrl: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", label: "Light", styleUrl: "mapbox://styles/mapbox/light-v11" },
  { id: "satellite", label: "Satellite", styleUrl: "mapbox://styles/mapbox/satellite-streets-v12" }
] as const;

type BasemapStyleId = (typeof basemapOptions)[number]["id"];

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.startsWith("pk.");
}

type MapWorkspaceClientProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  onPointSelect: (point: SelectedPoint) => void;
  onObjectSelect?: (object: SelectedDemoObject) => void;
  className?: string;
  showEmptyOverlay?: boolean;
  showLayerControls?: boolean;
  uploadedDatasets?: UploadedDataset[];
};

const initialLayerVisibility = demoLayers.reduce<Record<DemoLayerId, boolean>>((visibility, layer) => {
  visibility[layer.id] = layer.visibleByDefault;
  return visibility;
}, {} as Record<DemoLayerId, boolean>);

const selectedObjectSourceId = "geoai-selected-object";
const hoverObjectSourceId = "geoai-hover-object";
const openGeodataSourceId = "geoai-open-geodata-baseline";
const openGeodataLayerIds = ["geoai-open-landuse", "geoai-open-roads", "geoai-open-poi"];
const uploadedDatasetSourceId = "geoai-uploaded-datasets";
const uploadedDatasetLayerIds = ["geoai-uploaded-fill", "geoai-uploaded-line", "geoai-uploaded-circle"];
const plannedLayerRows = [
  "DLD / Dubai Pulse market data",
  "Dubai Municipality / GeoDubai GIS",
  "OSM / Geofabrik infrastructure",
  "Customer parcels / portfolio upload"
];

function getSourceId(layer: DemoLayer) {
  return `geoai-${layer.id}`;
}

function getLayerIds(layer: DemoLayer) {
  if (layer.type === "polygon") {
    return [`${layer.id}-fill`, `${layer.id}-outline`];
  }

  if (layer.type === "line") {
    return [`${layer.id}-line`];
  }

  return [`${layer.id}-circle`];
}

function getInteractiveLayerIds(visibility: Record<DemoLayerId, boolean>, uploadedDatasets: UploadedDataset[] = []) {
  const hasVisibleUploadedLayers = uploadedDatasets.some(
    (dataset) => dataset.type === "geojson" && dataset.status === "parsed" && dataset.visible !== false
  );

  return [
    ...openGeodataLayerIds,
    ...(hasVisibleUploadedLayers ? uploadedDatasetLayerIds : []),
    ...demoLayers.flatMap((layer) => (visibility[layer.id] ? getLayerIds(layer) : []))
  ];
}

function toFeatureCollection(features: unknown[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features as GeoJSON.Feature[]
  };
}

function toDemoGeometryType(geometryType: GeoJSON.Geometry["type"]): DemoLayerType {
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return "point";
  }

  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return "line";
  }

  return "polygon";
}

function collectGeometryCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates as [number, number][];
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates.flat(1) as [number, number][];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2) as [number, number][];
  return [];
}

function getGeometryCenter(geometry: GeoJSON.Geometry, fallback: SelectedPoint): SelectedPoint {
  const coordinates = collectGeometryCoordinates(geometry);
  if (coordinates.length === 0) {
    return fallback;
  }

  const total = coordinates.reduce(
    (sum, coordinate) => ({
      longitude: sum.longitude + coordinate[0],
      latitude: sum.latitude + coordinate[1]
    }),
    { longitude: 0, latitude: 0 }
  );

  return {
    longitude: total.longitude / coordinates.length,
    latitude: total.latitude / coordinates.length
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFeatureLabel(feature: DemoLayerFeature) {
  return {
    title: feature.properties.name,
    type: `${feature.properties.category} · ${feature.properties.objectType}`,
    source: `${feature.properties.sourceMode.replace(/_/g, "-")} · ${feature.properties.confidenceLevel} confidence`,
    relevance: feature.properties.relevance
  };
}

function getBasemapContextFeature(features: MapboxGeoJSONFeature[] = []) {
  return features.find((feature) => {
    const layerId = feature.layer?.id ?? "";
    const name = feature.properties?.name_en ?? feature.properties?.name;

    if (!name || layerId.startsWith("geoai-")) {
      return false;
    }

    return (
      layerId.includes("label") ||
      layerId.includes("road") ||
      layerId.includes("poi") ||
      layerId.includes("place") ||
      layerId.includes("building")
    );
  });
}

function getBasemapContextType(layerId: string) {
  if (layerId.includes("road")) return "road / access context";
  if (layerId.includes("poi")) return "POI / landmark context";
  if (layerId.includes("place")) return "place label context";
  if (layerId.includes("building")) return "building context";
  return "basemap context";
}

function openRoadToFeature(road: OpenRoadFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: road.id,
    properties: {
      id: road.id,
      name: road.name,
      openFeatureKind: "road",
      category: "Open geospatial baseline",
      subtype: road.roadClass,
      sourceMode: road.sourceMode,
      confidenceLevel: road.confidence,
      relevance: "Accessibility and road access context.",
      clickPriority: 30,
      layerOrder: 15
    },
    geometry: road.geometry
  };
}

function openPoiToFeature(poi: OpenPoiFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: poi.id,
    properties: {
      id: poi.id,
      name: poi.name,
      openFeatureKind: "poi",
      category: "Open geospatial baseline",
      subtype: poi.subcategory,
      sourceMode: poi.sourceMode,
      confidenceLevel: poi.confidence,
      relevance: `${poi.category.replace(/_/g, " ")} anchor context.`,
      clickPriority: 88,
      layerOrder: 75
    },
    geometry: {
      type: "Point",
      coordinates: [poi.coordinates.longitude, poi.coordinates.latitude]
    }
  };
}

function openLanduseToFeature(landuse: OpenLanduseFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: landuse.id,
    properties: {
      id: landuse.id,
      name: landuse.name,
      openFeatureKind: "landuse",
      category: "Open geospatial baseline",
      subtype: landuse.landuseClass.replace(/_/g, " "),
      sourceMode: landuse.sourceMode,
      confidenceLevel: landuse.confidence,
      relevance: "Indicative landuse context from local OSM-style fixture.",
      clickPriority: 18,
      layerOrder: 12
    },
    geometry: landuse.geometry
  };
}

function getOpenGeodataFeatures() {
  return [
    ...openGeodataBaseline.landuse.map(openLanduseToFeature),
    ...openGeodataBaseline.roads.map(openRoadToFeature),
    ...openGeodataBaseline.poi.map(openPoiToFeature)
  ];
}

function getUploadedGeojsonFeatures(uploadedDatasets: UploadedDataset[] = []) {
  return uploadedDatasets
    .filter((dataset) => dataset.type === "geojson" && dataset.status === "parsed" && dataset.visible !== false)
    .flatMap((dataset) =>
      (dataset.geojson?.features ?? []).map((feature, index) => ({
        ...feature,
        id: feature.id ?? `${dataset.id}-feature-${index}`,
        properties: {
          ...(feature.properties ?? {}),
          id: String(feature.id ?? feature.properties?.id ?? `${dataset.id}-feature-${index}`),
          name: String(feature.properties?.name ?? feature.properties?.site_name ?? feature.properties?.area_name ?? `${dataset.name} feature ${index + 1}`),
          uploadedDatasetId: dataset.id,
          uploadedDatasetName: dataset.name,
          uploadedFeatureKind: "user-uploaded",
          sourceMode: dataset.sourceMode,
          confidenceLevel: dataset.confidence,
          officialStatus: dataset.officialStatus,
          fillColor: "#6b7fd7",
          strokeColor: "#3447a5",
          clickPriority: 82,
          layerOrder: 82
        }
      }))
    );
}

function sortRenderedFeatures(features: MapboxGeoJSONFeature[] = []) {
  return [...features].sort((a, b) => {
    const priorityA = Number(a.properties?.clickPriority ?? 0);
    const priorityB = Number(b.properties?.clickPriority ?? 0);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    return Number(b.properties?.layerOrder ?? 0) - Number(a.properties?.layerOrder ?? 0);
  });
}

function setHoverTooltip(
  popup: MapboxPopup | null,
  lngLat: { lng: number; lat: number },
  feature: DemoLayerFeature,
  map: MapboxMap
) {
  if (!popup) {
    return;
  }

  const label = getFeatureLabel(feature);
  popup
    .setLngLat(lngLat)
    .setHTML(
      `<div class="geoai-map-tooltip">
        <div class="geoai-map-tooltip-title">${escapeHtml(label.title)}</div>
        <div class="geoai-map-tooltip-detail">${escapeHtml(label.type)}</div>
        <div class="geoai-map-tooltip-source">${escapeHtml(label.source)}</div>
        <div class="geoai-map-tooltip-note">${escapeHtml(label.relevance)}</div>
      </div>`
    )
    .addTo(map);
}

function setBasemapTooltip(
  popup: MapboxPopup | null,
  lngLat: { lng: number; lat: number },
  feature: MapboxGeoJSONFeature,
  map: MapboxMap
) {
  if (!popup) {
    return;
  }

  const title = String(feature.properties?.name_en ?? feature.properties?.name ?? "Basemap context");
  const layerId = feature.layer?.id ?? "basemap";
  const detail = getBasemapContextType(layerId);

  popup
    .setLngLat(lngLat)
    .setHTML(
      `<div class="geoai-map-tooltip">
        <div class="geoai-map-tooltip-title">${escapeHtml(title)}</div>
        <div class="geoai-map-tooltip-detail">${escapeHtml(detail)}</div>
        <div class="geoai-map-tooltip-source">live basemap</div>
      </div>`
    )
    .addTo(map);
}

function setOpenGeodataTooltip(
  popup: MapboxPopup | null,
  lngLat: { lng: number; lat: number },
  feature: MapboxGeoJSONFeature,
  map: MapboxMap
) {
  if (!popup) {
    return;
  }

  const title = String(feature.properties?.name ?? "Open geospatial context");
  const detail = `${String(feature.properties?.subtype ?? "context")} · ${String(feature.properties?.category ?? "Open geospatial baseline")}`;
  const source = `${String(feature.properties?.sourceMode ?? "open_geodata_sample").replace(/_/g, "-")} · ${String(feature.properties?.confidenceLevel ?? "sample")} confidence`;
  const note = String(feature.properties?.relevance ?? "Open baseline context.");

  popup
    .setLngLat(lngLat)
    .setHTML(
      `<div class="geoai-map-tooltip">
        <div class="geoai-map-tooltip-title">${escapeHtml(title)}</div>
        <div class="geoai-map-tooltip-detail">${escapeHtml(detail)}</div>
        <div class="geoai-map-tooltip-source">${escapeHtml(source)}</div>
        <div class="geoai-map-tooltip-note">${escapeHtml(note)}</div>
      </div>`
    )
    .addTo(map);
}

function setUploadedDatasetTooltip(
  popup: MapboxPopup | null,
  lngLat: { lng: number; lat: number },
  feature: MapboxGeoJSONFeature,
  map: MapboxMap
) {
  if (!popup) {
    return;
  }

  const title = String(feature.properties?.name ?? "Uploaded spatial feature");
  const datasetName = String(feature.properties?.uploadedDatasetName ?? "User-uploaded dataset");
  const source = `${String(feature.properties?.sourceMode ?? "user-uploaded").replace(/-/g, " ")} · ${String(feature.properties?.confidenceLevel ?? "user-provided")}`;
  const note = `Local-only ${datasetName}; official validation required.`;

  popup
    .setLngLat(lngLat)
    .setHTML(
      `<div class="geoai-map-tooltip">
        <div class="geoai-map-tooltip-title">${escapeHtml(title)}</div>
        <div class="geoai-map-tooltip-detail">${escapeHtml(datasetName)}</div>
        <div class="geoai-map-tooltip-source">${escapeHtml(source)}</div>
        <div class="geoai-map-tooltip-note">${escapeHtml(note)}</div>
      </div>`
    )
    .addTo(map);
}

function getFallbackPoint(clientX: number, clientY: number, rect: DOMRect): SelectedPoint {
  const xRatio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const yRatio = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);

  return {
    latitude: 25.45 - yRatio * 0.72,
    longitude: 54.85 + xRatio * 0.78
  };
}

function getFallbackMarkerStyle(selectedPoint: SelectedPoint) {
  const left = ((selectedPoint.longitude - 54.85) / 0.78) * 100;
  const top = ((25.45 - selectedPoint.latitude) / 0.72) * 100;

  return {
    left: `${Math.min(Math.max(left, 0), 100)}%`,
    top: `${Math.min(Math.max(top, 0), 100)}%`
  };
}

function addDemoLayerToMap(map: MapboxMap, layer: DemoLayer) {
  const sourceId = getSourceId(layer);

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: toFeatureCollection(layer.features)
    });
  }

  if (layer.type === "polygon") {
    if (!map.getLayer(`${layer.id}-fill`)) {
      map.addLayer({
        id: `${layer.id}-fill`,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": layer.color,
          "fill-opacity": layer.style.fillOpacity
        },
        minzoom: layer.minZoom,
        maxzoom: layer.maxZoom
      });
    }

    if (!map.getLayer(`${layer.id}-outline`)) {
      map.addLayer({
        id: `${layer.id}-outline`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": layer.color,
          "line-width": layer.style.strokeWidth,
          "line-opacity": layer.style.strokeOpacity
        },
        minzoom: layer.minZoom,
        maxzoom: layer.maxZoom
      });
    }
  }

  if (layer.type === "point" && !map.getLayer(`${layer.id}-circle`)) {
    map.addLayer({
      id: `${layer.id}-circle`,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-color": layer.color,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, Math.max((layer.style.pointRadius ?? 5.2) - 1.2, 3.8), 13, layer.style.pointRadius ?? 5.2],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": layer.style.strokeWidth,
        "circle-opacity": layer.style.fillOpacity
      },
      minzoom: layer.minZoom,
      maxzoom: layer.maxZoom
    });
  }

  if (layer.type === "line" && !map.getLayer(`${layer.id}-line`)) {
    map.addLayer({
      id: `${layer.id}-line`,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": layer.color,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, Math.max(layer.style.strokeWidth - 0.8, 1.6), 13, layer.style.strokeWidth],
        "line-opacity": layer.style.strokeOpacity,
        ...(layer.style.lineDasharray ? { "line-dasharray": layer.style.lineDasharray } : {})
      },
      minzoom: layer.minZoom,
      maxzoom: layer.maxZoom
    });
  }
}

function addOpenGeodataLayers(map: MapboxMap) {
  if (!map.getSource(openGeodataSourceId)) {
    map.addSource(openGeodataSourceId, {
      type: "geojson",
      data: toFeatureCollection(getOpenGeodataFeatures())
    });
  }

  if (!map.getLayer("geoai-open-landuse")) {
    map.addLayer({
      id: "geoai-open-landuse",
      type: "fill",
      source: openGeodataSourceId,
      filter: ["==", ["get", "openFeatureKind"], "landuse"],
      paint: {
        "fill-color": [
          "match",
          ["get", "subtype"],
          "tourism waterfront",
          "#7fb8c9",
          "mixed use",
          "#8aa98c",
          "industrial logistics",
          "#b99b70",
          "#9bb5a6"
        ],
        "fill-opacity": 0.055
      },
      minzoom: 9.1
    });
  }

  if (!map.getLayer("geoai-open-roads")) {
    map.addLayer({
      id: "geoai-open-roads",
      type: "line",
      source: openGeodataSourceId,
      filter: ["==", ["get", "openFeatureKind"], "road"],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#536d7a",
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          0.28,
          12,
          0.46
        ],
        "line-width": ["match", ["get", "subtype"], "motorway", 2.2, "trunk", 2, "primary", 1.8, 1.25]
      },
      minzoom: 8.8
    });
  }

  if (!map.getLayer("geoai-open-poi")) {
    map.addLayer({
      id: "geoai-open-poi",
      type: "circle",
      source: openGeodataSourceId,
      filter: ["==", ["get", "openFeatureKind"], "poi"],
      paint: {
        "circle-color": "#1f6b83",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.3, 13, 5],
        "circle-opacity": 0.72,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.1
      },
      minzoom: 9.6
    });
  }
}

function addUploadedDatasetLayers(map: MapboxMap, uploadedDatasets: UploadedDataset[] = []) {
  const features = getUploadedGeojsonFeatures(uploadedDatasets);

  if (!map.getSource(uploadedDatasetSourceId)) {
    map.addSource(uploadedDatasetSourceId, {
      type: "geojson",
      data: toFeatureCollection(features)
    });
  } else {
    const source = map.getSource(uploadedDatasetSourceId) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(features));
  }

  if (!map.getLayer("geoai-uploaded-fill")) {
    map.addLayer({
      id: "geoai-uploaded-fill",
      type: "fill",
      source: uploadedDatasetSourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#6b7fd7",
        "fill-opacity": 0.16
      },
      minzoom: 8
    });
  }

  if (!map.getLayer("geoai-uploaded-line")) {
    map.addLayer({
      id: "geoai-uploaded-line",
      type: "line",
      source: uploadedDatasetSourceId,
      paint: {
        "line-color": "#3447a5",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.6, 13, 2.5],
        "line-opacity": 0.74
      },
      minzoom: 8
    });
  }

  if (!map.getLayer("geoai-uploaded-circle")) {
    map.addLayer({
      id: "geoai-uploaded-circle",
      type: "circle",
      source: uploadedDatasetSourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#5b66c7",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 13, 7],
        "circle-opacity": 0.82,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.7
      },
      minzoom: 8
    });
  }
}

function syncUploadedDatasetSource(map: MapboxMap, uploadedDatasets: UploadedDataset[] = []) {
  const source = map.getSource(uploadedDatasetSourceId) as GeoJSONSource | undefined;
  source?.setData(toFeatureCollection(getUploadedGeojsonFeatures(uploadedDatasets)));
}

function addSelectedObjectLayer(map: MapboxMap) {
  if (!map.getSource(selectedObjectSourceId)) {
    map.addSource(selectedObjectSourceId, {
      type: "geojson",
      data: toFeatureCollection([])
    });
  }

  if (!map.getLayer("geoai-selected-fill")) {
    map.addLayer({
      id: "geoai-selected-fill",
      type: "fill",
      source: selectedObjectSourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#174f63"],
        "fill-opacity": 0.3
      }
    });
  }

  if (!map.getLayer("geoai-selected-line")) {
    map.addLayer({
      id: "geoai-selected-line",
      type: "line",
      source: selectedObjectSourceId,
      paint: {
        "line-color": ["coalesce", ["get", "strokeColor"], "#0b5a6e"],
        "line-width": 3,
        "line-opacity": 0.96,
        "line-blur": 0.2
      }
    });
  }

  if (!map.getLayer("geoai-selected-circle")) {
    map.addLayer({
      id: "geoai-selected-circle",
      type: "circle",
      source: selectedObjectSourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["coalesce", ["get", "fillColor"], "#0f5f76"],
        "circle-radius": 8.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3
      }
    });
  }
}

function addHoverObjectLayer(map: MapboxMap) {
  if (!map.getSource(hoverObjectSourceId)) {
    map.addSource(hoverObjectSourceId, {
      type: "geojson",
      data: toFeatureCollection([])
    });
  }

  if (!map.getLayer("geoai-hover-fill")) {
    map.addLayer({
      id: "geoai-hover-fill",
      type: "fill",
      source: hoverObjectSourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#174f63"],
        "fill-opacity": 0.19
      }
    });
  }

  if (!map.getLayer("geoai-hover-line")) {
    map.addLayer({
      id: "geoai-hover-line",
      type: "line",
      source: hoverObjectSourceId,
      paint: {
        "line-color": ["coalesce", ["get", "strokeColor"], "#0f5f76"],
        "line-width": 1.8,
        "line-opacity": 0.82
      }
    });
  }

  if (!map.getLayer("geoai-hover-circle")) {
    map.addLayer({
      id: "geoai-hover-circle",
      type: "circle",
      source: hoverObjectSourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["coalesce", ["get", "fillColor"], "#0f5f76"],
        "circle-radius": 7.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    });
  }
}

function syncLayerVisibility(map: MapboxMap, visibility: Record<DemoLayerId, boolean>) {
  demoLayers.forEach((layer) => {
    const layerVisibility = visibility[layer.id] ? "visible" : "none";
    getLayerIds(layer).forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", layerVisibility);
      }
    });
  });
}

function syncSelectedObjectSource(map: MapboxMap, selectedObject: SelectedDemoObject | null) {
  const source = map.getSource(selectedObjectSourceId) as GeoJSONSource | undefined;
  const selectedFeature = selectedObject ? getDemoFeatureById(selectedObject.id) : null;
  const analysisTargetFeature = selectedObject?.analysisTarget?.geometry
    ? {
        type: "Feature",
        id: selectedObject.analysisTarget.id,
        properties: {
          id: selectedObject.analysisTarget.id,
          name: selectedObject.analysisTarget.label,
          fillColor: selectedObject.analysisTarget.type === "uploaded-feature" ? "#6b7fd7" : "#174f63",
          strokeColor: selectedObject.analysisTarget.type === "uploaded-feature" ? "#3447a5" : "#0b5a6e"
        },
        geometry: selectedObject.analysisTarget.geometry
      }
    : null;
  source?.setData(toFeatureCollection(selectedFeature ? [selectedFeature] : analysisTargetFeature ? [analysisTargetFeature] : []));
}

function attachGeoAiMapLayers(
  map: MapboxMap,
  visibility: Record<DemoLayerId, boolean>,
  selectedObject: SelectedDemoObject | null,
  uploadedDatasets: UploadedDataset[] = []
) {
  addOpenGeodataLayers(map);
  addUploadedDatasetLayers(map, uploadedDatasets);
  demoLayers.forEach((layer) => addDemoLayerToMap(map, layer));
  addSelectedObjectLayer(map);
  addHoverObjectLayer(map);
  syncLayerVisibility(map, visibility);
  syncSelectedObjectSource(map, selectedObject);
  syncUploadedDatasetSource(map, uploadedDatasets);
}

export function MapWorkspaceClient({
  selectedPoint,
  selectedObject = null,
  onPointSelect,
  onObjectSelect,
  className = "relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#dfe8ec]",
  showEmptyOverlay = true,
  showLayerControls = true,
  uploadedDatasets = []
}: MapWorkspaceClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const hoverPopupRef = useRef<MapboxPopup | null>(null);
  const onPointSelectRef = useRef(onPointSelect);
  const onObjectSelectRef = useRef(onObjectSelect);
  const selectedObjectRef = useRef<SelectedDemoObject | null>(selectedObject);
  const layerVisibilityRef = useRef(initialLayerVisibility);
  const uploadedDatasetsRef = useRef<UploadedDataset[]>(uploadedDatasets);
  const [layerVisibility, setLayerVisibility] = useState(initialLayerVisibility);
  const [layersExpanded, setLayersExpanded] = useState(false);
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>("streets");
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapResourceError, setMapResourceError] = useState<string | null>(null);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);

  useEffect(() => {
    onPointSelectRef.current = onPointSelect;
  }, [onPointSelect]);

  useEffect(() => {
    onObjectSelectRef.current = onObjectSelect;
  }, [onObjectSelect]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    uploadedDatasetsRef.current = uploadedDatasets;
  }, [uploadedDatasets]);

  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;
  }, [layerVisibility]);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => String(arg)).join(" ");
      const isMapboxTileError =
        message.includes("api.mapbox.com") ||
        (message.includes("Failed to fetch") && message.toLowerCase().includes("mapbox"));

      if (isMapboxTileError) {
        setMapResourceError(
          "Map tiles could not be loaded. Check the Mapbox token, internet access, or token domain settings."
        );
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function initializeMap() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!isMounted || !mapContainerRef.current || mapRef.current) {
        return;
      }

      setMapResourceError(null);
      mapboxgl.accessToken = mapboxToken;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: basemapOptions[0].styleUrl,
        center: defaultCenter,
        zoom: defaultZoom
      });

      hoverPopupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        className: "geoai-hover-popup"
      });

      mapRef.current.on("error", () => {
        if (!isMounted) {
          return;
        }

        setMapResourceError(
          "Map tiles could not be loaded. Check the Mapbox token, internet access, or token domain settings."
        );
      });

      const handleStyleReady = () => {
        if (isMounted) {
          setMapResourceError(null);
          attachGeoAiMapLayers(
            mapRef.current as MapboxMap,
            layerVisibilityRef.current,
            selectedObjectRef.current,
            uploadedDatasetsRef.current
          );
          window.setTimeout(() => mapRef.current?.resize(), 0);
          setIsMapReady(true);
        }
      };

      mapRef.current.on("load", handleStyleReady);
      mapRef.current.on("style.load", handleStyleReady);

      mapRef.current.on("mousemove", (event) => {
        const interactiveLayers = getInteractiveLayerIds(layerVisibilityRef.current, uploadedDatasetsRef.current).filter((layerId) =>
          Boolean(mapRef.current?.getLayer(layerId))
        );
        const features = interactiveLayers.length > 0
          ? mapRef.current?.queryRenderedFeatures(event.point, { layers: interactiveLayers })
          : [];
        const orderedFeatures = sortRenderedFeatures(features);
        const hoveredFeature = orderedFeatures[0];
        const featureId = hoveredFeature?.properties?.id as string | undefined;
        const demoFeature = featureId ? getDemoFeatureById(featureId) : null;
        const basemapFeature = demoFeature ? null : getBasemapContextFeature(mapRef.current?.queryRenderedFeatures(event.point) ?? []);
        const source = mapRef.current?.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;

        if (source) {
          source.setData(toFeatureCollection(demoFeature ? [demoFeature] : (hoveredFeature?.properties?.openFeatureKind || hoveredFeature?.properties?.uploadedFeatureKind) ? [hoveredFeature] : []));
        }

        if (mapRef.current) {
          const isSelectableOpenPoi = hoveredFeature?.properties?.openFeatureKind === "poi";
          const isUploadedFeature = Boolean(hoveredFeature?.properties?.uploadedFeatureKind);
          mapRef.current.getCanvas().style.cursor = demoFeature || isSelectableOpenPoi || isUploadedFeature ? "pointer" : "";

          if (demoFeature) {
            setHoverTooltip(hoverPopupRef.current, event.lngLat, demoFeature, mapRef.current);
          } else if (hoveredFeature?.properties?.uploadedFeatureKind) {
            setUploadedDatasetTooltip(hoverPopupRef.current, event.lngLat, hoveredFeature, mapRef.current);
          } else if (hoveredFeature?.properties?.openFeatureKind) {
            setOpenGeodataTooltip(hoverPopupRef.current, event.lngLat, hoveredFeature, mapRef.current);
          } else if (basemapFeature) {
            setBasemapTooltip(hoverPopupRef.current, event.lngLat, basemapFeature, mapRef.current);
          } else {
            hoverPopupRef.current?.remove();
          }
        }
      });

      mapRef.current.on("mouseleave", () => {
        const source = mapRef.current?.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;
        source?.setData(toFeatureCollection([]));
        hoverPopupRef.current?.remove();

        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = "";
        }
      });

      mapRef.current.on("click", (event) => {
        const interactiveLayers = getInteractiveLayerIds(layerVisibilityRef.current, uploadedDatasetsRef.current).filter((layerId) =>
          Boolean(mapRef.current?.getLayer(layerId))
        );
        const features = interactiveLayers.length > 0
          ? mapRef.current?.queryRenderedFeatures(event.point, { layers: interactiveLayers })
          : [];
        const orderedFeatures = sortRenderedFeatures(features);
        const selectedRenderedFeature = orderedFeatures[0];
        const featureId = selectedRenderedFeature?.properties?.id as string | undefined;
        const demoFeature = featureId ? getDemoFeatureById(featureId) : null;

        if (demoFeature && onObjectSelectRef.current) {
          onObjectSelectRef.current(getSelectedDemoObject(demoFeature));
          return;
        }

        if (selectedRenderedFeature?.properties?.uploadedFeatureKind && onObjectSelectRef.current) {
          const geometry = selectedRenderedFeature.geometry as GeoJSON.Geometry;
          const center = getGeometryCenter(geometry, {
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng
          });
          const featureName = String(selectedRenderedFeature.properties.name ?? "Uploaded screening geometry");
          const datasetName = String(selectedRenderedFeature.properties.uploadedDatasetName ?? "User-provided GeoJSON");
          const datasetId = String(selectedRenderedFeature.properties.uploadedDatasetId ?? "uploaded-local");

          onObjectSelectRef.current({
            id: `uploaded-${datasetId}-${String(selectedRenderedFeature.properties.id ?? featureName)}`,
            name: featureName,
            type: "Uploaded screening geometry",
            layerId: "futureCustomerAssets",
            layerName: datasetName,
            geometryType: toDemoGeometryType(geometry.type),
            center,
            analysisTarget: {
              id: String(selectedRenderedFeature.properties.id ?? featureName),
              type: "uploaded-feature",
              label: featureName,
              coordinates: center,
              geometry,
              properties: selectedRenderedFeature.properties as Record<string, unknown>,
              datasetId,
              datasetName,
              sourceMode: "user-uploaded",
              officialStatus: "official-validation-required"
            }
          });
          return;
        }

        if (selectedRenderedFeature?.properties?.openFeatureKind === "poi" && onObjectSelectRef.current) {
          const coordinates = selectedRenderedFeature.geometry.type === "Point"
            ? selectedRenderedFeature.geometry.coordinates as [number, number]
            : [event.lngLat.lng, event.lngLat.lat];
          onObjectSelectRef.current({
            id: `open-${String(selectedRenderedFeature.properties.id)}`,
            name: String(selectedRenderedFeature.properties.name ?? "Open baseline anchor"),
            type: String(selectedRenderedFeature.properties.subtype ?? "Open geospatial anchor"),
            layerId: "infrastructureNodes",
            layerName: "Open geospatial baseline",
            geometryType: "point",
            center: {
              longitude: coordinates[0],
              latitude: coordinates[1]
            }
          });
          return;
        }

        onPointSelectRef.current({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng
        });
      });
    }

    void initializeMap();

    return () => {
      isMounted = false;
      setIsMapReady(false);
      markerRef.current?.remove();
      markerRef.current = null;
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, mapboxToken]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    const nextStyle = basemapOptions.find((option) => option.id === basemapStyle) ?? basemapOptions[0];
    const currentStyle = mapRef.current.getStyle();

    if (currentStyle?.sprite?.includes(nextStyle.id) || currentStyle?.name?.toLowerCase().includes(nextStyle.id)) {
      return;
    }

    try {
      mapRef.current.setStyle(nextStyle.styleUrl);
      setMapResourceError(null);
    } catch {
      setMapResourceError("Basemap style could not be loaded. Keeping the current map style.");
    }
  }, [basemapStyle, canUseMapbox, isMapReady]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !selectedPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    let isMounted = true;

    async function updateMarker() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!isMounted || !mapRef.current || !selectedPoint) {
        return;
      }

      const lngLat: [number, number] = [selectedPoint.longitude, selectedPoint.latitude];

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#174f63" })
          .setLngLat(lngLat)
          .addTo(mapRef.current);
        return;
      }

      markerRef.current.setLngLat(lngLat);
    }

    void updateMarker();

    return () => {
      isMounted = false;
    };
  }, [canUseMapbox, selectedPoint]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    window.setTimeout(() => mapRef.current?.resize(), 0);
  }, [canUseMapbox, isMapReady, selectedObject, selectedPoint]);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current) {
      return;
    }

    const resizeMap = () => {
      window.requestAnimationFrame(() => mapRef.current?.resize());
    };
    const observer = new ResizeObserver(resizeMap);

    observer.observe(mapContainerRef.current);
    resizeMap();

    return () => {
      observer.disconnect();
    };
  }, [canUseMapbox]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    syncLayerVisibility(mapRef.current, layerVisibility);

    const hoverSource = mapRef.current.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;
    hoverSource?.setData(toFeatureCollection([]));
  }, [canUseMapbox, isMapReady, layerVisibility]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    syncSelectedObjectSource(mapRef.current, selectedObject);
  }, [canUseMapbox, isMapReady, selectedObject]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    addUploadedDatasetLayers(mapRef.current, uploadedDatasets);
    syncUploadedDatasetSource(mapRef.current, uploadedDatasets);
  }, [canUseMapbox, isMapReady, uploadedDatasets]);

  function handleFallbackClick(event: React.MouseEvent<HTMLElement>) {
    if (canUseMapbox) {
      return;
    }

    onPointSelect(getFallbackPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
  }

  function toggleLayer(layerId: DemoLayerId) {
    setLayerVisibility((currentVisibility) => ({
      ...currentVisibility,
      [layerId]: !currentVisibility[layerId]
    }));
  }

  function setAllLayers(visible: boolean) {
    setLayerVisibility(
      demoLayers.reduce<Record<DemoLayerId, boolean>>((visibility, layer) => {
        visibility[layer.id] = visible;
        return visibility;
      }, {} as Record<DemoLayerId, boolean>)
    );
  }

  const visibleUploadedLayerCount = uploadedDatasets.filter(
    (dataset) => dataset.type === "geojson" && dataset.status === "parsed" && dataset.visible !== false
  ).length;
  const activeLayerCount = Object.values(layerVisibility).filter(Boolean).length + visibleUploadedLayerCount;
  const demoOverlayLayers = demoLayers.filter((layer) => !["planned_official", "customer_future"].includes(layer.sourceMode));
  const uploadedGeojsonDatasets = uploadedDatasets.filter((dataset) => dataset.type === "geojson" && dataset.status === "parsed");

  return (
    <section
      className={className}
      onClick={handleFallbackClick}
    >
      <div ref={mapContainerRef} className="absolute inset-0" aria-label="GeoAI map workspace" />

      {!canUseMapbox ? (
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:42px_42px]">
          {showEmptyOverlay ? (
            <>
              <div className="absolute left-6 top-6 max-w-md rounded-lg border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  Mapbox placeholder
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  Full-screen spatial workspace
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Add `NEXT_PUBLIC_MAPBOX_TOKEN` later to render the live Mapbox
                  basemap. The app stays usable without local environment tokens.
                </p>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/85 px-4 py-3 text-sm text-muted shadow-soft backdrop-blur">
                <span>Dubai / Abu Dhabi demo extent</span>
                <span>Click the map to select a point for express analysis.</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {canUseMapbox && mapResourceError && showEmptyOverlay ? (
        <div className="absolute left-6 top-6 z-10 max-w-md rounded-lg border border-[#f2c6bd] bg-white/95 p-4 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f3412]">
            Map status
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{mapResourceError}</p>
        </div>
      ) : null}

      {canUseMapbox && showEmptyOverlay && !selectedPoint && !mapResourceError ? (
        <div className="absolute left-5 top-5 z-10 max-w-sm rounded-lg border border-white/75 bg-white/92 p-4 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Start here
          </p>
          <ol className="mt-2 space-y-1 text-sm leading-6 text-muted">
            <li>1. Select a point or object on the map</li>
            <li>2. Choose a scenario</li>
            <li>3. Run Express Analysis</li>
          </ol>
        </div>
      ) : null}

      {canUseMapbox && showLayerControls ? (
        <div
          className={`absolute right-5 top-5 z-20 max-w-[calc(100%-40px)] rounded-lg border border-white/75 bg-white/92 shadow-soft backdrop-blur ${layersExpanded ? "flex w-[280px] flex-col overflow-hidden p-2.5" : "w-auto p-0"}`}
          style={{ maxHeight: layersExpanded ? "calc(100% - 112px)" : undefined }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setLayersExpanded((isExpanded) => !isExpanded)}
            className={`flex w-full items-center justify-between gap-3 text-left ${layersExpanded ? "" : "h-10 rounded-lg px-3"}`}
          >
            <div className="min-w-0">
              <p className={`font-semibold uppercase tracking-[0.12em] text-muted ${layersExpanded ? "text-[10px]" : "text-[10px]"}`}>
                Spatial layers
              </p>
              <h2 className={`truncate font-semibold text-ink ${layersExpanded ? "mt-0.5 text-sm" : "text-xs"}`}>
                {layersExpanded ? "Basemap + GeoAI signals" : `Layers · ${activeLayerCount}`}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-brand">
              {activeLayerCount} active
            </span>
          </button>

          {layersExpanded ? (
            <div className="mt-2 min-h-0 overflow-y-auto pr-1">
              <div className="mb-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllLayers(true)}
                  className="h-7 flex-1 rounded-md border border-line bg-white text-[11px] font-semibold text-ink transition hover:border-brand"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setAllLayers(false)}
                  className="h-7 flex-1 rounded-md border border-line bg-white text-[11px] font-semibold text-ink transition hover:border-brand"
                >
                  Hide all
                </button>
              </div>

              <div className="rounded-md border border-line bg-white px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Basemap Context</p>
                    <p className="mt-0.5 text-xs font-semibold text-ink">Roads, coastline, labels</p>
                  </div>
                  <span className="rounded-full bg-[#eaf4ef] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#276749]">
                    live
                  </span>
                </div>
              </div>

              <div className="mt-2 grid gap-1.5">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Open Geospatial Baseline
                </p>
                <div className="rounded-md border border-line bg-white px-2.5 py-2">
                  <div className="grid gap-1 text-[11px] text-muted">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#536d7a]" /><span className="truncate">Roads / access</span></span>
                      <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]">OSM</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1f6b83]" /><span className="truncate">POI / anchors</span></span>
                      <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]">open</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#9bb5a6]" /><span className="truncate">Landuse context</span></span>
                      <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]">sample</span>
                    </div>
                  </div>
                </div>

                <p className="mt-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  GeoAI Demo Analytical Overlays
                </p>
                {demoOverlayLayers.map((layer) => (
                  <label key={layer.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: layer.color }} />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-ink">{layer.legendLabel}</span>
                        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.06em] text-muted">
                          {getLayerSourceModeLabel(layer)}
                        </span>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility[layer.id]}
                      onChange={() => toggleLayer(layer.id)}
                      className="h-4 w-4 accent-[#174f63]"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-2 rounded-md border border-line bg-white px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Uploaded datasets
                  </p>
                  <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-muted">
                    {uploadedGeojsonDatasets.length}
                  </span>
                </div>
                <div className="mt-1.5 grid gap-1">
                  {uploadedGeojsonDatasets.length === 0 ? (
                    <p className="text-[11px] leading-4 text-muted">Upload GeoJSON in Data Sources to render a local layer.</p>
                  ) : (
                    uploadedGeojsonDatasets.map((dataset) => (
                      <div key={dataset.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-[11px] text-muted">
                        <span className="flex min-w-0 items-start gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#6b7fd7]" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{dataset.name}</span>
                            <span className="block truncate text-[9px] uppercase tracking-[0.06em] text-muted">
                              GeoJSON / {dataset.featureCount ?? 0} features / validation required
                            </span>
                          </span>
                        </span>
                        <span className="max-w-[66px] shrink-0 truncate rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-muted">
                          {dataset.visible === false ? "hidden" : "local"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-2 rounded-md border border-line bg-white px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Planned Official / Customer Layers
                </p>
                <div className="mt-1.5 grid gap-1">
                  {plannedLayerRows.map((item) => (
                    <div key={item} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px] text-muted">
                      <span className="min-w-0 truncate">{item}</span>
                      <span className="max-w-[70px] shrink-0 truncate rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-muted">
                        planned
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 rounded-md bg-white px-2.5 py-2 text-[11px] leading-4 text-muted">
                GeoAI overlays are demo-normalized screening layers, not official GIS, parcel, zoning, planning, or risk boundaries.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canUseMapbox ? (
        <div
          className="absolute bottom-5 right-5 z-20 flex max-w-[calc(100%-40px)] gap-1 rounded-lg border border-white/75 bg-white/92 p-1 shadow-soft backdrop-blur"
          onClick={(event) => event.stopPropagation()}
          aria-label="Basemap style switcher"
        >
          {basemapOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setBasemapStyle(option.id)}
              className={`h-8 rounded-md px-2.5 text-[11px] font-semibold transition ${
                basemapStyle === option.id
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {canUseMapbox && selectedObject ? (
        <div className={`pointer-events-none absolute left-5 z-10 max-w-sm rounded-lg border border-white/75 bg-white/92 px-3 py-2 text-sm font-semibold text-ink shadow-soft backdrop-blur ${layersExpanded ? "bottom-20" : "bottom-5"}`}>
          <span className="text-brand">Selected:</span> {selectedObject.name}
        </div>
      ) : null}

      {canUseMapbox && showLayerControls && layersExpanded ? (
        <div
          className="absolute bottom-5 left-5 z-10 flex max-w-[720px] flex-wrap gap-2 rounded-lg border border-white/75 bg-white/90 px-3 py-2 shadow-soft backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          {demoOverlayLayers.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
              <span>{layer.legendLabel}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!canUseMapbox && selectedPoint ? (
        <div
          className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-brand shadow-soft"
          style={getFallbackMarkerStyle(selectedPoint)}
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}

import type { PointObjectCreatePreviewModel } from "./point-to-object-create-preview";

type Position3D = [number, number, number];
export type ConceptCamera = { center: [number, number]; zoom: number; bearing: number; pitch: number };
export type ConceptCameraViewport = { width: number; height: number; fieldOfView: number };
export type ConceptScreenBounds = { left: number; right: number; top: number; bottom: number };
const RAD = Math.PI / 180;
// Match the pinned MapLibre Mercator renderer's mean Earth radius and tile size.
const CIRCUMFERENCE = 2 * Math.PI * 6371008.8;
const mercatorY = (latitude: number) => (1 - Math.log(Math.tan(Math.PI / 4 + latitude * RAD / 2)) / Math.PI) / 2;
const latitudeFromY = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / RAD;

function positions(model: PointObjectCreatePreviewModel): Position3D[] {
  return [
    ...model.aoiFeature.geometry.coordinates.flat().map(([x, y]): Position3D => [x, y, 0]),
    ...model.massingFeatureCollection.features.flatMap(feature => feature.geometry.coordinates.flat().flatMap(([x, y]): Position3D[] =>
      [[x, y, feature.properties.baseM], [x, y, feature.properties.heightM]]))
  ];
}

/** Mercator perspective at zero roll/terrain; heights remain actual saved metres. */
export function projectConceptPosition(position: Position3D, camera: ConceptCamera, viewport: ConceptCameraViewport): [number, number] | null {
  const worldSize = 512 * 2 ** camera.zoom;
  const dx = (position[0] - camera.center[0]) / 360 * worldSize;
  const dy = (mercatorY(position[1]) - mercatorY(camera.center[1])) * worldSize;
  const bearing = camera.bearing * RAD, pitch = camera.pitch * RAD;
  const x = Math.cos(bearing) * dx + Math.sin(bearing) * dy;
  const y = -Math.sin(bearing) * dx + Math.cos(bearing) * dy;
  const z = position[2] * worldSize / (CIRCUMFERENCE * Math.cos(camera.center[1] * RAD));
  const distance = viewport.height / 2 / Math.tan(viewport.fieldOfView * RAD / 2);
  const depth = distance - Math.sin(pitch) * y - Math.cos(pitch) * z;
  if (!Number.isFinite(depth) || depth < distance * 0.02) return null;
  return [viewport.width / 2 + x * distance / depth,
    viewport.height / 2 + (Math.cos(pitch) * y - Math.sin(pitch) * z) * distance / depth];
}

function envelope(points: Position3D[], camera: ConceptCamera, viewport: ConceptCameraViewport): ConceptScreenBounds | null {
  const projected = points.map(point => projectConceptPosition(point, camera, viewport));
  if (projected.some(point => !point || !point.every(Number.isFinite))) return null;
  const valid = projected as Array<[number, number]>;
  return { left: Math.min(...valid.map(p => p[0])), right: Math.max(...valid.map(p => p[0])),
    top: Math.min(...valid.map(p => p[1])), bottom: Math.max(...valid.map(p => p[1])) };
}

export function conceptSceneScreenBounds(model: PointObjectCreatePreviewModel, camera: ConceptCamera, viewport: ConceptCameraViewport) {
  return envelope(positions(model), camera, viewport);
}

/** Fit the full 3D envelope, not an unpitched geographic bbox plus fixed zoom-out. */
export function fitConceptCamera(model: PointObjectCreatePreviewModel, viewport: ConceptCameraViewport,
  orientation: { bearing: number; pitch: number }, maxZoom = 22): (ConceptCamera & { screenBounds: ConceptScreenBounds }) | null {
  if (![viewport.width, viewport.height, viewport.fieldOfView, maxZoom, orientation.bearing, orientation.pitch].every(Number.isFinite) ||
    viewport.width < 100 || viewport.height < 160 || viewport.fieldOfView <= 0 || viewport.fieldOfView >= 90 ||
    orientation.pitch < 0 || orientation.pitch > 60 || maxZoom < 0 || maxZoom > 24) return null;
  const points = positions(model);
  if (!points.length || points.some(p => !p.every(Number.isFinite) || Math.abs(p[1]) > 85 || p[2] < 0)) return null;
  const targetHeight = Math.min(viewport.height * 0.72, viewport.height - 100);
  const centerY = viewport.height / 2 - 25; // reserve the lower camera-control strip
  const target = { left: viewport.width * 0.14, right: viewport.width * 0.86,
    top: centerY - targetHeight / 2, bottom: centerY + targetHeight / 2 };
  const evaluate = (zoom: number) => {
    const camera: ConceptCamera = { center: [...model.center], zoom, ...orientation };
    // Recenter the actual perspective envelope, including roofs. This is a pure
    // search: it never jumps the visible map through intermediate camera states.
    for (let iteration = 0; iteration < 6; iteration++) {
      const bounds = envelope(points, camera, viewport);
      if (!bounds) return null;
      const dx = (bounds.left + bounds.right) / 2 - viewport.width / 2;
      const dy = ((bounds.top + bounds.bottom) / 2 - centerY) / Math.cos(camera.pitch * RAD);
      const bearing = camera.bearing * RAD, worldSize = 512 * 2 ** zoom;
      camera.center = [camera.center[0] + (Math.cos(bearing) * dx - Math.sin(bearing) * dy) / worldSize * 360,
        latitudeFromY(mercatorY(camera.center[1]) + (Math.sin(bearing) * dx + Math.cos(bearing) * dy) / worldSize)];
    }
    const bounds = envelope(points, camera, viewport);
    return bounds && bounds.left >= target.left && bounds.right <= target.right && bounds.top >= target.top && bounds.bottom <= target.bottom
      ? { ...camera, screenBounds: bounds } : null;
  };
  let lower = 0, upper = maxZoom, best = evaluate(lower);
  for (let iteration = 0; iteration < 22; iteration++) {
    const middle = (lower + upper) / 2, candidate = evaluate(middle);
    if (candidate) { lower = middle; best = candidate; } else upper = middle;
  }
  return best;
}

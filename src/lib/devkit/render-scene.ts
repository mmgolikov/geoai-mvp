/** Pure, offline SVG views of saved canonical geometry. No source fetch or generative imagery. */
export const DEVKIT_RENDER_VERSION = "canonical-svg-1";

export function escapeExportText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export type ExportPolygon = { type: "Polygon"; coordinates: number[][][] };
export type ExportSceneBuilding = {
  id: string;
  footprint: ExportPolygon;
  floors: number | null;
  heightM: number | null;
  floorHeightM?: number | null;
  topFloorFootprint?: ExportPolygon | null;
  use?: string | null;
};
export type ExportCanonicalScene = {
  projectId: string;
  snapshotId: string;
  variantId: string;
  revisionId: string;
  geometryCrs: "EPSG:4326";
  aoi: { id: string; revisionId: string; geometry: ExportPolygon };
  buildings: ExportSceneBuilding[];
  preservedBuildings: ExportSceneBuilding[];
  exclusionZones: { id: string; geometry: ExportPolygon; reason: string }[];
};

function validPolygon(polygon: ExportPolygon): boolean {
  return polygon?.type === "Polygon" && Array.isArray(polygon.coordinates) && polygon.coordinates.length > 0 && polygon.coordinates.length <= 100 && polygon.coordinates.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.length <= 10000 && ring.every(point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90) && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]);
}

/** The caller adapts an already validated scene; unknown coordinates/heights never become precise quantities. */
export function renderCanonicalScene(scene: ExportCanonicalScene, options: { locale?: "en" | "ru"; view?: "plan" | "axonometric" } = {}): string {
  const ru = options.locale === "ru", plan = options.view === "plan";
  if (scene.geometryCrs !== "EPSG:4326" || !scene.projectId || !scene.snapshotId || !scene.revisionId || !validPolygon(scene.aoi.geometry) || scene.buildings.length + scene.preservedBuildings.length > 500 || scene.exclusionZones.length > 500) throw new Error("DEVKIT_RENDER_INVALID_SCENE");
  const allBuildings = [...scene.buildings, ...scene.preservedBuildings];
  for (const building of allBuildings) {
    if (!building.id || !validPolygon(building.footprint) || (building.topFloorFootprint && !validPolygon(building.topFloorFootprint)) || (building.heightM !== null && (!Number.isFinite(building.heightM) || building.heightM < 0 || building.heightM > 2000)) || (building.floorHeightM != null && (!Number.isFinite(building.floorHeightM) || building.floorHeightM <= 0)) || (building.floors !== null && (!Number.isInteger(building.floors) || building.floors < 0 || building.floors > 500))) throw new Error("DEVKIT_RENDER_INVALID_BUILDING");
  }
  if (scene.exclusionZones.some(zone => !validPolygon(zone.geometry))) throw new Error("DEVKIT_RENDER_INVALID_EXCLUSION");
  const origin = scene.aoi.geometry.coordinates[0][0];
  const cosine = Math.cos(origin[1] * Math.PI / 180);
  if (Math.abs(cosine) < 0.01) throw new Error("DEVKIT_RENDER_UNSUPPORTED_LATITUDE");
  const project = (point: number[], z = 0): [number, number] => {
    const x = (point[0] - origin[0]) * 111320 * cosine, y = (point[1] - origin[1]) * 110574;
    return plan ? [x, -y] : [(x - y) * 0.8660254, -(x + y) * 0.5 - z];
  };
  const points: [number, number][] = [];
  const include = (polygon: ExportPolygon, z = 0) => polygon.coordinates.forEach(ring => ring.forEach(point => points.push(project(point, z))));
  include(scene.aoi.geometry);
  scene.exclusionZones.forEach(zone => include(zone.geometry));
  allBuildings.forEach(building => { include(building.footprint); include(building.footprint, building.heightM ?? 0); if (building.topFloorFootprint) include(building.topFloorFootprint, building.heightM ?? 0); });
  const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX - minX < 0.001 || maxY - minY < 0.001 || maxX - minX > 100000 || maxY - minY > 100000) throw new Error("DEVKIT_RENDER_INVALID_EXTENT");
  const scale = Math.min(820 / (maxX - minX), 390 / (maxY - minY));
  const screen = (point: number[], z = 0) => { const [x, y] = project(point, z); return [60 + (x - minX) * scale, 65 + (y - minY) * scale]; };
  const fmt = (value: number) => value.toFixed(2);
  const path = (polygon: ExportPolygon, z = 0) => polygon.coordinates.map(ring => ring.map((point, index) => `${index ? "L" : "M"}${screen(point, z).map(fmt).join(",")}`).join(" ") + " Z").join(" ");
  const title = `${ru ? "Вариант" : "Variant"} ${scene.variantId} · ${plan ? (ru ? "план" : "plan") : (ru ? "объёмная схема" : "axonometric")}`;
  const shapes = [`<path d="${path(scene.aoi.geometry)}" fill="#eef6f6" stroke="#147d85" stroke-width="2" fill-rule="evenodd"/>`];
  scene.exclusionZones.forEach(zone => shapes.push(`<path d="${path(zone.geometry)}" fill="#fef3c7" stroke="#a16207" stroke-dasharray="6 4" fill-rule="evenodd"><title>${escapeExportText(`${zone.id}: ${zone.reason}`)}</title></path>`));
  const ordered = allBuildings.map((building, index) => ({ building, preserved: index >= scene.buildings.length })).sort((a, b) => project(a.building.footprint.coordinates[0][0])[1] - project(b.building.footprint.coordinates[0][0])[1]);
  for (const { building, preserved } of ordered) {
    const height = building.heightM ?? 0, ring = building.footprint.coordinates[0];
    const terrace = building.topFloorFootprint && building.floorHeightM != null && building.floors !== null && JSON.stringify(building.topFloorFootprint) !== JSON.stringify(building.footprint);
    const lowerRoof = terrace ? Math.max(0, height - building.floorHeightM!) : height;
    const sides = (polygon: ExportPolygon, base: number, top: number) => {
      const edge = polygon.coordinates[0];
      for (let index = 0; index < edge.length - 1; index++) {
        const corners = [screen(edge[index], base), screen(edge[index + 1], base), screen(edge[index + 1], top), screen(edge[index], top)].map(point => point.map(fmt).join(",")).join(" ");
        shapes.push(`<polygon points="${corners}" fill="${preserved ? "#c8ced6" : "#b9d8da"}" stroke="#607987" stroke-width="0.7"/>`);
      }
    };
    if (!plan && lowerRoof > 0) sides(building.footprint, 0, lowerRoof);
    if (terrace) {
      shapes.push(`<path d="${path(building.footprint, plan ? 0 : lowerRoof)}" fill="#e4eee0" stroke="#607987" fill-rule="evenodd"/>`);
      if (!plan) sides(building.topFloorFootprint!, lowerRoof, height);
    }
    const roof = building.topFloorFootprint ?? building.footprint;
    shapes.push(`<path d="${path(roof, plan ? 0 : height)}" fill="${preserved ? "#e2e6ec" : "#d5e8e9"}" stroke="#496573" fill-rule="evenodd"><title>${escapeExportText(`${building.id} · ${building.use ?? (ru ? "назначение неизвестно" : "use unknown")} · ${building.floors ?? "?"} ${ru ? "этажей" : "floors"} · ${building.heightM ?? "?"} m`)}</title></path>`);
    const center = ring.slice(0, -1).reduce((sum, point) => [sum[0] + point[0] / (ring.length - 1), sum[1] + point[1] / (ring.length - 1)], [0, 0]);
    const label = screen(center, plan ? 0 : height);
    const shortId = building.id.match(/(?:building|block|tower)-\d+$/)?.[0] ?? (building.id.length > 24 ? `${building.id.slice(0, 10)}…${building.id.slice(-10)}` : building.id);
    shapes.push(`<text x="${fmt(label[0])}" y="${fmt(label[1])}" text-anchor="middle" font-size="11" fill="#173544" stroke="#fff" stroke-width="3" paint-order="stroke"><title>${escapeExportText(building.id)}</title>${escapeExportText(shortId)} · ${building.floors ?? "?"}F</text>`);
  }
  const disclaimer = ru ? "Схема из сохранённой геометрии; приближённая проекция; не обмер и не BIM." : "Saved geometry schematic; approximate projection; not a survey or BIM.";
  const metadata = { renderer: DEVKIT_RENDER_VERSION, projectId: scene.projectId, snapshotId: scene.snapshotId, variantId: scene.variantId, revisionId: scene.revisionId, aoiRevisionId: scene.aoi.revisionId, geometryCrs: scene.geometryCrs, view: plan ? "plan" : "axonometric", unknownHeightBuildingIds: allBuildings.filter(building => building.heightM === null).map(building => building.id) };
  const footer = `${scene.snapshotId} · ${scene.revisionId}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560" role="img" aria-labelledby="scene-title scene-description"><title id="scene-title">${escapeExportText(title)}</title><desc id="scene-description">${escapeExportText(disclaimer)}</desc><metadata>${escapeExportText(JSON.stringify(metadata))}</metadata><rect width="960" height="560" fill="#fff"/><g font-family="Arial, sans-serif"><text x="32" y="30" font-size="20" fill="#173544">${escapeExportText(title)}</text>${shapes.join("")}<text x="32" y="505" font-size="12" fill="#45586b">${escapeExportText(disclaimer)}</text><text x="32" y="526" font-size="10" fill="#45586b"><title>${escapeExportText(footer)}</title>${escapeExportText(footer.length > 165 ? `${footer.slice(0, 162)}…` : footer)}</text><text x="32" y="546" font-size="10" fill="#45586b">${ru ? "Зелёный: AOI · Жёлтый: исключения · Серый: сохранение · ?: неизвестно" : "Teal: AOI · Amber: exclusions · Grey: preserved · ?: unknown"}</text></g></svg>`;
}

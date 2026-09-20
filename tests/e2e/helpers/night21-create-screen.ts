import type { Locator } from "@playwright/test";

export type CreateScreenPoint = { x: number; y: number; w: number; surface: "base" | "roof" };
export type CreateScreenProjection = { width: number; height: number; points: CreateScreenPoint[] };

/**
 * Camera acceptance, not site coverage: the base-and-roof silhouette must span
 * >=30% of at least one viewport dimension. No per-building placement, density,
 * uniformity or occupied-pixel percentage is required. The 1px clipping tolerance
 * matches the existing ground framing assertion and only absorbs raster edges.
 */
export const CREATE_MIN_SCREEN_SPAN_RATIO = 0.30;
export function createScreenMetrics({ width, height, points }: CreateScreenProjection) {
  const valid = width > 100 && height > 100 && Number.isFinite(width) && Number.isFinite(height) && points.length > 0 &&
    points.some(p => p.surface === "base") && points.some(p => p.surface === "roof") &&
    points.every(p => [p.x, p.y, p.w].every(Number.isFinite) && p.w > 0);
  const framed = valid && points.every(p => p.x >= -1 && p.x <= width + 1 && p.y >= -1 && p.y <= height + 1);
  const spanX = valid ? Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) : 0;
  const spanY = valid ? Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) : 0;
  const largestSpanRatio = valid ? Math.max(spanX / width, spanY / height) : 0;
  return { valid, framed, useful: valid && largestSpanRatio >= CREATE_MIN_SCREEN_SPAN_RATIO, largestSpanRatio,
    baseVertices: points.filter(p => p.surface === "base").length, roofVertices: points.filter(p => p.surface === "roof").length };
}

export async function readCreateScreen(preview: Locator) {
  return preview.evaluate(async (element) => {
    type Fiber = { memoizedState: { memoizedState: unknown; next: unknown } | null; return: Fiber | null };
    type MercatorTransform = { worldSize: number; _pixelMatrix: ArrayLike<number>;
      coordinatePoint(coord: { x: number; y: number; z: number }, elevation: number): { x: number; y: number } };
    const key = Object.getOwnPropertyNames(element).find(name => name.startsWith("__reactFiber$"));
    let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : null;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
        if (map && typeof map.queryRenderedFeatures === "function" && typeof map.getSource === "function") {
          // Pinned MapLibre 6.9.0 MercatorTransform.coordinatePoint constructs
          // [coord.x*worldSize, coord.y*worldSize, elevationMETRES, 1].
          // Public map.project is ground-only; passing mercator-z here is wrong.
          const transform = (map as unknown as { _camera?: { transform?: MercatorTransform } })._camera?.transform;
          // getProjection() returns the optional stylesheet declaration. The
          // actual engine name remains mandatory even for default-Mercator styles.
          const projection = (map as unknown as { style?: { projection?: { name?: string } } }).style?.projection?.name;
          if (projection !== "mercator" || !transform || typeof transform.coordinatePoint !== "function" ||
              !Number.isFinite(transform.worldSize) || transform.worldSize <= 0 || transform._pixelMatrix?.length !== 16 ||
              !Array.from(transform._pixelMatrix).every(Number.isFinite)) throw new Error(`Create screen oracle requires the pinned native Mercator transform: ${JSON.stringify({
                projection, transformPresent: Boolean(transform), coordinatePoint: typeof transform?.coordinatePoint,
                worldSize: transform?.worldSize, pixelMatrixLength: transform?._pixelMatrix?.length })}`);
          const source = map.getSource("create-result-preview-massing") as import("maplibre-gl").GeoJSONSource | undefined;
          if (!source) return null;
          const geometry = await source.getData();
          if (geometry.type !== "FeatureCollection" || geometry.features.length === 0) throw new Error("Create massing source is empty or invalid.");
          const canvas = map.getCanvas();
          const points: CreateScreenPoint[] = [];
          let groundFramed = true;
          for (const feature of geometry.features) {
            const baseM = feature.properties?.baseM;
            const heightM = feature.properties?.heightM;
            if (feature.geometry.type !== "Polygon" || !Number.isFinite(baseM) || !Number.isFinite(heightM) ||
                baseM < 0 || heightM <= baseM) throw new Error("Create massing has invalid polygon or extrusion metres.");
            for (const p of feature.geometry.coordinates.flat()) {
              if (p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) >= 85.051129) {
                throw new Error("Create massing has invalid Mercator coordinates.");
              }
              // Same x/y conversion as pinned geo/mercator_coordinate.ts.
              const coord = { x: (180 + p[0]) / 360,
                y: (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + p[1] * Math.PI / 360)))) / 360, z: 0 };
              const ground = map.project([p[0], p[1]]);
              const nativeGround = transform.coordinatePoint(coord, 0);
              if (Math.abs(ground.x - nativeGround.x) > 0.1 || Math.abs(ground.y - nativeGround.y) > 0.1) {
                throw new Error("Create native Mercator projection disagrees with the public ground projection.");
              }
              groundFramed &&= ground.x >= -1 && ground.x <= canvas.clientWidth + 1 && ground.y >= -1 && ground.y <= canvas.clientHeight + 1;
              for (const [surface, elevation] of [["base", baseM], ["roof", heightM]] as const) {
                const pixel = transform.coordinatePoint(coord, elevation);
                const m = transform._pixelMatrix;
                const w = m[3] * coord.x * transform.worldSize + m[7] * coord.y * transform.worldSize + m[11] * elevation + m[15];
                points.push({ x: pixel.x, y: pixel.y, w, surface });
              }
            }
          }
          const rendered = map.queryRenderedFeatures();
          return { geometry, projection: { width: canvas.clientWidth, height: canvas.clientHeight, points }, groundFramed,
            scene: element.getAttribute("data-preview-scene"),
            context: rendered.some(f => !String(f.source).startsWith("create-result-preview-")),
            massing: rendered.some(f => f.source === "create-result-preview-massing"), pitch: Math.round(map.getPitch()) };
        }
        hook = hook.next as typeof hook;
      }
      fiber = fiber.return;
    }
    return null;
  });
}

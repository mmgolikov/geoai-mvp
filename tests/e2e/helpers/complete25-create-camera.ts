import type { Page } from "@playwright/test";

/** Independent check using the pinned renderer's actual projection matrix. */
export async function inspectSavedConceptCamera(page: Page) {
  return page.getByTestId("create-result-preview-3d-canvas").evaluate(async canvas => {
    type Hook = { memoizedState: unknown; next: Hook | null };
    type Fiber = { memoizedState: Hook | null; return: Fiber | null };
    const key = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"));
    if (!key) return null;
    let fiber: Fiber | null = (canvas as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
        if (typeof map?.getSource === "function" && map.getSource("create-result-preview-massing") && !map.isMoving()) {
          const massing = await (map.getSource("create-result-preview-massing") as import("maplibre-gl").GeoJSONSource).getData() as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
          const aoi = await (map.getSource("create-result-preview-aoi") as import("maplibre-gl").GeoJSONSource).getData() as GeoJSON.Feature<GeoJSON.Polygon>;
          // Private renderer introspection stays test-only, independently of the
          // product's pure fitting equations. Production uses public Map APIs.
          const transform = (map as unknown as { _camera: { transform: { modelViewProjectionMatrix: number[]; worldSize: number } } })._camera.transform;
          const matrix = transform.modelViewProjectionMatrix;
          const width = canvas.clientWidth, height = canvas.clientHeight;
          const points = [...aoi.geometry.coordinates.flat().map(([x, y]) => [x, y, 0]),
            ...massing.features.flatMap(feature => feature.geometry.coordinates.flat().flatMap(([x, y]) =>
              [[x, y, Number(feature.properties?.baseM)], [x, y, Number(feature.properties?.heightM)]]))];
          const projected = points.map(([longitude, latitude, altitude]) => {
            const x = (longitude + 180) / 360 * transform.worldSize;
            const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) / Math.PI) / 2 * transform.worldSize;
            const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * altitude + matrix[12];
            const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * altitude + matrix[13];
            const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * altitude + matrix[15];
            return [width * (clipX / clipW + 1) / 2, height * (1 - clipY / clipW) / 2];
          });
          const left = Math.min(...projected.map(p => p[0])), right = Math.max(...projected.map(p => p[0]));
          const top = Math.min(...projected.map(p => p[1])), bottom = Math.max(...projected.map(p => p[1]));
          return { left, right, top, bottom, width, height, bearing: map.getBearing(), pitch: map.getPitch(),
            occupancy: Math.max((right - left) / width, (bottom - top) / height) };
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  });
}

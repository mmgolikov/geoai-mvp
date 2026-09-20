import type { LiveMapSelection, LiveResolvedObjectContext } from "../../../components/point-to-object/live-types";

/** A source record may enrich only that exact selected object. Tile fragments
 * never lend height to a complete footprint, even if their numeric ID matches. */
export function mergePointObjectContextGeometry(object: LiveMapSelection["object"], resolved: LiveResolvedObjectContext): LiveMapSelection["object"] {
  if (resolved.geometryProvenance !== "confirmed_complete_footprint" || !resolved.displayGeometry ||
      resolved.sourceFeatureId !== object.sourceFeatureId || resolved.coordinateAssociation !== "trusted_open_map_identity") return object;
  const retainHeight = object.geometryProvenance !== "rendered_tile_polygon_member" &&
    (object.geometry?.type === "Polygon" || object.geometry?.type === "MultiPolygon");
  const suppliedHeight = resolved.renderHeightM;
  const hasHeight = typeof suppliedHeight === "number" && Number.isFinite(suppliedHeight) && suppliedHeight > 0;
  return {
    ...object,
    geometry: resolved.displayGeometry as LiveMapSelection["object"]["geometry"],
    geometryProvenance: "confirmed_complete_footprint",
    renderHeightM: hasHeight ? suppliedHeight : retainHeight ? object.renderHeightM : null,
    renderMinHeightM: hasHeight ? resolved.renderMinHeightM ?? null : retainHeight ? object.renderMinHeightM : null
  };
}

/** Stable screen-space offsets keep coincident controls individually clickable.
 * The footprint/point coordinates themselves are never moved. */
export function separateMapMarkerControls(points: readonly {x:number;y:number}[]): [number,number][] {
  const placed: {x:number;y:number}[] = [];
  return points.map(point => {
    for (let index=0; index<100; index++) {
      const dx = index === 0 ? 0 : Math.ceil(index/2)*46*(index%2 ? 1 : -1);
      if (placed.every(other => Math.abs(other.x-point.x-dx)>=44 || Math.abs(other.y-point.y)>=44)) {
        placed.push({x:point.x+dx,y:point.y}); return [dx,0];
      }
    }
    placed.push(point); return [0,0];
  });
}

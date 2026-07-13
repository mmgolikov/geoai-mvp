from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable

import pyproj
import shapely
from pyproj import Transformer
from shapely.geometry import Point, mapping, shape
from shapely.ops import transform
from shapely.validation import make_valid

SOURCE_CRS = "EPSG:4326"
WORKING_CRS = "EPSG:32640"
OUTPUT_CRS = "EPSG:4326"
MASTER_BBOX = (54.95, 24.80, 55.55, 25.36)
SELECTION_RADIUS_METRES = 1_000.0
MAX_TARGET_DISTANCE_METRES = 750.0
TARGETS = {
    "dubai-marina-jbr-palm-v1": {
        "name": "Dubai Marina / JBR / Palm",
        "latitude": 25.082200,
        "longitude": 55.143100,
    },
    "downtown-business-bay-meydan-v1": {
        "name": "Business Bay / Downtown / Meydan",
        "latitude": 25.185300,
        "longitude": 55.268500,
    },
    "dubai-south-jebel-ali-v1": {
        "name": "Dubai South / Jebel Ali",
        "latitude": 24.888700,
        "longitude": 55.154200,
    },
}
LAYER_PLAUSIBILITY = {
    "transport": {"minimumLengthMetres": 20.0, "maximumLengthMetres": 200_000.0},
    "anchors": {"minimumAreaSqm": 0.0, "maximumAreaSqm": 5_000_000.0},
    "buildings": {"minimumAreaSqm": 20.0, "maximumAreaSqm": 250_000.0},
    "landuse": {"minimumAreaSqm": 50.0, "maximumAreaSqm": 100_000_000.0},
    "water": {"minimumAreaSqm": 0.0, "maximumAreaSqm": 100_000_000.0},
    "construction": {"minimumAreaSqm": 20.0, "maximumAreaSqm": 5_000_000.0},
    "selected-aoi": {"minimumAreaSqm": 50.0, "maximumAreaSqm": 250_000.0},
}
REQUIRED_CAVEAT = (
    "Screening hypothesis; official validation required; not a legal, cadastral, "
    "zoning, planning or valuation conclusion."
)

TO_WORKING = Transformer.from_crs(SOURCE_CRS, WORKING_CRS, always_xy=True)
TO_OUTPUT = Transformer.from_crs(WORKING_CRS, OUTPUT_CRS, always_xy=True)


def deterministic_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(deterministic_json_bytes(value))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower().replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return re.sub(r"-{2,}", "-", normalized) or "unnamed"


def stable_feature_key(role: str, name: str) -> str:
    role_token = {
        "context_boundary": "area",
        "screening_zone": "zone",
        "asset_footprint": "asset",
        "aoi": "aoi",
        "corridor": "corridor",
        "anchor": "anchor",
        "observation_footprint": "observation",
    }[role]
    return f"geoai:{role_token}:ae-du:{slugify(name)}"


def provider_independent_feature_key(
    role: str,
    semantic_name: str | None,
    category: str,
    centroid: dict[str, float],
) -> str:
    semantic_identity = semantic_name or (
        f"{category}-{centroid['longitude']:.5f}-{centroid['latitude']:.5f}"
    )
    return stable_feature_key(role, semantic_identity)


def iter_positions(coordinates: Any) -> Iterable[tuple[float, float]]:
    if not isinstance(coordinates, (list, tuple)):
        return
    if len(coordinates) >= 2 and isinstance(coordinates[0], (int, float)) and isinstance(coordinates[1], (int, float)):
        yield float(coordinates[0]), float(coordinates[1])
        return
    for item in coordinates:
        yield from iter_positions(item)


def geometry_positions(geometry: dict[str, Any]) -> list[tuple[float, float]]:
    return list(iter_positions(geometry.get("coordinates")))


def to_working_geometry(geometry: dict[str, Any]):
    return transform(TO_WORKING.transform, shape(geometry))


def to_output_mapping(geometry) -> dict[str, Any]:
    return mapping(transform(TO_OUTPUT.transform, geometry))


def target_point_working(target_id: str) -> Point:
    target = TARGETS[target_id]
    return transform(TO_WORKING.transform, Point(target["longitude"], target["latitude"]))


def target_selection_area_working(target_id: str):
    return target_point_working(target_id).buffer(SELECTION_RADIUS_METRES)


def target_selection_areas_overlap() -> list[dict[str, Any]]:
    target_ids = sorted(TARGETS)
    overlaps: list[dict[str, Any]] = []
    for index, left_id in enumerate(target_ids):
        for right_id in target_ids[index + 1 :]:
            overlap_area = target_selection_area_working(left_id).intersection(target_selection_area_working(right_id)).area
            if overlap_area > 0:
                overlaps.append({"left": left_id, "right": right_id, "overlapAreaSqm": round(overlap_area, 3)})
    return overlaps


def _polygon_rings_closed(geometry) -> bool:
    polygons = []
    if geometry.geom_type == "Polygon":
        polygons = [geometry]
    elif geometry.geom_type == "MultiPolygon":
        polygons = list(geometry.geoms)
    if not polygons:
        return True
    return all(polygon.exterior.is_ring and all(interior.is_ring for interior in polygon.interiors) for polygon in polygons)


def _count_empty_parts(geometry) -> int:
    if not hasattr(geometry, "geoms"):
        return int(geometry.is_empty)
    return sum(int(part.is_empty) for part in geometry.geoms)


def geometry_checksum(working_geometry) -> str:
    normalized = shapely.normalize(working_geometry)
    return sha256_bytes(normalized.wkb)


def normalize_geometry(geometry: dict[str, Any], layer: str) -> dict[str, Any]:
    issues: list[dict[str, str]] = []
    positions = geometry_positions(geometry)
    coordinate_range_valid = bool(positions) and all(
        math.isfinite(longitude)
        and math.isfinite(latitude)
        and MASTER_BBOX[0] <= longitude <= MASTER_BBOX[2]
        and MASTER_BBOX[1] <= latitude <= MASTER_BBOX[3]
        for longitude, latitude in positions
    )
    if not positions:
        issues.append({"severity": "error", "code": "empty_geometry", "message": "Geometry has no coordinates."})
    if not coordinate_range_valid:
        issues.append(
            {
                "severity": "error",
                "code": "coordinate_range_invalid",
                "message": "Coordinates are outside the approved processing envelope.",
            }
        )

    try:
        working = to_working_geometry(geometry)
    except Exception as error:
        return {
            "geometry": None,
            "workingGeometry": None,
            "centroid": None,
            "areaSqm": None,
            "lengthMetres": None,
            "geometryChecksum": None,
            "repairOperation": "projection_failed",
            "quality": {
                "valid": False,
                "ringClosed": False,
                "selfIntersectionCount": 1,
                "emptyPartCount": 1,
                "centroidInside": False,
                "pointOnSurfaceInside": False,
                "coordinateRangeValid": coordinate_range_valid,
                "areaPlausible": False,
                "lengthPlausible": False,
                "overlapPolicyPassed": None,
                "sourceAlignmentReviewed": False,
                "sourceAlignmentStatus": "pending_independent_review",
                "issues": issues
                + [{"severity": "error", "code": "projection_failed", "message": str(error)[:240]}],
            },
        }

    repair_operation = "none"
    initial_valid = working.is_valid
    if not initial_valid:
        repaired = make_valid(working)
        repair_operation = "shapely.make_valid"
        working = repaired
    if working.is_empty:
        issues.append({"severity": "error", "code": "empty_after_repair", "message": "Geometry is empty after repair."})
    if not working.is_valid:
        issues.append({"severity": "error", "code": "invalid_after_repair", "message": "Geometry remains invalid after repair."})
    if working.geom_type not in {"Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"}:
        issues.append(
            {
                "severity": "error",
                "code": "unsupported_geometry_after_repair",
                "message": f"Repair produced unsupported {working.geom_type} geometry.",
            }
        )

    polygonal = working.geom_type in {"Polygon", "MultiPolygon"}
    linear = working.geom_type in {"LineString", "MultiLineString"}
    area_sqm = float(working.area) if polygonal else None
    length_metres = float(working.length) if linear else None
    rules = LAYER_PLAUSIBILITY[layer]
    area_plausible = True
    if polygonal:
        area_plausible = rules.get("minimumAreaSqm", 0.0) <= (area_sqm or 0.0) <= rules.get("maximumAreaSqm", float("inf"))
    length_plausible = True
    if linear:
        length_plausible = rules.get("minimumLengthMetres", 0.0) <= (length_metres or 0.0) <= rules.get("maximumLengthMetres", float("inf"))
    if not area_plausible:
        issues.append({"severity": "error", "code": "area_not_plausible", "message": "Metric area is outside the approved layer range."})
    if not length_plausible:
        issues.append({"severity": "error", "code": "length_not_plausible", "message": "Metric length is outside the approved layer range."})

    centroid = working.centroid
    point_on_surface = working.representative_point()
    centroid_inside = bool(working.covers(centroid))
    point_on_surface_inside = bool(working.covers(point_on_surface))
    ring_closed = _polygon_rings_closed(working)
    empty_part_count = _count_empty_parts(working)
    if not ring_closed:
        issues.append({"severity": "error", "code": "ring_not_closed", "message": "One or more polygon rings are not closed."})
    if empty_part_count:
        issues.append({"severity": "error", "code": "empty_parts", "message": f"{empty_part_count} empty part(s) remain."})
    if not point_on_surface_inside:
        issues.append({"severity": "error", "code": "point_on_surface_outside", "message": "Point-on-surface is not covered by the geometry."})

    output_geometry = to_output_mapping(working)
    output_centroid = transform(TO_OUTPUT.transform, centroid)
    output_point_on_surface = transform(TO_OUTPUT.transform, point_on_surface)
    valid = coordinate_range_valid and not any(issue["severity"] == "error" for issue in issues)
    return {
        "geometry": output_geometry,
        "workingGeometry": working,
        "pointOnSurfaceWorking": point_on_surface,
        "centroid": {"longitude": output_centroid.x, "latitude": output_centroid.y},
        "pointOnSurface": {
            "longitude": output_point_on_surface.x,
            "latitude": output_point_on_surface.y,
        },
        "areaSqm": round(area_sqm, 3) if area_sqm is not None else None,
        "lengthMetres": round(length_metres, 3) if length_metres is not None else None,
        "geometryChecksum": geometry_checksum(working),
        "repairOperation": repair_operation,
        "quality": {
            "valid": valid,
            "ringClosed": ring_closed,
            "selfIntersectionCount": 0 if working.is_valid else 1,
            "emptyPartCount": empty_part_count,
            "centroidInside": centroid_inside,
            "pointOnSurfaceInside": point_on_surface_inside,
            "coordinateRangeValid": coordinate_range_valid,
            "areaPlausible": area_plausible,
            "lengthPlausible": length_plausible,
            "overlapPolicyPassed": None,
            "sourceAlignmentReviewed": False,
            "sourceAlignmentStatus": "pending_independent_review",
            "issues": issues,
        },
    }


def transformation_evidence() -> dict[str, Any]:
    return {
        "libraries": {
            "shapely": shapely.__version__,
            "pyproj": pyproj.__version__,
            "geos": shapely.geos_version_string,
            "proj": pyproj.proj_version_str,
        },
        "sourceCrs": SOURCE_CRS,
        "workingCrs": WORKING_CRS,
        "outputCrs": OUTPUT_CRS,
        "alwaysXY": True,
        "operations": [
            "EPSG:4326 input decoded by Shapely",
            "pyproj Transformer reprojects geometry to EPSG:32640",
            "validity, make-valid, area, length, distance, topology and point-on-surface run in EPSG:32640",
            "accepted geometry reprojects to EPSG:4326 for GeoJSON output",
        ],
        "repairOperation": "shapely.make_valid when source geometry is invalid; otherwise none",
        "selectionRadiusMetres": SELECTION_RADIUS_METRES,
        "maximumTargetDistanceMetres": MAX_TARGET_DISTANCE_METRES,
        "selectionAreaOverlaps": target_selection_areas_overlap(),
    }

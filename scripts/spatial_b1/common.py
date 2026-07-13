from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable

MASTER_BBOX = (54.95, 24.80, 55.55, 25.36)
FOCUS_AOIS = {
    "dubai-marina-jbr-palm-v1": (55.08, 25.04, 55.19, 25.16),
    "downtown-business-bay-meydan-v1": (55.22, 25.13, 55.37, 25.23),
    "dubai-south-jebel-ali-v1": (54.98, 24.82, 55.28, 25.06),
}
REQUIRED_CAVEAT = (
    "Screening hypothesis; official validation required; not a legal, cadastral, "
    "zoning, planning or valuation conclusion."
)


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


def stable_feature_key(role: str, name: str, source_feature_id: str) -> str:
    role_token = {
        "context_boundary": "area",
        "screening_zone": "zone",
        "asset_footprint": "asset",
        "aoi": "aoi",
        "corridor": "corridor",
        "anchor": "anchor",
        "observation_footprint": "observation",
    }[role]
    return f"geoai:{role_token}:ae-du:{slugify(name)}-{slugify(source_feature_id)[-24:]}"


def iter_positions(coordinates: Any) -> Iterable[tuple[float, float]]:
    if not isinstance(coordinates, list):
        return
    if len(coordinates) >= 2 and isinstance(coordinates[0], (int, float)) and isinstance(coordinates[1], (int, float)):
        yield float(coordinates[0]), float(coordinates[1])
        return
    for item in coordinates:
        yield from iter_positions(item)


def geometry_positions(geometry: dict[str, Any]) -> list[tuple[float, float]]:
    return list(iter_positions(geometry.get("coordinates")))


def geometry_bbox(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    positions = geometry_positions(geometry)
    if not positions:
        return None
    longitudes = [position[0] for position in positions]
    latitudes = [position[1] for position in positions]
    return min(longitudes), min(latitudes), max(longitudes), max(latitudes)


def bbox_intersects(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> bool:
    return left[0] <= right[2] and left[2] >= right[0] and left[1] <= right[3] and left[3] >= right[1]


def geometry_centroid(geometry: dict[str, Any]) -> dict[str, float] | None:
    positions = geometry_positions(geometry)
    if not positions:
        return None
    return {
        "longitude": sum(position[0] for position in positions) / len(positions),
        "latitude": sum(position[1] for position in positions) / len(positions),
    }


def _ring_area_sqm(ring: list[list[float]]) -> float:
    if len(ring) < 4:
        return 0.0
    centroid_latitude = sum(float(position[1]) for position in ring) / len(ring)
    meters_per_degree_latitude = 111_320.0
    meters_per_degree_longitude = math.cos(math.radians(centroid_latitude)) * meters_per_degree_latitude
    projected = [
        (float(position[0]) * meters_per_degree_longitude, float(position[1]) * meters_per_degree_latitude)
        for position in ring
    ]
    total = 0.0
    for index, current in enumerate(projected):
        following = projected[(index + 1) % len(projected)]
        total += current[0] * following[1] - following[0] * current[1]
    return abs(total) / 2.0


def geometry_area_sqm(geometry: dict[str, Any]) -> float | None:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "Polygon" and isinstance(coordinates, list) and coordinates:
        return round(_ring_area_sqm(coordinates[0]))
    if geometry_type == "MultiPolygon" and isinstance(coordinates, list):
        return round(sum(_ring_area_sqm(polygon[0]) for polygon in coordinates if polygon))
    return None


def _orientation(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> int:
    value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
    if abs(value) < 1e-12:
        return 0
    return 1 if value > 0 else 2


def _on_segment(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> bool:
    return (
        min(a[0], c[0]) - 1e-12 <= b[0] <= max(a[0], c[0]) + 1e-12
        and min(a[1], c[1]) - 1e-12 <= b[1] <= max(a[1], c[1]) + 1e-12
    )


def _segments_intersect(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float], d: tuple[float, float]) -> bool:
    first = _orientation(a, b, c)
    second = _orientation(a, b, d)
    third = _orientation(c, d, a)
    fourth = _orientation(c, d, b)
    if first != second and third != fourth:
        return True
    return (
        (first == 0 and _on_segment(a, c, b))
        or (second == 0 and _on_segment(a, d, b))
        or (third == 0 and _on_segment(c, a, d))
        or (fourth == 0 and _on_segment(c, b, d))
    )


def _polygon_rings(geometry: dict[str, Any]) -> list[list[list[float]]]:
    coordinates = geometry.get("coordinates")
    if geometry.get("type") == "Polygon" and isinstance(coordinates, list):
        return coordinates
    if geometry.get("type") == "MultiPolygon" and isinstance(coordinates, list):
        return [ring for polygon in coordinates for ring in polygon]
    return []


def geometry_quality(geometry: dict[str, Any], bbox: tuple[float, float, float, float] = MASTER_BBOX) -> dict[str, Any]:
    issues: list[dict[str, str]] = []
    positions = geometry_positions(geometry)
    coordinate_range_valid = bool(positions) and all(
        math.isfinite(longitude)
        and math.isfinite(latitude)
        and bbox[0] <= longitude <= bbox[2]
        and bbox[1] <= latitude <= bbox[3]
        for longitude, latitude in positions
    )
    if not positions:
        issues.append({"severity": "error", "code": "empty_geometry", "message": "Geometry has no coordinates."})
    if not coordinate_range_valid:
        issues.append({"severity": "error", "code": "coordinate_range_invalid", "message": "Coordinates are outside the approved processing envelope."})

    rings = _polygon_rings(geometry)
    ring_closed = None if not rings else all(len(ring) >= 4 and ring[0][:2] == ring[-1][:2] for ring in rings)
    if ring_closed is False:
        issues.append({"severity": "error", "code": "ring_not_closed", "message": "One or more polygon rings are not closed."})
    empty_part_count = sum(1 for ring in rings if len(ring) < 4)
    if empty_part_count:
        issues.append({"severity": "error", "code": "short_polygon_part", "message": f"{empty_part_count} polygon part(s) are too short."})

    self_intersection_count = 0
    for raw_ring in rings:
        ring = [(float(position[0]), float(position[1])) for position in raw_ring]
        segment_count = max(0, len(ring) - 1)
        for first_index in range(segment_count):
            for second_index in range(first_index + 1, segment_count):
                if abs(first_index - second_index) <= 1 or (first_index == 0 and second_index == segment_count - 1):
                    continue
                if _segments_intersect(ring[first_index], ring[first_index + 1], ring[second_index], ring[second_index + 1]):
                    self_intersection_count += 1
    if self_intersection_count:
        issues.append({"severity": "error", "code": "self_intersection", "message": f"{self_intersection_count} self-intersection(s) detected."})

    return {
        "valid": not any(issue["severity"] == "error" for issue in issues),
        "ringClosed": ring_closed,
        "selfIntersectionCount": self_intersection_count,
        "emptyPartCount": empty_part_count,
        "centroidInside": None,
        "coordinateRangeValid": coordinate_range_valid,
        "areaPlausible": None,
        "overlapPolicyPassed": None,
        "sourceAlignmentReviewed": False,
        "issues": issues,
    }

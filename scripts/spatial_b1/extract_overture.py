from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import duckdb

TARGETS = {
    "dubai-marina-jbr-palm-v1": (55.143100, 25.082200),
    "downtown-business-bay-meydan-v1": (55.268500, 25.185300),
    "dubai-south-jebel-ali-v1": (55.154200, 24.888700),
}
EXTRACTION_HALF_SPAN_DEGREES = 0.025


def safe_json(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--per-aoi-limit", type=int, default=1500)
    arguments = parser.parse_args()

    output_path = Path(arguments.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    connection = duckdb.connect(database=":memory:")
    connection.execute("INSTALL spatial")
    connection.execute("LOAD spatial")
    connection.execute("INSTALL httpfs")
    connection.execute("LOAD httpfs")
    connection.execute("SET s3_region='us-west-2'")
    connection.execute("SET enable_progress_bar=false")

    parquet_path = (
        "s3://overturemaps-us-west-2/release/"
        f"{arguments.release}/theme=buildings/type=building/*"
    )
    features_by_id: dict[str, dict[str, Any]] = {}

    for aoi_id, (anchor_longitude, anchor_latitude) in TARGETS.items():
        minimum_longitude = anchor_longitude - EXTRACTION_HALF_SPAN_DEGREES
        maximum_longitude = anchor_longitude + EXTRACTION_HALF_SPAN_DEGREES
        minimum_latitude = anchor_latitude - EXTRACTION_HALF_SPAN_DEGREES
        maximum_latitude = anchor_latitude + EXTRACTION_HALF_SPAN_DEGREES
        query = f"""
            SELECT
              id,
              ST_AsGeoJSON(geometry) AS geometry_json,
              to_json(names) AS names_json,
              to_json(sources) AS sources_json,
              to_json(bbox) AS bbox_json
            FROM read_parquet(
              '{parquet_path}',
              filename=true,
              hive_partitioning=1
            )
            WHERE bbox.xmin <= ?
              AND bbox.xmax >= ?
              AND bbox.ymin <= ?
              AND bbox.ymax >= ?
            ORDER BY id
            LIMIT ?
        """
        rows = connection.execute(
            query,
            [maximum_longitude, minimum_longitude, maximum_latitude, minimum_latitude, arguments.per_aoi_limit],
        ).fetchall()
        for feature_id, geometry_json, names_json, sources_json, bbox_json in rows:
            if not feature_id or not geometry_json:
                continue
            feature_key = str(feature_id)
            properties = {
                "id": feature_key,
                "type": "building",
                "names": safe_json(names_json, {}),
                "sources": safe_json(sources_json, []),
                "bbox": safe_json(bbox_json, {}),
                "focusAoiIds": sorted(
                    set((features_by_id.get(feature_key, {}).get("properties", {}).get("focusAoiIds") or []) + [aoi_id])
                ),
                "overtureRelease": arguments.release,
            }
            features_by_id[feature_key] = {
                "type": "Feature",
                "id": feature_key,
                "geometry": json.loads(geometry_json),
                "properties": properties,
            }

    feature_collection = {
        "type": "FeatureCollection",
        "name": "Overture buildings for approved GeoAI Dubai focus AOIs",
        "features": [features_by_id[key] for key in sorted(features_by_id)],
    }
    output_path.write_text(
        json.dumps(feature_collection, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "release": arguments.release,
                "featureCount": len(feature_collection["features"]),
                "focusAois": sorted(TARGETS),
                "selectionAnchors": {
                    target_id: {"longitude": coordinates[0], "latitude": coordinates[1]}
                    for target_id, coordinates in TARGETS.items()
                },
                "extractionHalfSpanDegrees": EXTRACTION_HALF_SPAN_DEGREES,
                "output": str(output_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

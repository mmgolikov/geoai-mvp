from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import (
    FOCUS_AOIS,
    MASTER_BBOX,
    REQUIRED_CAVEAT,
    bbox_intersects,
    deterministic_json_bytes,
    geometry_area_sqm,
    geometry_bbox,
    geometry_centroid,
    geometry_quality,
    sha256_bytes,
    sha256_file,
    stable_feature_key,
    write_json,
)

LAYER_LIMITS = {
    "transport": 100,
    "anchors": 100,
    "buildings": 1000,
    "landuse": 100,
    "water": 100,
    "construction": 20,
    "selected-aoi": 4,
}


def scalar_metadata(properties: dict[str, Any]) -> dict[str, str | int | float | bool | None]:
    return {
        str(key): value
        for key, value in properties.items()
        if value is None or isinstance(value, (str, int, float, bool))
    }


def feature_identity(feature: dict[str, Any], provider: str, fallback_index: int) -> str:
    properties = feature.get("properties") or {}
    candidates = [
        properties.get("id"),
        properties.get("osm_id"),
        properties.get("osmId"),
        feature.get("id"),
    ]
    for candidate in candidates:
        if candidate is not None and str(candidate).strip():
            if provider == "osm":
                osm_type = str(properties.get("osm_type") or properties.get("osmType") or "feature")
                return f"{osm_type}/{candidate}"
            return str(candidate)
    return f"generated/{fallback_index}"


def feature_name(feature: dict[str, Any], layer: str, source_id: str) -> str:
    properties = feature.get("properties") or {}
    names = properties.get("names") if isinstance(properties.get("names"), dict) else {}
    common = names.get("common") if isinstance(names.get("common"), dict) else {}
    for candidate in (
        names.get("primary"),
        common.get("en"),
        properties.get("name_en"),
        properties.get("name"),
    ):
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return f"{layer.replace('-', ' ').title()} {source_id[-16:]}"


def layer_definition(layer: str) -> tuple[str, str, str]:
    return {
        "transport": ("corridor", "transport", "open_transport_context"),
        "anchors": ("anchor", "spatial_anchor", "open_spatial_anchor"),
        "buildings": ("asset_footprint", "building", "open_building_footprint"),
        "landuse": ("context_boundary", "landuse_context", "open_landuse_context"),
        "water": ("context_boundary", "water_context", "open_water_context"),
        "construction": ("observation_footprint", "construction", "open_construction_target"),
        "selected-aoi": ("aoi", "selected_aoi", "sample_aoi_on_real_world_geometry"),
    }[layer]


def infer_provider(path: Path) -> str:
    return "overture" if path.name.startswith("overture-") else "osm"


def infer_layer(path: Path) -> str | None:
    name = path.stem.lower()
    for layer in ("transport", "anchors", "buildings", "landuse", "water", "construction"):
        if layer in name:
            return layer
    if "places" in name or "poi" in name:
        return "anchors"
    return None


def read_feature_collection(path: Path) -> list[dict[str, Any]]:
    value = json.loads(path.read_text("utf-8"))
    if value.get("type") == "FeatureCollection" and isinstance(value.get("features"), list):
        return value["features"]
    raise ValueError(f"{path} is not a GeoJSON FeatureCollection")


def normalize_feature(
    raw: dict[str, Any],
    provider: str,
    layer: str,
    dataset: dict[str, Any],
    index: int,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    geometry = raw.get("geometry")
    if not isinstance(geometry, dict):
        return None, {"sourceFeatureId": None, "reason": "missing_geometry"}
    quality = geometry_quality(geometry)
    source_id = feature_identity(raw, provider, index)
    if not quality["valid"]:
        return None, {"sourceFeatureId": source_id, "reason": "geometry_quality_failed", "quality": quality}
    centroid = geometry_centroid(geometry)
    if centroid is None:
        return None, {"sourceFeatureId": source_id, "reason": "centroid_unavailable"}
    role, category, subtype = layer_definition(layer)
    name = feature_name(raw, layer, source_id)
    source_name = "overture-maps" if provider == "overture" else "osm-geofabrik"
    feature_key = stable_feature_key(role, name, source_id)
    properties = raw.get("properties") or {}
    aliases = [{"sourceId": source_name, "sourceFeatureId": source_id}]
    if provider == "overture" and isinstance(properties.get("sources"), list):
        for source in properties["sources"]:
            if not isinstance(source, dict):
                continue
            source_dataset = source.get("dataset") or source.get("source")
            record_id = source.get("record_id") or source.get("recordId") or source.get("id")
            if source_dataset and record_id:
                aliases.append({"sourceId": str(source_dataset), "sourceFeatureId": str(record_id)})

    envelope = {
        "type": "Feature",
        "featureKey": feature_key,
        "datasetId": dataset["datasetId"],
        "datasetVersion": dataset["datasetVersion"],
        "sourceFeatureId": source_id,
        "sourceAliases": aliases,
        "name": name,
        "category": category,
        "subtype": subtype,
        "geometry": geometry,
        "centroid": centroid,
        "areaSqm": geometry_area_sqm(geometry),
        "geometryOrigin": "source",
        "geometryRole": role,
        "geometryAccuracy": "source_exact",
        "observedAt": dataset.get("snapshotDate"),
        "validFrom": dataset.get("validFrom"),
        "validTo": None,
        "freshnessStatus": "unknown",
        "validationStatus": "open_context",
        "confidenceLevel": "medium",
        "scenarioRelevance": ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"],
        "limitations": [
            "Open-context geometry; not an official parcel, zoning, cadastral, planning or hazard boundary.",
            REQUIRED_CAVEAT,
        ],
        "lineage": [
            {
                "sequence": 1,
                "operation": "source_adapter_normalize",
                "tool": "geoai-spatial-b1-builder",
                "toolVersion": "1.0.0",
                "inputDatasetIds": [dataset["datasetId"]],
                "parameters": {"provider": provider, "layer": layer},
                "outputChecksum": None,
            }
        ],
        "quality": quality,
        "metadata": scalar_metadata(properties),
    }
    return envelope, None


def select_by_layer(features: list[dict[str, Any]], layer: str) -> list[dict[str, Any]]:
    if layer == "buildings":
        selected: list[dict[str, Any]] = []
        per_aoi_limit = max(1, LAYER_LIMITS[layer] // len(FOCUS_AOIS))
        for aoi_bbox in FOCUS_AOIS.values():
            candidates = [
                feature
                for feature in features
                if (feature_bbox := geometry_bbox(feature["geometry"])) and bbox_intersects(feature_bbox, aoi_bbox)
            ]
            candidates.sort(key=lambda feature: (-(feature.get("areaSqm") or 0), feature["featureKey"]))
            selected.extend(candidates[:per_aoi_limit])
        unique = {feature["featureKey"]: feature for feature in selected}
        return [unique[key] for key in sorted(unique)][: LAYER_LIMITS[layer]]
    features.sort(key=lambda feature: feature["featureKey"])
    return features[: LAYER_LIMITS[layer]]


def build_selected_aois(buildings: list[dict[str, Any]], dataset: dict[str, Any]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for aoi_id, aoi_bbox in FOCUS_AOIS.items():
        candidates = [
            feature
            for feature in buildings
            if (feature_bbox := geometry_bbox(feature["geometry"])) and bbox_intersects(feature_bbox, aoi_bbox)
        ]
        candidates.sort(key=lambda feature: (-(feature.get("areaSqm") or 0), feature["featureKey"]))
        if not candidates:
            continue
        source = candidates[0]
        name = f"{aoi_id.replace('-v1', '').replace('-', ' ').title()} Sample AOI"
        selected.append(
            {
                **source,
                "featureKey": stable_feature_key("aoi", name, source["sourceFeatureId"]),
                "datasetId": dataset["datasetId"],
                "datasetVersion": dataset["datasetVersion"],
                "name": name,
                "category": "selected_aoi",
                "subtype": "sample_aoi_on_real_world_geometry",
                "geometryRole": "aoi",
                "limitations": [
                    "Sample AOI on real-world open geometry; not a parcel, title, cadastral or planning boundary.",
                    REQUIRED_CAVEAT,
                ],
                "metadata": {**source.get("metadata", {}), "focusAoiId": aoi_id},
            }
        )
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--source-manifest", required=True)
    parser.add_argument("--dataset-version", required=True)
    arguments = parser.parse_args()

    input_dir = Path(arguments.input_dir)
    output_dir = Path(arguments.output_dir)
    source_manifest = json.loads(Path(arguments.source_manifest).read_text("utf-8"))
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    layers: dict[str, list[dict[str, Any]]] = {layer: [] for layer in LAYER_LIMITS if layer != "selected-aoi"}
    datasets: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for source_file in sorted(input_dir.glob("*.geojson")):
        layer = infer_layer(source_file)
        if layer is None:
            continue
        provider = infer_provider(source_file)
        source_record = source_manifest["sources"][provider]
        dataset = {
            "datasetId": f"dubai-open-context-{provider}-{layer}",
            "datasetVersion": arguments.dataset_version,
            "layerId": layer,
            "layerName": layer.replace("-", " ").title(),
            "geography": "Dubai open-context processing envelope",
            "snapshotDate": source_record.get("snapshotDate"),
            "accessedAt": source_record["accessedAt"],
            "validFrom": source_record.get("snapshotDate"),
            "validTo": None,
            "sourceId": source_record["sourceId"],
            "sourceReleaseId": source_record.get("sourceReleaseId"),
            "sourceMode": "open_snapshot",
            "licenseId": source_record["licenseId"],
            "attribution": source_record["attribution"],
            "buildMethod": "geoai-spatial-b1-builder",
            "buildVersion": "1.0.0",
            "checksum": sha256_file(source_file),
            "caveat": REQUIRED_CAVEAT,
        }
        datasets.append(dataset)
        for index, raw_feature in enumerate(read_feature_collection(source_file), start=1):
            feature, rejection = normalize_feature(raw_feature, provider, layer, dataset, index)
            if feature:
                layers[layer].append(feature)
            elif rejection:
                rejected.append({"inputFile": source_file.name, **rejection})

    normalized_layers = {layer: select_by_layer(features, layer) for layer, features in layers.items()}
    selected_dataset = {
        "datasetId": "dubai-open-context-selected-aoi",
        "datasetVersion": arguments.dataset_version,
        "layerId": "selected-aoi",
        "layerName": "Sample AOIs on Real-World Geometry",
        "geography": "Approved Dubai focus AOIs",
        "snapshotDate": source_manifest.get("snapshotDate"),
        "accessedAt": source_manifest["generatedAt"],
        "validFrom": source_manifest.get("snapshotDate"),
        "validTo": None,
        "sourceId": "geoai-derived-from-open-context",
        "sourceReleaseId": arguments.dataset_version,
        "sourceMode": "derived_open_context",
        "licenseId": "inherits-source-licences",
        "attribution": "Derived from the source features listed in sourceAliases.",
        "buildMethod": "deterministic-largest-footprint-selection",
        "buildVersion": "1.0.0",
        "checksum": "pending-output-checksum",
        "caveat": REQUIRED_CAVEAT,
    }
    selected_aois = build_selected_aois(normalized_layers["buildings"], selected_dataset)
    normalized_layers["selected-aoi"] = selected_aois
    datasets.append(selected_dataset)

    geometry_dir = output_dir / "geometry"
    file_records = []
    all_features = []
    for layer, features in normalized_layers.items():
        collection = {"type": "FeatureCollection", "name": layer, "features": features}
        output_path = geometry_dir / f"{layer}.geojson"
        write_json(output_path, collection)
        checksum = sha256_file(output_path)
        file_records.append({"layer": layer, "path": str(output_path.relative_to(output_dir)), "featureCount": len(features), "sha256": checksum, "bytes": output_path.stat().st_size})
        all_features.extend(features)

    selected_dataset["checksum"] = next((record["sha256"] for record in file_records if record["layer"] == "selected-aoi"), "")
    bundle = {
        "bundleId": "dubai-open-context-b1",
        "bundleVersion": arguments.dataset_version,
        "generatedAt": generated_at,
        "defaultSourceMode": "synthetic_fallback",
        "datasets": datasets,
        "features": all_features,
        "metrics": [],
    }
    write_json(output_dir / "bundle.json", bundle)
    write_json(output_dir / "attribution.json", source_manifest.get("attribution", {}))
    write_json(output_dir / "rejected-features.json", rejected)
    quality_summary = {
        "valid": len(rejected) == 0 or len(all_features) > 0,
        "acceptedFeatureCount": len(all_features),
        "rejectedFeatureCount": len(rejected),
        "files": file_records,
        "mandatoryFocusAoisRepresented": sorted(feature.get("metadata", {}).get("focusAoiId") for feature in selected_aois),
        "requiredFocusAois": sorted(FOCUS_AOIS),
        "defaultSourceMode": "synthetic_fallback",
        "bundleSha256": sha256_bytes(deterministic_json_bytes(bundle)),
        "caveat": REQUIRED_CAVEAT,
    }
    quality_summary["focusAoiGatePassed"] = quality_summary["mandatoryFocusAoisRepresented"] == quality_summary["requiredFocusAois"]
    write_json(output_dir / "quality-report.json", quality_summary)
    if not quality_summary["focusAoiGatePassed"]:
        raise SystemExit("Mandatory focus AOI representation gate failed")
    print(json.dumps(quality_summary, indent=2))


if __name__ == "__main__":
    main()

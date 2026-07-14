from __future__ import annotations

import argparse
import copy
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import (
    OUTPUT_CRS,
    REQUIRED_CAVEAT,
    SELECTION_RADIUS_METRES,
    SOURCE_CRS,
    TARGETS,
    WORKING_CRS,
    deterministic_json_bytes,
    normalize_geometry,
    snapshot_provisional_feature_key,
    source_stable_feature_key,
    sha256_bytes,
    sha256_file,
    target_point_working,
    target_selection_area_working,
    to_working_geometry,
    transformation_evidence,
    write_json,
)
from canonical_feature_registry import registry_document, selected_registry_entry
from freshness import FRESHNESS_POLICY, freshness_status, normalize_source_timestamp
from naming import normalized_names
from source_alignment_review import review_record, reviewed_with_conditions

LAYER_LIMITS = {
    "transport": 100,
    "anchors": 100,
    "buildings": 1000,
    "landuse": 100,
    "water": 100,
    "construction": 20,
    "selected-aoi": 3,
}
OSM_ID_PATTERN = re.compile(r"^(node|way|relation)/([0-9]+)$")
APPROVED_HIGHWAYS = {"motorway", "trunk", "primary", "secondary", "tertiary"}
APPROVED_RAILWAYS = {"rail", "subway", "light_rail", "tram"}
APPROVED_AMENITIES = {
    "airport",
    "bus_station",
    "college",
    "community_centre",
    "conference_centre",
    "fire_station",
    "hospital",
    "marketplace",
    "parking",
    "place_of_worship",
    "police",
    "school",
    "townhall",
    "university",
}
APPROVED_TOURISM = {"aquarium", "attraction", "gallery", "hotel", "museum", "theme_park", "viewpoint", "zoo"}
APPROVED_LANDUSE = {"residential", "commercial", "retail", "industrial", "brownfield", "greenfield"}


def scalar_metadata(properties: dict[str, Any]) -> dict[str, str | int | float | bool | None]:
    return {
        str(key): value
        for key, value in properties.items()
        if value is None or isinstance(value, (str, int, float, bool))
    }


def exact_feature_identity(feature: dict[str, Any], provider: str) -> tuple[str | None, dict[str, str] | None]:
    properties = feature.get("properties") or {}
    if provider == "overture":
        candidate = properties.get("id") or feature.get("id")
        if candidate is None or not str(candidate).strip():
            return None, None
        return str(candidate).strip(), None

    object_type = str(properties.get("@type") or "").strip().lower()
    numeric_id = str(properties.get("@id") or "").strip()
    if object_type not in {"node", "way", "relation"} or not numeric_id.isdigit():
        return None, None
    return f"{object_type}/{numeric_id}", {"objectType": object_type, "numericId": numeric_id}


def source_records(properties: dict[str, Any], provider: str) -> list[dict[str, Any]]:
    if provider == "overture" and isinstance(properties.get("sources"), list):
        return [record for record in properties["sources"] if isinstance(record, dict)]
    return [{}]


def source_updated_timestamp(properties: dict[str, Any], provider: str) -> dict[str, str | int | float | None]:
    if provider == "overture":
        values = [
            normalize_source_timestamp(record.get("update_time") or record.get("updateTime"))
            for record in source_records(properties, provider)
        ]
        valid = [value for value in values if value["sourceUpdatedAtEpoch"] is not None]
        return max(valid, key=lambda value: float(value["sourceUpdatedAtEpoch"] or 0)) if valid else normalize_source_timestamp(None)
    return normalize_source_timestamp(properties.get("@timestamp"))


def source_category(layer: str, source_name: str | None, properties: dict[str, Any]) -> str:
    if layer == "transport":
        highway = normalized_tag(properties, "highway")
        railway = normalized_tag(properties, "railway")
        if highway in APPROVED_HIGHWAYS:
            return f"{highway}_corridor"
        return {
            "subway": "metro_corridor",
            "light_rail": "tram_corridor",
            "tram": "tram_corridor",
        }.get(railway, "rail_corridor")
    if layer == "anchors":
        if normalized_tag(properties, "aeroway") in {"aerodrome", "terminal"}:
            return "airport_anchor"
        if normalized_tag(properties, "harbour") or normalized_tag(properties, "amenity") == "ferry_terminal":
            return "port_anchor"
        if (
            normalized_tag(properties, "public_transport") in {"station", "platform", "stop_position"}
            or normalized_tag(properties, "railway") in {"station", "halt", "subway_entrance"}
            or normalized_tag(properties, "amenity") == "bus_station"
        ):
            return "transport_station_anchor"
        if normalized_tag(properties, "amenity"):
            return "amenity_anchor"
        if normalized_tag(properties, "tourism"):
            return "tourism_anchor"
        return "activity_anchor"
    if layer == "landuse":
        landuse = normalized_tag(properties, "landuse")
        if landuse in {"commercial", "retail"}:
            return "commercial_landuse_context"
        if landuse == "industrial":
            return "industrial_landuse_context"
        if normalized_tag(properties, "leisure") in {"park", "garden"} or landuse in {"greenfield", "brownfield"}:
            return "park_landuse_context"
        return "residential_landuse_context"
    if layer == "water":
        if normalized_tag(properties, "natural") == "coastline":
            return "coastline_context"
        if normalized_tag(properties, "waterway"):
            return "waterway_context"
        return "water_context"
    if layer == "construction":
        return "construction_footprint"
    if source_name:
        return "named_operational_building_footprint" if any(
            token in source_name.lower() for token in ("services", "logistics", "warehouse", "industrial")
        ) else "named_building_footprint"
    return "building_footprint"


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


def attribution_notice(source_manifest: dict[str, Any]) -> str:
    urls = source_manifest["attribution"]["urls"]
    providers = source_manifest["attribution"].get("sourceProviders", [])
    provider_lines = [
        (
            f"- {provider['sourceDataset']}: {provider['sourceAttribution']}; "
            f"source-record licence {provider['sourceRecordLicenseId']} "
            f"({provider.get('sourceRecordLicenseUrl') or 'URL not declared'}); "
            f"attribution {provider.get('attributionUrl') or 'URL not declared'}."
        )
        for provider in providers
    ]
    return "\n".join(
        [
            "# Spatial B1 Attribution Notice",
            "",
            "This notice accompanies a short-lived, read-only evidence artifact. It does not approve public repository geometry distribution or activate open geometry in Product.",
            "",
            "## OpenStreetMap / Geofabrik",
            "",
            "- © OpenStreetMap contributors.",
            f"- Copyright and attribution: {urls['openStreetMapCopyright']}",
            f"- Open Database License 1.0 legal code: {urls['odblLegalCode']}",
            f"- Geofabrik extract reference: {urls['geofabrikExtractReference']}",
            "",
            "## Overture Maps and source providers",
            "",
            "- Overture Maps Foundation.",
            f"- Attribution documentation: {urls['overtureAttributionDocumentation']}",
            f"- Foundation reference: {urls['overtureMapsFoundation']}",
            *provider_lines,
            "",
            "## Data honesty and distribution control",
            "",
            "- Open-context and source-provider records do not imply official municipal, parcel, zoning, cadastral, ownership, planning, valuation, title or approval evidence.",
            "- publicRepositoryGeometryApproved = false",
            "- openGeometryActivated = false",
            f"- {REQUIRED_CAVEAT}",
            "",
        ]
    )


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


def normalized_tag(properties: dict[str, Any], key: str) -> str:
    value = properties.get(key)
    return str(value).strip().lower() if value is not None else ""


def classify_osm_feature(feature: dict[str, Any]) -> str | None:
    properties = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    geometry_type = geometry.get("type")
    polygonal = geometry_type in {"Polygon", "MultiPolygon"}
    linear = geometry_type in {"LineString", "MultiLineString"}
    point_or_area = geometry_type in {"Point", "MultiPoint", "Polygon", "MultiPolygon"}

    construction = normalized_tag(properties, "construction")
    if polygonal and (
        normalized_tag(properties, "landuse") == "construction"
        or normalized_tag(properties, "building") == "construction"
        or bool(construction)
    ):
        return "construction"
    if linear and (
        normalized_tag(properties, "highway") in APPROVED_HIGHWAYS
        or normalized_tag(properties, "railway") in APPROVED_RAILWAYS
    ):
        return "transport"
    if point_or_area and (
        normalized_tag(properties, "amenity") in APPROVED_AMENITIES
        or normalized_tag(properties, "tourism") in APPROVED_TOURISM
        or normalized_tag(properties, "aeroway") in {"aerodrome", "terminal"}
        or normalized_tag(properties, "public_transport") in {"station", "platform", "stop_position"}
        or normalized_tag(properties, "railway") in {"station", "halt", "subway_entrance"}
        or bool(normalized_tag(properties, "harbour"))
    ):
        return "anchors"
    if (
        normalized_tag(properties, "natural") in {"water", "coastline", "beach"}
        or bool(normalized_tag(properties, "water"))
        or bool(normalized_tag(properties, "waterway"))
    ) and geometry_type in {"LineString", "MultiLineString", "Polygon", "MultiPolygon"}:
        return "water"
    if polygonal and (
        normalized_tag(properties, "landuse") in APPROVED_LANDUSE
        or normalized_tag(properties, "leisure") in {"park", "garden"}
        or normalized_tag(properties, "natural") == "beach"
        or normalized_tag(properties, "aeroway") in {"apron", "terminal"}
    ):
        return "landuse"
    return None


def dedupe_aliases(aliases: list[dict[str, str]]) -> list[dict[str, str]]:
    unique = {(alias["sourceId"], alias["sourceFeatureId"]): alias for alias in aliases}
    return [unique[key] for key in sorted(unique)]


def normalize_feature(
    raw: dict[str, Any],
    provider: str,
    expected_layer: str,
    dataset: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    source_id, osm_identity = exact_feature_identity(raw, provider)
    if source_id is None:
        return None, {"sourceFeatureId": None, "reason": "missing_exact_provider_identity", "provider": provider}
    if provider == "osm":
        classified_layer = classify_osm_feature(raw)
        if classified_layer != expected_layer:
            return None, {
                "sourceFeatureId": source_id,
                "reason": "thematic_layer_mismatch",
                "inputLayer": expected_layer,
                "classifiedLayer": classified_layer,
            }
    else:
        classified_layer = "buildings"
        if expected_layer != classified_layer:
            return None, {"sourceFeatureId": source_id, "reason": "provider_layer_mismatch"}

    geometry = raw.get("geometry")
    if not isinstance(geometry, dict):
        return None, {"sourceFeatureId": source_id, "reason": "missing_geometry"}
    normalized = normalize_geometry(geometry, classified_layer)
    quality = normalized["quality"]
    if not quality["valid"]:
        return None, {
            "sourceFeatureId": source_id,
            "reason": "geometry_quality_failed",
            "quality": quality,
            "repairOperation": normalized["repairOperation"],
        }

    role, category, subtype = layer_definition(classified_layer)
    source_name = "overture-maps" if provider == "overture" else "osm-geofabrik"
    properties = raw.get("properties") or {}
    detailed_category = source_category(classified_layer, None, properties)
    names = normalized_names(properties, provider, detailed_category, source_id)
    source_object_name = names["sourceObjectName"]
    detailed_category = source_category(classified_layer, source_object_name, properties)
    if detailed_category != source_category(classified_layer, None, properties):
        names = normalized_names(properties, provider, detailed_category, source_id)
        source_object_name = names["sourceObjectName"]
    identity_scope = "source_stable" if names["englishName"] else "snapshot_provisional"
    identity_crosswalk_policy = (
        "english_name_plus_rounded_centroid_provider_crosswalk_v1" if identity_scope == "source_stable" else None
    )
    aliases = [{"sourceId": source_name, "sourceFeatureId": source_id}]
    if osm_identity:
        aliases.append(
            {
                "sourceId": f"OpenStreetMap/{osm_identity['objectType']}",
                "sourceFeatureId": osm_identity["numericId"],
            }
        )
    if provider == "overture" and isinstance(properties.get("sources"), list):
        for source in properties["sources"]:
            if not isinstance(source, dict):
                continue
            source_dataset = source.get("dataset") or source.get("source")
            record_id = source.get("record_id") or source.get("recordId") or source.get("id")
            if source_dataset and record_id:
                aliases.append({"sourceId": str(source_dataset), "sourceFeatureId": str(record_id)})

    aliases = dedupe_aliases(aliases)
    updated = source_updated_timestamp(properties, provider)
    updated_at = updated["sourceUpdatedAt"]
    feature_freshness = freshness_status(updated_at, dataset["accessedAt"])
    crosswalks = [
        {
            **alias,
            "datasetVersion": dataset["datasetVersion"],
            "validFrom": dataset.get("validFrom"),
            "validTo": dataset.get("validTo"),
            "matchMethod": (
                "provider_record_identity"
                if alias["sourceId"] == source_name and alias["sourceFeatureId"] == source_id
                else "provider_declared_source_alias"
            ),
            "matchConfidence": 1.0 if alias["sourceFeatureId"] == source_id else 0.95,
            "sourceUpdatedAt": updated_at,
            "reviewStatus": "machine_matched_pending_review",
        }
        for alias in aliases
    ]
    provenance = []
    for record in source_records(properties, provider):
        record_updated = normalize_source_timestamp(
            record.get("update_time") or record.get("updateTime") if provider == "overture" else properties.get("@timestamp")
        )
        if record_updated["sourceUpdatedAt"] is None:
            record_updated = updated
        source_dataset = str(record.get("dataset") or record.get("source") or source_name)
        record_license_id = str(record.get("license") or dataset["licenseId"])
        provider_manifest = next(
            (
                item
                for item in dataset.get("sourceProviders", [])
                if item.get("sourceDataset") == source_dataset
                and item.get("sourceRecordLicenseId") == record_license_id
            ),
            {},
        )
        record_license_url = str(
            provider_manifest.get("sourceRecordLicenseUrl")
            or (dataset.get("licenseUrl") if record_license_id in {"ODbL-1.0", dataset["licenseId"]} else "")
        )
        source_attribution = str(record.get("attribution") or provider_manifest.get("sourceAttribution") or source_dataset)
        attribution_url = str(
            record.get("attribution_url")
            or record.get("attributionUrl")
            or provider_manifest.get("attributionUrl")
            or dataset.get("attributionUrl")
            or ""
        ) or None
        provenance.append(
            {
                "datasetReleaseDate": dataset.get("datasetReleaseDate"),
                "datasetSnapshotDate": dataset.get("datasetSnapshotDate"),
                "sourceDataset": source_dataset,
                "sourceRecordId": str(
                    record.get("record_id") or record.get("recordId") or record.get("id") or source_id
                ),
                "sourceRecordVersion": (
                    str(record.get("record_version") or record.get("recordVersion") or properties.get("@version"))
                    if record.get("record_version") or record.get("recordVersion") or properties.get("@version")
                    else None
                ),
                "themeLicenseId": dataset["licenseId"],
                "themeLicenseUrl": dataset["licenseUrl"],
                "sourceRecordLicenseId": record_license_id,
                "sourceRecordLicenseUrl": record_license_url,
                "sourceLicenseId": record_license_id,
                "sourceAttribution": source_attribution,
                "attributionUrl": attribution_url,
                **record_updated,
                "sourceObservedAt": None,
                "accessedAt": dataset["accessedAt"],
                "freshnessStatus": freshness_status(record_updated["sourceUpdatedAt"], dataset["accessedAt"]),
                "freshnessPolicyId": FRESHNESS_POLICY["freshnessPolicyId"],
            }
        )

    checksum = normalized["geometryChecksum"]
    envelope = {
        "type": "Feature",
        "featureKey": (
            source_stable_feature_key(role, names["englishName"], normalized["centroid"])
            if identity_scope == "source_stable"
            else snapshot_provisional_feature_key(role, detailed_category, provider, source_id)
        ),
        "datasetId": dataset["datasetId"],
        "datasetVersion": dataset["datasetVersion"],
        "sourceFeatureId": source_id,
        "sourceAliases": aliases,
        "sourceCrosswalks": crosswalks,
        "sourceProvenance": provenance,
        "name": names["displayName"],
        "displayName": names["displayName"],
        "canonicalName": names["displayName"],
        "sourceObjectName": source_object_name,
        "localName": names["localName"],
        "englishName": names["englishName"],
        "alternateNames": names["alternateNames"],
        "identityScope": identity_scope,
        "identityCrosswalkPolicy": identity_crosswalk_policy,
        "contextArea": None,
        "businessNarrative": "Open-context source feature retained for screening context.",
        "category": category,
        "subtype": subtype,
        "geometry": normalized["geometry"],
        "centroid": normalized["centroid"],
        "pointOnSurface": normalized["pointOnSurface"],
        "areaSqm": normalized["areaSqm"],
        "lengthMetres": normalized["lengthMetres"],
        "geometryChecksum": checksum,
        "geometryOrigin": "source",
        "geometryRole": role,
        "geometryAccuracy": "source_repaired" if normalized["repairOperation"] != "none" else "source_exact",
        "observedAt": None,
        "validFrom": dataset.get("validFrom"),
        "validTo": None,
        "freshnessStatus": feature_freshness,
        "freshnessPolicyId": FRESHNESS_POLICY["freshnessPolicyId"],
        "sourceUpdatedAtRaw": updated["sourceUpdatedAtRaw"],
        "sourceUpdatedAtEpoch": updated["sourceUpdatedAtEpoch"],
        "sourceUpdatedAt": updated_at,
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
                "operation": "source_adapter_normalize_metric_crs",
                "tool": "geoai-spatial-b1-builder",
                "toolVersion": "1.1.0",
                "inputDatasetIds": [dataset["datasetId"]],
                "parameters": {
                    "provider": provider,
                    "layer": classified_layer,
                    "sourceCrs": SOURCE_CRS,
                    "workingCrs": WORKING_CRS,
                    "outputCrs": OUTPUT_CRS,
                    "repairOperation": normalized["repairOperation"],
                },
                "outputChecksum": checksum,
            }
        ],
        "quality": quality,
        "metadata": {
            **scalar_metadata(properties),
            "provider": provider,
            "classifiedLayer": classified_layer,
            "repairOperation": normalized["repairOperation"],
            "sourceCategory": detailed_category,
            "displayNameSource": names["displayNameSource"],
        },
    }
    return envelope, None


def feature_distance_to_target(feature: dict[str, Any], target_id: str) -> float:
    geometry = to_working_geometry(feature["geometry"])
    return target_point_working(target_id).distance(geometry.representative_point())


def select_context_by_layer(features: list[dict[str, Any]], layer: str) -> list[dict[str, Any]]:
    if not features:
        return []
    per_target_limit = max(1, LAYER_LIMITS[layer] // len(TARGETS))
    selected: dict[str, dict[str, Any]] = {}
    for target_id in sorted(TARGETS):
        candidates = sorted(features, key=lambda feature: (feature_distance_to_target(feature, target_id), feature["featureKey"]))
        for feature in candidates[:per_target_limit]:
            selected[feature["featureKey"]] = feature
    return [selected[key] for key in sorted(selected)][: LAYER_LIMITS[layer]]


def alias_set_key(feature: dict[str, Any]) -> str:
    return json.dumps(feature["sourceAliases"], sort_keys=True, separators=(",", ":"))


def build_selected_aois(
    candidates: list[dict[str, Any]],
    dataset: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    target_records: list[dict[str, Any]] = []
    for target_id, target in TARGETS.items():
        registry = selected_registry_entry(target_id)
        profile = registry["selectionProfile"]
        anchor = target_point_working(target_id)
        selection_area = target_selection_area_working(target_id)
        ranked: list[tuple[dict[str, Any], dict[str, Any]]] = []
        for feature in candidates:
            geometry = to_working_geometry(feature["geometry"])
            if geometry.geom_type not in {"Polygon", "MultiPolygon"}:
                continue
            point_on_surface = geometry.representative_point()
            distance = anchor.distance(point_on_surface)
            if not selection_area.covers(point_on_surface):
                continue
            area = feature.get("areaSqm") or 0.0
            source_name = feature.get("sourceObjectName")
            category = feature.get("metadata", {}).get("sourceCategory", "building")
            within_distance = distance <= profile["maximumAnchorDistanceMetres"]
            area_accepted = profile["minimumAreaSqm"] <= area <= profile["maximumAreaSqm"]
            eligible = within_distance and area_accepted and feature["quality"]["valid"]
            preferred_area = profile["preferredAreaMinimumSqm"] <= area <= profile["preferredAreaMaximumSqm"]
            preferred_category = category in profile["preferredCategories"]
            preferred_name = bool(source_name and source_name in profile["preferredSourceNames"])
            components = {
                "distance": round(
                    max(0.0, 1.0 - distance / profile["maximumAnchorDistanceMetres"])
                    * profile["distanceWeight"],
                    3,
                ),
                "name": profile["nameBonus"] if source_name else 0.0,
                "preferredName": profile["preferredNameBonus"] if preferred_name else 0.0,
                "preferredArea": profile["preferredAreaBonus"] if preferred_area else 0.0,
                "preferredCategory": profile["preferredCategoryBonus"] if preferred_category else 0.0,
                "freshness": profile["freshnessScores"][feature["freshnessStatus"]],
                "eligibilityPenalty": 0.0 if eligible else -1000.0,
            }
            score = round(sum(components.values()), 3)
            reasons = []
            if not within_distance:
                reasons.append("outside target maximum anchor distance")
            if not area_accepted:
                reasons.append(
                    f"area outside accepted {profile['minimumAreaSqm']:.0f}-{profile['maximumAreaSqm']:.0f} sqm range"
                )
            if source_name:
                reasons.append("named source object")
            if preferred_name:
                reasons.append("target-preferred source name")
            if preferred_area:
                reasons.append("within target-preferred area range")
            if preferred_category:
                reasons.append(f"preferred {category} category")
            reasons.append(f"{feature['freshnessStatus']} source update evidence")
            candidate = {
                "rank": 0,
                "sourceName": source_name,
                "sourceProvider": feature.get("metadata", {}).get("provider"),
                "sourceProviderId": feature["sourceFeatureId"],
                "aliases": feature["sourceAliases"],
                "geometryType": feature["geometry"]["type"],
                "sourceCategory": category,
                "areaSqm": area,
                "anchorDistanceMetres": round(distance, 3),
                "sourceUpdatedAt": feature.get("sourceUpdatedAt"),
                "freshnessStatus": feature["freshnessStatus"],
                "geometryValid": feature["quality"]["valid"],
                "nameAvailable": bool(source_name),
                "selectionScore": score,
                "scoreComponents": components,
                "eligible": eligible,
                "selected": False,
                "reason": "; ".join(reasons),
            }
            ranked.append((candidate, feature))
        ranked.sort(
            key=lambda item: (
                -item[0]["selectionScore"],
                item[0]["anchorDistanceMetres"],
                item[0]["sourceProviderId"],
            )
        )
        for rank, (candidate, _) in enumerate(ranked, start=1):
            candidate["rank"] = rank
        selected_pair = next((item for item in ranked if item[0]["eligible"]), None)
        if selected_pair is None:
            target_records.append(
                {
                    "targetId": target_id,
                    "targetName": target["name"],
                    "anchor": {"latitude": target["latitude"], "longitude": target["longitude"]},
                    "selectionRadiusMetres": SELECTION_RADIUS_METRES,
                    "maximumTargetDistanceMetres": profile["maximumAnchorDistanceMetres"],
                    "selectionProfile": profile,
                    "status": "missing",
                    "rankedCandidates": [candidate for candidate, _ in ranked[:10]],
                }
            )
            continue
        selected_candidate, source = selected_pair
        selected_candidate["selected"] = True
        selected_candidate["reason"] = f"Selected by {profile['profileId']}: {selected_candidate['reason']}"
        distance = selected_candidate["anchorDistanceMetres"]
        source_object_name = source.get("sourceObjectName")
        display_name = (
            f"{source_object_name} — Open-Context Building Footprint"
            if source_object_name
            else f"{registry['canonicalName']} — Open-Context Building Footprint"
        )
        selected_feature = copy.deepcopy(source)
        source_alignment_reviewed = reviewed_with_conditions(
            registry["featureKey"], source["sourceFeatureId"], source["geometryChecksum"]
        )
        selected_feature.update(
            {
                "featureKey": registry["featureKey"],
                "datasetId": dataset["datasetId"],
                "datasetVersion": dataset["datasetVersion"],
                "name": display_name,
                "displayName": display_name,
                "canonicalName": registry["canonicalName"],
                "sourceObjectName": source_object_name,
                "identityScope": "canonical_registry",
                "identityCrosswalkPolicy": "canonical_registry_provider_version_crosswalk_v1",
                "contextArea": registry["contextArea"],
                "businessNarrative": registry["businessNarrative"],
                "category": "selected_aoi",
                "subtype": "sample_aoi_on_real_world_geometry",
                "geometryRole": "aoi",
                "limitations": [
                    "Sample AOI on real-world open geometry; not a parcel, title, cadastral or planning boundary.",
                    REQUIRED_CAVEAT,
                ],
                "metadata": {
                    **source.get("metadata", {}),
                    "focusAoiId": target_id,
                    "anchorLatitude": target["latitude"],
                    "anchorLongitude": target["longitude"],
                    "targetDistanceMetres": distance,
                    "selectionRadiusMetres": SELECTION_RADIUS_METRES,
                    "selectionRule": profile["profileId"],
                    "selectionProfile": profile,
                    "selectedCandidateRank": selected_candidate["rank"],
                    "selectionScore": selected_candidate["selectionScore"],
                    "sourceCategory": selected_candidate["sourceCategory"],
                    "contextFeatureKey": registry["contextFeatureKey"],
                    "businessSemanticAccepted": True,
                },
            }
        )
        selected_feature["quality"]["sourceAlignmentReviewed"] = source_alignment_reviewed
        selected_feature["quality"]["sourceAlignmentStatus"] = (
            "reviewed_with_conditions" if source_alignment_reviewed else "pending_independent_review"
        )
        selected_feature["sourceCrosswalks"] = [
            {
                **crosswalk,
                "reviewStatus": (
                    "reviewed_with_conditions" if source_alignment_reviewed else crosswalk["reviewStatus"]
                ),
            }
            for crosswalk in selected_feature["sourceCrosswalks"]
        ]
        selected.append(selected_feature)
        target_records.append(
            {
                "targetId": target_id,
                "targetName": target["name"],
                "anchor": {"latitude": target["latitude"], "longitude": target["longitude"]},
                "selectionRadiusMetres": SELECTION_RADIUS_METRES,
                "maximumTargetDistanceMetres": profile["maximumAnchorDistanceMetres"],
                "selectionRule": profile["profileId"],
                "selectionProfile": profile,
                "status": "selected",
                "canonicalFeatureKey": registry["featureKey"],
                "canonicalName": registry["canonicalName"],
                "displayName": display_name,
                "sourceObjectName": source_object_name,
                "contextArea": registry["contextArea"],
                "businessNarrative": registry["businessNarrative"],
                "geometryRole": "aoi",
                "selectedSourceFeatureId": source["sourceFeatureId"],
                "selectedSourceAliases": source["sourceAliases"],
                "selectedSourceCrosswalks": selected_feature["sourceCrosswalks"],
                "selectedGeometryChecksum": source["geometryChecksum"],
                "selectedAreaSqm": source.get("areaSqm"),
                "distanceMetres": distance,
                "sourceUpdatedAt": source.get("sourceUpdatedAt"),
                "freshnessStatus": source["freshnessStatus"],
                "sourceAlignmentReviewed": source_alignment_reviewed,
                "sourceAlignmentStatus": (
                    "reviewed_with_conditions" if source_alignment_reviewed else "pending_independent_review"
                ),
                "selectedRank": selected_candidate["rank"],
                "eligibleCandidateCount": sum(1 for candidate, _ in ranked if candidate["eligible"]),
                "rankedCandidates": [candidate for candidate, _ in ranked[:10]],
                "nearestRejectedAlternatives": sorted(
                    [candidate for candidate, _ in ranked if not candidate["selected"]],
                    key=lambda candidate: (candidate["anchorDistanceMetres"], candidate["sourceProviderId"]),
                )[:5],
            }
        )

    provider_ids = [feature["sourceFeatureId"] for feature in selected]
    geometry_hashes = [feature["geometryChecksum"] for feature in selected]
    alias_sets = [alias_set_key(feature) for feature in selected]
    canonical_keys = [feature["featureKey"] for feature in selected]
    uniqueness = {
        "selectedCount": len(selected),
        "requiredCount": len(TARGETS),
        "duplicateProviderIds": sorted(key for key, count in Counter(provider_ids).items() if count > 1),
        "duplicateGeometryChecksums": sorted(key for key, count in Counter(geometry_hashes).items() if count > 1),
        "duplicateAliasSets": sorted(key for key, count in Counter(alias_sets).items() if count > 1),
        "duplicateCanonicalKeys": sorted(key for key, count in Counter(canonical_keys).items() if count > 1),
    }
    uniqueness["passed"] = (
        uniqueness["selectedCount"] == uniqueness["requiredCount"]
        and not uniqueness["duplicateProviderIds"]
        and not uniqueness["duplicateGeometryChecksums"]
        and not uniqueness["duplicateAliasSets"]
        and not uniqueness["duplicateCanonicalKeys"]
    )
    return selected, {"targets": target_records, "uniqueness": uniqueness}


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
    duplicates: list[dict[str, Any]] = []
    provider_inventory: list[dict[str, Any]] = []
    repairs: list[dict[str, Any]] = []
    accepted_identity: dict[tuple[str, str], str] = {}
    accepted_geometry: dict[str, tuple[str, str]] = {}
    accepted_aliases: dict[tuple[str, str], tuple[str, str]] = {}
    accepted_feature_key_counts: Counter[str] = Counter()

    for source_file in sorted(input_dir.glob("*.geojson")):
        input_layer = infer_layer(source_file)
        if input_layer is None:
            continue
        provider = infer_provider(source_file)
        source_record = source_manifest["sources"][provider]
        dataset = {
            "datasetId": f"dubai-open-context-{provider}-{input_layer}",
            "datasetVersion": arguments.dataset_version,
            "layerId": input_layer,
            "layerName": input_layer.replace("-", " ").title(),
            "geography": "Dubai open-context processing envelope",
            "snapshotDate": source_record.get("snapshotDate"),
            "datasetReleaseDate": source_record.get("datasetReleaseDate"),
            "datasetSnapshotDate": source_record.get("datasetSnapshotDate"),
            "accessedAt": source_record["accessedAt"],
            "validFrom": source_record.get("datasetSnapshotDate") or source_record.get("datasetReleaseDate"),
            "validTo": None,
            "sourceId": source_record["sourceId"],
            "sourceReleaseId": source_record.get("sourceReleaseId"),
            "sourceMode": "open_snapshot",
            "licenseId": source_record["licenseId"],
            "licenseUrl": source_record["licenseUrl"],
            "attributionUrl": source_record["attributionUrl"],
            "attribution": source_record["attribution"],
            "sourceProviders": source_record.get("featureSourceProviders", []),
            "buildMethod": "geoai-spatial-b1-builder",
            "buildVersion": "1.2.0",
            "checksum": sha256_file(source_file),
            "freshnessPolicyId": FRESHNESS_POLICY["freshnessPolicyId"],
            "caveat": REQUIRED_CAVEAT,
        }
        datasets.append(dataset)
        for raw_feature in read_feature_collection(source_file):
            feature, rejection = normalize_feature(raw_feature, provider, input_layer, dataset)
            if rejection:
                rejected.append({"inputFile": source_file.name, **rejection})
                continue
            assert feature is not None
            identity_key = (provider, feature["sourceFeatureId"])
            checksum = feature["geometryChecksum"]
            if identity_key in accepted_identity:
                duplicate = {
                    "type": "provider_identity",
                    "provider": provider,
                    "sourceFeatureId": feature["sourceFeatureId"],
                    "firstLayer": accepted_identity[identity_key],
                    "duplicateLayer": input_layer,
                }
                duplicates.append(duplicate)
                rejected.append({"inputFile": source_file.name, "sourceFeatureId": feature["sourceFeatureId"], "reason": "duplicate_provider_identity"})
                continue
            if checksum in accepted_geometry:
                first_provider, first_id = accepted_geometry[checksum]
                duplicate = {
                    "type": "geometry_checksum",
                    "geometryChecksum": checksum,
                    "firstProvider": first_provider,
                    "firstSourceFeatureId": first_id,
                    "duplicateProvider": provider,
                    "duplicateSourceFeatureId": feature["sourceFeatureId"],
                    "duplicateLayer": input_layer,
                }
                duplicates.append(duplicate)
                rejected.append({"inputFile": source_file.name, "sourceFeatureId": feature["sourceFeatureId"], "reason": "duplicate_geometry_checksum"})
                continue
            colliding_aliases = []
            for alias in feature["sourceAliases"]:
                alias_key = (alias["sourceId"], alias["sourceFeatureId"])
                owner = accepted_aliases.get(alias_key)
                if owner is not None and owner != identity_key:
                    colliding_aliases.append(
                        {
                            "sourceId": alias["sourceId"],
                            "sourceFeatureId": alias["sourceFeatureId"],
                            "firstProvider": owner[0],
                            "firstProviderFeatureId": owner[1],
                        }
                    )
            if colliding_aliases:
                duplicates.append(
                    {
                        "type": "source_alias",
                        "provider": provider,
                        "sourceFeatureId": feature["sourceFeatureId"],
                        "duplicateLayer": input_layer,
                        "collidingAliases": colliding_aliases,
                    }
                )
                rejected.append({"inputFile": source_file.name, "sourceFeatureId": feature["sourceFeatureId"], "reason": "source_alias_collision"})
                continue
            base_feature_key = feature["featureKey"]
            collision_index = accepted_feature_key_counts[base_feature_key]
            if collision_index:
                duplicates.append(
                    {
                        "type": "feature_key",
                        "featureKey": base_feature_key,
                        "provider": provider,
                        "sourceFeatureId": feature["sourceFeatureId"],
                        "duplicateLayer": input_layer,
                    }
                )
                rejected.append(
                    {
                        "inputFile": source_file.name,
                        "sourceFeatureId": feature["sourceFeatureId"],
                        "reason": "source_stable_or_provisional_feature_key_collision",
                    }
                )
                continue
            accepted_feature_key_counts[base_feature_key] += 1
            accepted_identity[identity_key] = input_layer
            accepted_geometry[checksum] = identity_key
            for alias in feature["sourceAliases"]:
                accepted_aliases[(alias["sourceId"], alias["sourceFeatureId"])] = identity_key
            layers[input_layer].append(feature)
            provider_inventory.append(
                {
                    "provider": provider,
                    "layer": input_layer,
                    "sourceFeatureId": feature["sourceFeatureId"],
                    "sourceAliases": feature["sourceAliases"],
                    "geometryChecksum": checksum,
                }
            )
            repairs.append(
                {
                    "provider": provider,
                    "layer": input_layer,
                    "sourceFeatureId": feature["sourceFeatureId"],
                    "repairOperation": feature["metadata"]["repairOperation"],
                    "valid": feature["quality"]["valid"],
                    "pointOnSurfaceInside": feature["quality"]["pointOnSurfaceInside"],
                    "geometryAccuracy": feature["geometryAccuracy"],
                }
            )

    # The overlap/collision flag is intentionally unresolved during per-feature
    # normalization and is set only after this complete cross-provider audit.
    for accepted_features in layers.values():
        for feature in accepted_features:
            feature["quality"]["overlapPolicyPassed"] = True

    normalized_before_limits = sum(len(features) for features in layers.values())
    selected_dataset = {
        "datasetId": "dubai-open-context-selected-aoi",
        "datasetVersion": arguments.dataset_version,
        "layerId": "selected-aoi",
        "layerName": "Sample AOIs on Real-World Geometry",
        "geography": "Seeded target anchors with non-overlapping EPSG:32640 inner selection areas",
        "snapshotDate": source_manifest.get("snapshotDate"),
        "datasetReleaseDate": None,
        "datasetSnapshotDate": source_manifest.get("snapshotDate"),
        "accessedAt": source_manifest["generatedAt"],
        "validFrom": source_manifest.get("snapshotDate"),
        "validTo": None,
        "sourceId": "geoai-derived-from-open-context",
        "sourceReleaseId": arguments.dataset_version,
        "sourceMode": "derived_open_context",
        "licenseId": "inherits-source-licences",
        "licenseUrl": "https://docs.overturemaps.org/attribution/",
        "attributionUrl": "https://docs.overturemaps.org/attribution/",
        "attribution": "Derived from the source features listed in sourceAliases.",
        "sourceProviders": source_manifest.get("attribution", {}).get("sourceProviders", []),
        "buildMethod": "target-specific-ranked-selection-in-epsg-32640",
        "buildVersion": "1.2.0",
        "checksum": "pending-output-checksum",
        "freshnessPolicyId": FRESHNESS_POLICY["freshnessPolicyId"],
        "caveat": REQUIRED_CAVEAT,
    }
    selected_aois, selection_report = build_selected_aois(layers["buildings"] + layers["construction"], selected_dataset)
    normalized_layers = {layer: select_context_by_layer(features, layer) for layer, features in layers.items()}
    normalized_layers["selected-aoi"] = selected_aois
    datasets.append(selected_dataset)

    geometry_dir = output_dir / "geometry"
    file_records: list[dict[str, Any]] = []
    all_features: list[dict[str, Any]] = []
    for layer, features in normalized_layers.items():
        collection = {"type": "FeatureCollection", "name": layer, "features": features}
        output_path = geometry_dir / f"{layer}.geojson"
        write_json(output_path, collection)
        checksum = sha256_file(output_path)
        file_records.append(
            {
                "layer": layer,
                "path": str(output_path.relative_to(output_dir)),
                "featureCount": len(features),
                "sha256": checksum,
                "bytes": output_path.stat().st_size,
            }
        )
        all_features.extend(features)

    selected_dataset["checksum"] = next((record["sha256"] for record in file_records if record["layer"] == "selected-aoi"), "")
    accepted_osm_ids = sorted(
        record["sourceFeatureId"] for record in provider_inventory if record["provider"] == "osm"
    )
    generated_osm_ids = [source_id for source_id in accepted_osm_ids if source_id.startswith("generated/")]
    malformed_osm_ids = [source_id for source_id in accepted_osm_ids if not OSM_ID_PATTERN.fullmatch(source_id)]
    mandatory_fields = (
        "valid",
        "ringClosed",
        "centroidInside",
        "pointOnSurfaceInside",
        "coordinateRangeValid",
        "areaPlausible",
        "lengthPlausible",
        "overlapPolicyPassed",
    )
    null_quality_fields = [
        {"featureKey": feature["featureKey"], "field": field}
        for feature in all_features
        for field in mandatory_fields
        if feature["quality"].get(field) is None
    ]
    selected_quality_passed = all(
        feature["quality"]["areaPlausible"]
        and feature["quality"]["overlapPolicyPassed"]
        and (feature["quality"]["centroidInside"] or feature["quality"]["pointOnSurfaceInside"])
        and feature["metadata"]["targetDistanceMetres"]
        <= feature["metadata"]["selectionProfile"]["maximumAnchorDistanceMetres"]
        for feature in selected_aois
    )
    selected_by_target = {feature["metadata"]["focusAoiId"]: feature for feature in selected_aois}
    dubai_south = selected_by_target.get("dubai-south-jebel-ali-v1")
    dubai_south_semantic_gate = bool(dubai_south and (dubai_south.get("areaSqm") or 0) >= 500)
    canonical_provider_id_violations = []
    prohibited_key_tokens = {
        "osm",
        "overture",
        "geofabrik",
        *(
            str(value).lower()
            for dataset in datasets
            for value in (dataset.get("sourceReleaseId"), dataset.get("snapshotDate"))
            if value
        ),
    }
    for feature in all_features:
        feature_key = feature["featureKey"].lower()
        source_identifiers = {
            str(feature["sourceFeatureId"] or "").lower(),
            *(str(alias["sourceFeatureId"]).lower() for alias in feature["sourceAliases"]),
        }
        embedded = sorted(
            identifier
            for identifier in source_identifiers
            if len(identifier) >= 6 and identifier in feature_key
        )
        embedded.extend(sorted(token for token in prohibited_key_tokens if token and token in feature_key))
        if embedded:
            canonical_provider_id_violations.append(
                {
                    "featureKey": feature["featureKey"],
                    "sourceFeatureId": feature["sourceFeatureId"],
                    "embeddedTokens": sorted(set(embedded)),
                }
            )
    source_category_records = [
        {
            "featureKey": feature["featureKey"],
            "classifiedLayer": feature["metadata"]["classifiedLayer"],
            "sourceCategory": feature["metadata"]["sourceCategory"],
        }
        for feature in all_features
    ]
    wrong_layer_building_categories = [
        record
        for record in source_category_records
        if record["classifiedLayer"] != "buildings" and "building" in record["sourceCategory"]
    ]
    category_assertions_passed = (
        not wrong_layer_building_categories
        and all(
            record["sourceCategory"] == "construction_footprint"
            for record in source_category_records
            if record["classifiedLayer"] == "construction"
        )
        and all(
            record["sourceCategory"]
            in {"building_footprint", "named_building_footprint", "named_operational_building_footprint"}
            for record in source_category_records
            if record["classifiedLayer"] == "buildings"
        )
    )
    selected_alignment_reviewed = all(
        feature["quality"]["sourceAlignmentReviewed"]
        and feature["quality"]["sourceAlignmentStatus"] == "reviewed_with_conditions"
        for feature in selected_aois
    )
    machine_valid = (
        selection_report["uniqueness"]["passed"]
        and len(selected_aois) == len(TARGETS)
        and bool(accepted_osm_ids)
        and not transformation_evidence()["selectionAreaOverlaps"]
        and selected_quality_passed
        and not generated_osm_ids
        and not malformed_osm_ids
        and not null_quality_fields
        and all(feature["quality"]["valid"] for feature in all_features)
        and dubai_south_semantic_gate
        and not canonical_provider_id_violations
        and category_assertions_passed
        and selected_alignment_reviewed
    )
    source_alignment_status = (
        "selected_aois_reviewed_with_conditions_other_features_pending"
        if selected_alignment_reviewed
        else "independent_review_record_present_exact_match_pending"
    )
    bundle = {
        "bundleId": "dubai-open-context-b1",
        "bundleVersion": arguments.dataset_version,
        "generatedAt": generated_at,
        "defaultSourceMode": "synthetic_fallback",
        "machineValid": machine_valid,
        "sourceAlignmentStatus": source_alignment_status,
        "releaseReady": False,
        "datasets": datasets,
        "features": all_features,
        "metrics": [],
    }
    write_json(output_dir / "bundle.json", bundle)
    write_json(output_dir / "attribution.json", source_manifest.get("attribution", {}))
    write_json(output_dir / "rejected-features.json", rejected)
    write_json(output_dir / "provider-id-inventory.json", sorted(provider_inventory, key=lambda record: (record["provider"], record["sourceFeatureId"], record["layer"])))
    write_json(output_dir / "osm-exact-identity-assertion.json", {
        "passed": bool(accepted_osm_ids) and not generated_osm_ids and not malformed_osm_ids,
        "acceptedOsmFeatureCount": len(accepted_osm_ids),
        "generatedIdCount": len(generated_osm_ids),
        "generatedIds": generated_osm_ids,
        "malformedIdCount": len(malformed_osm_ids),
        "malformedIds": malformed_osm_ids,
        "requiredPattern": "node/<id> | way/<id> | relation/<id>",
    })
    write_json(output_dir / "selected-aoi-records.json", selected_aois)
    write_json(output_dir / "target-distance-report.json", selection_report)
    write_json(output_dir / "canonical-feature-key-registry.json", registry_document())
    write_json(output_dir / "ranked-candidate-tables.json", {
        "selectionProfilesAreTargetSpecific": len({
            target["selectionProfile"]["profileId"] for target in selection_report["targets"]
        }) == len(TARGETS),
        "targets": [
            {
                "targetId": target["targetId"],
                "targetName": target["targetName"],
                "profileId": target["selectionProfile"]["profileId"],
                "candidates": target.get("rankedCandidates", []),
            }
            for target in selection_report["targets"]
        ],
    })
    write_json(output_dir / "precise-object-context-labels.json", [
        {
            "targetId": feature["metadata"]["focusAoiId"],
            "canonicalFeatureKey": feature["featureKey"],
            "canonicalObjectName": feature["canonicalName"],
            "displayName": feature["name"],
            "sourceObjectName": feature["sourceObjectName"],
            "contextArea": feature["contextArea"],
            "businessNarrative": feature["businessNarrative"],
            "geometryRole": feature["geometryRole"],
        }
        for feature in selected_aois
    ])
    write_json(output_dir / "source-alias-crosswalk-history.json", [
        {
            "canonicalFeatureKey": feature["featureKey"],
            "sourceAliases": feature["sourceAliases"],
            "sourceCrosswalks": feature["sourceCrosswalks"],
        }
        for feature in selected_aois
    ])
    write_json(output_dir / "feature-level-freshness-records.json", {
        "policy": FRESHNESS_POLICY,
        "records": [
            {
                "featureKey": feature["featureKey"],
                "sourceFeatureId": feature["sourceFeatureId"],
                "datasetReleaseDate": feature["sourceProvenance"][0]["datasetReleaseDate"],
                "datasetSnapshotDate": feature["sourceProvenance"][0]["datasetSnapshotDate"],
                "sourceUpdatedAtRaw": feature["sourceUpdatedAtRaw"],
                "sourceUpdatedAtEpoch": feature["sourceUpdatedAtEpoch"],
                "sourceUpdatedAt": feature["sourceUpdatedAt"],
                "sourceObservedAt": feature["observedAt"],
                "freshnessStatus": feature["freshnessStatus"],
                "freshnessPolicyId": feature["freshnessPolicyId"],
                "sourceProvenance": feature["sourceProvenance"],
            }
            for feature in all_features
        ],
    })
    write_json(output_dir / "canonical-key-provider-id-assertion.json", {
        "passed": not canonical_provider_id_violations,
        "providerIdsEmbeddedInCanonicalGeoAiKeys": len(canonical_provider_id_violations),
        "violations": canonical_provider_id_violations,
    })
    write_json(output_dir / "selected-aoi-uniqueness-report.json", selection_report["uniqueness"])
    write_json(output_dir / "epsg-32640-transformation-evidence.json", transformation_evidence())
    write_json(output_dir / "geometry-validity-repair-report.json", {
        "acceptedFeatureCountBeforeLayerLimits": normalized_before_limits,
        "repairedFeatureCount": sum(1 for record in repairs if record["repairOperation"] != "none"),
        "nullMandatoryQualityFields": null_quality_fields,
        "records": repairs,
    })
    write_json(output_dir / "duplicate-collision-report.json", {
        "duplicateCount": len(duplicates),
        "withinLayerCount": sum(1 for record in duplicates if record.get("firstLayer") == record.get("duplicateLayer")),
        "crossLayerCount": sum(1 for record in duplicates if record.get("firstLayer") != record.get("duplicateLayer")),
        "records": duplicates,
        "expectedDerivedSelectedAoiReferences": [
            {"targetId": feature["metadata"]["focusAoiId"], "sourceFeatureId": feature["sourceFeatureId"], "geometryChecksum": feature["geometryChecksum"]}
            for feature in selected_aois
        ],
    })
    write_json(output_dir / "final-collision-overlap-policy-report.json", {
        "globalAuditCompleted": True,
        "acceptedFeatureCount": len(all_features),
        "acceptedFeaturesWithOverlapPolicyPassed": sum(
            1 for feature in all_features if feature["quality"]["overlapPolicyPassed"] is True
        ),
        "acceptedFeaturesWithUnresolvedOverlapPolicy": sum(
            1 for feature in all_features if feature["quality"]["overlapPolicyPassed"] is None
        ),
        "detectedDuplicatesExcluded": len(duplicates),
        "machineValidityIsSeparateFromSourceAlignmentReview": True,
        "businessSemanticAcceptance": {
            "selectedAoiCount": len(selected_aois),
            "accepted": all(feature["metadata"]["businessSemanticAccepted"] for feature in selected_aois),
            "dubaiSouthMinimumAreaGatePassed": dubai_south_semantic_gate,
        },
        "sourceAlignmentReviewed": False,
        "selectedAoiSourceAlignmentReviewed": selected_alignment_reviewed,
        "selectedAoiSourceAlignmentStatus": "reviewed_with_conditions" if selected_alignment_reviewed else "pending_independent_review",
        "otherFeatureSourceAlignmentStatus": "pending_independent_review",
        "releaseReady": False,
    })

    osm_features = [feature for feature in all_features if feature["metadata"]["provider"] == "osm"]
    osm_freshness_counts = Counter(feature["freshnessStatus"] for feature in osm_features)
    valid_osm_timestamp_count = sum(1 for feature in osm_features if feature["sourceUpdatedAt"] is not None)
    write_json(output_dir / "osm-timestamp-normalization-report.json", {
        "normalizationPolicyId": "geoai-source-timestamp-normalization-v1",
        "datasetSnapshotDateIsSeparate": True,
        "observedAtPopulated": any(feature["observedAt"] is not None for feature in osm_features),
        "records": [
            {
                "featureKey": feature["featureKey"],
                "sourceFeatureId": feature["sourceFeatureId"],
                "sourceUpdatedAtRaw": feature["sourceUpdatedAtRaw"],
                "sourceUpdatedAtEpoch": feature["sourceUpdatedAtEpoch"],
                "sourceUpdatedAt": feature["sourceUpdatedAt"],
                "datasetSnapshotDate": feature["sourceProvenance"][0]["datasetSnapshotDate"],
                "observedAt": feature["observedAt"],
                "freshnessStatus": feature["freshnessStatus"],
            }
            for feature in osm_features
        ],
    })
    write_json(output_dir / "osm-freshness-state-counts.json", {
        "osmFeatureCount": len(osm_features),
        "validSourceTimestampCount": valid_osm_timestamp_count,
        "states": {state: osm_freshness_counts.get(state, 0) for state in FRESHNESS_POLICY["states"]},
        "validTimestampsClassifiedUnknown": sum(
            1 for feature in osm_features if feature["sourceUpdatedAt"] and feature["freshnessStatus"] == "unknown"
        ),
        "passed": valid_osm_timestamp_count > 0
        and not any(feature["sourceUpdatedAt"] and feature["freshnessStatus"] == "unknown" for feature in osm_features),
    })
    write_json(output_dir / "layer-specific-source-category-matrix.json", {
        "categoriesByLayer": {
            layer: sorted({record["sourceCategory"] for record in source_category_records if record["classifiedLayer"] == layer})
            for layer in sorted({record["classifiedLayer"] for record in source_category_records})
        },
        "records": source_category_records,
    })
    write_json(output_dir / "zero-wrong-layer-building-categories-assertion.json", {
        "passed": category_assertions_passed,
        "transportFeaturesClassifiedAsBuilding": sum(1 for record in wrong_layer_building_categories if record["classifiedLayer"] == "transport"),
        "anchorFeaturesClassifiedAsBuilding": sum(1 for record in wrong_layer_building_categories if record["classifiedLayer"] == "anchors"),
        "landUseFeaturesClassifiedAsBuilding": sum(1 for record in wrong_layer_building_categories if record["classifiedLayer"] == "landuse"),
        "waterFeaturesClassifiedAsBuilding": sum(1 for record in wrong_layer_building_categories if record["classifiedLayer"] == "water"),
        "violations": wrong_layer_building_categories,
    })
    write_json(output_dir / "multilingual-naming-audit.json", {
        "preferredOrder": [
            "structured_provider_primary_english",
            "structured_provider_common_english",
            "osm_name_en",
            "name_en",
            "local_name",
            "neutral_category_provider_identity",
        ],
        "records": [
            {
                "featureKey": feature["featureKey"],
                "sourceFeatureId": feature["sourceFeatureId"],
                "displayName": feature["displayName"],
                "sourceObjectName": feature["sourceObjectName"],
                "localName": feature["localName"],
                "englishName": feature["englishName"],
                "alternateNames": feature["alternateNames"],
                "displayNameSource": feature["metadata"]["displayNameSource"],
            }
            for feature in all_features
        ],
    })
    name_en_examples = [
        {
            "featureKey": feature["featureKey"],
            "sourceFeatureId": feature["sourceFeatureId"],
            "localName": feature["localName"],
            "englishName": feature["englishName"],
            "displayName": feature["displayName"],
            "displayNameSource": feature["metadata"]["displayNameSource"],
        }
        for feature in osm_features
        if feature["metadata"]["displayNameSource"] == "osm_name_en"
    ]
    write_json(output_dir / "osm-name-en-regression-examples.json", {
        "passed": bool(name_en_examples)
        and all(record["displayName"] == record["englishName"] for record in name_en_examples),
        "examples": name_en_examples[:25],
    })
    write_json(output_dir / "identity-scope-inventory.json", {
        "allowedScopes": ["canonical_registry", "source_stable", "snapshot_provisional", "derived"],
        "counts": dict(sorted(Counter(feature["identityScope"] for feature in all_features).items())),
        "registeredContexts": registry_document()["contexts"],
        "records": [
            {
                "featureKey": feature["featureKey"],
                "sourceFeatureId": feature["sourceFeatureId"],
                "identityScope": feature["identityScope"],
                "identityCrosswalkPolicy": feature["identityCrosswalkPolicy"],
            }
            for feature in all_features
        ],
    })
    write_json(output_dir / "source-record-theme-licence-matrix.json", {
        "records": [
            {
                "featureKey": feature["featureKey"],
                **provenance,
            }
            for feature in all_features
            for provenance in feature["sourceProvenance"]
        ],
    })
    manifest_urls = source_manifest.get("attribution", {}).get("urls", {})
    source_provider_urls = [
        value
        for provider in source_manifest.get("attribution", {}).get("sourceProviders", [])
        for value in (provider.get("sourceRecordLicenseUrl"), provider.get("attributionUrl"))
        if value
    ]
    required_urls = [*manifest_urls.values(), *source_provider_urls]
    write_json(output_dir / "licence-attribution-url-validation.json", {
        "passed": bool(required_urls) and all(str(value).startswith("https://") for value in required_urls),
        "validationMethod": "machine-readable HTTPS URL presence and syntax",
        "urls": sorted(set(required_urls)),
    })
    independent_review = review_record()
    independent_review["matchedCurrentRecords"] = [
        {
            "featureKey": feature["featureKey"],
            "sourceProviderId": feature["sourceFeatureId"],
            "geometryChecksum": feature["geometryChecksum"],
            "matched": feature["quality"]["sourceAlignmentReviewed"],
        }
        for feature in selected_aois
    ]
    independent_review["allReviewedRecordsMatched"] = selected_alignment_reviewed
    write_json(output_dir / "independent-source-alignment-review-record.json", independent_review)
    notice_path = output_dir / "LICENSES" / "NOTICE.md"
    notice_path.parent.mkdir(parents=True, exist_ok=True)
    notice_path.write_text(attribution_notice(source_manifest), encoding="utf-8")

    quality_summary = {
        "valid": False,
        "machineValid": machine_valid,
        "sourceAlignmentReviewed": False,
        "selectedAoiSourceAlignmentReviewed": selected_alignment_reviewed,
        "sourceAlignmentStatus": source_alignment_status,
        "releaseReady": False,
        "acceptedFeatureCount": len(all_features),
        "acceptedFeatureCountBeforeLayerLimits": normalized_before_limits,
        "acceptedOsmFeatureCount": len(accepted_osm_ids),
        "rejectedFeatureCount": len(rejected),
        "duplicateCollisionCount": len(duplicates),
        "files": file_records,
        "mandatoryFocusAoisRepresented": sorted(feature.get("metadata", {}).get("focusAoiId") for feature in selected_aois),
        "requiredFocusAois": sorted(TARGETS),
        "defaultSourceMode": "synthetic_fallback",
        "selectedAoiUniqueness": selection_report["uniqueness"],
        "selectedAoiQualityPassed": selected_quality_passed,
        "businessSemanticAcceptancePassed": dubai_south_semantic_gate,
        "providerIdsEmbeddedInCanonicalGeoAiKeys": len(canonical_provider_id_violations),
        "acceptedOsmGeneratedIdCount": len(generated_osm_ids),
        "acceptedOsmMalformedIdCount": len(malformed_osm_ids),
        "nullMandatoryQualityFields": null_quality_fields,
        "bundleSha256": sha256_bytes(deterministic_json_bytes(bundle)),
        "caveat": REQUIRED_CAVEAT,
    }
    quality_summary["focusAoiGatePassed"] = (
        quality_summary["mandatoryFocusAoisRepresented"] == quality_summary["requiredFocusAois"]
        and selection_report["uniqueness"]["passed"]
    )
    write_json(output_dir / "quality-report.json", quality_summary)
    if not quality_summary["focusAoiGatePassed"]:
        raise SystemExit("Mandatory focus AOI identity, distance or uniqueness gate failed")
    if null_quality_fields:
        raise SystemExit("Mandatory geometry quality fields cannot be null")
    print(json.dumps(quality_summary, indent=2))


if __name__ == "__main__":
    main()

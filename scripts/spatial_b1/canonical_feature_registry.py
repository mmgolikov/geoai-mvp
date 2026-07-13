from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

REGISTRY_VERSION = "geoai-spatial-b1-canonical-registry-v1"

SELECTED_AOI_REGISTRY: dict[str, dict[str, Any]] = {
    "dubai-marina-jbr-palm-v1": {
        "registryId": "marina-waterfront-sample-01",
        "targetId": "dubai-marina-jbr-palm-v1",
        "featureKey": "geoai:aoi:ae-du:marina-waterfront-sample-01",
        "canonicalName": "Marina Waterfront Sample 01",
        "contextFeatureKey": "geoai:area:ae-du:dubai-marina-jbr-context",
        "contextArea": "Dubai Marina / JBR / Palm",
        "businessNarrative": "Named open-context building footprint near the seeded Marina screening anchor.",
        "geometryRole": "aoi",
        "allowedGeometrySources": ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
        "selectionProfile": {
            "profileId": "marina-named-anchor-v1",
            "minimumAreaSqm": 200.0,
            "preferredAreaMinimumSqm": 300.0,
            "preferredAreaMaximumSqm": 5_000.0,
            "maximumAreaSqm": 20_000.0,
            "maximumAnchorDistanceMetres": 750.0,
            "preferredCategories": ["named_building", "building"],
            "preferredSourceNames": ["Bonaire Tower"],
            "distanceWeight": 50.0,
            "nameBonus": 20.0,
            "preferredNameBonus": 30.0,
            "preferredAreaBonus": 15.0,
            "preferredCategoryBonus": 8.0,
            "freshnessScores": {"current": 8.0, "aging": 0.0, "stale": -10.0, "unknown": -5.0},
        },
    },
    "downtown-business-bay-meydan-v1": {
        "registryId": "business-bay-sample-01",
        "targetId": "downtown-business-bay-meydan-v1",
        "featureKey": "geoai:aoi:ae-du:business-bay-sample-01",
        "canonicalName": "Business Bay Sample 01",
        "contextFeatureKey": "geoai:area:ae-du:downtown-business-bay-context",
        "contextArea": "Business Bay / Downtown / Meydan",
        "businessNarrative": "Named open-context building footprint near the seeded Business Bay screening anchor.",
        "geometryRole": "aoi",
        "allowedGeometrySources": ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
        "selectionProfile": {
            "profileId": "business-bay-named-building-v1",
            "minimumAreaSqm": 500.0,
            "preferredAreaMinimumSqm": 1_000.0,
            "preferredAreaMaximumSqm": 10_000.0,
            "maximumAreaSqm": 50_000.0,
            "maximumAnchorDistanceMetres": 750.0,
            "preferredCategories": ["named_building", "building"],
            "preferredSourceNames": [],
            "distanceWeight": 35.0,
            "nameBonus": 30.0,
            "preferredNameBonus": 0.0,
            "preferredAreaBonus": 25.0,
            "preferredCategoryBonus": 10.0,
            "freshnessScores": {"current": 10.0, "aging": 2.0, "stale": -10.0, "unknown": -5.0},
        },
    },
    "dubai-south-jebel-ali-v1": {
        "registryId": "dubai-south-industrial-sample-01",
        "targetId": "dubai-south-jebel-ali-v1",
        "featureKey": "geoai:aoi:ae-du:dubai-south-industrial-sample-01",
        "canonicalName": "Dubai South Industrial Sample 01",
        "contextFeatureKey": "geoai:area:ae-du:dubai-south-development-context",
        "contextArea": "Dubai South / Jebel Ali",
        "businessNarrative": "Named operational open-context building footprint near the seeded Dubai South screening anchor.",
        "geometryRole": "aoi",
        "allowedGeometrySources": ["synthetic_fallback", "open_snapshot", "user_provided", "official_validated"],
        "selectionProfile": {
            "profileId": "dubai-south-operational-footprint-v1",
            "minimumAreaSqm": 500.0,
            "preferredAreaMinimumSqm": 1_000.0,
            "preferredAreaMaximumSqm": 20_000.0,
            "maximumAreaSqm": 100_000.0,
            "maximumAnchorDistanceMetres": 750.0,
            "preferredCategories": [
                "industrial_building",
                "logistics_building",
                "construction_footprint",
                "named_operational_building",
                "derived_industrial_block",
                "building",
            ],
            "preferredSourceNames": [],
            "distanceWeight": 25.0,
            "nameBonus": 30.0,
            "preferredNameBonus": 0.0,
            "preferredAreaBonus": 35.0,
            "preferredCategoryBonus": 20.0,
            "freshnessScores": {"current": 10.0, "aging": 0.0, "stale": -10.0, "unknown": -5.0},
        },
    },
}

CONTEXT_REGISTRY = [
    {
        "registryId": "dubai-marina-jbr-context",
        "featureKey": "geoai:area:ae-du:dubai-marina-jbr-context",
        "canonicalName": "Dubai Marina / JBR Open Context",
        "geometryRole": "context_boundary",
    },
    {
        "registryId": "downtown-business-bay-context",
        "featureKey": "geoai:area:ae-du:downtown-business-bay-context",
        "canonicalName": "Downtown / Business Bay Open Context",
        "geometryRole": "context_boundary",
    },
    {
        "registryId": "dubai-south-development-context",
        "featureKey": "geoai:area:ae-du:dubai-south-development-context",
        "canonicalName": "Dubai South Development Open Context",
        "geometryRole": "context_boundary",
    },
]


def normalize_registry_token(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower().replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return re.sub(r"-{2,}", "-", normalized) or "unnamed"


def build_registry_key(role_token: str, slug: str, country_code: str = "ae", region_code: str = "du") -> str:
    return (
        f"geoai:{normalize_registry_token(role_token)}:"
        f"{normalize_registry_token(country_code)}-{normalize_registry_token(region_code)}:"
        f"{normalize_registry_token(slug)}"
    )


def selected_registry_entry(target_id: str) -> dict[str, Any]:
    return SELECTED_AOI_REGISTRY[target_id]


def registry_document() -> dict[str, Any]:
    return {
        "registryVersion": REGISTRY_VERSION,
        "normalizationExamples": [
            {
                "roleToken": "aoi",
                "slug": "Marina Waterfront Sample 01",
                "featureKey": build_registry_key("aoi", "Marina Waterfront Sample 01"),
            },
            {
                "roleToken": "area",
                "slug": "Downtown & Business Bay Context",
                "featureKey": build_registry_key("area", "Downtown & Business Bay Context"),
            },
        ],
        "contexts": sorted(CONTEXT_REGISTRY, key=lambda entry: entry["featureKey"]),
        "selectedAois": [SELECTED_AOI_REGISTRY[target_id] for target_id in sorted(SELECTED_AOI_REGISTRY)],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    arguments = parser.parse_args()
    path = Path(arguments.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(registry_document(), sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

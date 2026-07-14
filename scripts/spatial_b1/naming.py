from __future__ import annotations

import re
from typing import Any

ARABIC_PATTERN = re.compile(r"[\u0600-\u06ff]")
LATIN_PATTERN = re.compile(r"[A-Za-z]")


def _text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _english_text(value: Any) -> str | None:
    candidate = _text(value)
    if not candidate or ARABIC_PATTERN.search(candidate) or not LATIN_PATTERN.search(candidate):
        return None
    return candidate


def _collect_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, list):
        return [item for child in value for item in _collect_strings(child)]
    if isinstance(value, dict):
        return [item for child in value.values() for item in _collect_strings(child)]
    return []


def normalized_names(properties: dict[str, Any], provider: str, category: str, provider_id: str) -> dict[str, Any]:
    names = properties.get("names") if isinstance(properties.get("names"), dict) else {}
    common = names.get("common") if isinstance(names.get("common"), dict) else {}
    primary = names.get("primary")
    structured_primary_english = None
    if isinstance(primary, dict):
        structured_primary_english = _text(primary.get("en"))
        if structured_primary_english is None and str(primary.get("language") or "").lower().startswith("en"):
            structured_primary_english = _text(primary.get("value"))
    else:
        structured_primary_english = _english_text(primary)

    structured_common_english = _text(common.get("en"))
    osm_english = _text(properties.get("name:en")) if provider == "osm" else None
    name_en = _text(properties.get("name_en"))
    local_name = _text(properties.get("name"))
    english_name = next(
        (
            candidate
            for candidate in (structured_primary_english, structured_common_english, osm_english, name_en)
            if candidate
        ),
        None,
    )
    source_object_name = local_name or _text(primary) or english_name
    fallback = f"{category.replace('_', ' ').title()} — {provider}:{provider_id}"
    display_name = english_name or local_name or fallback
    alternate_candidates = [
        *_collect_strings(names.get("alternate")),
        *_collect_strings(common),
        _text(properties.get("alt_name")),
        _text(properties.get("official_name")),
        _text(properties.get("short_name")),
        source_object_name,
    ]
    alternate_names = sorted(
        {
            candidate
            for candidate in alternate_candidates
            if candidate and candidate not in {display_name, local_name, english_name}
        }
    )
    return {
        "displayName": display_name,
        "sourceObjectName": source_object_name,
        "localName": local_name,
        "englishName": english_name,
        "alternateNames": alternate_names,
        "displayNameSource": next(
            label
            for label, candidate in (
                ("structured_provider_primary_english", structured_primary_english),
                ("structured_provider_common_english", structured_common_english),
                ("osm_name_en", osm_english),
                ("name_en", name_en),
                ("local_name", local_name),
                ("neutral_category_provider_identity", fallback),
            )
            if candidate == display_name
        ),
    }

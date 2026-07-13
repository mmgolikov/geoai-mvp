from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

FRESHNESS_POLICY = {
    "freshnessPolicyId": "geoai-source-update-age-v1",
    "timestampMeaning": "source record update time; not feature observation time",
    "thresholdsDays": {"currentMaximum": 365, "agingMaximum": 1095},
    "states": ["current", "aging", "stale", "unknown"],
    "sourceInterpretation": {
        "overture": "Latest declared source update_time across the Overture source records.",
        "osm": "OSM object timestamp when exported; dataset snapshot time remains separate.",
    },
}


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def freshness_status(source_updated_at: str | None, evaluated_at: str) -> str:
    updated = parse_timestamp(source_updated_at)
    evaluated = parse_timestamp(evaluated_at)
    if updated is None or evaluated is None:
        return "unknown"
    age_days = max(0.0, (evaluated - updated).total_seconds() / 86_400.0)
    if age_days <= FRESHNESS_POLICY["thresholdsDays"]["currentMaximum"]:
        return "current"
    if age_days <= FRESHNESS_POLICY["thresholdsDays"]["agingMaximum"]:
        return "aging"
    return "stale"


def freshness_evidence() -> dict[str, Any]:
    return FRESHNESS_POLICY

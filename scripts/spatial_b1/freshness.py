from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
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


def _canonical_epoch(value: float) -> int | float:
    return int(value) if value.is_integer() else value


def _canonical_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def normalize_source_timestamp(value: str | int | float | None) -> dict[str, str | int | float | None]:
    raw = value
    if value is None or isinstance(value, bool):
        return {"sourceUpdatedAtRaw": raw, "sourceUpdatedAtEpoch": None, "sourceUpdatedAt": None}

    numeric: float | None = None
    if isinstance(value, (int, float)):
        numeric = float(value)
    elif isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return {"sourceUpdatedAtRaw": raw, "sourceUpdatedAtEpoch": None, "sourceUpdatedAt": None}
        try:
            numeric = float(candidate)
        except ValueError:
            numeric = None

    if numeric is not None:
        if not math.isfinite(numeric):
            return {"sourceUpdatedAtRaw": raw, "sourceUpdatedAtEpoch": None, "sourceUpdatedAt": None}
        epoch_seconds = numeric / 1000.0 if abs(numeric) >= 100_000_000_000 else numeric
        try:
            parsed = datetime.fromtimestamp(epoch_seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return {"sourceUpdatedAtRaw": raw, "sourceUpdatedAtEpoch": None, "sourceUpdatedAt": None}
        return {
            "sourceUpdatedAtRaw": raw,
            "sourceUpdatedAtEpoch": _canonical_epoch(epoch_seconds),
            "sourceUpdatedAt": _canonical_iso(parsed),
        }

    assert isinstance(value, str)
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        parsed = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return {"sourceUpdatedAtRaw": raw, "sourceUpdatedAtEpoch": None, "sourceUpdatedAt": None}
    epoch_seconds = parsed.timestamp()
    return {
        "sourceUpdatedAtRaw": raw,
        "sourceUpdatedAtEpoch": _canonical_epoch(epoch_seconds),
        "sourceUpdatedAt": _canonical_iso(parsed),
    }


def parse_timestamp(value: str | int | float | None) -> datetime | None:
    normalized = normalize_source_timestamp(value)
    canonical = normalized["sourceUpdatedAt"]
    if not isinstance(canonical, str):
        return None
    return datetime.fromisoformat(canonical.replace("Z", "+00:00"))


def freshness_status(source_updated_at: str | int | float | None, evaluated_at: str) -> str:
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


def timestamp_normalization_report() -> dict[str, Any]:
    cases = [
        {"caseId": "iso", "input": "2026-06-01T12:34:56Z"},
        {"caseId": "unix_seconds", "input": 1_717_243_696},
        {"caseId": "unix_milliseconds", "input": 1_717_243_696_000},
        {"caseId": "invalid", "input": "not-a-timestamp"},
        {"caseId": "null", "input": None},
    ]
    return {
        "normalizationPolicyId": "geoai-source-timestamp-normalization-v1",
        "numericUnitDetection": {
            "secondsMaximumAbsoluteExclusive": 100_000_000_000,
            "millisecondsMinimumAbsoluteInclusive": 100_000_000_000,
        },
        "cases": [
            {"caseId": case["caseId"], "input": case["input"], **normalize_source_timestamp(case["input"])}
            for case in cases
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    arguments = parser.parse_args()
    output = Path(arguments.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(timestamp_normalization_report(), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

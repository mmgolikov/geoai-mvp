from __future__ import annotations

from typing import Any

REVIEWED_ARTIFACT_DIGEST = "sha256:0c6aa10e1e237dc1f80397cb43365ad6729535384ca8b7faba9eb6b65b1c0a49"
REVIEWED_SELECTED_AOIS = {
    "geoai:aoi:ae-du:marina-waterfront-sample-01": {
        "sourceProviderId": "228fb0d7-b668-4125-b96e-8280fbc20e18",
        "geometryChecksum": "0e45375ac5a1f7e390b426ce1272cf515be3e6ce71d1b4d36a36987174550460",
    },
    "geoai:aoi:ae-du:business-bay-sample-01": {
        "sourceProviderId": "342a7f78-14c4-4785-9c2d-09389c6fb357",
        "geometryChecksum": "1a61c78e9504e1cebdbb598ee702b5683074c60370d2a394d043b6107aceddb4",
    },
    "geoai:aoi:ae-du:dubai-south-industrial-sample-01": {
        "sourceProviderId": "4c8f2456-e981-492e-84ec-e72f555b93a6",
        "geometryChecksum": "7aaff6c52ad219ef5fc6a3fcb6b3f31622b6aa04924fb66043bc0a0d42763a8c",
    },
}


def reviewed_with_conditions(feature_key: str, source_provider_id: str, geometry_checksum: str) -> bool:
    reviewed = REVIEWED_SELECTED_AOIS.get(feature_key)
    return bool(
        reviewed
        and reviewed["sourceProviderId"] == source_provider_id
        and reviewed["geometryChecksum"] == geometry_checksum
    )


def review_record() -> dict[str, Any]:
    return {
        "schemaVersion": "geoai-independent-source-alignment-review-v1",
        "confluence": {
            "pageId": "8388618",
            "title": "B1 Independent Source Alignment and Contract Audit v2",
            "url": "https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/8388618/B1+Independent+Source+Alignment+and+Contract+Audit+v2",
        },
        "reviewedArtifact": {
            "artifactId": "8291680044",
            "digest": REVIEWED_ARTIFACT_DIGEST,
        },
        "decision": "reviewed_with_conditions",
        "reviewDate": "2026-07-14",
        "reviewerRole": "GeoAI Delivery Operating System independent audit",
        "reviewedRecords": [
            {"featureKey": feature_key, **REVIEWED_SELECTED_AOIS[feature_key]}
            for feature_key in sorted(REVIEWED_SELECTED_AOIS)
        ],
        "scope": "Independent spatial plausibility and source-alignment review of the three selected open-context objects.",
        "officialValidation": False,
    }

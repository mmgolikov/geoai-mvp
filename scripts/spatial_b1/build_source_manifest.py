from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from common import REQUIRED_CAVEAT, sha256_file, write_json

OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright"
ODBL_LEGAL_CODE_URL = "https://opendatacommons.org/licenses/odbl/1-0/"
GEOFABRIK_REFERENCE_URL = "https://download.geofabrik.de/"
OVERTURE_ATTRIBUTION_URL = "https://docs.overturemaps.org/attribution/"
OVERTURE_FOUNDATION_URL = "https://overturemaps.org/"
SOURCE_ATTRIBUTION_URLS = {
    "OpenStreetMap": OSM_ATTRIBUTION_URL,
    "Microsoft ML Buildings": "https://github.com/microsoft/GlobalMLBuildingFootprints",
}


def file_record(path: Path) -> dict[str, Any]:
    return {
        "path": str(path),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def license_url(license_id: str | None) -> str | None:
    if license_id == "ODbL-1.0":
        return ODBL_LEGAL_CODE_URL
    if license_id and license_id.startswith("http"):
        return license_id
    return None


def overture_source_providers(path: Path) -> list[dict[str, str | None]]:
    value = json.loads(path.read_text("utf-8"))
    providers: dict[tuple[str, str], dict[str, str | None]] = {}
    for feature in value.get("features", []):
        properties = feature.get("properties") or {}
        for source in properties.get("sources") or []:
            if not isinstance(source, dict):
                continue
            dataset = source.get("dataset") or source.get("source")
            if dataset:
                source_dataset = str(dataset)
                record_license_id = str(source.get("license") or "source-record-licence-not-declared")
                key = (source_dataset, record_license_id)
                providers[key] = {
                    "sourceDataset": source_dataset,
                    "sourceRecordLicenseId": record_license_id,
                    "sourceRecordLicenseUrl": license_url(record_license_id),
                    "sourceAttribution": str(source.get("attribution") or source_dataset),
                    "attributionUrl": str(source.get("attribution_url") or source.get("attributionUrl") or SOURCE_ATTRIBUTION_URLS.get(source_dataset) or "") or None,
                }
    return [providers[key] for key in sorted(providers)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated-at", required=True)
    parser.add_argument("--osm-pbf", required=True)
    parser.add_argument("--osm-url", required=True)
    parser.add_argument("--osm-release", required=True)
    parser.add_argument("--osm-snapshot-date", required=True)
    parser.add_argument("--osm-source-timestamp", required=True)
    parser.add_argument("--overture-geojson", required=True)
    parser.add_argument("--overture-release", required=True)
    parser.add_argument("--output", required=True)
    arguments = parser.parse_args()

    osm_path = Path(arguments.osm_pbf)
    overture_path = Path(arguments.overture_geojson)
    overture_providers = overture_source_providers(overture_path)
    overture_datasets = sorted({str(record["sourceDataset"]) for record in overture_providers})
    manifest = {
        "schemaVersion": "geoai-spatial-source-manifest-v1",
        "generatedAt": arguments.generated_at,
        "snapshotDate": arguments.osm_snapshot_date,
        "processingEnvelope": {
            "bbox": [54.95, 24.80, 55.55, 25.36],
            "role": "processing_aoi",
            "officialBoundary": False,
        },
        "sources": {
            "osm": {
                "sourceId": "osm-geofabrik",
                "provider": "OpenStreetMap / Geofabrik",
                "sourceReleaseId": arguments.osm_release,
                "sourceUrl": arguments.osm_url,
                "snapshotDate": arguments.osm_snapshot_date,
                "datasetReleaseDate": arguments.osm_snapshot_date,
                "datasetSnapshotDate": arguments.osm_snapshot_date,
                "sourceDataTimestamp": arguments.osm_source_timestamp,
                "accessedAt": arguments.generated_at,
                "licenseId": "ODbL-1.0",
                "licenseUrl": ODBL_LEGAL_CODE_URL,
                "attributionUrl": OSM_ATTRIBUTION_URL,
                "extractReferenceUrl": GEOFABRIK_REFERENCE_URL,
                "attribution": "© OpenStreetMap contributors; extract by Geofabrik GmbH. Open Database License 1.0.",
                "asset": file_record(osm_path),
                "sourceMode": "open_snapshot",
                "repositoryFixtureEligible": False,
                "distributionStatus": "artifact_only_pending_final_adapted_database_disposition",
            },
            "overture": {
                "sourceId": "overture-maps",
                "provider": "Overture Maps Foundation",
                "sourceReleaseId": arguments.overture_release,
                "sourceUrl": f"s3://overturemaps-us-west-2/release/{arguments.overture_release}/theme=buildings/type=building/",
                "snapshotDate": arguments.overture_release[:10],
                "datasetReleaseDate": arguments.overture_release[:10],
                "datasetSnapshotDate": None,
                "accessedAt": arguments.generated_at,
                "licenseId": "Overture-buildings-ODbL-1.0",
                "licenseUrl": ODBL_LEGAL_CODE_URL,
                "attributionUrl": OVERTURE_ATTRIBUTION_URL,
                "foundationUrl": OVERTURE_FOUNDATION_URL,
                "attribution": "Overture Maps Foundation buildings theme and listed source providers; ODbL 1.0.",
                "asset": file_record(overture_path),
                "featureSourceDatasets": overture_datasets,
                "featureSourceProviders": overture_providers,
                "sourceMode": "open_snapshot",
                "repositoryFixtureEligible": False,
                "distributionStatus": "artifact_only_pending_final_source_attribution_review",
            },
        },
        "attribution": {
            "interactiveMap": [
                "© OpenStreetMap contributors, ODbL 1.0",
                "Overture Maps Foundation and source providers; see source evidence",
            ],
            "printAndExport": [
                "Contains OpenStreetMap data available under ODbL 1.0; extract by Geofabrik GmbH.",
                "Contains Overture Maps buildings data and source-provider content; see the attached attribution manifest.",
            ],
            "sourceDatasetNames": overture_datasets,
            "urls": {
                "openStreetMapCopyright": OSM_ATTRIBUTION_URL,
                "odblLegalCode": ODBL_LEGAL_CODE_URL,
                "geofabrikExtractReference": GEOFABRIK_REFERENCE_URL,
                "overtureAttributionDocumentation": OVERTURE_ATTRIBUTION_URL,
                "overtureMapsFoundation": OVERTURE_FOUNDATION_URL,
            },
            "sourceProviders": overture_providers,
        },
        "legalDisposition": {
            "technicalReviewComplete": True,
            "finalLegalAdviceProvided": False,
            "publicRepositoryGeometryApproved": False,
            "largeGeometryDistribution": "GitHub Actions or release artifact only",
            "requiredBeforeProductActivation": [
                "final OSM adapted-database/public-distribution disposition",
                "Overture source-level attribution review",
                "Product and export attribution implementation",
            ],
        },
        "limitations": [
            "Open-context geometry is not official municipal, parcel, zoning, cadastral, planning or hazard evidence.",
            REQUIRED_CAVEAT,
        ],
    }
    write_json(Path(arguments.output), manifest)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

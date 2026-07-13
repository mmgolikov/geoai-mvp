#!/usr/bin/env bash
set -euo pipefail

: "${OSM_RELEASE:?OSM_RELEASE is required}"
: "${OSM_URL:?OSM_URL is required}"
: "${OSM_MD5_URL:?OSM_MD5_URL is required}"
: "${OSM_SNAPSHOT_DATE:?OSM_SNAPSHOT_DATE is required}"
: "${OSM_SOURCE_TIMESTAMP:?OSM_SOURCE_TIMESTAMP is required}"
: "${OVERTURE_RELEASE:?OVERTURE_RELEASE is required}"
: "${DATASET_VERSION:?DATASET_VERSION is required}"

rm -rf output/spatial-b1
mkdir -p output/spatial-b1/{raw,inputs,evidence,bundle-a,bundle-b}
date -u +%Y-%m-%dT%H:%M:%SZ > output/spatial-b1/evidence/generated-at.txt
printf '%s\n' "${GITHUB_SHA:-local}" > output/spatial-b1/evidence/tested-sha.txt

npm run lint
node scripts/spatial-b1-contract-check.mjs

curl --fail --location --retry 4 --retry-delay 5 \
  --dump-header output/spatial-b1/evidence/geofabrik-response-headers.txt \
  "$OSM_URL" \
  --output "output/spatial-b1/raw/$OSM_RELEASE"
curl --fail --location --retry 4 "$OSM_MD5_URL" \
  --output "output/spatial-b1/raw/$OSM_RELEASE.md5"
(
  cd output/spatial-b1/raw
  md5sum --check "$OSM_RELEASE.md5"
) | tee output/spatial-b1/evidence/geofabrik-md5-verification.txt
sha256sum "output/spatial-b1/raw/$OSM_RELEASE" \
  | tee output/spatial-b1/evidence/geofabrik-sha256.txt
stat --printf='%n %s bytes\n' "output/spatial-b1/raw/$OSM_RELEASE" \
  | tee output/spatial-b1/evidence/geofabrik-byte-size.txt

scripts/spatial_b1/extract_osm.sh \
  "output/spatial-b1/raw/$OSM_RELEASE" \
  output/spatial-b1/inputs
find output/spatial-b1/inputs -maxdepth 1 -name 'osm-*.geojson' -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > output/spatial-b1/evidence/osm-extract-sha256.txt

python scripts/spatial_b1/extract_overture.py \
  --release "$OVERTURE_RELEASE" \
  --per-aoi-limit 5000 \
  --output output/spatial-b1/inputs/overture-buildings.geojson \
  | tee output/spatial-b1/evidence/overture-extraction-summary.json
sha256sum output/spatial-b1/inputs/overture-buildings.geojson \
  > output/spatial-b1/evidence/overture-extract-sha256.txt
stat --printf='%n %s bytes\n' output/spatial-b1/inputs/overture-buildings.geojson \
  > output/spatial-b1/evidence/overture-extract-byte-size.txt

GENERATED_AT="$(cat output/spatial-b1/evidence/generated-at.txt)"
python scripts/spatial_b1/build_source_manifest.py \
  --generated-at "$GENERATED_AT" \
  --osm-pbf "output/spatial-b1/raw/$OSM_RELEASE" \
  --osm-url "$OSM_URL" \
  --osm-release "$OSM_RELEASE" \
  --osm-snapshot-date "$OSM_SNAPSHOT_DATE" \
  --osm-source-timestamp "$OSM_SOURCE_TIMESTAMP" \
  --overture-geojson output/spatial-b1/inputs/overture-buildings.geojson \
  --overture-release "$OVERTURE_RELEASE" \
  --output output/spatial-b1/evidence/source-manifest.json \
  > output/spatial-b1/evidence/source-manifest-pretty.json

python scripts/spatial_b1/build_snapshot.py \
  --input-dir output/spatial-b1/inputs \
  --output-dir output/spatial-b1/bundle-a \
  --source-manifest output/spatial-b1/evidence/source-manifest.json \
  --dataset-version "$DATASET_VERSION" \
  > output/spatial-b1/evidence/build-a-summary.json
sleep 1
python scripts/spatial_b1/build_snapshot.py \
  --input-dir output/spatial-b1/inputs \
  --output-dir output/spatial-b1/bundle-b \
  --source-manifest output/spatial-b1/evidence/source-manifest.json \
  --dataset-version "$DATASET_VERSION" \
  > output/spatial-b1/evidence/build-b-summary.json

find output/spatial-b1/bundle-a/geometry -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sed 's#output/spatial-b1/bundle-a#BUNDLE#' \
  > output/spatial-b1/evidence/bundle-a-geometry-sha256.txt
find output/spatial-b1/bundle-b/geometry -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sed 's#output/spatial-b1/bundle-b#BUNDLE#' \
  > output/spatial-b1/evidence/bundle-b-geometry-sha256.txt
diff -u \
  output/spatial-b1/evidence/bundle-a-geometry-sha256.txt \
  output/spatial-b1/evidence/bundle-b-geometry-sha256.txt \
  | tee output/spatial-b1/evidence/determinism-diff.txt
cmp output/spatial-b1/bundle-a/selected-aoi-records.json output/spatial-b1/bundle-b/selected-aoi-records.json

python scripts/spatial_b1/render_alignment.py \
  --bundle-dir output/spatial-b1/bundle-a \
  --output-dir output/spatial-b1/evidence/alignment

python - <<'PY'
import json
import platform
import subprocess
from pathlib import Path

import duckdb
import matplotlib
import pyproj
import shapely

manifest = json.loads(Path('output/spatial-b1/evidence/source-manifest.json').read_text())
quality = json.loads(Path('output/spatial-b1/bundle-a/quality-report.json').read_text())
bundle = json.loads(Path('output/spatial-b1/bundle-a/bundle.json').read_text())
osm_identity = json.loads(Path('output/spatial-b1/bundle-a/osm-exact-identity-assertion.json').read_text())
selection = json.loads(Path('output/spatial-b1/bundle-a/target-distance-report.json').read_text())
uniqueness = selection['uniqueness']

assert manifest['legalDisposition']['publicRepositoryGeometryApproved'] is False
assert bundle['defaultSourceMode'] == 'synthetic_fallback'
assert bundle['machineValid'] is True
assert bundle['releaseReady'] is False
assert quality['valid'] is False
assert quality['machineValid'] is True
assert quality['sourceAlignmentReviewed'] is False
assert quality['sourceAlignmentStatus'] == 'evidence_generated_pending_independent_review'
assert quality['focusAoiGatePassed'] is True
assert quality['selectedAoiQualityPassed'] is True
assert quality['acceptedFeatureCount'] > 0
assert quality['acceptedOsmFeatureCount'] > 0
assert quality['acceptedOsmGeneratedIdCount'] == 0
assert quality['acceptedOsmMalformedIdCount'] == 0
assert quality['nullMandatoryQualityFields'] == []
assert quality['requiredFocusAois'] == quality['mandatoryFocusAoisRepresented']
assert osm_identity['passed'] is True
assert uniqueness['passed'] is True
assert uniqueness['selectedCount'] == 3
assert uniqueness['duplicateProviderIds'] == []
assert uniqueness['duplicateGeometryChecksums'] == []
assert uniqueness['duplicateAliasSets'] == []
assert len(selection['targets']) == 3
assert all(target['status'] == 'selected' for target in selection['targets'])
assert all(target['distanceMetres'] <= target['maximumTargetDistanceMetres'] for target in selection['targets'])

Path('output/spatial-b1/evidence/hard-assertions.json').write_text(
    json.dumps({
        'ok': True,
        'publicRepositoryGeometryApproved': False,
        'defaultSourceMode': bundle['defaultSourceMode'],
        'releaseReady': bundle['releaseReady'],
        'machineValid': quality['machineValid'],
        'sourceAlignmentStatus': quality['sourceAlignmentStatus'],
        'acceptedFeatureCount': quality['acceptedFeatureCount'],
        'acceptedOsmFeatureCount': quality['acceptedOsmFeatureCount'],
        'rejectedFeatureCount': quality['rejectedFeatureCount'],
        'focusAois': quality['mandatoryFocusAoisRepresented'],
        'selectedAoiUniqueness': uniqueness,
    }, indent=2) + '\n'
)
Path('output/spatial-b1/evidence/no-default-activation-assertion.json').write_text(
    json.dumps({
        'ok': bundle['defaultSourceMode'] == 'synthetic_fallback' and bundle['releaseReady'] is False,
        'defaultSourceMode': bundle['defaultSourceMode'],
        'openGeometryActivated': False,
        'publicRepositoryGeometryApproved': manifest['legalDisposition']['publicRepositoryGeometryApproved'],
    }, indent=2) + '\n'
)
Path('output/spatial-b1/evidence/determinism-report.json').write_text(
    json.dumps({
        'passed': True,
        'geometryChecksumsMatch': True,
        'selectedAoiRecordsMatch': True,
        'buildsCompared': ['bundle-a', 'bundle-b'],
    }, indent=2) + '\n'
)
Path('output/spatial-b1/evidence/tool-versions.json').write_text(
    json.dumps({
        'python': platform.python_version(),
        'shapely': shapely.__version__,
        'geos': shapely.geos_version_string,
        'pyproj': pyproj.__version__,
        'proj': pyproj.proj_version_str,
        'matplotlib': matplotlib.__version__,
        'duckdb': duckdb.__version__,
        'osmium': subprocess.run(['osmium', '--version'], check=True, capture_output=True, text=True).stdout.strip(),
    }, indent=2) + '\n'
)
PY

for evidence_file in \
  provider-id-inventory.json \
  osm-exact-identity-assertion.json \
  selected-aoi-records.json \
  target-distance-report.json \
  selected-aoi-uniqueness-report.json \
  epsg-32640-transformation-evidence.json \
  geometry-validity-repair-report.json \
  rejected-features.json \
  duplicate-collision-report.json \
  quality-report.json; do
  cp "output/spatial-b1/bundle-a/$evidence_file" "output/spatial-b1/evidence/$evidence_file"
done

du -ah output/spatial-b1/inputs output/spatial-b1/bundle-a output/spatial-b1/evidence/alignment \
  | sort -h \
  > output/spatial-b1/evidence/asset-size-inventory.txt
find output/spatial-b1/bundle-a -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > output/spatial-b1/evidence/bundle-file-sha256.txt
cp docs/SPATIAL_B1_EXECUTION_PLAN_V1.md output/spatial-b1/evidence/
cp docs/SPATIAL_B1_RELEASE_CONTROL_V1.md output/spatial-b1/evidence/
rm -rf output/spatial-b1/raw output/spatial-b1/bundle-b

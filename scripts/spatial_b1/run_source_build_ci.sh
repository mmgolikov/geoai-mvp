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
python scripts/spatial_b1/canonical_feature_registry.py \
  --output output/spatial-b1/evidence/canonical-feature-key-registry-python.json
python scripts/spatial_b1/freshness.py \
  --output output/spatial-b1/evidence/osm-timestamp-normalization-python.json
SPATIAL_B1_PYTHON_REGISTRY=output/spatial-b1/evidence/canonical-feature-key-registry-python.json \
SPATIAL_B1_PYTHON_TIMESTAMP_REPORT=output/spatial-b1/evidence/osm-timestamp-normalization-python.json \
SPATIAL_B1_CONTRACT_EVIDENCE_DIR=output/spatial-b1/evidence \
  node scripts/spatial-b1-contract-check.mjs \
  | tee output/spatial-b1/evidence/spatial-b1-contract-check.json

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
parity = json.loads(Path('output/spatial-b1/evidence/python-typescript-key-parity-report.json').read_text())
refresh = json.loads(Path('output/spatial-b1/evidence/provider-id-refresh-stability-report.json').read_text())
precedence = json.loads(Path('output/spatial-b1/evidence/source-precedence-resolver-matrix.json').read_text())
freshness_parity = json.loads(Path('output/spatial-b1/evidence/python-typescript-freshness-parity-report.json').read_text())
provider_key_assertion = json.loads(Path('output/spatial-b1/bundle-a/canonical-key-provider-id-assertion.json').read_text())
freshness = json.loads(Path('output/spatial-b1/bundle-a/feature-level-freshness-records.json').read_text())
osm_freshness = json.loads(Path('output/spatial-b1/bundle-a/osm-freshness-state-counts.json').read_text())
categories = json.loads(Path('output/spatial-b1/bundle-a/zero-wrong-layer-building-categories-assertion.json').read_text())
name_en = json.loads(Path('output/spatial-b1/bundle-a/osm-name-en-regression-examples.json').read_text())
identity_scopes = json.loads(Path('output/spatial-b1/bundle-a/identity-scope-inventory.json').read_text())
licence_urls = json.loads(Path('output/spatial-b1/bundle-a/licence-attribution-url-validation.json').read_text())
review = json.loads(Path('output/spatial-b1/bundle-a/independent-source-alignment-review-record.json').read_text())
selected = json.loads(Path('output/spatial-b1/bundle-a/selected-aoi-records.json').read_text())
selected_by_target = {feature['metadata']['focusAoiId']: feature for feature in selected}

assert manifest['legalDisposition']['publicRepositoryGeometryApproved'] is False
assert bundle['defaultSourceMode'] == 'synthetic_fallback'
assert bundle['machineValid'] is True
assert bundle['releaseReady'] is False
assert quality['valid'] is False
assert quality['machineValid'] is True
assert quality['sourceAlignmentReviewed'] is False
assert quality['selectedAoiSourceAlignmentReviewed'] is True
assert quality['sourceAlignmentStatus'] == 'selected_aois_reviewed_with_conditions_other_features_pending'
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
assert uniqueness['duplicateCanonicalKeys'] == []
assert len(selection['targets']) == 3
assert all(target['status'] == 'selected' for target in selection['targets'])
assert all(target['distanceMetres'] <= target['maximumTargetDistanceMetres'] for target in selection['targets'])
assert provider_key_assertion['providerIdsEmbeddedInCanonicalGeoAiKeys'] == 0
assert parity['failureCount'] == 0
assert refresh['businessKeyChanged'] is False
assert precedence['passed'] is True
assert [row['resolvedSource'] for row in precedence['matrix']] == ['synthetic', 'open', 'licensed', 'client', 'official']
assert freshness_parity['failureCount'] == 0
assert osm_freshness['passed'] is True
assert osm_freshness['validTimestampsClassifiedUnknown'] == 0
assert categories['passed'] is True
assert categories['transportFeaturesClassifiedAsBuilding'] == 0
assert categories['anchorFeaturesClassifiedAsBuilding'] == 0
assert categories['landUseFeaturesClassifiedAsBuilding'] == 0
assert categories['waterFeaturesClassifiedAsBuilding'] == 0
assert name_en['passed'] is True
assert identity_scopes['counts']['canonical_registry'] == 3
assert all(record['identityScope'] == 'canonical_registry' for record in identity_scopes['registeredContexts'])
assert licence_urls['passed'] is True
assert review['allReviewedRecordsMatched'] is True
assert review['decision'] == 'reviewed_with_conditions'
assert review['officialValidation'] is False
assert len({feature['featureKey'] for feature in selected}) == 3
assert len({feature['sourceFeatureId'] for feature in selected}) == 3
assert len({feature['geometryChecksum'] for feature in selected}) == 3
assert selected_by_target['dubai-south-jebel-ali-v1']['areaSqm'] >= 500
assert all(feature['name'] != feature['contextArea'] for feature in selected)
assert all(feature['canonicalName'] != feature['contextArea'] for feature in selected)
assert all(feature['sourceUpdatedAt'] for feature in selected if feature['metadata']['provider'] == 'overture')
assert all(feature['observedAt'] is None for feature in selected)
assert all(record['sourceObservedAt'] is None for record in freshness['records'])
assert all(feature['quality']['sourceAlignmentStatus'] == 'reviewed_with_conditions' for feature in selected)
assert all(feature['identityScope'] == 'canonical_registry' for feature in selected)
assert all(
    provenance['themeLicenseId'] and provenance['themeLicenseUrl']
    and provenance['sourceRecordLicenseId'] and provenance['sourceRecordLicenseUrl']
    and provenance['sourceDataset'] and provenance['sourceRecordId']
    and provenance['sourceAttribution'] and provenance['attributionUrl']
    for feature in selected for provenance in feature['sourceProvenance']
)
assert len({target['selectionProfile']['profileId'] for target in selection['targets']}) == 3

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
        'providerIdsEmbeddedInCanonicalGeoAiKeys': provider_key_assertion['providerIdsEmbeddedInCanonicalGeoAiKeys'],
        'canonicalKeyParityFailures': parity['failureCount'],
        'providerRefreshBusinessKeyChanges': int(refresh['businessKeyChanged']),
        'sourcePrecedencePassed': precedence['passed'],
        'freshnessParityFailures': freshness_parity['failureCount'],
        'validOsmTimestampsClassifiedUnknown': osm_freshness['validTimestampsClassifiedUnknown'],
        'wrongLayerBuildingCategoryCount': len(categories['violations']),
        'nameEnRegressionPassed': name_en['passed'],
        'selectedAoiSourceAlignmentReviewed': review['allReviewedRecordsMatched'],
        'selectedDubaiSouthAreaSqm': selected_by_target['dubai-south-jebel-ali-v1']['areaSqm'],
        'datasetReleaseSubstitutedForObservedAt': any(feature['observedAt'] is not None for feature in selected),
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
        'node': subprocess.run(['node', '--version'], check=True, capture_output=True, text=True).stdout.strip(),
        'npm': subprocess.run(['npm', '--version'], check=True, capture_output=True, text=True).stdout.strip(),
    }, indent=2) + '\n'
)
PY

for evidence_file in \
  provider-id-inventory.json \
  canonical-feature-key-registry.json \
  canonical-key-provider-id-assertion.json \
  osm-exact-identity-assertion.json \
  selected-aoi-records.json \
  target-distance-report.json \
  ranked-candidate-tables.json \
  precise-object-context-labels.json \
  source-alias-crosswalk-history.json \
  feature-level-freshness-records.json \
  osm-timestamp-normalization-report.json \
  osm-freshness-state-counts.json \
  layer-specific-source-category-matrix.json \
  zero-wrong-layer-building-categories-assertion.json \
  multilingual-naming-audit.json \
  osm-name-en-regression-examples.json \
  identity-scope-inventory.json \
  source-record-theme-licence-matrix.json \
  licence-attribution-url-validation.json \
  independent-source-alignment-review-record.json \
  selected-aoi-uniqueness-report.json \
  epsg-32640-transformation-evidence.json \
  geometry-validity-repair-report.json \
  rejected-features.json \
  duplicate-collision-report.json \
  final-collision-overlap-policy-report.json \
  quality-report.json; do
  cp "output/spatial-b1/bundle-a/$evidence_file" "output/spatial-b1/evidence/$evidence_file"
done

mkdir -p output/spatial-b1/LICENSES
cp output/spatial-b1/bundle-a/LICENSES/NOTICE.md output/spatial-b1/LICENSES/NOTICE.md

python - <<'PY'
import json
from pathlib import Path

geofabrik = Path('output/spatial-b1/evidence/geofabrik-sha256.txt').read_text().split()[0]
overture = Path('output/spatial-b1/evidence/overture-extract-sha256.txt').read_text().split()[0]
Path('output/spatial-b1/evidence/source-checksums.json').write_text(
    json.dumps({
        'geofabrikPbfSha256': geofabrik,
        'overtureExtractSha256': overture,
        'osmNormalizedExtractChecksumsFile': 'osm-extract-sha256.txt',
        'bundleChecksumsFile': 'bundle-file-sha256.txt',
    }, indent=2) + '\n'
)
items = [
    'evidence/osm-timestamp-normalization-report.json',
    'evidence/python-typescript-freshness-parity-report.json',
    'evidence/osm-freshness-state-counts.json',
    'evidence/layer-specific-source-category-matrix.json',
    'evidence/zero-wrong-layer-building-categories-assertion.json',
    'evidence/multilingual-naming-audit.json',
    'evidence/osm-name-en-regression-examples.json',
    'evidence/identity-scope-inventory.json',
    'evidence/source-record-theme-licence-matrix.json',
    'evidence/licence-attribution-url-validation.json',
    'LICENSES/NOTICE.md',
    'evidence/independent-source-alignment-review-record.json',
    'evidence/canonical-feature-key-registry.json',
    'evidence/selected-aoi-records.json',
    'evidence/alignment',
    'evidence/source-checksums.json',
    'evidence/determinism-report.json',
    'evidence/no-default-activation-assertion.json',
    'evidence/tested-sha.txt',
    'evidence/tool-versions.json',
]
missing = [item for item in items if not Path('output/spatial-b1', item).exists()]
if missing:
    raise SystemExit(f'Missing required evidence: {missing}')
Path('output/spatial-b1/evidence/artifact-evidence-index.json').write_text(
    json.dumps({'passed': True, 'requiredItemCount': 20, 'items': items}, indent=2) + '\n'
)
PY

du -ah output/spatial-b1/inputs output/spatial-b1/bundle-a output/spatial-b1/evidence/alignment \
  | sort -h \
  > output/spatial-b1/evidence/asset-size-inventory.txt
find output/spatial-b1/bundle-a -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > output/spatial-b1/evidence/bundle-file-sha256.txt
cp docs/SPATIAL_B1_EXECUTION_PLAN_V1.md output/spatial-b1/evidence/
cp docs/SPATIAL_B1_RELEASE_CONTROL_V1.md output/spatial-b1/evidence/
cp docs/SPATIAL_B1_ATTRIBUTION_AND_DISTRIBUTION_SPEC_V1.md output/spatial-b1/evidence/
rm -rf output/spatial-b1/raw output/spatial-b1/bundle-b

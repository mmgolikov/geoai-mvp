#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <source.osm.pbf> <output-dir>" >&2
  exit 2
fi

SOURCE_PBF="$1"
OUTPUT_DIR="$2"
WORK_DIR="${OUTPUT_DIR}/.osm-work"
BBOX="54.95,24.80,55.55,25.36"

mkdir -p "$OUTPUT_DIR" "$WORK_DIR"

osmium extract \
  --bbox "$BBOX" \
  --strategy complete_ways \
  --overwrite \
  "$SOURCE_PBF" \
  -o "$WORK_DIR/dubai-master.osm.pbf"

filter_export() {
  local name="$1"
  shift
  osmium tags-filter \
    --overwrite \
    "$WORK_DIR/dubai-master.osm.pbf" \
    "$@" \
    -o "$WORK_DIR/${name}.osm.pbf"
  osmium export \
    --overwrite \
    --output-format geojson \
    --attributes=type,id \
    --add-unique-id=type_id \
    "$WORK_DIR/${name}.osm.pbf" \
    -o "$OUTPUT_DIR/osm-${name}.geojson"
}

filter_export transport \
  w/highway=motorway,trunk,primary,secondary,tertiary \
  w/railway=rail,subway,light_rail,tram

filter_export anchors \
  nwr/aeroway=aerodrome,terminal \
  nwr/amenity \
  nwr/tourism \
  nwr/public_transport=station,platform,stop_position \
  nwr/railway=station,halt,subway_entrance \
  nwr/harbour

filter_export landuse \
  nwr/landuse=residential,commercial,retail,industrial,construction,brownfield,greenfield \
  nwr/leisure=park,garden \
  nwr/natural=beach \
  nwr/aeroway=apron,terminal

filter_export water \
  nwr/natural=water,coastline,beach \
  nwr/water \
  nwr/waterway

filter_export construction \
  nwr/landuse=construction \
  nwr/building=construction \
  nwr/construction

rm -rf "$WORK_DIR"

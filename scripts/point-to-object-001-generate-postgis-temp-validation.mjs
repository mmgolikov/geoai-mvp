import { readFile, writeFile } from "node:fs/promises";

const cases = [
  {
    directory: "data/point-to-object-001/case-packs/uae-dubai-museum-future-v1",
    output: "scripts/point-to-object-001-postgis-uae-temp-validation.sql",
    table: "p2o_uae_identity",
    metricSrid: 32640,
    interior: [55.2818037, 25.2191],
    boundary: [55.2812974, 25.2187139],
    expectedInterior: 1,
    expectedBoundary: 1,
    containmentRadiusM: 300
  },
  {
    directory: "data/point-to-object-001/case-packs/singapore-marina-bay-v1",
    output: "scripts/point-to-object-001-postgis-sg-temp-validation.sql",
    table: "p2o_sg_identity",
    metricSrid: 32648,
    interior: [103.8601839, 1.2826713],
    boundary: [103.8605263, 1.2827539],
    expectedInterior: 2,
    expectedBoundary: 1,
    containmentRadiusM: 400
  }
];

for (const item of cases) {
  const collection = JSON.parse(await readFile(`${item.directory}/normalized-features.geojson`, "utf8"));
  const config = JSON.parse(await readFile(`${item.directory}/case-config.json`, "utf8"));
  const features = collection.features.filter((feature) =>
    ["building", "building_part", "land_use"].includes(feature.properties.featureClass)
      && ["Polygon", "MultiPolygon"].includes(feature.geometry.type));
  const payload = JSON.stringify(features.map((feature) => ({
    id: feature.id,
    featureClass: feature.properties.featureClass,
    geometryHashSha256: feature.properties.geometryHashSha256,
    geometry: feature.geometry
  })));
  const [west, south, east, north] = config.bboxWgs84;
  const sql = `begin;
set local statement_timeout = '45s';
set local lock_timeout = '1s';
set local idle_in_transaction_session_timeout = '60s';
set local search_path = pg_temp, public, pg_catalog;

create temporary table ${item.table} (
  feature_id text primary key,
  feature_class text not null,
  geometry_hash_sha256 text not null,
  geom public.geometry(Geometry,4326) not null
) on commit drop;

insert into ${item.table} (feature_id, feature_class, geometry_hash_sha256, geom)
select
  feature ->> 'id',
  feature ->> 'featureClass',
  feature ->> 'geometryHashSha256',
  public.st_setsrid(public.st_geomfromgeojson(feature -> 'geometry'),4326)
from jsonb_array_elements($p2o$${payload}$p2o$::jsonb) feature;

create index ${item.table}_geom_gix on ${item.table} using gist (geom);
create index ${item.table}_class_bix on ${item.table} (feature_class, feature_id);
analyze ${item.table};

do $validation$
declare
  invalid_count integer;
  interior_count integer;
  boundary_count integer;
  safe_distance double precision;
begin
  select count(*) into invalid_count from ${item.table}
  where public.st_srid(geom) <> 4326 or public.st_isempty(geom) or not public.st_isvalid(geom) or public.st_dimension(geom) <> 2;
  if invalid_count <> 0 then raise exception 'P2O_FULL_GEOMETRY_VALIDITY_FAILURE:%', invalid_count; end if;
  select count(*) into interior_count from ${item.table}
  where feature_class in ('building','building_part')
    and geom && public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326)
    and public.st_covers(geom, public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326));
  if interior_count <> ${item.expectedInterior} then raise exception 'P2O_INTERIOR_CANDIDATE_COUNT_FAILURE:%', interior_count; end if;
  select count(*) into boundary_count from ${item.table}
  where feature_class in ('building','building_part')
    and geom && public.st_setsrid(public.st_point(${item.boundary[0]},${item.boundary[1]}),4326)
    and public.st_covers(geom, public.st_setsrid(public.st_point(${item.boundary[0]},${item.boundary[1]}),4326));
  if boundary_count <> ${item.expectedBoundary} then raise exception 'P2O_BOUNDARY_CANDIDATE_COUNT_FAILURE:%', boundary_count; end if;
  select public.st_distance(
    public.st_transform(public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326),${item.metricSrid}),
    public.st_boundary(public.st_transform(public.st_makeenvelope(${west},${south},${east},${north},4326),${item.metricSrid}))
  ) into safe_distance;
  if safe_distance < ${item.containmentRadiusM} then raise exception 'P2O_BBOX_CONTAINMENT_RADIUS_FAILURE:%', safe_distance; end if;
end
$validation$;

set local enable_seqscan = off;
explain (analyze, buffers, format json)
select feature_id from ${item.table}
where feature_class in ('building','building_part')
  and geom && public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326)
  and public.st_covers(geom, public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326))
order by feature_id;

select json_build_object(
  'case_id','${config.caseId}',
  'source_snapshot_id','${config.sourceSnapshotId}',
  'identity_feature_count',(select count(*) from ${item.table}),
  'valid_geometry_count',(select count(*) from ${item.table} where public.st_isvalid(geom)),
  'invalid_geometry_count',(select count(*) from ${item.table} where not public.st_isvalid(geom)),
  'interior_candidate_count',(select count(*) from ${item.table} where feature_class in ('building','building_part') and public.st_covers(geom,public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326))),
  'boundary_candidate_count',(select count(*) from ${item.table} where feature_class in ('building','building_part') and public.st_covers(geom,public.st_setsrid(public.st_point(${item.boundary[0]},${item.boundary[1]}),4326))),
  'boundary_touch_count',(select count(*) from ${item.table} where feature_class in ('building','building_part') and public.st_touches(geom,public.st_setsrid(public.st_point(${item.boundary[0]},${item.boundary[1]}),4326))),
  'metric_srid',${item.metricSrid},
  'anchor_to_coverage_boundary_m',public.st_distance(
    public.st_transform(public.st_setsrid(public.st_point(${item.interior[0]},${item.interior[1]}),4326),${item.metricSrid}),
    public.st_boundary(public.st_transform(public.st_makeenvelope(${west},${south},${east},${north},4326),${item.metricSrid}))
  ),
  'max_radius_contained_within_query_bbox_gate_m',${item.containmentRadiusM},
  'context_completeness_at_contained_radius','UNKNOWN',
  'default_800m_complete',false,
  'temporary_only',true
) as validation_result;

rollback;
`;
  await writeFile(item.output, sql, "utf8");
  console.log(`${item.output}\t${features.length}\t${Buffer.byteLength(sql)}`);
}

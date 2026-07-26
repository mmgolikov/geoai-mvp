-- DLD / Dubai Pulse scoring foundation v1 — REVIEW ONLY.
-- This file is not a migration. The guard intentionally aborts execution.
-- Convert it into an approved canonical migration only after SOURCE-01, security,
-- synthetic replay and founder approval.

DO $$ BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: approved migration required';
END $$;

CREATE SCHEMA IF NOT EXISTS geoai_source_private;
CREATE SCHEMA IF NOT EXISTS geoai_feature_private;
REVOKE ALL ON SCHEMA geoai_source_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SCHEMA geoai_feature_private FROM PUBLIC, anon, authenticated, service_role;

-- Controlled dimensions.
CREATE TABLE geoai_source_private.dld_areas (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  area_id bigint NOT NULL,
  name_en text,
  name_ar text,
  municipality_number text,
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, area_id)
);

CREATE TABLE geoai_source_private.dld_lookup_values (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  lookup_family text NOT NULL CHECK (lookup_family IN ('market_type','transaction_group','transaction_procedure')),
  lookup_id text NOT NULL,
  parent_lookup_id text,
  name_en text,
  name_ar text,
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, lookup_family, lookup_id)
);

-- Restricted normalized facts. Raw source files remain immutable private objects.
CREATE TABLE geoai_source_private.dld_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  source_transaction_id text,
  transaction_date date,
  area_id bigint,
  procedure_id text,
  transaction_group_id text,
  market_type_id text,
  registration_type_en text,
  property_type_en text,
  property_sub_type_en text,
  property_usage_en text,
  is_off_plan boolean,
  is_free_hold boolean,
  procedure_area_sqm numeric(20,4) CHECK (procedure_area_sqm IS NULL OR procedure_area_sqm >= 0),
  actual_worth_aed numeric(22,2) CHECK (actual_worth_aed IS NULL OR actual_worth_aed >= 0),
  project_number text,
  project_name_en text,
  master_project_en text,
  nearest_metro_en text,
  nearest_mall_en text,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_release_id, source_row_hash)
);
CREATE INDEX ON geoai_source_private.dld_transactions(area_id, transaction_date);

CREATE TABLE geoai_source_private.dld_rent_contracts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  contract_id text,
  line_number integer,
  registration_type_en text,
  contract_start_date date,
  contract_end_date date,
  contract_amount_aed numeric(22,2) CHECK (contract_amount_aed IS NULL OR contract_amount_aed >= 0),
  annual_amount_aed numeric(22,2) CHECK (annual_amount_aed IS NULL OR annual_amount_aed >= 0),
  area_id bigint,
  property_type_en text,
  property_sub_type_en text,
  property_usage_en text,
  actual_area_sqm numeric(20,4) CHECK (actual_area_sqm IS NULL OR actual_area_sqm >= 0),
  is_free_hold boolean,
  project_number text,
  project_name_en text,
  master_project_en text,
  tenant_type_en text,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_release_id, source_row_hash)
);
CREATE INDEX ON geoai_source_private.dld_rent_contracts(area_id, contract_start_date);

CREATE TABLE geoai_source_private.dld_projects (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  project_id bigint NOT NULL,
  project_number text,
  project_name_en text,
  master_project_en text,
  developer_id bigint,
  developer_name_en text,
  area_id bigint,
  project_status_en text,
  registration_date date,
  completion_date date,
  completion_ratio numeric(8,4) CHECK (completion_ratio IS NULL OR completion_ratio BETWEEN 0 AND 100),
  total_units integer CHECK (total_units IS NULL OR total_units >= 0),
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, project_id)
);

CREATE TABLE geoai_source_private.dld_valuations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  source_valuation_id text,
  valuation_date date,
  valuation_type_en text,
  area_id bigint,
  property_type_en text,
  property_sub_type_en text,
  actual_area_sqm numeric(20,4) CHECK (actual_area_sqm IS NULL OR actual_area_sqm >= 0),
  valuation_amount_aed numeric(22,2) CHECK (valuation_amount_aed IS NULL OR valuation_amount_aed >= 0),
  project_number text,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_release_id, source_row_hash)
);

CREATE TABLE geoai_source_private.dld_property_stock (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  source_family text NOT NULL CHECK (source_family IN ('land','building','unit')),
  source_object_id text NOT NULL,
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  area_id bigint,
  parcel_id text,
  municipality_number text,
  project_id bigint,
  building_id text,
  property_type_en text,
  property_sub_type_en text,
  property_usage_en text,
  actual_area_sqm numeric(20,4) CHECK (actual_area_sqm IS NULL OR actual_area_sqm >= 0),
  level_count integer CHECK (level_count IS NULL OR level_count >= 0),
  unit_count integer CHECK (unit_count IS NULL OR unit_count >= 0),
  room_count integer CHECK (room_count IS NULL OR room_count >= 0),
  parking_count integer CHECK (parking_count IS NULL OR parking_count >= 0),
  is_free_hold boolean,
  is_registered boolean,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, source_family, source_object_id, source_row_hash)
);
CREATE INDEX ON geoai_source_private.dld_property_stock(area_id, source_family);

-- Contact/person fields are deliberately absent.
CREATE TABLE geoai_source_private.dld_registered_entities (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  entity_family text NOT NULL CHECK (entity_family IN ('broker','developer','office','valuator','license','permit','owner_association')),
  source_entity_id text NOT NULL,
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  display_name_en text,
  related_entity_id text,
  activity_type_en text,
  area_id bigint,
  valid_from date,
  valid_to date,
  status_en text,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, entity_family, source_entity_id, source_row_hash)
);

CREATE TABLE geoai_source_private.dld_residential_sale_index (
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  observation_period date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  all_property_index numeric(20,6),
  villa_index numeric(20,6),
  unit_index numeric(20,6),
  source_row_hash char(64) NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_release_id, observation_period, period_type)
);

-- Privacy-minimized curated features.
CREATE TABLE geoai_feature_private.dld_area_market_monthly (
  area_id bigint NOT NULL,
  observation_month date NOT NULL,
  sale_count bigint NOT NULL DEFAULT 0,
  mortgage_count bigint NOT NULL DEFAULT 0,
  other_transaction_count bigint NOT NULL DEFAULT 0,
  total_transaction_value_aed numeric(24,2),
  median_value_per_sqm_aed numeric(22,4),
  liquidity_index numeric(8,4) CHECK (liquidity_index IS NULL OR liquidity_index BETWEEN 0 AND 100),
  primary_market_share numeric(8,6) CHECK (primary_market_share IS NULL OR primary_market_share BETWEEN 0 AND 1),
  source_release_ids uuid[] NOT NULL CHECK (cardinality(source_release_ids) > 0),
  method_version text NOT NULL,
  freshness_status text NOT NULL CHECK (freshness_status IN ('current','aging','stale')),
  quality_status text NOT NULL CHECK (quality_status IN ('accepted','warning')),
  confidence numeric(8,6) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  caveat text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_id, observation_month, method_version)
);

CREATE TABLE geoai_feature_private.dld_area_rent_monthly (
  area_id bigint NOT NULL,
  observation_month date NOT NULL,
  contract_count bigint NOT NULL DEFAULT 0,
  new_contract_count bigint NOT NULL DEFAULT 0,
  renewal_contract_count bigint NOT NULL DEFAULT 0,
  median_annual_rent_aed numeric(22,2),
  median_rent_per_sqm_aed numeric(22,4),
  rental_demand_index numeric(8,4) CHECK (rental_demand_index IS NULL OR rental_demand_index BETWEEN 0 AND 100),
  source_release_ids uuid[] NOT NULL CHECK (cardinality(source_release_ids) > 0),
  method_version text NOT NULL,
  freshness_status text NOT NULL CHECK (freshness_status IN ('current','aging','stale')),
  quality_status text NOT NULL CHECK (quality_status IN ('accepted','warning')),
  confidence numeric(8,6) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  caveat text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_id, observation_month, method_version)
);

CREATE TABLE geoai_feature_private.dld_context_snapshots (
  context_family text NOT NULL CHECK (context_family IN ('project_supply','property_stock','valuation','registered_entities')),
  context_key text NOT NULL,
  area_id bigint,
  snapshot_date date NOT NULL,
  metrics jsonb NOT NULL,
  source_release_ids uuid[] NOT NULL CHECK (cardinality(source_release_ids) > 0),
  method_version text NOT NULL,
  quality_status text NOT NULL CHECK (quality_status IN ('accepted','warning')),
  confidence numeric(8,6) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  caveat text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (context_family, context_key, snapshot_date, method_version)
);

CREATE TABLE geoai_feature_private.dld_index_series (
  observation_period date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  all_property_index numeric(20,6),
  villa_index numeric(20,6),
  unit_index numeric(20,6),
  source_release_id uuid NOT NULL REFERENCES public.source_releases(id),
  method_version text NOT NULL,
  quality_status text NOT NULL CHECK (quality_status IN ('accepted','warning')),
  confidence numeric(8,6) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  caveat text NOT NULL,
  PRIMARY KEY (observation_period, period_type, source_release_id, method_version)
);

CREATE TABLE geoai_feature_private.dld_source_quality (
  source_release_id uuid PRIMARY KEY REFERENCES public.source_releases(id),
  dataset_id text NOT NULL,
  source_updated_at timestamptz,
  retrieved_at timestamptz NOT NULL,
  record_count bigint NOT NULL CHECK (record_count >= 0),
  malformed_row_count bigint NOT NULL DEFAULT 0,
  duplicate_rate numeric(8,6) CHECK (duplicate_rate IS NULL OR duplicate_rate BETWEEN 0 AND 1),
  missingness_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  lookup_integrity jsonb NOT NULL DEFAULT '{}'::jsonb,
  freshness_status text NOT NULL CHECK (freshness_status IN ('current','aging','stale')),
  quality_status text NOT NULL CHECK (quality_status IN ('accepted','warning','rejected')),
  confidence numeric(8,6) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  caveat text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Fail closed: RLS enabled, no policies and no direct grants.
ALTER TABLE geoai_source_private.dld_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_lookup_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_rent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_property_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_registered_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_source_private.dld_residential_sale_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_feature_private.dld_area_market_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_feature_private.dld_area_rent_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_feature_private.dld_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_feature_private.dld_index_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE geoai_feature_private.dld_source_quality ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA geoai_source_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA geoai_feature_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA geoai_source_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA geoai_feature_private FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE geoai_source_private.dld_property_stock IS
  'DLD source context only; not an official GeoAI parcel, cadastral or ownership authority.';
COMMENT ON TABLE geoai_source_private.dld_valuations IS
  'DLD valuation-event context; not a GeoAI certified valuation.';
COMMENT ON TABLE geoai_feature_private.dld_area_market_monthly IS
  'Screening signals with source-release lineage; official validation required.';

-- GeoAI Audit Runtime Write v1
-- Applied to geoai-dev / pphdqkurxneyagvnnjdt on 2026-07-08.
-- Purpose: allow trusted server runtime to write/read audit_events for non-blocking audit durability checks.
-- This does not create a certified audit trail and does not enable hard access.

grant select, insert on table public.audit_events to service_role;

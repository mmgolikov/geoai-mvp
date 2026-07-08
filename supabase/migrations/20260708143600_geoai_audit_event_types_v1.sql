-- GeoAI Audit Event Types v1
-- Applied to geoai-dev / pphdqkurxneyagvnnjdt on 2026-07-08.
-- Purpose: keep the database audit event type constraint aligned with the application audit event enum.

alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type = any (array[
    'auth_session_checked',
    'demo_login',
    'project_viewed',
    'project_updated',
    'aoi_created',
    'aoi_updated',
    'aoi_deleted',
    'analysis_run',
    'report_generated',
    'data_room_asset_added',
    'checklist_updated',
    'pilot_input_updated',
    'pilot_deliverable_updated',
    'ai_decision_score_generated',
    'validation_evidence_created',
    'validation_evidence_updated',
    'validation_evidence_deleted',
    'validation_connector_reviewed',
    'report_validation_appendix_viewed',
    'evidence_file_uploaded',
    'evidence_file_metadata_created',
    'evidence_file_download_requested',
    'evidence_file_deleted',
    'storage_health_checked',
    'evidence_review_created',
    'evidence_review_updated',
    'evidence_review_status_changed',
    'signed_url_requested',
    'signed_url_verified',
    'upload_intent_created'
  ]));

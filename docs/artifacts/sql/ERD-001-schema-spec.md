# ERD-001 Schema Specification

Version: v0.9  
Status: Review  
Publication gate: Not passed  
Target: Supabase / PostgreSQL / PostGIS  

This is a non-executable schema specification. It must be converted into a reviewed migration only after engineering validation.

## Required tables

| Table | Purpose |
|---|---|
| organizations | tenant or client organization |
| user_profiles | product user profile and access role |
| projects | workspace and analysis container |
| datasets | source register and source status |
| aois | selected point, polygon or spatial area |
| objects | parcels, buildings, assets or detected features |
| analyses | scenario and custom query runs |
| scores | scoring outputs linked to analyses |
| evidence_items | source-backed facts and observations |
| reports | report metadata and export status |
| audit_events | traceable user and system events |

## Required spatial fields

| Table | Field | Notes |
|---|---|---|
| aois | geometry | geometry field, SRID 4326 target |
| objects | geometry | geometry field, SRID 4326 target |

## Required status fields

| Table | Status examples |
|---|---|
| datasets | candidate, validated, connected, production_ready, deprecated |
| analyses | draft, validating, running, completed, refining, failed, superseded, archived |
| reports | requested, generating, ready, failed, archived |
| evidence_items | source_backed, model_derived, manual_review_required |

## Required review before migration

1. Confirm table names against current repository code.
2. Confirm whether `users` or `user_profiles` should be used.
3. Confirm PostGIS extension and SRID policy.
4. Confirm row-level security policy.
5. Confirm project isolation and audit events.
6. Convert to migration only after review.

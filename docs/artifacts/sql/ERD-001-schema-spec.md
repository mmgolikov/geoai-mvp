# ERD-001 Schema Specification

> **Non-authoritative target draft.** This v0.9 schema sketch predates the selected global-profile plus organization/project-membership model and the canonical migration ledger. It must not be converted or applied without reconciliation against the current [Implemented Architecture](../../architecture.md) and [Supabase containment runbook](../../SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md).

Version: v0.9  
Status: Non-authoritative target draft
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

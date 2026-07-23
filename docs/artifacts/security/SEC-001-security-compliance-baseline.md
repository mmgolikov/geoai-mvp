# SEC-001 Security and Compliance Baseline

Status: Review source artifact  
Owner: GeoAI Security / Architecture  
Confluence target: 09.12 Security and Compliance Baseline

## Purpose

Define the minimum security and compliance baseline for GeoAI documentation, demo operations and pilot-readiness planning.

## Baseline controls

| Control area | Requirement | Evidence |
|---|---|---|
| Secrets | No service role keys, DB URLs or private tokens in code, docs, screenshots or logs | Secret hygiene checks |
| Authentication | Demo mode and real auth mode must be clearly separated | Auth status documentation |
| Authorization | Project/member access must be verified before hard access claims | Access decision tests |
| RLS | Supabase RLS must be reviewed and tested before pilot claims | DB/RLS review notes |
| Storage | Buckets, policies and signed URLs must be verified before secure storage claims | Storage verification evidence |
| Audit | Sensitive actions should produce audit events before enterprise claims | Audit event checks |
| Data honesty | Official/legal/cadastral/valuation claims require validation evidence | Source confidence rules |
| Release | Production deploy requires explicit approval and rollback point | Release gate |

## Forbidden claims without evidence

- Production-ready.
- Pilot-ready.
- Secure enterprise storage.
- Hard access enforcement.
- Official parcel or zoning validation.
- Ownership verification.
- Certified valuation.

## Maintenance rule

Update after auth, RLS, storage, env, deployment, source validation or report/export security changes.

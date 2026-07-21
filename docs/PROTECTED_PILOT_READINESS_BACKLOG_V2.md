# GeoAI Protected Pilot Readiness Backlog v2

Status: Active protected-readiness backlog
Last verified: 2026-07-21
Owner: GeoAI Engineering / Security
Authority: Dependency-ordered protected-pilot blocker list after CR 09.23
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [System Stabilization Audit v2](SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

## P0 Before Protected Pilot

| Track | GitHub issue | Current state | Next evidence required |
| --- | --- | --- | --- |
| DB-01 | #85 | Open | Owner-approved development upgrade/drift/apply plan, direct-public denial, RLS personas and rollback evidence |
| ENV-01 | #99 | Open | Vercel public-runtime credential inventory/evacuation/rotation proof without exposing values |
| AUTH-01 | #88 | Open | Real existing-user email/phone/password session, project membership, RLS, IDOR and Admin persona matrix |
| STORAGE-01 | #90 | Open | Server-derived scope, magic-byte/checksum/quarantine and signed access wrong-tenant personas |
| SOURCE-01 | #89 | Open | Real-source custody, explicit visibility, trusted worker, rights and projection evidence |
| Geometry/attribution | #80 | Open | OSM/Overture distribution, attribution, retention, checksum and rollback disposition |

## P1 Before Quality Claim

| Track | GitHub issue | Current state | Next evidence required |
| --- | --- | --- | --- |
| OPS-01 | #91 | Open | Pinned CI actions, request IDs, structured logs, traces, alerts and evidence TTLs |
| AI-01 | #92 | Open | Auth-bound privacy-safe AI gateway, quotas, redaction and cost telemetry |
| GEO-01 | #93 | Partial | Server-side durable AOI geometry/persona evidence |
| UX/PERF/PRINT | #95 | Partial | Broader responsive visual, field/lab performance and print pagination evidence |
| STATE-01 | #98 | Open | Durable entity identity, normalization and cross-user state contracts |
| DOCS-01 | #94 | Partial | Confluence long-tail lifecycle cleanup and stale program issue reconciliation |

## Closed In Current Public-Demo Slice

| Track | Issue | Closed by |
| --- | --- | --- |
| Public funnel separation | #104 | PR #106 |
| CR 09.22 release-truth remediation | #105 | PR #106 |

## Non-Authorizations

This backlog does not authorize Production deployment, Supabase writes/migrations, Auth enforcement, Storage policies, real users, provider activation, secrets, Figma/design implementation or protected-client data use.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

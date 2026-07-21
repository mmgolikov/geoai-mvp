# GeoAI Database Replay Audit Receipt v2

Status: Active database-replay receipt
Last verified: 2026-07-21
Owner: GeoAI Database / Release Engineering
Authority: Current CR 09.23 database replay evidence
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [System Stabilization Audit v2](SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md) · [Supabase containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)

## Current Evidence

Post-merge Quality Gate run `29835520415` executed the permanent `database-replay` job on exact main `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b`.

| Evidence | Result |
| --- | --- |
| Job | `88650735754`, success |
| Supabase CLI | Pinned `2.109.1` |
| Clean start/reset | Passed |
| Clean pgTAP personas | Passed |
| Synthetic ledger-prefix upgrade rehearsal | Passed |
| Post-rehearsal pgTAP personas | Passed |
| Artifact | `8497226028`, `geoai-database-evidence-29835520415` |
| Digest | `sha256:dcd9958e72421fca60fb62adca2a001020e40b34fe2f8b38737061300e85898a` |

## Hosted Read-Only Counts

Current accepted hosted invariants remain:

- development `pphdqkurxneyagvnnjdt`: 10 migration-ledger entries, 0 confirmed Auth users;
- Auth rehearsal `bkmfcjzalcvdsdvyxpgi`: 18 migration-ledger entries, 1 pre-existing confirmed Auth user;
- CR 09.23 performed no hosted DDL/DML, no Auth user action and no Supabase write.

## Boundary

This is local clean replay plus synthetic upgrade rehearsal evidence. It is not a development clone, drift proof, live apply, authenticated HTTP/RPC persona, protected Storage persona or Production database certification.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

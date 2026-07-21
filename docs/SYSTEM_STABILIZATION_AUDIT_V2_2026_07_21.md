# GeoAI System Stabilization Audit v2 — 2026-07-21

Status: Active CR 09.23 audit receipt
Last verified: 2026-07-21
Owner: GeoAI Release Governance / QA
Authority: Current post-release stabilization audit for PR #106 public-demo baseline
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Release Authority Lifecycle Decision](RELEASE_AUTHORITY_LIFECYCLE_DECISION.md) · [Protected Pilot Readiness Backlog v2](PROTECTED_PILOT_READINESS_BACKLOG_V2.md)

## Executive Summary

CR 09.23 confirms that current `main` is `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` from merged PR #106 and current Production is Vercel deployment `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X` at https://geoai-mvp.vercel.app. The public demo is operational as a browser-local/public-demo prototype. Protected pilot, protected Storage, real sources, Auth/RLS/Admin personas and development Supabase apply remain blocked.

The primary defect found by this audit was governance drift: active release authorities still identified PR #97 / `b915a831d5e5b28eab5fd26ac86059820e7e4a32` / `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7` as current after PR #106 had merged and Production had moved to `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X`. This branch corrects the authority lifecycle and adds reproducible static checks.

## Source Audit Summary

- Required branch `audit/cr-09-23-system-stabilization-v2` was verified at starting head `e3b8327cdc939d0dc989f9157076a82dde63a81a`.
- The branch initially contained only `docs/CR_09_23_SYSTEM_STABILIZATION_AUDIT_V2.md` over released main.
- `AGENTS.md`, `CURRENT_RELEASE_STATE.md`, `CURRENT_RELEASE_RECEIPT.json`, `DOCUMENTATION_INDEX.md`, README, roadmap, QA checklist, backlog, architecture and data strategy were inspected for release-authority drift.
- GitHub issue #107, PR #106, PR #97 and blocker issues #80, #85, #88, #89, #90, #91, #92, #93, #94, #95, #96, #98, #99, #104 and #105 were reconciled.
- Vercel Production was inspected; route smoke passed on the current alias.

## Current Release Evidence

| Evidence | Result |
| --- | --- |
| Current `main` | `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` |
| Current PR | PR #106, merged |
| Production deployment | `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X`, READY |
| Production URL | https://geoai-mvp.vercel.app |
| Rollback | `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7` |
| Post-merge Quality Gate | Run `29835520415`, success |
| Application/static job | `88650735580`, success |
| Database replay job | `88650735754`, success |
| Quality artifact | `8497283837`, `geoai-quality-evidence-29835520415`, `sha256:858bb64b06d76ed222966fc715c8432112a8ac74915bfd281250666e48359653` |
| Database artifact | `8497226028`, `geoai-database-evidence-29835520415`, `sha256:dcd9958e72421fca60fb62adca2a001020e40b34fe2f8b38737061300e85898a` |

## Production Smoke

External HTTP smoke returned 200 for `/`, `/workspace`, `/projects`, `/explore`, `/api/health`, `/api/db/health`, `/api/platform/activation-status`, `/api/pilot-backend/status`, `/reports/seeded-analysis-dubai-marina-report/print` and `/reports/seeded-comparison-dubai-shortlist-report/print`.

Vercel logs for the checked window contained info-level route requests and no error/fatal entries.

## Verdict

The public-demo baseline is stable enough to remain the public demo prototype. It is not ready for protected pilot preparation beyond planning and fail-closed foundations. The next work should address DB-01, ENV-01 and AUTH-01 in dependency order before any protected-client, real-source, Storage or Admin activation.

## P0 Findings

- **REL-01 fixed on this branch:** current release authorities were stale after PR #106.
- **DB-01 open:** local replay and synthetic upgrade pass, but development upgrade/drift/apply and live personas remain incomplete.
- **AUTH-01 open:** no real email/phone/RLS/Admin browser persona was executed and protected Product repositories remain disabled.
- **ENV-01 open for Production and historical scopes:** public-runtime privileged credential evacuation remains owner-controlled external work.
- **STORAGE-01 open:** protected upload/signed access remains blocked.
- **SOURCE-01/#80 open:** real source custody and geometry distribution/attribution decisions remain blocked.

## P1/P2 Findings

- Mutable GitHub Actions tags should be pinned in a separate CI hardening package.
- Field Core Web Vitals, broader device/route visual evidence and real-user personas remain incomplete.
- Long-tail Confluence/document authority cleanup remains open under DOCS-01.
- Large UI coordinators and print/report quality debt remain product-quality backlog, not protected-readiness proof.

## Data Honesty

No live official DLD/GeoDubai integration, official parcel, zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, Production-ready or pilot-ready claim is made.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

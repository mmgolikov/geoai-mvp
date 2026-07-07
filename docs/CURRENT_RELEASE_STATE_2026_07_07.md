# Current Release State - 2026-07-07

## Executive Summary

GeoAI `main` is updated through Data Foundation v1.2. The deployed production URL is live as an investor/client demo with local/API fallback behavior because Supabase environment variables are not configured in the production runtime.

Design implementation remains blocked. PR #34 is the active design QA gate and is docs/design-governance only. It protects the current `/projects` Data Readiness / Source Lineage block and does not approve a Figma-to-code implementation.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Merged PRs

| PR | Status | Release / Scope | Notes |
| --- | --- | --- | --- |
| #27 | Merged | GeoAI Pilot UX v3.6 | Release-candidate UX hardening and visual QA freeze. |
| #28 | Merged | Documentation artifacts | Confluence/repo artifact baseline and design documentation additions. |
| #29 | Merged | Codex project instructions | Updated `AGENTS.md` with documentation-first project rules. |
| #30 | Merged | Data Foundation v1.1 | Source registry API and readiness layer. |
| #33 | Merged | Data Foundation v1.2 | Snapshot sync helper, readiness APIs and `/projects` Data Readiness / Source Lineage UI block. |

## Open PRs

| PR | Current role | Recommendation |
| --- | --- | --- |
| #34 | Active design QA gate after Data Foundation v1.2 | Keep open until the design QA gate is accepted or replaced by a successor governance PR. Do not implement design from it. |
| #32 | Older V6/manual QA design gate | Compare with PR #34. Likely superseded for implementation governance; preserve or close only after manual review. |
| #37 | Data Foundation v1.3 branch | Not part of `main` until merged. Treat as separate data/backend/product-safe work. |
| #2 | Legacy visual polish branch | Review for supersession by current `main`; likely close as superseded after confirmation. |
| #3 | Legacy brand baseline branch | Review for supersession by current `main` and active design docs; likely close as superseded after confirmation. |
| #4 | Legacy analysis restore/custom query branch | Review for supersession by later product flows; likely close as superseded after confirmation. |
| #5 | Legacy custom query integration branch | Review for supersession by current `main`; likely close as superseded after confirmation. |

Do not close, merge or retarget any PR automatically from this document.

## Production / Vercel Status

- Production URL: `https://geoai-mvp.vercel.app`.
- Production `/api/health` returned HTTP 200 on 2026-07-07.
- Production mode reported `investor_demo_prototype`.
- Production data status reported sample/open and offline data only; live official integrations are not connected.
- Production `/api/db/health` returned HTTP 200 and reported `repositoryMode: local_fallback`.
- Production `/api/platform/activation-status` returned HTTP 200 and reported Supabase activation blocked by missing runtime env.

Preview deployments are not production. Do not manually deploy or promote production without explicit approval.

## Supabase State

- Supabase project: `geoai-dev`.
- Ref: `pphdqkurxneyagvnnjdt`.
- Region: `eu-west-1`.
- Data Foundation v1.2 baseline includes 18 GeoAI core tables, PostGIS/pgcrypto, RLS on GeoAI tables, 5 source registry rows and 5 external snapshot metadata rows.
- Production runtime currently has no Supabase public/server env configured.
- Production runtime uses local/API fallback, not durable production storage.
- No Supabase migrations or data modifications are approved by this governance cleanup.

## Design State

- Design implementation remains blocked.
- PR #34 is docs/design-governance only.
- PR #34 protects `/projects` Data Readiness / Source Lineage.
- New Figma/design is not to be implemented in code yet.
- Future design implementation work must start from fresh `main`.
- Any future design implementation must explicitly preserve Data Readiness / Source Lineage unless a separate approved task changes it.

## Codex Rules

- Start every new task from fresh `main` unless the user explicitly says otherwise.
- Use the branch requested in the task.
- Do not work directly on `main`.
- Do not merge PRs, close PRs, deploy production, apply Supabase migrations, modify Supabase data, add secrets or change auth enforcement unless explicitly approved.
- Preserve data honesty language and the required caveat.
- Do not claim live official integrations, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready status or pilot-ready status.

## Key Blockers

- Production Supabase env is not configured.
- Durable production storage is not active.
- Design implementation is blocked by the manual Figma QA gate.
- PR #32 and legacy PRs #2, #3, #4 and #5 remain open and may confuse future task state.
- PR #37 exists outside `main`; future tasks must check whether it has merged before assuming Data Foundation v1.3 is available.

## Next Recommended Work Packages

1. Resolve PR governance: decide whether PR #32 and PRs #2-#5 should be closed as superseded or preserved as historical references.
2. Complete design QA gate: finish PR #34 review, including Data Readiness / Source Lineage preservation.
3. Continue data foundation only after confirming whether PR #37 is merged or still open.
4. Configure production Supabase env only through an approved infrastructure task with no secrets committed.
5. Prepare a separate design implementation branch from fresh `main` only after manual Figma QA passes.

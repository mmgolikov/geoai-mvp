# Current Release State — 2026-07-15

## Executive summary

Current `main` is PR #81 merge `cd5f9efe791ff7d5ac46597925bbf17eb60d2754`. Vercel Production deployment `dpl_94Tz2TZG5Pf8k1PGygTBjQBCQAkf` is READY on the exact merge SHA at `https://geoai-mvp.vercel.app`.

The released scope is an inactive Spatial B1/B2A source-contract, attribution, lineage, fallback and Workspace UX foundation. Production remains a caveated public demo using synthetic/local fallback and soft access. GeoAI is not established as production-ready or pilot-ready.

## Released authority

| Item | State |
| --- | --- |
| PR #81 | Merged on 2026-07-14 |
| Merge SHA | `cd5f9efe791ff7d5ac46597925bbf17eb60d2754` |
| Production deployment | `dpl_94Tz2TZG5Pf8k1PGygTBjQBCQAkf` — READY |
| Production source mode | Synthetic/local fallback |
| Access | Public demo / soft |
| Real geometry | Absent and not authorized |
| B2B/B2C activation | Not authorized |
| Production Supabase | Not configured |

## Accepted release evidence

- Tested Product SHA: `29c5b9f004e0cf65fddf7c23f846391ae87ad29d`.
- Final clean PR head: `e9b02306857ee5f3584268ed9d5619d5d0296eb8`.
- Merge comparison: one merge commit, zero Product-tree file changes.
- Evidence run/job: `29367934398` / `87204007323`.
- Artifact: `8324879513`, `cr-dev7-001-responsive-evidence-29367934398`.
- Result: 17 screenshots and 223/223 assertions passed.
- Permanent pre-merge Quality Gate: `29368152641` / `87204710137`.

The evidence applies only to the released inactive scope. It does not authorize real-source activation, public geometry distribution or a maturity promotion.

## Current controls and blockers

- GitHub Issue #80 remains the Spatial B2B delivery, distribution and attribution decision gate.
- Curated open-geometry Preview activation is not authorized.
- Production source activation is not authorized.
- Production Supabase/Auth/RLS/Storage and hard access are not authorized.
- Durable custody of expiring evidence and direct merge-commit CI remain follow-up controls.
- Permanent rendered-browser regression remains separate from source-contract CI.

## CR-DEV7-002 candidate

CR-DEV7-002 adds a non-deploying Quality Gate trigger for pushes to `main`, permanent Spatial B1/B2A source checks, exact tested-SHA metadata and current route smoke. It does not change the Product or Production runtime.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

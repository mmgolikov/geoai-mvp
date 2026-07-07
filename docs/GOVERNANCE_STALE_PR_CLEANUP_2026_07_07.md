# Governance Stale PR Cleanup - 2026-07-07

## Summary

This note records cleanup recommendations for open PRs that may no longer represent the current GeoAI `main` state. It is documentation only.

Do not close, merge, retarget or rewrite any PR automatically from this note.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Recommendation Table

| PR | Title / Branch | Current State | Recommendation | Reason |
| --- | --- | --- | --- | --- |
| #32 | `Add Figma V6 manual QA gate` / `geoai-v6-manual-qa` | Open, older design/docs-governance, not mergeable against current `main` | Compare with PR #34. Likely close as superseded after preserving any historical notes that are still useful. | PR #34 starts from fresh `main` after Data Foundation v1.2 and more directly protects `/projects` Data Readiness / Source Lineage. |
| #34 | `Add design QA gate after Data Foundation v1.2` / `geoai-design-qa-v12` | Open, active design QA gate, docs/design-governance only | Keep open as the current design QA gate unless a successor governance PR replaces it. | It is based on fresh `main` after PR #33 and explicitly blocks design implementation while preserving Data Readiness / Source Lineage. |
| #2 | `Polish current visual demo flow` / `codex/fix-current-visual-polish-v3` | Open legacy stacked PR targeting `codex/fix-investor-demo-flow-v2`, not `main` | Review diff against current `main`; likely close as superseded. | Current `main` has later Pilot UX v3.x work and Data Foundation v1.2, making this old visual polish branch stale. |
| #3 | `Freeze GeoAI brand baseline` / `codex/freeze-brand-system-v1` | Open legacy stacked PR targeting PR #2 branch, not `main` | Review for any unique docs worth preserving; likely close as superseded. | Current `AGENTS.md`, README and design governance docs supersede the old brand baseline branch. |
| #4 | `Restore analyses and honor custom queries` / `codex/fix-analysis-restore-and-custom-query-v1` | Open legacy stacked PR targeting PR #2 branch, not `main` | Review for unique custom-query restore behavior; likely close as superseded by current product flow. | Later merged UX/backend work has changed workspace, dashboard, project and reporting behavior substantially. |
| #5 | `Integrate custom query into analysis content` / `codex/fix-custom-query-integration-v2` | Open legacy stacked PR targeting PR #4 branch, not `main` | Review for any unique custom-query logic; likely close as superseded after confirmation. | Current `main` is far ahead of this stacked branch and contains later report, dashboard, source-lineage and fallback changes. |

## PR #32 Versus PR #34

PR #32 is an older design QA gate with broader V6 design reset and prototype-faithful exploration notes. It predates the clean PR #34 gate after Data Foundation v1.2 and is not the preferred implementation-governance source.

PR #34 is the current active design QA gate because it:

- starts from fresh `main` after PR #33;
- explicitly states that design implementation remains blocked;
- protects `/projects` Data Readiness / Source Lineage;
- keeps Page 14 / Figma design as QA material only;
- documents manual QA issues before any Codex handoff.

Recommendation: keep PR #34 as the active gate and close PR #32 as superseded only after confirming whether any historical notes from PR #32 should be copied into merged governance docs.

## Legacy PRs #2, #3, #4 and #5

These PRs are stacked on older branches and do not target the current `main` release line. They likely predate the merged Pilot UX v3.x and Data Foundation v1.2 state.

Recommended cleanup sequence:

1. Open each PR diff and compare against current `main`.
2. Identify whether any unique documentation, test evidence or product logic still matters.
3. If no unique value remains, close as superseded with a short note referencing current `main` and the relevant merged PRs.
4. Do not cherry-pick runtime code from these PRs without a new approved task.
5. Do not merge the legacy stacked branches directly.

## Guardrails

- No runtime product code changes are part of this cleanup.
- No Supabase migrations or data changes are part of this cleanup.
- No design implementation is approved by this cleanup.
- New Figma/design is not to be implemented in code yet.
- Future design implementation branches must start from fresh `main`.
- Do not claim live official integrations, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready status or pilot-ready status.

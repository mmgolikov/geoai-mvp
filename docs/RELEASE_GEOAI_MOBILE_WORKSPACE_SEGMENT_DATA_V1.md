# GeoAI Mobile Workspace Map Access and Segment Data v1

## Summary

Mobile Workspace Map Access and Segment Data v1 keeps the current GeoAI workspace and Project Hub design intact while improving iPhone/tablet usability, full-screen mobile map selection, post-analysis handoff and demo data separation.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## What Changed

- Added a mobile full-screen map picker from the Selected Point / AOI / Object card.
- Added direct mobile map-picker actions after a valid selection:
  - `Run Express Analysis`;
  - `Back to workflow`.
- Updated the mobile analysis handoff so a completed run closes the map picker and opens the dashboard/result state automatically.
- Restored always-visible workflow actions after desktop/tablet point selection:
  - the Selected Point / AOI / Object card now includes the current primary action;
  - the workflow footer remains pinned/sticky so `Run Express Analysis`, `Continue Analysis` or `Export Report` cannot be pushed out of reach by Project, Scenario, Custom Query, Candidate Search or Selected Point blocks.
- Restored custom-query CTA state by keeping the current result available when the user types a follow-up query, allowing `Continue Analysis` to appear instead of resetting the workflow to a map-only/run state.
- Changed the workspace shell so desktop keeps the fixed two-column app layout while mobile/tablet can scroll naturally to the map and command panel.
- Preserved the existing command panel, dashboard, report preview and map-first workflow visual style.
- Added B2C demo projects alongside the existing B2B demo projects:
  - Home Buyer Neighborhood Fit;
  - Family Relocation Area Review.
- Added segment metadata to demo projects so `/projects` can switch between B2B and B2C demo data.
- Added B2C seeded analyses, comparison summaries and printable report records.
- Updated Project Hub seeded fallbacks so analyses, reports and comparisons are scoped to the active project instead of leaking across demo segments.
- Aligned the Workspace project selector with the active B2B/B2C audience:
  - project segment is derived from `metadata.segment ?? metadata.audience`;
  - the selector only shows projects for the active audience;
  - B2B/B2C switching selects a matching default project and clears stale results;
  - URL project handoff aligns the Workspace audience to the selected project segment.
- Kept full-screen mobile map picker controls above the map canvas so `Run Express Analysis` and `Back to workflow` remain tappable after a map selection.

## Files Changed

- `README.md`
- `components/analysis-panel.tsx`
- `components/project-dashboard/project-dashboard.tsx`
- `components/workspace-shell.tsx`
- `docs/RELEASE_GEOAI_MOBILE_WORKSPACE_SEGMENT_DATA_V1.md`
- `docs/qa-checklist.md`
- `src/data/demo-projects.ts`
- `src/data/demo-report-seeds.ts`
- `src/lib/project-local-store.ts`

## Source / Segment Groups

- B2B demo projects remain fund/family office, developer and bank/lender oriented.
- B2C demo projects are consumer-facing neighborhood/relocation examples.
- All segment data uses local sample/open context and deterministic mock scoring.
- No live official integration is claimed.

## Validation

Required validation for this release:

- `npm run lint`
- `npm run build`
- `npm run test:api-contract`

Required responsive smoke:

- `/workspace` at iPhone 15 Pro, iPhone 15/16/17 Pro Max, iPad 11 portrait/landscape and iPad 13 portrait/landscape.
- Mobile full-screen map picker open, map selection, direct run from picker, return to workflow from picker, dashboard open after analysis, evidence/source section open, report preview / print path open.
- Desktop/tablet selected-point QA: after a valid map point/object/AOI/candidate selection, the primary action is visible inside the selected target card and in the pinned workflow footer.
- Desktop custom-query QA: after an analysis run, entering a custom query changes the primary action to continue analysis; clearing the query returns the primary action to the current report/run state.
- Workspace project selector QA: B2B mode shows only B2B projects, B2C mode shows only B2C projects, B2B/B2C switching aligns the active project and clears stale result state, and URL-selected projects align the Workspace audience to the selected project segment.
- Fix-pass evidence: iPhone 15 Pro viewport completed B2B full-screen picker select, back-to-workflow retention, direct run, dashboard open, custom-query Continue/Export state, and B2C switch state clearing; iPad 13 landscape viewport completed B2C full-screen picker select, direct run, dashboard evidence/source visibility, and printable report path; desktop criteria-first search and compare flow completed.
- B2B and B2C map-first flows.
- Criteria-first flow where available.
- Compare flow.
- Restore/open existing analysis.
- Segment switch with different B2B/B2C content.
- `/projects?segment=b2b`
- `/projects?segment=b2c`
- seeded report preview / print routes for B2B and B2C reports.

## Data Honesty

This release does not claim:

- live official DLD integration;
- live GeoDubai integration;
- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- production-ready status;
- pilot-ready status.

All outputs remain screening hypotheses requiring official/client validation.

## Known Limitations

- Mobile QA is responsive/browser smoke, not a full device lab certification.
- B2C projects use deterministic sample/open context only.
- Segment separation is demo/local data separation; it is not tenant security or hard access control.
- Supabase migrations, writes, secrets and auth hardening are not included.
- No Figma redesign, Page 14 implementation or visual system refactor is included.

## Rollback Point

Before merge, rollback is the current `main` before this PR. After merge, revert this PR to restore the previous workspace mobile layout and three-project demo seed set.

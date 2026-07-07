# GeoAI Mobile Workspace Map Access and Segment Data v1

## Summary

Mobile Workspace Map Access and Segment Data v1 keeps the current GeoAI workspace and Project Hub design intact while improving iPhone/tablet usability and demo data separation.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## What Changed

- Added mobile-safe workspace map access from the Selected Point / AOI / Object card.
- Changed the workspace shell so desktop keeps the fixed two-column app layout while mobile/tablet can scroll naturally to the map and command panel.
- Preserved the existing command panel, dashboard, report preview and map-first workflow.
- Added B2C demo projects alongside the existing B2B demo projects:
  - Home Buyer Neighborhood Fit;
  - Family Relocation Area Review.
- Added segment metadata to demo projects so `/projects` can switch between B2B and B2C demo data.
- Added B2C seeded analyses, comparison summaries and printable report records.
- Updated Project Hub seeded fallbacks so analyses, reports and comparisons are scoped to the active project instead of leaking across demo segments.

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

- `/workspace` at iPhone 15 Pro, iPhone Pro Max, iPad 11 portrait/landscape and iPad 13 portrait/landscape.
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

# Workspace Mobile Responsive Corrections v1.1

## Control

- Change Request: `CR-DEV6-004`
- Confluence: `06.57 Workspace Mobile Responsive Corrections v1.1`
- Status: isolated implementation candidate
- Base: current `main` at `24b542c0fc4f3bdb01496483f62ff17d890fd504`
- Merge and Production release: not approved

## Problem

Controlled responsive QA confirmed that the sticky mobile action area overlaps the lower part of the Custom Query textarea at 390×844. The desktop split layout also renders the mobile-only `Open map` action at 1366×768.

## Scope

- hide the unavailable disabled `Add to compare` action in the initial narrow-screen state;
- retain the comparison action after a point becomes available;
- preserve safe focus scrolling for Custom Query;
- hide the mobile-only `Open map` action whenever the `lg` split map layout is active;
- add a focused browser regression check.

## Files

- `app/layout.tsx`
- `app/workspace-responsive-fixes.css`
- `scripts/workspace-responsive-browser-check.mjs`
- temporary QA workflow while the candidate is under review

## Acceptance

- no Custom Query/footer overlap at 390×844 and 430×932;
- no horizontal overflow at controlled viewports;
- `Open map` visible at 768×1024;
- `Open map` hidden at 1366×768 and 1440×900;
- Workspace source regression, TypeScript and build pass;
- no API, data, report, Auth, Supabase or access-control change.

## Limitations

Headless-browser evidence is not physical-device certification. The change does not establish production-ready or pilot-ready status.

## Required caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

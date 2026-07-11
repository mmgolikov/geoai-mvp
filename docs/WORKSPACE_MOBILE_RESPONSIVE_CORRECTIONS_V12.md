# Workspace Mobile Responsive Corrections v1.2

## Control

- Task: Workspace Mobile Responsive Corrections v1.2 - current-main refresh
- Historical reference: PR #57, source only; no merge, rebase or force-push
- Status: isolated implementation candidate
- Base: current `main` at `f592179b46a767ecd94ce234b65e278294fe076a`
- Merge and Production release: not approved

## Problem

Controlled responsive QA found that the sticky mobile action area can overlap the lower part of the Custom Query textarea at 390x844. The initial disabled comparison action also consumes narrow-screen space, while the mobile-only `Open map` action remains visible after the desktop split map is active.

## Scope

- hide only the unavailable first disabled comparison action below 1024 px;
- retain the comparison action after a point becomes available;
- preserve safe focus scrolling for `#custom-query` below 1024 px;
- keep the action block in normal flow at 400 px and below so it cannot cover Custom Query;
- hide elements marked `min-[1367px]:hidden` when the `lg` split map layout is active;
- preserve current PR #54 behavior and the PR #55 quality gate.

## Selector rationale

- `aside > section.sticky.bottom-0 > button:first-of-type:disabled` targets only the unavailable first action in the Workspace panel footer.
- `#custom-query` adds focus scroll clearance without changing query behavior or layout.
- `aside > section.sticky.bottom-0` changes only the narrowest Workspace panel footer from sticky to normal flow.
- `[class~="min-[1367px]:hidden"]` hides the existing mobile map actions from the same 1024 px breakpoint where the split Workspace map becomes visible.

## Files

- `app/layout.tsx`
- `app/workspace-responsive-fixes.css`
- `docs/WORKSPACE_MOBILE_RESPONSIVE_CORRECTIONS_V12.md`

## Acceptance

- no Custom Query/footer overlap at 390x844 and 430x932;
- intersection is exactly 0 px at both narrow mobile viewports;
- no horizontal overflow at the five controlled viewports;
- disabled comparison action does not consume initial narrow-screen space;
- `Open map` remains available at 768x1024 and opens the mobile picker;
- `Open map` is hidden at 1366x768 and 1440x900 while the split map is visible;
- the released PR #55 quality gate, local checks and Preview smoke pass;
- no API, data, report, Auth, Supabase, access-control, Storage, Figma or Production change.

## Limitations

Browser evidence is not physical-device certification. This correction does not establish production-ready or pilot-ready status. Rollback is the single v1.2 commit on `dev6-workspace-responsive-fix-v12-current-main`.

## Required caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

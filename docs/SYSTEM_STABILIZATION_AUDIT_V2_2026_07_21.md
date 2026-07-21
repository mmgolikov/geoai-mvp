# GeoAI System Stabilization Audit v2 - 2026-07-21

Status: Active CR 09.23 audit receipt
Last verified: 2026-07-21
Owner: GeoAI Release Governance / QA
Authority: Bounded system stabilization evidence and residual-risk record
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Release Authority Policy](RELEASE_AUTHORITY_POLICY.json) · [Findings](SYSTEM_STABILIZATION_FINDINGS_V2.json)

## Executive Summary

CR 09.23 replaces the self-invalidating release tuple with a merge-safe policy, historical snapshot and external live-authority model. It also makes physical Chromium PDF evidence, browser-state resilience, a complete API route inventory and seven-profile Lighthouse evidence permanent Quality Gate controls. The Product remains a public-demo prototype; protected pilot, live backends and real sources remain blocked.

## Released Baseline

The repository preserves PR #106 / `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` / `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X` as the historical last externally verified snapshot, not as current operational authority. Current runtime truth must be read from external GitHub, Vercel and Project Hub post-release evidence under `RELEASE_AUTHORITY_POLICY.json`.

## Audit Methodology

The audit inspected active authorities, all 66 API route files and access contracts, browser-local persistence boundaries, Auth/logout behavior, existing Playwright/Axe/visual suites, print components/CSS, Lighthouse outputs, Quality Gate structure, migration replay evidence and read-only hosted Supabase receipts. No Product redesign or live backend mutation was performed.

## Passed Controls

- Stable release policy and historical snapshot schemas with five lifecycle fixtures.
- Browser-local malformed JSON, unknown version, oversized repository, unavailable storage, unavailable clipboard, logout cleanup and repeated-action evidence.
- Project-scoped source contract for analyses, artifacts, AOIs and uploads.
- Complete 66-route machine inventory plus representative malformed/oversized runtime matrix.
- Compact public diagnostics contracts and data-honesty scan.
- Seven Lighthouse profiles with exact final URL, LCP, CLS, TBT, transferred/decoded JS, largest chunks and Mapbox contribution.
- Twelve physical A4/Letter PDF variants from real seeded report routes with page rasters, extracted text, manifest and assertions.

## Findings By Severity

`SYSTEM_STABILIZATION_FINDINGS_V2.json` records 28 findings: 7 P0, 19 P1 and 2 P2. Two P0 audit-control defects (release authority and physical PDF evidence) are fixed on this branch; DB/Auth/environment/Storage/source activation remain external P0 gates.

## Unproven Controls

No real-user Auth/RLS/Admin/Storage persona, development or Production migration/apply, live source custody, field Core Web Vitals, printer-fleet validation, Production environment reconfiguration or post-merge Production receipt is claimed.

## Frontend/Browser-Local Findings

Permanent tests cover corrupted JSON, unknown namespace versions, artifact size caps, localStorage/sessionStorage denial, clipboard denial, namespace cleanup and duplicate request actions. Cross-project scoping remains enforced by compound project identity. Recovery messaging and distributed state ownership remain P2 debt.

## API Findings

`security/api-route-inventory.json` enumerates every route, classification, method, cache requirement, request-size limit status, positive response contract, negative status matrix and diagnostic exposure. Explicit bounded readers are recorded; null size limits remain honest API-02 debt. Runtime checks exercise positive health, unsupported method, malformed JSON and oversized JSON on bounded public routes.

## Security Findings

Public diagnostics remain compact/sanitized. Existing-user Auth containment remains intact. Mutable Action tags, request correlation and all protected live personas remain open. Repository CI explicitly cannot claim live GitHub/Vercel inspection.

## UX/Accessibility Findings

Covered Playwright surfaces retain zero serious/critical Axe findings. Clipboard and browser-storage denial produce usable bounded fallbacks. Generic corrupted-state recovery messaging remains open; no redesign is included.

## Performance Findings

Lighthouse covers Landing, Workspace, Projects, Explore, Login, Request Access and Profile with final-URL assertions and declared budgets. Summary evidence records LCP, CLS, TBT, transferred/decoded JavaScript, route first-load proxy, largest chunks and Mapbox bytes. Login is explicitly identified as CI Auth dev-server evidence and uses a separate development-bundle byte budget; Profile keeps a 0.90 accessibility floor, so remaining accessibility work is not hidden by the 0.95 default. A production Auth-mode build profile, isolated Mapbox initialization timing and field data remain unproven.

## PDF/Print Findings

The permanent harness prints seeded analysis/comparison plus long-title analysis/comparison, long lineage and partial evidence in A4 and Letter. It requires PDFs, all page rasters, extracted text, dimensions, hashes, no blank trailing page, no clipping/overflow/orphan headings, avoid-break cards, bounded map/table, wrapped long URLs, report identity/timestamp/classification/caveat/source lineage/attribution and page numbering. The captured Marina image must be embedded in analysis PDFs. Product print CSS still relies on viewer/harness footer numbering and remains a documented P1 limitation.

## Data/Backend Findings

Local clean replay, synthetic upgrade rehearsal and pgTAP remain strong deterministic evidence but are not hosted-clone certification. Historical read-only counts remain development 10 migrations/0 Auth users and rehearsal 18 migrations/1 pre-existing Auth user; this audit performs no hosted write.

## Documentation/Governance Findings

Active authorities now link stable policy and historical snapshot instead of a committed current tuple. The long-tail repository/Confluence lifecycle remains DOCS-01 and is not inflated into completion.

## Updated Dependency Plan

1. Maintain public-demo containment and permanent evidence gates.
2. Obtain owner-approved development DB-01 target evidence.
3. Run approved real Auth/membership/RLS personas.
4. Prove protected Storage personas.
5. Approve source rights/custody and observability before activation.
6. Capture an external post-release receipt after any future merge/deployment.

## Recommendations

Keep PR #108 Draft until the exact-head Quality Gate, PDF manifest, Preview route/log verification and read-only hosted counts are attached. Follow with separate CI SHA-pinning, request-size hardening and observability packages; do not mix those runtime changes into this audit.

## Next Steps

Run the permanent Quality Gate, inspect downloadable artifacts and PDFs, verify the exact Vercel Preview, recheck hosted counts read-only, and update PR #108 plus issue #107. Stop without merge or Production action.

## Non-Authorizations

This audit does not authorize merge, Ready-for-review transition, Production deployment, Supabase migration/write, Auth/provider/Storage activation, secrets/environment changes, Figma work, real-user execution or protected data.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

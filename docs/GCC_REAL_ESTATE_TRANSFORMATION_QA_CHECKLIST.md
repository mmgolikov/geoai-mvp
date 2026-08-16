# GCC Real Estate Transformation QA Checklist

Status: Active candidate acceptance checklist
Last verified: 2026-08-16
Owner: GeoAI Engineering and QA
Authority: Acceptance gate for Draft PR #143 under the GCC Real Estate Decision Platform v1 CR
Successor: Final exact-head release receipt or a later owner-approved checklist

## Release control

- [x] Work is on `product/gcc-real-estate-decision-platform-v1` from exact baseline `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
- [x] PR #143 remains Draft.
- [x] No direct `main` change, merge, Production deployment or Production environment change occurred.
- [x] No secret, credential, personal data or confidential project evidence appears in code, logs or artifacts.
- [ ] Exact final SHA is recorded in GitHub, Vercel, evidence and documentation.

## Product contracts

- [x] B2B includes development site, redevelopment, acquisition, commercial/hospitality and portfolio workflows.
- [x] B2C prioritizes home purchase, off-plan/investment property, rent/relocation and overseas-buyer workflows.
- [x] Tourism remains secondary.
- [x] UAE is the only enabled screening market unless another market has a separate approved source release.
- [x] Saudi Arabia, Qatar and Oman show metadata/readiness only and cannot silently influence scores.
- [x] B2B and B2C projects, analyses, reports and restored state remain separated.

## Workspace

- [x] Map-first and Criteria-first order and defaults are canonical.
- [x] Audience, market, role, scenario, criteria and Custom Query remain visible and usable.
- [x] Main setup sections do not create nested-scroll traps.
- [x] One sticky primary action does not obscure inputs.
- [x] Mobile full-screen map picker supports point/object/AOI selection, direct run and return without losing selection.
- [x] After a run, Dashboard or Comparison replaces setup as the primary surface.
- [x] `Back to setup` restores selection and criteria.

## Decision Dashboard and Comparison

- [x] Target identity, coordinates, scenario, posture, score, confidence and validation state are visible.
- [x] Score and confidence are separate concepts.
- [x] Drivers, risks, source basis, open gaps and next action are visible.
- [x] No duplicated KPI/status card set remains.
- [x] Comparison is usable without a 900 px mobile table overflow.
- [x] All values come from the normalized decision result contract.

## Project Hub

- [x] Summary is compact and work-oriented.
- [x] Analyses, comparisons, reports and project assets are primary sections.
- [x] Data Readiness / Source Lineage appears exactly once after primary work content.
- [x] Advanced diagnostics do not repeat analyses or reports.
- [x] Segment-specific selectors and restored state remain correct after hydration.

## Reports

- [x] Analysis and comparison report values match the source Dashboard/Comparison result.
- [x] Target identity, coordinates, posture, score, confidence, validation, rationale and next action match.
- [x] Captured map snapshot is primary when available; fallback is clearly labeled as screening context.
- [x] Required caveat appears exactly and remains readable.
- [x] No blank physical page, clipped content, overlap or orphan heading.
- [x] PDF text extraction retains headings, values and caveat.

## Data and integrations

- [x] Local normalized files are the default ingestion path.
- [x] Dry-run is the default for readiness synchronization.
- [x] Supabase write requires explicit non-dry-run configuration and server-only service-role credentials.
- [x] No Preview or Production database write is performed without exact-target, rights, migration, RLS and rollback gates.
- [x] Source provenance contains source ID/name, file/object identity, rights, attribution, hash, size, counts, timestamps, CRS/bounds where applicable, validation, caveat and next step.
- [x] Missing custody, rights or integrity evidence fails closed.
- [x] Local or imported screening metrics cannot change decision scores until the source release gate explicitly permits decision use.
- [x] Legacy persisted analyses are normalized before restore and cannot bypass the current source-release gate.
- [x] Matched or available source context is distinguished from context actually used in scoring across comparison, preview and printable reports.
- [x] Evidence references alone are not presented as runtime-observed external data use.
- [x] API responses expose consistent source groups, readiness, manifest, lineage, blockers, next actions, caveat and generatedAt.
- [x] Remote ingestion rejects non-HTTPS, unapproved hosts, redirects, oversized payloads and unsupported content.

## Security and privacy

- [x] Public analysis remains browser-local and cannot authorize protected server resources.
- [x] Protected mutations fail closed before request-body parsing.
- [x] Existing-user Auth behavior is unchanged unless separately authorized.
- [x] No new browser-exposed secret or server credential path exists.
- [x] Dependency audit reports zero accepted production vulnerabilities.
- [x] Map unmount/remount regression produces zero console errors.

## Figma candidate evidence

- [x] Candidate page `1956:11` and authority board `1956:12` remain explicitly `CANDIDATE`.
- [x] Landing, Workspace, Decision Intelligence, Project Hub and Reports retain exact node mappings.
- [x] Loading `1961:1060`, empty `1961:1177`, error `1961:1294` and partial-evidence `1957:24727` states are independently reviewable.
- [x] System-state export and machine-readable SHA-256 receipt are committed under `docs/evidence/figma-gcc-real-estate-v1/`.

## Automated validation

- [x] `npm audit --omit=dev`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:api-contract`
- [x] `npm run test:data-honesty`
- [x] `npm run test:documentation-current-truth`
- [x] `npm run test:document-lifecycle`
- [x] scenario, result-parity, provenance, map-lifecycle, Workspace and Project Hub checks
- [x] legacy-analysis hydration, source-use truth and browser-release evidence contracts
- [x] normalized data validation and source-readiness dry-run
- [ ] permanent GeoAI Quality Gate on exact final clean head

## Browser evidence

Viewports:

- [x] 390x844
- [x] 430x932
- [x] 768x1024
- [x] 834x1112
- [x] 1366x768
- [x] 1440x900

Routes and flows:

- [x] `/`
- [x] `/login`
- [x] `/workspace` B2B Map-first and Criteria-first
- [x] `/workspace` B2C Map-first and Criteria-first
- [x] full-screen mobile map direct run and return
- [x] Dashboard, Comparison and restore existing analysis
- [x] `/projects` for both segments
- [x] analysis and comparison report previews/print routes
- [x] relevant API health, platform, source and lineage routes
- [x] zero horizontal overflow and obscured controls
- [x] Axe serious/critical findings = 0
- [x] accepted-route browser console errors = 0
- [x] permanent browser suite records 38 passed, zero failures/skips/errors and retries disabled
- [x] responsive evidence records 25 screenshots, five required viewports and zero horizontal overflow/unexpected console or page errors

## Independent critical review

- [ ] Independent agent reviewed the exact final SHA and authored none of the Product changes.
- [ ] Every P0/P1 finding is fixed or explicitly recorded as an owner-approved limitation.
- [ ] Final review records the exact SHA, test evidence, Preview and remaining blockers.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

# CR-DEV7-003 Architecture Rendering & Exact Mapping — QA Checklist

Status: Local implementation validation passed; CI/Preview and independent review pending

Publication gate: Not passed

## Source and render controls

- [x] C4-001, C4-002, C4-003, BPMN-001, STATE-001, SEQ-001, ERD-001, DATA-LINEAGE-001, ACT-001, DEP-001 and API-001 are registered.
- [x] Each canonical source is a complete PlantUML document and produces a valid SVG.
- [x] PlantUML renderer version and JAR SHA-256 are pinned.
- [x] Source and SVG SHA-256 values match `render-manifest.json`.
- [x] No artifact is marked Approved and publication gate remains `not_passed`.

## Exact implementation checks

- [x] Every mapped file exists.
- [x] Every mapped symbol/literal exists in the referenced file.
- [x] Workspace role/scenario/criteria/map selection and analysis state match `WorkspaceShell`.
- [x] Spatial request, bundle, activation, layer adapter, lineage and attribution match `src/lib/spatial-b2/*`.
- [x] Analysis sequence matches `/api/analyze`, optional OpenAI and deterministic fallback behavior.
- [x] ERD matches the pilot-persistence migration and does not claim Production activation.
- [x] Deployment view identifies `/tmp` Vercel fallback as ephemeral/non-durable.
- [x] API view maps real route handlers and treats route existence separately from readiness.

## Trace checks

- [x] Missing bundle fails closed to synthetic fallback.
- [x] Invalid checksum fails closed to synthetic fallback.
- [x] Unapproved source mode fails closed.
- [x] Production open-context request is rejected.
- [x] Eligible controlled non-real fixture activates in Preview/development.
- [x] Rollback removes obsolete layers before sources and clears invalid fixture selection.
- [x] Layer visibility and attribution payload remain in parity.
- [x] Fallback-grid state emits no Mapbox record.
- [x] Uploaded user data attribution remains separate.

## Regression and evidence

- [x] `npm run test:architecture`
- [x] `npm run test:spatial-b2a`
- [x] `npm run test:data-honesty`
- [x] `npm run lint`
- [x] `npm run build`
- [ ] Permanent Quality Gate records architecture evidence at the exact event SHA.
- [ ] Vercel Preview routes and deployment-scoped warning/error/fatal logs are inspected after push.
- [x] No secret, environment, Supabase, Figma or Production mutation occurs.

## Pre-review corrections and open findings

- [x] DEP-001 identifies Vercel Git integration, not GitHub Actions, as the deployment owner.
- [x] ERD-001 removes non-existent/reversed profile, analysis-score, AOI and audit relationships.
- [x] C4-001/002/003 carry explicit Person, Software System, Container and Component semantics.
- [x] Corrected sources were re-rendered and visually inspected; repeated render hashes match exactly.
- [x] Controlled artifact versions advance existing lineage and are visible in canonical sources/renders.
- [ ] Security/backend and Data/GIS reviewers disposition the ordered-migration versus applied-schema finding.
- [ ] Architecture reviewer accepts the bounded BPMN-aligned rendering or requests BPMN 2.0 XML separately.
- [ ] Real people are assigned to all five independent review roles.

## Independent gate

- [ ] Product architecture owner decision recorded.
- [ ] Engineering reviewer decision recorded.
- [ ] Data/GIS reviewer decision recorded.
- [ ] Security/backend reviewer decision recorded.
- [ ] Documentation controller decision recorded.
- [ ] Findings resolved or accepted with conditions.
- [ ] Confluence publication decision updated after, not before, independent review.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

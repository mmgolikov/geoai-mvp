# GeoAI Responsive Visual QA v1 — QA Checklist

## Scope

- [ ] Branch starts from current `main`.
- [ ] Only responsive QA workflow, harness and documentation are changed.
- [ ] No product UI, API, data, Supabase, Auth/RLS, environment or Figma change is included.
- [ ] No merge or Production deployment is requested automatically.

## Workflow

- [ ] Pull requests to `main` trigger the workflow.
- [ ] Manual dispatch is available.
- [ ] Repository permission is read-only.
- [ ] Node.js 22 and `npm ci` are used.
- [ ] TypeScript and build pass before browser evidence starts.
- [ ] Chrome/Chromium executable is detected explicitly.
- [ ] Built server readiness and early exit are handled.
- [ ] Evidence uploads even after a failed QA step where possible.

## Viewports

- [ ] 390×844
- [ ] 430×932
- [ ] 768×1024
- [ ] 1366×768
- [ ] 1440×900

## Landing

- [ ] Visible H1.
- [ ] At least two visible hero actions.
- [ ] Visible screening caveat.
- [ ] No horizontal overflow.
- [ ] Viewport and full-page screenshot captured.

## Workspace initial state

- [ ] Project Details control absent.
- [ ] Scenario setup present.
- [ ] Candidate Search present after Scenario setup.
- [ ] Custom Query present after Candidate Search.
- [ ] Custom Query textarea exists.
- [ ] At least one Run Express Analysis action is visible.
- [ ] Horizontal overflow absent.
- [ ] Narrow-screen Custom Query fold status recorded.
- [ ] Duplicate primary actions recorded.
- [ ] Visible compact caveat status recorded.
- [ ] 1366px Open map breakpoint status recorded.

## Segment and interaction modes

- [ ] B2C state can be selected.
- [ ] B2C Scenario values do not expose B2B IDs.
- [ ] B2B state can be restored.
- [ ] Criteria-first state can be selected.
- [ ] Candidate Search remains visible in criteria-first state.
- [ ] Narrow-screen map picker opens.
- [ ] Back to workflow is visible within viewport.
- [ ] Run Express Analysis is visible within viewport.

## Project Hub

- [ ] Project Hub title visible.
- [ ] Active project selector exists.
- [ ] Data Readiness / Source Lineage exists.
- [ ] Advanced diagnostics default state recorded.
- [ ] Known contradictory demo/pilot/access labels recorded.
- [ ] No horizontal overflow.

## Printable reports

- [ ] Analysis report captured at 768×1024 and 1440×900.
- [ ] Comparison report captured at 1440×900.
- [ ] Back and Print controls exist.
- [ ] Scenario/Selected target mapping recorded.
- [ ] Schematic map label status recorded.
- [ ] Demo/model-assisted score label status recorded.
- [ ] Mandatory caveat duplication count recorded.
- [ ] No horizontal overflow.

## Evidence package

- [ ] PNG screenshots created.
- [ ] `responsive-qa-summary.json` created.
- [ ] `responsive-qa-summary.md` created.
- [ ] Chrome log preserved.
- [ ] Next.js runtime log preserved.
- [ ] Findings include severity, code, message and evidence.
- [ ] Artifact retention is limited.
- [ ] No credentials, cookies, env values or confidential data are included.

## Governance

- [ ] P0 causes workflow failure.
- [ ] P1/P2 remain visible review findings.
- [ ] A successful run is not described as physical-device, security, Production or pilot certification.
- [ ] PR links Confluence UX-QA-DEV6-001 and REL-EVID-001.
- [ ] Standing caveat is included.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

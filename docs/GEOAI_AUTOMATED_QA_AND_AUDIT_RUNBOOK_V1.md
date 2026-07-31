# GeoAI Automated QA and Audit Runbook v1

**Status:** Proposed  
**Delivery timezone:** Europe/Amsterdam  
**Evidence timezone:** UTC  
**Default mode:** read-only and exception-driven

## 1. Operating model

GeoAI uses three audit layers:

| Layer | Cadence | Purpose | Default depth |
|---|---|---|---|
| Daily control-plane audit | Every day at 07:00 | detect changes, contradictions and urgent risks | delta only |
| Weekly governance audit | Monday at 07:00 | complete source, documentation and release review | deep |
| Release gate audit | on explicit request | candidate GO/NO-GO decision | candidate-specific deep audit |

The cadence is unchanged from the previous operating model. Delivery is aligned to the founder's current timezone. All source timestamps and evidence manifests use UTC.

## 2. Daily audit procedure

### Inputs

- `docs/GEOAI_PROJECT_REGISTRY_V1.json`;
- `docs/CURRENT_RELEASE_STATE.md`;
- `docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json`;
- current GitHub `main` SHA and open PR heads;
- current Vercel Production deployment ID/SHA/state;
- latest Supabase migration/source-state/advisor fingerprints;
- update timestamps of canonical Confluence pages;
- Figma authority only when changed or actively affected.

### Checks

1. Production SHA equals the repository release baseline.
2. Production deployment ID and state match the verified snapshot.
3. Candidate branches are not labelled as released.
4. Open PR/branch heads changed or remained stable.
5. Supabase migration count/latest version and source-state counts changed or remained stable.
6. DLD payload remains explicitly separate from metadata/table-contract readiness.
7. New security advisors are surfaced.
8. Canonical Confluence pages are not older than contradictory primary-source evidence.
9. Exact data-honesty wording is present in current authority documents.
10. Protected actions remain unexecuted without approval.

### Output

- changes since the previous audit;
- blockers or contradictions;
- owner decisions required;
- documentation patches prepared or applied under existing approval;
- one-sentence next action.

When nothing changed, do not perform full rewrites. Record a compact no-change result.

## 3. Weekly audit procedure

### Confluence

- verify Project Home, Current Delivery State, Governance & Change Log, Change Log, Artifact Registry and Agent Operating Mode;
- check hierarchy, broken/duplicate authorities and stale page references;
- confirm approved Change Requests and release decisions are linked.

### GitHub

- inspect default branch, open/draft PRs, active branches, merged state and review/check status;
- validate registry/current-state/snapshot consistency;
- review automated audit failures and documentation drift;
- identify branches that need archival, PR creation or explicit owner disposition.

### Vercel

- verify Production alias, deployment ID, source SHA, state and recent runtime errors;
- inspect only relevant Previews;
- require route/visual evidence for release decisions;
- distinguish successful build from successful release QA.

### Supabase

- verify projects and regions;
- inspect migration ledger and current physical schema;
- check RLS/policy state, source registry, external snapshots and payload counts;
- review security/performance advisors;
- record remediation decisions but do not apply migrations without approval.

### Figma

- verify canonical file and authority nodes;
- read affected sections/components rather than the full file by default;
- confirm executable prototype, runtime alignment and correction receipts;
- identify design/runtime drift and missing Codex handoff evidence.

### Data honesty

Search current UI copy, reports and client/investor materials for unsupported terms including official/live/verified/approved/cadastral/zoning/valuation/pilot-ready/production-ready. Validate evidence or replace with bounded wording.

## 4. Document QA

For DOCX, PPTX, PDF and XLSX artifacts:

1. preserve source/template hierarchy and formatting requirements;
2. render the final artifact;
3. inspect every page/sheet/slide for overflow, clipping, overlap, broken tables, empty imbalance and unreadable typography;
4. verify numbers, units, labels, caveats and source lineage;
5. repair and rerender until checks pass;
6. retain editable source and final export where required;
7. record artifact path/version and QA result in the Artifact Registry.

A generated file is not complete until its rendered result is checked.

## 5. Product and release QA

Required release evidence:

- founder-approved CR and acceptance criteria;
- exact candidate branch/PR/head SHA;
- successful build and checks;
- relevant Preview deployment ID;
- route smoke results;
- visual QA for affected states and breakpoints;
- data-honesty QA;
- documentation sync;
- rollback point;
- explicit merge/deploy decision.

Preview is never Production. A merge is not a verified deployment. A READY deployment is not sufficient proof of route, visual or data correctness.

## 6. Current known owner decisions

1. `public.spatial_ref_sys` appears in the Supabase security advisor with RLS disabled. Because it is the PostGIS spatial reference metadata table, remediation must be explicitly reviewed rather than automatically applied.
2. DLD source payload access, licensing, lineage and ingestion remain unconfirmed; existing state is metadata/table-contract readiness only.
3. The Moscow Rosimushchestvo pilot branch remains a separate candidate and requires its own CR, source audit, QA and approval path.
4. This control-plane branch must be reviewed before merge; no Production action is authorised by this runbook.

## 7. Failure handling

| Failure | Response |
|---|---|
| provider timeout/rate limit | bounded retry; retain partial verified evidence; report incomplete source |
| permission/auth failure | stop that write path; report exact missing permission |
| source conflict | use primary-source order; mark derived document stale; prepare correction |
| missing visual evidence | report missing; do not infer pass |
| stale registry | refresh affected domain and regenerate derived documents |
| validator failure | block merge recommendation until resolved |
| protected action without approval | refuse execution and prepare decision package only |

## 8. Escalation severity

- **P0:** unauthorised Production/database/auth/security change; active customer-data exposure.
- **P1:** Production unavailable, wrong release active, official-data claim without evidence, critical security advisory.
- **P2:** candidate QA failure, documentation/registry drift, stale source lineage, broken report/export.
- **P3:** formatting, navigation, low-risk metadata or housekeeping issue.

## 9. Completion evidence

Every audit must end with:

- audit type and time;
- primary version keys;
- changed/unchanged domains;
- verified findings and confidence;
- risks and owner decisions;
- files/pages updated;
- validator result;
- protected actions not taken;
- next scheduled or decision-triggered step.

## 10. Rollback

This control plane changes documentation, validation code and scheduled prompts only. Rollback is:

1. disable or restore the prior automation prompt/schedule;
2. revert the control-plane commit/PR;
3. restore previous authority documents from Git history;
4. record the rollback in Confluence Change Log.

No database or runtime rollback is required unless a later, separately approved release includes additional changes.
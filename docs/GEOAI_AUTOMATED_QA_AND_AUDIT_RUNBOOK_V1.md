# GeoAI Automated QA and Audit Runbook v1

**Status:** Proposed / Goal 0 correction candidate  
**Delivery timezone:** Europe/Amsterdam  
**Evidence timezone:** UTC  
**Default mode:** read-only and exception-driven

## 1. Operating model

| Layer | Cadence | Purpose | Evidence boundary |
|---|---|---|---|
| Daily control-plane audit | Every day at 07:00 | detect deltas and contradictions | fresh version keys plus scoped direct reads |
| Weekly governance audit | Monday at 07:00 | complete six-system reconciliation | deep external read-back |
| Release gate audit | on explicit request | candidate GO/NO-GO package | exact candidate head plus direct external evidence |
| Repository control-plane check | PR/manual | validate local schemas and cross-file boundaries | internal consistency only |

The repository control-plane check is not an external Truth Gate. A green job cannot prove live GitHub, Vercel, Supabase, Figma, Confluence or Google Drive state and cannot recommend merge.

## 2. Daily audit procedure

### Inputs

- `docs/GEOAI_PROJECT_REGISTRY_V1.json`;
- `docs/CURRENT_RELEASE_STATE.md`;
- `docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json`;
- current GitHub default branch and active PR/branch heads;
- current Vercel Production deployment and relevant Preview identities;
- latest Supabase migration/source/advisor fingerprints;
- direct current versions of canonical Confluence pages;
- affected Figma authority nodes when changed or active;
- registered Drive supporting folder when artifact authority could drift.

### Checks

1. Production deployment SHA equals the released GitHub baseline.
2. Preview/candidate branches are not labelled released or Production.
3. Open PR and prototype branch heads changed or remained stable.
4. Supabase physical ledger, RLS/policy and row-count boundaries changed or remained stable.
5. DLD payload remains separate from metadata/schema readiness.
6. Figma node allow-list and metric definitions remain current when affected.
7. Direct Confluence page version/body does not conflict with primary systems.
8. Rovo search snippets are used only for discovery, never as overwrite authority.
9. Drive remains supporting storage and does not duplicate the decision authority.
10. Protected actions remain unexecuted without explicit approval.
11. Exact data-honesty wording remains present.

### Output

- exact changed/unchanged version keys;
- blockers and severity;
- incomplete providers;
- owner decisions;
- documents/pages updated under current approval;
- protected actions not taken;
- exact next action.

## 3. Weekly six-system audit

### GitHub

Inspect default/release branches, open/draft PRs, active prototype branches, exact heads, merge state, changed files, reviews and checks.

### Vercel

Verify Production alias/deployment/target/SHA, relevant Preview deployment identities, build/runtime evidence and route/visual receipts. READY is not route or visual QA.

### Supabase

Verify project/region/status, migration ledger, schema/table/RLS/policies, Auth users, source metadata, exact payload counts and advisors. Record remediation decisions; never apply them automatically.

### Figma

Direct-read the canonical file and affected authority nodes/pages. Define screen, component and reaction metrics explicitly. Figma approval does not prove runtime parity.

### Confluence

Direct-fetch Project Home, Current Delivery, Governance, Change Log, active CRs and evidence pages. Use returned page versions/bodies as authority. Search snippets may lag and are discovery-only.

### Google Drive

Inspect the registered supporting folder and relevant artifact locations. Confirm whether files are controlled deliverables, uncontrolled support, empty placeholders or duplicate authorities.

### Data honesty

Search current UI, reports, documentation and client/investor materials for unsupported official/live/verified/approved/cadastral/zoning/valuation/pilot-ready/production-ready claims.

## 4. Internal control-plane check

The dependency-free check may validate:

- JSON parse/schema expectations;
- release/candidate separation;
- equal values across registry, snapshot, policy and current-state files;
- exact caveat;
- Figma allow-list and metric definitions;
- Moscow branch graph recorded in derived files;
- protected-action boundaries;
- requirement for a six-system external Truth Gate.

It may not:

- call provider APIs;
- certify current external state;
- infer visual/runtime/data correctness;
- recommend merge;
- authorise protected actions.

Its successful output must explicitly say external truth is unverified.

## 5. Release gate evidence

Required:

- Founder-approved CR and acceptance criteria;
- exact candidate branch/PR/head;
- exact-head checks and run IDs;
- exact-head Preview identity;
- route and visual evidence for affected behavior;
- data-honesty QA;
- six-system external Truth Gate;
- documentation receipt;
- rollback point;
- explicit Founder merge/release decision.

Preview is never Production. Merge is not verified deployment. A green internal check is not external truth.

## 6. Current known decisions

1. `public.spatial_ref_sys` RLS remediation requires a dedicated security decision; no automatic SQL.
2. DLD access, rights, custody, quality, ingestion and scoring remain unapproved.
3. Moscow M0 authority is `bd90887c...`; the separate dev prototype exists at `722e516...`, ahead 2 / behind 0, Preview-only and unmerged.
4. PR #120 remains Draft/HOLD until one correction commit, two new exact-head checks and a fresh six-system read-back.
5. Production and Figma remain unchanged by this task.

## 7. Failure handling

| Failure | Response |
|---|---|
| provider timeout/rate limit | bounded retry; retain partial verified evidence; mark gate incomplete |
| permission/auth failure | stop that write path; report exact missing permission |
| source conflict | primary source wins; mark derived surface stale; correct under approval |
| stale Rovo snippet | direct-fetch current page/version/body; never overwrite from snippet |
| missing visual evidence | report missing; do not infer pass |
| internal validator failure | block progression and inspect scoped source issue |
| internal validator green but external source missing | keep external Truth Gate incomplete |
| protected action without approval | refuse execution and prepare decision package only |

## 8. Severity

- **P0:** unauthorised Production/database/auth/security change, active customer-data exposure, or current authority causing an unsafe release decision.
- **P1:** Production unavailable/wrong release, unsupported official-data claim, critical security finding.
- **P2:** candidate QA failure, documentation/registry drift, stale lineage or broken report/export.
- **P3:** formatting, navigation or low-risk metadata.

## 9. Completion evidence

Every audit records:

- audit type/time and exact version keys;
- per-system direct/derived/unverified status;
- contradictions and severity;
- files/pages updated;
- internal validator result;
- external Truth Gate result or incompleteness;
- protected actions not taken;
- next decision.

## 10. Rollback

This branch changes documentation and validation only. Rollback is a Git revert plus Confluence Change Log receipt. No database/runtime rollback is required because no protected system is changed.

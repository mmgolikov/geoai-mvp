# GeoAI Source Audit and Delta Protocol v1

**Status:** Proposed / Goal 0 correction candidate  
**Effective after approval:** 2026-08-01  
**Delivery timezone:** Europe/Amsterdam  
**Evidence timestamps:** UTC

## 1. Objective

Reduce repeated discovery while preserving evidence quality, data honesty and Founder-controlled release gates.

The protocol separates:

- **daily delta audit** — compact, exception-driven version-key comparison;
- **weekly deep audit** — complete six-system reconciliation;
- **release audit** — exact candidate evidence and direct external Truth Gate;
- **repository internal check** — schema, boundary and cross-file consistency only.

## 2. Mandatory starting point

Read:

1. `docs/GEOAI_PROJECT_REGISTRY_V1.json`;
2. `docs/CURRENT_RELEASE_STATE.md`;
3. `docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json`;
4. the applicable Change Request and approval record.

These are derived starting indexes. Query primary systems whenever evidence is stale, changed, missing, contradictory, decision-critical or required for a protected action.

## 3. Version keys

| Source | Fast version key | Deep evidence |
|---|---|---|
| GitHub | default/release branch SHA; PR/branch head; merge state | body/comments, checks, files, reviews, commit graph |
| Vercel | Production deployment/SHA/target; Preview deployment/SHA | aliases, logs, route/visual/runtime evidence |
| Supabase | project status; migration count/latest; table/policy/row fingerprints | ledger, catalog, read-only SQL, advisors |
| Figma | file key, node/page IDs and defined metric authority | direct node/page metadata, components, reactions and receipts |
| Confluence | page ID and current version | direct current-page body, hierarchy, decisions and links |
| Google Drive | folder/file ID, modified time and classification | direct folder contents, file metadata and duplicate-authority review |

## 4. Delta audit

1. Read compact derived authorities.
2. Compare live version keys.
3. Deep-read only changed, expired, contradictory or decision-critical domains.
4. Report exact deltas, stale derived files, incomplete sources and the next safe action.
5. Do not rewrite documents only to refresh timestamps.

## 5. Weekly and release external Truth Gate

Reconcile all six systems:

1. GitHub;
2. Vercel;
3. Supabase;
4. Figma;
5. Confluence;
6. Google Drive.

For a release candidate, perform the external Truth Gate **after** exact-head checks. Record the exact candidate head, check run IDs, Preview identity, Production identity, database state, design allow-list/metrics, direct Confluence versions and Drive classification.

A gate is incomplete if any required system cannot be directly verified. A green repository validator never substitutes for this read-back.

## 6. Conflict rules

### Production

Vercel deployment evidence determines what is running. GitHub determines source and merge state. Preview cannot be promoted by wording.

### Database

Supabase physical ledger/catalog/query evidence determines state. Migration files do not prove application.

### Design

Direct Figma authority nodes/pages determine intent. Runtime code/screenshots determine implementation. Design approval does not prove parity.

### Decisions and Confluence search safety

Confluence direct current-page version/body records decisions. Rovo search snippets may lag after an update and are discovery-only. Never use a stale search snippet to overwrite a newer direct page.

### Drive

Drive is supporting artifact storage unless a specific controlled artifact is registered. It must not become a duplicate decision authority.

### Derived files

Registry, snapshot, policy and CI output are indexes/checks. Fresher primary evidence wins.

## 7. Internal validator boundary

The repository validator checks:

- parse/schema requirements;
- local cross-file equality;
- release/candidate and protected-action boundaries;
- exact data-honesty wording;
- explicit Figma/Moscow derived values;
- external Truth Gate requirements.

It does not query providers or prove current truth. It must output `EXTERNAL TRUTH: UNVERIFIED` unless a separate fresh direct-read receipt exists. It cannot recommend merge.

## 8. Evidence format

```json
{
  "source": "github|vercel|supabase|figma|confluence|google_drive",
  "object_id": "stable identifier",
  "environment": "production|preview|development|rehearsal|supporting",
  "verified_at": "ISO-8601 UTC timestamp",
  "version_key": "SHA, deployment ID, migration, page version, node/page ID or file/folder ID",
  "finding": "plain-language verified result",
  "confidence": "verified|partially_verified|unverified",
  "action_required": false
}
```

## 9. Write and approval boundaries

Without explicit approval, no audit may:

- merge, mark ready or enable auto-merge;
- deploy/promote/rollback Production;
- mutate Supabase data/schema/Auth/RLS/grants/functions/Storage;
- change secrets/environment variables;
- edit Figma;
- activate sources or scoring;
- publish official/legal/cadastral/zoning/planning/valuation conclusions.

## 10. Data-honesty gate

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Unsupported official/live/verified/approved/guaranteed claims fail the audit.

## 11. Completion rule

Completion requires source evidence, explicit contradictions or gate incompleteness, reviewable corrections, internal QA result, external Truth Gate status, protected-action record and one exact next decision.

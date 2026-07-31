# GeoAI Source Audit and Delta Protocol v1

**Status:** Proposed  
**Effective after approval:** 2026-08-01  
**Delivery timezone:** Europe/Amsterdam  
**Evidence timestamps:** UTC

## 1. Objective

Reduce repeated discovery and full-workspace reads while preserving evidence quality, data honesty and founder-controlled release gates.

The protocol separates:

- **daily delta audit** — compact, exception-driven and based on version keys;
- **weekly deep audit** — complete cross-system reconciliation and governance review;
- **release audit** — explicit candidate-to-production evidence package, never inferred from a Preview.

## 2. Mandatory starting point

Every operational agent must begin with:

1. `docs/GEOAI_PROJECT_REGISTRY_V1.json`;
2. `docs/CURRENT_RELEASE_STATE.md`;
3. `docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json`;
4. the applicable Change Request and approval record.

Primary sources must be queried only for objects that are stale, changed, missing, contradictory or required by the requested action.

## 3. Version keys by source

| Source | Fast version key | Deep evidence |
|---|---|---|
| GitHub | default-branch SHA; open PR head SHA; merge state | PR body, checks, changed files, review threads and commit history |
| Vercel | production deployment ID and Git SHA; candidate deployment ID | build state, logs, aliases, route smoke and runtime errors |
| Supabase | migration count/latest version; table/row fingerprints; advisor count | migration ledger, schema/table/RLS/policies, source-state rows and validation SQL |
| Figma | file key plus approved node IDs and documented authority version | affected node metadata, variables, components, prototype states and receipts |
| Confluence | page ID plus updated timestamp/version | complete content, hierarchy, decisions, links and change-log reconciliation |

## 4. Daily delta audit

### 4.1 Read compact authorities

Read the registry, current release state and verified snapshot first. Do not enumerate an entire workspace by default.

### 4.2 Compare version keys

Check:

- current `main` SHA and open PR head SHAs;
- current Production deployment ID/SHA/state;
- latest Supabase migration and source-state counts;
- updated timestamps of canonical Confluence pages;
- Figma authority only when its recorded node/version changed or design work is active.

### 4.3 Escalate only changed sources

Deep-read a source when:

- its version key changed;
- a required field is missing;
- primary sources conflict;
- a protected action is requested;
- the evidence TTL expired;
- a client/investor claim depends on that source.

### 4.4 Produce an exception report

A daily audit should report only:

- verified changes;
- stale derived documents;
- conflicting evidence;
- new risks/advisories;
- decisions required;
- exact safe next action.

No-change audits should be brief and should not rewrite documentation merely to refresh timestamps.

## 5. Weekly deep audit

The weekly audit must reconcile all canonical sources:

1. Confluence structure, current pages, change log and artifact registry;
2. GitHub branches, PRs, merged state, documentation and automation checks;
3. Vercel Production and relevant Previews, logs and route evidence;
4. Supabase projects, migration ledger, tables, RLS, source state, payload counts and advisors;
5. Figma authority graph, approved versions, components and runtime alignment;
6. repository registry, release snapshot and policy consistency;
7. data-honesty language across current product/docs/materials.

The weekly output must contain:

- executive status;
- current released baseline;
- active candidate matrix;
- source and design readiness;
- risks and owner decisions;
- documentation drift;
- recommended next actions;
- evidence references and timestamps.

## 6. Conflict-resolution rules

### 6.1 Production

Vercel deployment evidence determines what is running. GitHub determines whether the corresponding code is merged. A Confluence or repository statement cannot promote a Preview to Production.

### 6.2 Database

Supabase physical schema, migration ledger and query evidence determine database state. Migration files alone do not prove application.

### 6.3 Design

Approved Figma authority nodes determine design intent. Runtime screenshots and code determine implementation. A design approval does not prove runtime alignment without evidence.

### 6.4 Decisions

Confluence records approvals and operating decisions. A technical state change without the required approval is reported as a governance breach, not silently normalised.

### 6.5 Derived documents

The registry and snapshots are indexes. When stale, update them after verifying the primary source; never use them to override it.

## 7. Cache and freshness policy

Cache identifiers and immutable evidence where safe:

- repository, project, file, page and node IDs;
- merged commit SHAs and deployment IDs;
- migration versions;
- approval record IDs.

Do not cache as current truth beyond its TTL:

- open PR states;
- Production aliases/deployments;
- source payload counts;
- runtime errors;
- security advisors;
- mutable Confluence page content.

Default TTLs are defined in the registry. A protected action always requires fresh evidence regardless of TTL.

## 8. Evidence record format

Each finding must contain:

```json
{
  "source": "github|vercel|supabase|figma|confluence",
  "object_id": "stable identifier",
  "environment": "production|preview|development|rehearsal",
  "verified_at": "ISO-8601 UTC timestamp",
  "version_key": "SHA, deployment ID, migration version, page version or node authority",
  "finding": "plain-language verified result",
  "confidence": "verified|partially_verified|unverified",
  "action_required": false
}
```

## 9. Write and approval boundaries

A scheduled or ad-hoc audit may read and prepare documentation. It must not, without explicit approval:

- merge a pull request;
- deploy or promote Production;
- apply a Supabase migration or mutate source data;
- change authentication/hard enforcement;
- add or modify secrets/environment variables;
- approve official/legal/cadastral/zoning/planning/valuation conclusions.

## 10. Data-honesty gate

Any site, object, parcel, score, value or scenario output based on sample, open, generated, metadata-only or user-provided data must preserve this statement:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

An audit must fail when a current product or client-facing artifact presents an unsupported source as official, live, verified or guaranteed.

## 11. Agent completion rule

An agent is not complete when it has only produced prose. Completion requires:

- source evidence obtained;
- conflicts resolved or explicitly escalated;
- affected registry/snapshot/docs updated on a reviewable branch or approved system;
- validator/QA result recorded;
- protected actions left untouched unless separately approved;
- next decision stated in one sentence.
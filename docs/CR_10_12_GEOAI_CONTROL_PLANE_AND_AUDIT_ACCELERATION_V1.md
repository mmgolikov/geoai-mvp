# CR 10.12 — GeoAI Control Plane and Audit Acceleration v1

**Status:** Proposed / documentation and validation implementation complete on a dedicated branch  
**Owner:** GeoAI Founder  
**Prepared:** 2026-07-31  
**Scope:** Governance, source authority, delta audits, machine-readable registry, non-destructive QA  
**Protected actions:** No merge, production deployment, Supabase migration, authentication enforcement, secret or environment-variable change is authorised by this CR.

## 1. Problem

GeoAI delivery state is distributed across Confluence, GitHub, Vercel, Supabase and Figma. Agents currently need multiple discovery and reconciliation calls before they can answer basic operational questions. The current repository release documents also drifted behind the actual production state: `main` and Production are on PR #113 / SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, while the previous repository snapshot still described PR #106.

This creates four risks:

1. agents repeatedly read large documents instead of checking deltas;
2. candidate branches can be confused with released state;
3. stale documentation can override newer deployment evidence;
4. source, design and data claims can be repeated without a current evidence timestamp.

## 2. Business reason

A dependable control plane reduces audit time, supports faster B2B/B2G pilot preparation, and protects client and investor materials from unsupported claims. It also creates an enterprise-grade evidence chain for release decisions without weakening founder approval gates.

## 3. Users

- GeoAI Founder and release approver;
- product, design and engineering agents;
- delivery and QA owners;
- enterprise/B2G proposal and pilot teams;
- future MCP/control-plane implementers.

## 4. Affected product screens

No runtime screen is changed. The control plane references, but does not modify, the approved Figma and runtime authorities.

Operationally affected surfaces:

- Confluence Project Home, Current Delivery State and governance pages;
- GitHub release authority documents and pull-request checks;
- scheduled daily and weekly audits;
- future agent handoffs.

## 5. Data impact

Documentation and metadata only.

- No source payload is ingested.
- No Supabase schema or data is changed.
- Existing DLD foundation remains metadata/table-contract only with zero payload rows.
- The registry records source readiness, environment IDs, verified facts and validation boundaries.

Mandatory product wording remains:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 6. Design impact

No Figma write is included. The registry records the verified authority graph:

- file: `TAzDqOvRCw1mQGMU3Y4S9H`;
- executable Start Here: `1797:2`;
- executable prototype: `1482:2`;
- runtime alignment: `1749:21157`;
- correction receipts: `1819:11`, `1825:11`;
- delivery cockpit: `1495:53`.

Design-to-code work must continue to use affected nodes/components rather than rereading the whole file.

## 7. Engineering impact

This CR introduces:

1. `docs/GEOAI_PROJECT_REGISTRY_V1.json` — compact machine-readable authority index;
2. `docs/GEOAI_SOURCE_AUDIT_AND_DELTA_PROTOCOL_V1.md` — daily delta and weekly deep-audit protocol;
3. `docs/GEOAI_MCP_TOOL_CONTRACTS_V1.md` — high-level GeoAI control-plane tool contracts;
4. `docs/GEOAI_AUTOMATED_QA_AND_AUDIT_RUNBOOK_V1.md` — operational runbook;
5. `scripts/geoai-control-plane-check.mjs` — dependency-free consistency validator;
6. `.github/workflows/geoai-control-plane-audit.yml` — read-only pull-request and scheduled check;
7. concise current release authority and refreshed verified snapshot.

The validator performs no network writes and requires no secrets.

## 8. Source audit — verified 2026-07-31

| Source | Verified state | Authority use | Finding |
|---|---|---|---|
| GitHub | `main` at `7f323c…`; PR #113 merged; PR #118 draft/open; Moscow pilot branch separate | code, PR and branch truth | repository release snapshot was stale |
| Vercel | production deployment `dpl_4yBH4WUUf6GYTemFdSdAxUJQYgsC`; SHA `7f323c…`; zero runtime errors reported for the previous seven days | runtime/deployment truth | production matches `main`; previews remain non-production |
| Supabase | `geoai-dev` healthy; 12 migrations; 20 public base tables; 8 source-registry rows; 8 external-snapshot rows; seven zero-row DLD tables in isolated schemas | schema/data truth | `public.spatial_ref_sys` security advisory requires an owner decision, not automatic remediation |
| Figma | file and authority nodes accessible | design intent and approval truth | node-level registry can replace repeated full-file discovery |
| Confluence | Project Home and Current Delivery State describe PR #113 and DLD foundation | operational narrative and decision truth | repository and Confluence had diverged |

### Active candidates, not released state

- DLD controlled ingestion foundation: PR #118, branch `agent/dld-controlled-ingestion-foundation-v1`, verified head `703f37691efb341d14c988383ad785bfda1c5044`.
- Rosimushchestvo Moscow pilot: branch `pilot/rosimushchestvo-moscow-v1`, verified head `c735200c…`; separate preview/candidate only.

## 9. Source authority and conflict rule

1. Runtime state: Vercel deployment evidence.
2. Code/merge state: GitHub PR, branch and commit evidence.
3. Database state: Supabase schema, migration ledger and row-level evidence.
4. Design state: approved Figma authority nodes and receipts.
5. Decision and operating narrative: Confluence.
6. Registry and snapshot: derived indexes; never allowed to override a fresher primary source.

When sources disagree, the primary source wins and the derived document is marked stale in the same audit.

## 10. Risks and controls

| Risk | Control |
|---|---|
| Registry becomes another stale document | TTL warnings, primary-source timestamps and automated cross-file consistency checks |
| Candidate mistaken for Production | explicit environment classification and validator prohibition |
| Scheduled audit causes unauthorised writes | prompts prohibit merge/deploy/migration/auth/secrets and require existing approval |
| Full audits remain expensive | daily delta mode; deep weekly audit only |
| False data-source claims | mandatory caveat and explicit `official_validation_required` flag |
| PostGIS advisory remediated incorrectly | record as an owner/security decision; no automatic SQL change |

## 11. Acceptance criteria

- [x] Current production SHA, PR and Vercel deployment are consistent across registry, release state and snapshot.
- [x] Active DLD and Moscow pilot branches are classified as candidates, not Production.
- [x] Supabase physical schemas, migration count, source-state counts and zero-row DLD foundation are represented accurately.
- [x] Figma and Confluence canonical IDs are recorded.
- [x] Exact data-honesty wording is present.
- [x] A dependency-free validator fails on authority drift and candidate/production confusion.
- [x] Daily and weekly audit procedures are separated.
- [x] No protected action is executed.
- [ ] Founder review and merge approval.
- [ ] Post-merge first scheduled-run review.

## 12. Approval requested

Approve merge of the documentation/control-plane PR only. Production deployment effects, if any are triggered by the repository's normal Production Branch policy after merge, remain a separate founder decision and must be checked against the release policy before merge.
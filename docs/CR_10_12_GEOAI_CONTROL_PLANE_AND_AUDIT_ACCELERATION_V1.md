# CR 10.12 — GeoAI Control Plane and Audit Acceleration v1

**Status:** Proposed / implemented on dedicated branch `ops/geoai-control-plane-v1` and Draft PR #120  
**Owner:** GeoAI Founder  
**Prepared:** 2026-07-31  
**Confluence authority:** page `22052867`  
**Scope:** Governance, source authority, delta audits, machine-readable registry, non-destructive QA  
**Protected actions:** No merge, Production deployment, Supabase migration, authentication enforcement, secret or environment-variable change is authorised by this CR.

## 1. Problem

GeoAI delivery state is distributed across Confluence, GitHub, Vercel, Supabase and Figma. Agents currently need multiple discovery and reconciliation calls before they can answer basic operational questions. Repository release documents also drifted behind the actual Production state: `main` and Production are on PR #113 / SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, while the previous repository snapshot still described PR #106.

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

- Confluence Project Home, Current Delivery State, Governance and Agent Operating Mode;
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
6. `.github/workflows/geoai-control-plane-audit.yml` — read-only pull-request/manual check;
7. concise current release authority and refreshed verified snapshot.

The validator performs no network writes and requires no secrets. Daily and weekly timing is handled by the existing task scheduler, which is updated separately rather than duplicated in GitHub Actions.

## 8. Source audit — verified 2026-07-31

| Source | Verified state | Authority use | Finding |
|---|---|---|---|
| GitHub | `main` at `7f323c…`; PR #113 merged; PR #118 Draft/open at `3c27d97a…`; Moscow pilot branch separate; PR #120 Draft/open | code, PR and branch truth | repository release snapshot was stale |
| Vercel | Production deployment `dpl_4yBH4WUUf6GYTemFdSdAxUJQYgsC`; SHA `7f323c…`; zero runtime errors returned for the previous seven days | runtime/deployment truth | Production matches `main`; Previews remain non-production |
| Supabase | `geoai-dev` healthy; 12 migrations; 20 public base tables; 8 source-registry rows; 8 external-snapshot rows; seven zero-row DLD tables in isolated schemas; one RLS policy per DLD table | schema/data truth | `public.spatial_ref_sys` security advisory requires an owner decision, not automatic remediation |
| Figma | file and authority nodes accessible | design intent and approval truth | node-level registry can replace repeated full-file discovery |
| Confluence | Project Home, Current Delivery and Governance are the decision/operating narrative authorities | operational narrative and decision truth | stale deployment/policy statements required controlled correction |

### Active candidates, not released state

- DLD controlled ingestion foundation: PR #118, branch `agent/dld-controlled-ingestion-foundation-v1`, current head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d`.
- Rosimushchestvo Moscow pilot: branch `pilot/rosimushchestvo-moscow-v1`, verified head prefix `c735200c`; separate Preview/candidate only.
- Control Plane and Audit Acceleration: PR #120, branch `ops/geoai-control-plane-v1`; documentation/validator candidate only.

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

- [x] Current Production SHA, PR and Vercel deployment are consistent across registry, release state and snapshot.
- [x] Active DLD, Moscow pilot and control-plane branches are classified as candidates, not Production.
- [x] Supabase physical schemas, migration count, source-state counts, policy counts and zero-row DLD foundation are represented accurately.
- [x] Figma and Confluence canonical IDs are recorded.
- [x] Exact data-honesty wording is present.
- [x] A dependency-free validator fails on authority drift and candidate/Production confusion.
- [x] Daily and weekly audit procedures are separated.
- [x] Confluence CR and governance authority are updated.
- [x] No protected action is executed.
- [ ] CI checks pass at the final PR head.
- [ ] Founder review and merge approval.
- [ ] Post-merge first scheduled-run review.

## 12. Approval requested

Approve merge of Draft PR #120 only after final checks pass. Production deployment or promotion, if later required, remains a separate founder decision and must use fresh release evidence.
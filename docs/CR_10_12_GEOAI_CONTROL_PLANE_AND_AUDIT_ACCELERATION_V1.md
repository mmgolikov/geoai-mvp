# CR 10.12 — GeoAI Control Plane and Audit Acceleration v1

**Status:** Implemented candidate / HOLD — Goal 0 external-truth correction authorised  
**Owner:** GeoAI Founder  
**Prepared:** 2026-07-31  
**Confluence authority:** page `22052867`  
**Branch / PR:** `ops/geoai-control-plane-v1` / Draft PR #120  
**Correction parent:** `e255a94450e3fe359a3cd0ad2050107f6d851bb5`  
**Scope:** Governance, source authority, delta audits, machine-readable registry and dependency-free internal QA  
**Protected actions:** No merge, ready-for-review transition, auto-merge, Production action, Supabase mutation, authentication/RLS/grant/function/Storage change, secret/environment change or Figma mutation is authorised.

## 1. Problem

GeoAI delivery state is distributed across Confluence, GitHub, Vercel, Supabase, Figma and Google Drive. The current control-plane candidate correctly records the released Production and Supabase tuple, but its remaining Moscow and Figma registry entries are stale. Its repository validator also checks agreement among local files; it does not query or prove live external truth.

A green local check over mutually consistent derived files can therefore coexist with a wrong external claim. That is a release-governance blocker.

## 2. Business reason

A dependable control plane reduces audit time and protects B2B/B2G, client and investor materials from unsupported claims. It must accelerate delivery without weakening Founder approval gates or presenting internal consistency as external evidence.

## 3. Users and affected surfaces

- GeoAI Founder and release approver;
- product, design, engineering, data and QA agents;
- enterprise/B2G proposal and pilot teams;
- repository authority files, PR evidence, Confluence operational pages and scheduled audits.

No runtime screen, application feature or protected data system is changed.

## 4. Data impact

Documentation, derived metadata and read-only validation only.

- No source payload is ingested.
- No Supabase schema, data, Auth, RLS, grant, function or Storage state is changed.
- `geoai-dev` remains a development foundation with 12 migrations, five source-registry rows, five external snapshots and zero Auth users.
- Seven DLD tables remain RLS-enabled, zero-policy and zero-row. This is fail-closed metadata/schema readiness, not a live official integration.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 5. Design impact

No Figma write is included. Direct read-only verification established the authority allow-list:

- executable Start Here: `1797:2`;
- executable prototype: `1482:2`;
- runtime alignment: `1749:21157`;
- accessibility correction receipt: `1819:11`;
- Product System correction receipt: `1825:11`.

Nodes `1670:2` and `1673:2` are absent and must not be treated as authorities.

Audited metric definitions:

- **68 prototype screens:** direct child `FRAME` nodes under `1482:2` whose names begin `Prototype /`; `1482:3` and `1492:2` are excluded as non-screen frames;
- **35 component sets / 368 variants:** all `COMPONENT_SET` / `COMPONENT` nodes on canonical Product Design System page `68:3`;
- **114 authored reactions:** reactions on descendants of `1482:2` whose IDs do not begin with `I`; instance-expanded duplicate reactions are excluded.

Figma approval remains design intent only and does not prove runtime implementation.

## 6. Engineering impact

This CR maintains:

1. `docs/GEOAI_PROJECT_REGISTRY_V1.json`;
2. `docs/GEOAI_SOURCE_AUDIT_AND_DELTA_PROTOCOL_V1.md`;
3. `docs/GEOAI_MCP_TOOL_CONTRACTS_V1.md`;
4. `docs/GEOAI_AUTOMATED_QA_AND_AUDIT_RUNBOOK_V1.md`;
5. `scripts/geoai-control-plane-check.mjs`;
6. `.github/workflows/geoai-control-plane-audit.yml`;
7. current release policy/snapshot surfaces;
8. generated lifecycle sidecars.

The validator is dependency-free and read-only. It validates repository schema, boundaries and cross-file consistency. It does **not** query GitHub, Vercel, Supabase, Figma, Confluence or Google Drive; it cannot certify external truth or recommend merge.

## 7. Fresh source audit — 2026-07-31 23:00 UTC cutoff

| Source | Direct verified state | Correction |
|---|---|---|
| GitHub | `main` and `release/production` at `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`; PR #120 branch still at parent `e255a94450e3fe359a3cd0ad2050107f6d851bb5`; PR #118 at `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Preserve released tuple and HOLD |
| Vercel | Production `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`; PR #120 Preview `dpl_2zJYuUiMLf6Dn264stqysiikDxKA`; Moscow Preview `dpl_DNqStSdLGqt5FiK6ZJXAGY4t19Gm` | Preview remains non-Production |
| Supabase | `geoai-dev` ACTIVE_HEALTHY; 12 migrations; latest `20260726152858`; 5/5 registry; zero Auth; DLD seven tables / zero rows / zero policies | Preserve fail-closed boundary |
| Figma | Five valid authority nodes; `1670:2` and `1673:2` absent; metrics 68 / 35 / 368 / 114 under explicit definitions | Replace stale node/metric registry |
| Confluence | Direct pages are current authority; search snippets may lag. Active pages still state that the Moscow dev branch is absent | Correct by direct page version after exact-head evidence |
| Google Drive | GeoAI folder contains two uncontrolled PDFs plus Archive; seven category folders are empty | Supporting storage only; no duplicate authority |
| Moscow | M0 branch/head `pilot/rosimushchestvo-moscow-v1` / `bd90887c8de10b5ffa85ed6b8adfa1d93f70d316`; dev branch exists at `722e5166f37168ddaa8ccb7bf83bfcb6c9681b4e`, ahead 2 / behind 0, 22 files | Record as separate Preview prototype, unmerged and non-Production |

## 8. Authority and conflict rules

1. Vercel determines deployed runtime identity.
2. GitHub determines code, branch, PR, commit and check identity.
3. Supabase physical ledger/catalog/query evidence determines database state.
4. Figma direct node/page reads determine approved design intent.
5. Confluence direct current-page version/body records decisions and operational narrative.
6. Google Drive is supporting artifact storage only.
7. Registry, snapshot and CI output are derived; fresher primary evidence overrides them.

Rovo search results are discovery aids. They may lag after updates and must never overwrite a newer direct current-page fetch/version/body.

## 9. Validator and Truth Gate boundary

The repository check may pass only when local schemas, values and prohibited boundaries are internally consistent. Its output must state:

- external evidence is unverified;
- six-system direct read-back is still required;
- a green result is not a merge recommendation or approval.

After the single correction commit, both PR-triggered checks must succeed on the same exact new head. Then GitHub, Vercel, Supabase, Figma, Confluence and Google Drive must be read again. Goal 0 can return to Founder merge review only if that external Truth Gate has zero P0 contradictions.

## 10. Acceptance criteria

- [x] Production and Supabase tuple reverified without mutation.
- [x] Moscow branch graph reverified at M0 `bd90887...` and dev `722e516...`, ahead 2 / behind 0.
- [x] Figma allow-list and metric definitions reverified directly.
- [x] Drive classified as supporting-only with no duplicate authority.
- [x] Rovo direct-page safety rule documented.
- [ ] Ten source/control files corrected in one atomic commit from exact parent `e255a944...`.
- [ ] Lifecycle sidecars regenerated and verified.
- [ ] New exact-head `GeoAI Quality Gate` succeeds.
- [ ] New exact-head `GeoAI control-plane audit` succeeds.
- [ ] Fresh six-system external Truth Gate reports zero P0 contradictions.
- [ ] PR body/comment and Confluence factual receipts reflect the new exact head.
- [ ] Founder / GeoAI Main decides whether to merge.

## 11. Non-authorisations

This CR does not authorise:

- merge, ready-for-review or auto-merge;
- Production deploy, promotion or rollback;
- Vercel project/domain/environment/secret changes;
- Supabase migration, SQL mutation, RLS/Auth/grant/function/Storage/source activation;
- DLD payload ingestion or scoring activation;
- Figma mutation;
- modification of the Rosimushchestvo branches;
- any official, customer-approved, pilot-ready or Production-ready claim.

## 12. Decision

Keep Draft PR #120 on HOLD. Publish exactly one scoped correction commit, obtain two new exact-head green checks, complete a fresh six-system external read-back and only then return the candidate to Founder / GeoAI Main for a merge decision.

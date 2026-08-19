# WP-DEV13-002 — Exact-Head Evidence Closure, Phase A

Status: Authorized for local implementation and three local commits; external actions remain blocked
Last verified: 2026-08-18
Owner: GeoAI Engineering
Authority: Independent-review remediation scope for WP-DEV13-001
Successor: A founder-approved exact-head Draft PR and its external evidence receipts
Baseline ancestor: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
Working branch: `dev13/production-baseline-recovery-v1`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [External Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json) · [WP-DEV13-001 Source Audit](PRODUCTION_BASELINE_SOURCE_AUDIT_2026_08_18.md)

## Independent review disposition

The 34-file WP-DEV13-001 working set received `NO-GO` as one commit or pull request, with no P0 finding. Phase A preserves that work and closes the P1 evidence defects without expanding Product, design, data or deployment scope.

## Authorized outcomes

1. Remove current-hosted-state claims that exceed the latest evidence boundary. GeoAI_main observed management metadata only: `geoai-dev` is `INACTIVE`, and `geoai-auth-rehearsal` is `ACTIVE_HEALTHY`. Physical schema, migration ledger, Auth and database rows, source rows, advisors, RLS, policies and Storage remain `unverified` without a fresh physical readback.
2. Make the external authority registry expire according to a declared validity window and fail the documentation gate after expiry.
3. Add negative documentation fixtures for stale authority evidence and contradictory hosted-state claims.
4. Add a full dependency audit gate alongside the production-only audit and preserve the dependency/lockfile change as a separate review unit.
5. Preserve the mandatory comparison caveat as a separate data-honesty/UI review unit.
6. Run one clean aggregate Playwright command. Focused reruns cannot replace a failed aggregate receipt.

## Local commit partition

### Commit A — Release truth and documentation

Only release/documentation authorities, lifecycle sidecars, documentation validators/fixtures and this Phase A control may be included. This commit owns hosted-state wording, evidence freshness, the exact release tuple, lifecycle status and the blocked external gate plan. It must not contain dependency, workflow, UI or browser-test changes.

### Commit B — Supply chain and CI/test guards

Only dependency manifests/lockfile, dependency-version contracts, permanent CI workflows and non-UI source guards may be included. This commit owns the production and full dependency audits, the bounded Lighthouse patch, the retired legacy workflow and the repaired user-profile gate. It must not contain release prose or Product UI.

### Commit C — Data-honesty UI and focused E2E

Only the exact comparison caveat, the data-honesty scanner contract and focused comparison/mobile assertions may be included. It must not redesign or import any PR #143 Product/UI work.

The final handoff must provide the exact hash and `git show --name-status` manifest for each commit. The three commits must retain the baseline as their ancestor and remain local.

## Dependency safety case

`lighthouse` is a development-only evidence tool and is not bundled into the released Next.js runtime. The bounded patch from `13.4.0` to `13.4.1` refreshes its upstream Sentry/OpenTelemetry development-tool graph without changing application runtime APIs. The same supply-chain commit updates `postcss` to the minimum patched `8.5.23` and resolves `nanoid` to `3.3.18`. The resulting lockfile churn is acceptable only when a clean install, both dependency audits, `npm ls`, TypeScript/build, all seven Lighthouse budgets and the aggregate browser run pass together. No forced application-runtime or unbounded major upgrade is authorized.

## Clean local verification contract

- Use Node.js 22 when locally available; otherwise use another version allowed by `package.json` and record the exact version.
- Run `npm ci`, production-only audit, full audit, `npm run lint`, `npm run build`, every static Quality Gate contract and one aggregate `npm run test:e2e:auth-session` invocation.
- Preserve the aggregate result as the browser receipt. If it fails, classify the failing assertion as code/product failure or infrastructure/resource evidence block from the aggregate logs; do not substitute focused reruns.
- Do not start, reset or apply hosted Supabase, and do not claim a hosted database replay from static/local contracts.

## External gates — Blocked pending GeoAI_main/founder approval

### Gate E1 — GitHub-hosted ephemeral exact-head database replay

Required authorization: push the three local commits and run the database job for the exact Draft PR head. The job must use a clean ephemeral local Supabase instance on the GitHub-hosted runner; it must not connect to, resume or mutate `geoai-dev`, `geoai-auth-rehearsal` or Production.

Required receipt: exact checkout/tested SHA; Node and Supabase CLI versions; clean start/reset; first pgTAP receipt; synthetic ledger-prefix replay; second pgTAP receipt; successful stop; job ID/URL; artifact ID/digest; and no skipped step. This receipt proves repository replayability on an ephemeral runner only. It does not certify the current physical state of either hosted Supabase project.

### Gate E1b — Hosted Supabase physical readback

Required authorization: exact Supabase project/ref, read-only scope, approved credentials/operator and evidence-retention owner. Any write, replay, resume or maintenance action requires a separate authorization and rollback plan.

Required receipt: target identity and management status; physical migration ledger and hashes; schema/table/RLS/policy/grant inventory; Auth/user-row counts without identifying values; Storage bucket/object-policy inventory; advisors; source-custody rows; read timestamp and sanitization record. Management metadata alone cannot pass E1b, and no Phase A commit depends on claiming this gate as passed.

### Gate E2 — Hosted exact-head GitHub Quality Gate

Required authorization: push the three local commits and open a Draft PR against `main` while `main` remains at the approved baseline or after an explicit rebase review.

Required receipt: Draft PR head SHA equals local Commit C; checkout metadata records that exact SHA; both `quality-gate` and `database-replay` jobs complete; production and full audits are green; all static/build/runtime/browser/PDF/Lighthouse steps complete; artifacts and digests are recorded. A skipped job, earlier SHA or combined status is insufficient.

### Gate E3 — Exact-head Vercel Preview

Required authorization: Preview build only, with no Production promotion and no environment/secret mutation.

Required receipt: deployment ID, READY state, `target=preview`, exact Commit C SHA, Preview alias/URL, required route/API/redirect matrix, security headers, error/fatal build and runtime log inspection, and explicit public-demo/data-honesty boundary. READY without exact-SHA runtime evidence is insufficient.

Figma is owned by `design_13`; Confluence is owned by `wiki_2`. Phase A performs no read/write synchronization for either system.

## Local Phase A verification receipt

This receipt covers the final three-commit working tree before the commits are created; it is not evidence that Commit A alone contains Commit B or C.

- Node.js `24.19.0` and npm `10.8.2` were used because Node 22 was not locally available; both satisfy the repository engine boundary.
- Clean `npm ci`, production-only audit, full audit and dependency-tree validation passed. Both audits reported zero vulnerabilities; the resolved evidence tree contains Lighthouse `13.4.1`, PostCSS `8.5.23` and Nano ID `3.3.18`.
- TypeScript, all 40 static Quality Gate contracts, the local migration manifest and output-tracing contract passed. No Supabase instance was started, reset, queried or modified.
- Two full aggregate attempts against the polling/HMR development server were retained as blocked resource/timing receipts: one ended `34 passed, 1 flaky`; the next ended `33 passed, 1 flaky, 1 failed`. The latter coincided with an 8 GB host under high load and a 180-second production-page navigation hang. These runs are not accepted as code-pass evidence.
- The same full command was then executed once against an exact production-mode build with `--fail-on-flaky-tests`: `35 passed` in `5.7m`; JUnit is `35/0/0/0`, with no retry or flaky summary. No focused rerun substitutes for this receipt.
- A separate clean public production build generated 66 routes. Required route/API redirects, runtime API inventory, security headers and Auth/Admin negative smokes passed.
- All seven Lighthouse `13.4.1` profiles passed their budgets. Physical PDF evidence passed for 12 PDFs and 86 page rasters; the stabilization contract passed.

These are local exact-working-tree receipts only. E1, E1b, E2 and E3 remain blocked and unclaimed.

## Draft PR plan

- Proposed title: `docs(ci): close exact-head release evidence gaps`
- Base: `main`, only after confirming its exact head and reviewing any drift from `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
- Head: `dev13/production-baseline-recovery-v1` at local Commit C.
- Mode: Draft.
- Review order: Commit A release truth, Commit B supply chain/CI, Commit C data-honesty UI.
- Required reviewers/owners: GeoAI_main/founder for remote gates; `wiki_2` only for any later Confluence synchronization; `design_13` only for any later Figma verification.
- Merge/promotion: blocked until E1, E1b, E2 and E3 are dispositioned explicitly; no auto-merge and no Production deployment.

## Non-authorizations

No push, PR creation, merge, deployment, Vercel change, hosted database query/replay/write, Supabase/Auth/RLS/Storage/source change, secret/environment change, Figma write or Confluence write is authorized in Phase A.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

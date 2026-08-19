# WP-DEV13-001 Production Baseline Source Audit — 2026-08-18

Status: Read-only release-control evidence
Last verified: 2026-08-18
Owner: GeoAI Engineering
Authority: Point-in-time Source Audit evidence for WP-DEV13-001
Successor: `CURRENT_RELEASE_STATE.md`
Navigation: [Change Request](WP_DEV13_001_PRODUCTION_BASELINE_RECOVERY_CHANGE_REQUEST.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Product Baseline](PRODUCT_BASELINE_AND_READINESS.md) · [Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json)

## Method and scope

The audit began from clean exact HEAD `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`. A dedicated local branch `dev13/production-baseline-recovery-v1` was created before the first edit. GitHub, Vercel, live Production and package-registry checks were read-only. Local documentation, CI contracts, source guards and Supabase migration files were inspected without applying migrations or changing data.

Evidence labels are `E2E`, `partial`, `observed`, `blocked` and `unverified`.

## Release identity

| Evidence | Result | Classification |
| --- | --- | --- |
| GitHub default branch | `main` | E2E |
| Git refs | `main` and `release/production` both `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` | E2E |
| PR #113 | Merged; merge SHA is the exact release SHA | E2E |
| Vercel | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, READY, target Production, exact SHA | E2E |
| Production alias | `geoai-mvp.vercel.app` resolves to the exact deployment | E2E |
| Live health | `public_demo_prototype` | E2E |

## Runtime observations

- `/`, `/workspace`, `/projects`, `/login` and `/profile` returned 200.
- `/explore` and `/demo` returned 307 to `/workspace`.
- `/register` and `/mfa` returned 307 to `/login`.
- Health, activation and pilot status confirm browser-local/demo-public/soft access, confidential-pilot denial and S0 blockers DB-01/AUTH-01/STORAGE-01/SOURCE-01.
- Public source responses remain bundled/sample/manual-import/permission-required/planned; no live official integration is active.
- Desktop 1440×900 and mobile 390×844 landing screenshots were observed with zero browser console warnings. These are viewport observations, not a full interaction E2E.

## CI and dependency findings

- Historical exact-merge Quality Gate `30158549978` passed.
- Latest exact-SHA Quality Gate `31946738874` is partial/failed: database replay passed, while the application job stopped at dependency audit before static, build, browser and route smoke steps.
- The production tree contained `postcss 8.5.19` and `nanoid 3.3.12` advisories. Full audit additionally exposed dev-tool findings through `lighthouse 13.4.0` and stale transitive packages.
- `.github/workflows/apply-founder-ux-exact-head-qa-hardening.yml` is syntactically invalid and produced zero-job failed runs. It is a stale self-mutating helper, not a release gate.
- `test:user-profile` drifted after the account badge split and was absent from the Quality Gate.

## Documentation and migration findings

- Active release documents still named PR #106, its SHA and its deployment.
- Active design guidance still described Product System v3.2.1 as an unmerged candidate despite released PR #113 Product System v3.2.2 correction.
- The current-truth guard passed these contradictions, proving a false-green exact-release gap.
- Local migration authority is one pre-ledger reconciliation, ten immutable development-ledger migrations and seven pending migrations with `liveApplyReady:false`.
- Local Markdown link inspection found no missing tracked file target; no byte-identical Markdown duplicates were found.

## Boundaries

Hosted Supabase state, real Auth/RLS/Admin/Storage personas, private Vercel environment values, current Confluence Hub parity and live Figma parity were not re-certified. No external write was performed. PR #143 was not inspected as an implementation source and is excluded from authority.

Independent review supplied one newer management-plane observation from GeoAI_main on 2026-08-18: `geoai-dev` was `INACTIVE`, and `geoai-auth-rehearsal` was `ACTIVE_HEALTHY`. This evidence is management metadata only. It does not read or refresh physical schema, migration ledgers, Auth/database/source rows, advisors, RLS, policies, PostgREST configuration or Storage; every such hosted surface remains `unverified`. The 2026-07-16 development/rehearsal values remain historical point-in-time receipts only.

The [External Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json) gives the release/runtime observation a seven-day validity window and each supplied Supabase management-metadata observation a 24-hour validity window. The documentation gate fails after either declared window expires; refreshing one evidence class must not refresh another by implication.

## Local corrective verification

This table is the point-in-time receipt for the original unsplit WP-DEV13-001 working tree. It is not evidence that Commit A alone contains or passes the later supply-chain and UI commits; Phase A re-verifies the final three-commit head separately.

| Check | Result | Classification |
| --- | --- | --- |
| Dependency lock | `postcss 8.5.23`, `nanoid 3.3.18`, `lighthouse 13.4.1`; vulnerable `brace-expansion` branch removed | Partial/local |
| Dependency audit | Production and full `npm audit --audit-level=moderate`: zero findings | Partial/local |
| TypeScript and build | `npm run lint` and clean `npm run build` passed on Node `24.19.0`; 66 routes generated | Partial/local |
| Static Quality Gate contracts | Access/Auth/API/cache/RLS/migration/source/AOI/spatial/data-honesty/docs/lifecycle/runtime/output-tracing/profile contracts passed | Partial/local |
| Runtime API/route smoke | Required pages, redirects, 36-route API contract and security headers passed against the clean local production build | E2E/local working tree |
| Comparison browser flow | Desktop keyboard-only criteria-first → comparison → print and mobile 390×844 comparison/export passed; exact caveat visible; comparison/report Axe scans reported zero serious/critical findings | E2E/local working tree |
| Full browser suite | Aggregate run: 31 passed, three resource/raster failures and one serial skip; each affected test then passed independently (`5/5`, `1/1`, `1/1`), and the skipped mobile comparison passed in its focused run | Partial; no single green aggregate receipt |
| Phase A aggregate closure | Two complete polling/HMR runs remained resource/timing-blocked and are not accepted as pass evidence. One full production-mode run of the same 35-test command with `--fail-on-flaky-tests` passed `35/35` in `5.7m`; JUnit `35/0/0/0`, no retry/flaky summary | E2E/local final working tree |
| PDF evidence | 12 A4/Letter PDFs and 86 page rasters passed; stabilization contract passed | E2E/local working tree |
| Lighthouse | Seven-profile Lighthouse `13.4.1` budget contract passed after isolating the Auth dev server from the production `.next` bundle | E2E/local lab |
| Database replay | Static 1+10+7 contracts passed; no local/hosted Supabase start, reset, apply or data write was authorized or performed | Blocked for fresh E2E; historical exact-SHA CI DB job remains the only current replay receipt |

The local working tree is not a released SHA and no hosted Quality Gate was triggered. Therefore the external latest Quality Gate remains `partial`/failed until an authorized future PR run executes every required job.

## Disposition

WP-DEV13-001 is limited to release/docs recovery, bounded dependency/CI guard repair and the mandatory comparison caveat. The safest next package after fresh exact-head validation is a separately approved S0 package, starting with DB-01 and request-scoped AUTH-01 evidence rather than a UI redesign.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

# SECURITY-GATE-001 — Local Dependency Remediation

Status: ACCEPT_LOCAL_REMEDIATION_CANDIDATE · Local only · Not Released
Version: 1.0.0
Prepared: 2026-09-01
Owner: GeoAI Engineering (`dev_1`)
Work package: `SECURITY-GATE-001-LOCAL-DEPENDENCY-REMEDIATION`
Released authority: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
Local branch: `codex/security-gate-001-local-v1`
Local worktree: `/private/tmp/geoai-security-gate-001-local`

## Problem

The exact released dependency graph fails the production dependency audit with three findings: one high-severity `nanoid` finding and two moderate findings attributed to `postcss` and its `next` consumer. The exact released graph resolves `next@15.5.21`, the existing root `postcss` override to `postcss@8.5.19`, and `nanoid@3.3.12`.

The hosted Quality Gate for the separate, frozen Point-to-Object E1 Draft PR stops at this inherited released-baseline audit condition before application checks. This change request isolates the dependency remediation from that feature branch and from all runtime, data, design and release work.

## Business reason

The production dependency gate must be evidence-backed and pass without suppressing findings, lowering severity thresholds or forcing a major framework upgrade. Closing the inherited dependency condition separately preserves a reviewable feature history and avoids treating a security-gate failure as Product readiness evidence.

## Users and affected surfaces

- Direct users: GeoAI engineering and release reviewers.
- Indirect users: public-demo users who depend on a reproducible, supported build chain.
- Runtime UI/API behavior: no intentional change.
- Design: no change.
- Data, Auth, RLS, Storage and source custody: no change.
- Production and Preview: no action authorized or performed.

## Proposed bounded change

1. Keep `next@15.5.21`.
2. Keep the released `overrides.postcss = "$postcss"` policy.
3. Change the direct PostCSS specification from `^8.5.19` to exact `8.5.23`, the first patched release for `GHSA-fxqj-rqcc-2cmp`.
4. Resolve the sole transitive Nano ID node from `3.3.12` to `3.3.18`, which is outside both applicable 3.x advisory ranges.
5. Add no package, override, lifecycle script or runtime route.

## Engineering and supply-chain impact

- Manifest delta: one exact patch-level PostCSS pin.
- Lock delta: two existing nodes only (`postcss`, `nanoid`).
- Dependency shape: no new package coordinate. Clean `npm ci` reports 281 installed packages; the independent after-state audit reports 318 total dependencies and 31 production dependencies under npm audit's own counting lane.
- Licences: unchanged; both changed packages are MIT.
- Node compatibility: unchanged for the repository engine `>=22 <25`.
- Known behavioral delta: PostCSS 8.5.23 does not load a source map when `opts.from` is absent. A clean build and CSS/render evidence are required to prove GeoAI does not depend on the unsafe prior behavior.
- SBOM claim: no CycloneDX or SPDX document is generated in this bounded package. The exact package coordinates and lock integrities are recorded in the dependency decision and manifest only.

## Risks

| Risk | Control | Current status |
| --- | --- | --- |
| Existing Next 15.5.21 metadata declares exact PostCSS 8.4.31 | Preserve the already released root override; prove a clean install, dependency tree, typecheck, build and contracts | Local compatibility checks PASS |
| A lock edit could be inconsistent with registry bytes | Match exact cached registry-tarball SHA-512 integrity values and validate with clean offline `npm ci` and `npm ls` | PASS |
| A false offline audit could be reported as green | Require a standard registry-backed `npm audit`; explicitly reject offline empty reports | PASS — Main independently observed the standard audit result |
| CSS/source-map behavior could regress | Require clean install, TypeScript, production build and all relevant permanent static contracts locally; require full hosted Quality Gate after integration | Local acceptance gates PASS; hosted integration remains future evidence |
| Documentation could imply release | Mark every artifact Candidate/Not Released; do not update current-release authority | PASS |

## Acceptance criteria

All criteria are mandatory for `ACCEPT_LOCAL_REMEDIATION_CANDIDATE`:

1. Exact base and ancestry remain `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
2. Clean offline install resolves only `postcss@8.5.23` and `nanoid@3.3.18` for the affected closure.
3. Standard registry-backed production audit returns zero moderate/high findings.
4. Standard full audit is recorded without hiding residual development-tool findings.
5. TypeScript, production build, unchanged API route inventory and relevant permanent security/data-honesty/secret/API contracts pass on the exact candidate tree.
6. Independent review reports no P0/P1/P2 release blocker.
7. `git diff --check` passes and changed paths match the manifest.

Current result: all local acceptance criteria pass. Main independently executed the standard registry-backed audit against the same physical candidate and observed zero production vulnerabilities. The full audit remains non-zero only in the development-tool tree (18 findings: 17 moderate, 1 high) and is assigned to the separate bounded follow-up `SECURITY-GATE-002-DEV-TOOLING`. This package is accepted only as a local remediation Candidate; it does not fix PR #146, hosted CI or Production until separately integrated and reverified.

## Rollback

Rollback is a single non-main-branch revert of the dependency/documentation commit, or deletion of the isolated worktree before integration. No schema, data, environment, deployment or external rollback is involved.

## Explicit exclusions

- Next.js major upgrade or unrelated Next/SWC refresh.
- Additional dependency overrides or audit suppressions.
- Runtime code, UI, API or design changes.
- Point-to-Object E1 code or Draft PR #146 mutation.
- Push, PR creation/update, Preview, Vercel or Production action.
- Supabase, Auth, RLS, Storage, source or migration action.
- Secret or environment change.

## Data and claim boundary

This dependency-only candidate creates no new data claim and does not change product maturity. Production remains the released `public_demo_prototype`. Hosted DB/Auth/RLS/Storage/source custody remains outside this package.

Mandatory product wording remains:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

# WP-DEV13-001 — Production Baseline Recovery Change Request

Status: Approved for local implementation by the delegated owner scope; external promotion is not authorized
Last verified: 2026-08-18
Owner: GeoAI Engineering
Authority: Bounded implementation scope for production-baseline recovery
Successor: `CURRENT_RELEASE_STATE.md` after acceptance
Branch: `dev13/production-baseline-recovery-v1`
Baseline: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
Production: `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` at https://geoai-mvp.vercel.app
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [QA Checklist](qa-checklist.md)

## Problem

The released Git and Vercel runtime are aligned on PR #113 and exact SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, but the active repository authorities still describe PR #106 and its older deployment as the last verified baseline. The current documentation guard accepts this stale tuple. The latest exact-SHA Quality Gate also fails before static/build/runtime verification because its production dependency audit detects vulnerable `postcss` and `nanoid` versions. A legacy self-mutating workflow is syntactically invalid and creates zero-job failed runs, while the user-profile contract has drifted after the account badge was split into wrapper and visual components and is not executed by CI. The comparison dashboard does not show the mandatory caveat verbatim.

Draft PR #143 (`product/gcc-real-estate-decision-platform-v1` at `e92fb5d8e8d83de72ee4c4376d958ce598c00536`) is explicitly excluded. It is not a source, baseline, design authority or salvage pool for this change.

## Business reason

Release, product and risk decisions need one trustworthy baseline. A false-green documentation guard and an early-failing Quality Gate make owner review unreliable even when Production itself is healthy. Recovering exact release truth and the existing verification path reduces governance and supply-chain risk without changing the released product direction.

## Users

- GeoAI owner and release reviewers who need exact release and readiness evidence.
- Engineering and QA contributors who depend on deterministic CI contracts.
- Public-demo users who must receive the required screening limitation on decision surfaces.

## Scope and affected surfaces

### Documentation and governance

- Establish one compact current-release authority tied to PR #113, exact SHA, deployment and evidence timestamp.
- Publish the active product baseline, stage/readiness matrix and S0 blocker matrix.
- Publish a compact SSOT map, superseded/duplicate register and GitHub/Vercel/Figma/Confluence/Supabase authority status registry.
- Define the release/changelog evidence contract and record the PR #113 release plus this local work package.
- Update every affected active authority and strengthen the exact-tuple/current-stage documentation guard.
- Preserve historical files; do not delete or rename them.

### Engineering and CI

- Apply patch-only dependency remediation sufficient to clear the current production and full dependency audits; no Next.js major upgrade.
- Repair the user-profile source contract and add it to the permanent Quality Gate.
- Retire the invalid self-mutating founder-UX helper in place as an explicit read-only/manual historical notice; do not reactivate branch writes.
- Add a focused comparison-surface caveat contract and render the mandatory caveat verbatim without redesigning the dashboard.

### Data and design

- No source, score, schema, migration, RLS, Storage, Auth, environment, secret or hosted Supabase change.
- No Figma or Confluence write.
- No redesign and no import, cherry-pick, recreation or salvage from PR #143.
- Production behavior and the released visual baseline remain the reference; only the required comparison limitation copy may be added.

## Implementation allowlist

Tracked changes are limited to:

- active documentation authorities and generated lifecycle sidecars;
- this Change Request, an authority register and a release/changelog contract;
- `package.json` and `package-lock.json` for patch-only remediation;
- documentation, dependency-pin, profile and data-honesty contract scripts/fixtures;
- the focused comparison browser contract for a rendered exact-caveat assertion;
- `.github/workflows/geoai-quality-gate.yml` and the retired legacy helper workflow;
- `components/comparison-dashboard.tsx` for the exact mandatory caveat.

Any other product or route change requires a separate Change Request.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A historical receipt is accidentally presented as current | Current page is time-stamped; external GitHub/Vercel evidence retains precedence; historical files are registered as superseded, not rewritten as live evidence. |
| Dependency patches change runtime behavior | Patch releases only; clean install, full static suite, build, API/route smoke and browser checks are required. |
| Retiring the legacy helper removes needed coverage | The permanent Quality Gate already owns the founder-UX contracts; retirement is in place and read-only, with no deletion or rename. |
| Caveat copy changes layout | Use the existing compact header area and verify comparison at desktop/mobile widths plus the existing visual/overflow suite. |
| Documentation becomes another duplicate | `DOCUMENTATION_INDEX.md` remains sole navigation authority and explicitly assigns one owner per truth domain. |

## Acceptance criteria

1. GitHub `main` and `release/production`, PR #113, Vercel deployment/alias and live API stage form one exact evidence chain for SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
2. Active authorities agree on PR #113, the exact SHA/deployment, `public_demo_prototype`, browser-local/demo-public/soft access, confidential-pilot denial and S0 blockers `DB-01`, `AUTH-01`, `STORAGE-01`, `SOURCE-01`.
3. PR #143 is registered as `excluded_non_authority` and no changed implementation file is sourced from it.
4. Documentation current-truth checks fail on an incorrect current tuple, missing authority registry, or a claim that PR #143 is authoritative.
5. Production dependency audit has zero moderate/high/critical findings; full audit findings are zero or explicitly blocked with evidence.
6. User-profile, comparison caveat, data-honesty, API inventory, migration/source/AOI and all existing quality contracts pass.
7. `npm run lint` and `npm run build` pass on a supported Node.js version.
8. Built-route/API smoke passes for required product, status and source-lineage routes, including expected redirects.
9. Browser evidence covers the unchanged Production/local landing baseline and the comparison caveat at key desktop/mobile widths; evidence is classified as E2E, partial, observed, blocked or unverified.
10. No secret is printed or committed; no external system is mutated.

## Rollback

This work remains local. Rollback is a reviewable revert of the WP-DEV13-001 change set on `dev13/production-baseline-recovery-v1`. No Production alias, deployment, GitHub branch, Figma/Confluence object or Supabase state is changed, so external rollback is not required. The released deployment `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` remains untouched.

## Non-authorizations

This Change Request does not authorize push, PR creation or merge, deployment or promotion, Supabase migration/data/configuration changes, Auth enforcement, secret/environment changes, source activation, Figma/Confluence writes, or any Production-ready or pilot-ready claim.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

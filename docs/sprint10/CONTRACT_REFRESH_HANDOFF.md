# Sprint 10 Contract Refresh Handoff

Status: Candidate engineering evidence; not Released
Date: 2026-09-18
Owner: GeoAI Engineering
Branch: `codex/sprint10-contract-refresh-20260918`
Baseline: `dd96946f38dcee4a2769c29cbeb06c0538a70650`
Scope: Static CI contract compatibility only; no application, database, workflow, browser, Auth configuration, environment, provider, Preview, or Production mutation

## Decision

The current application contracts are compatible with the refreshed point-to-object checks after four bounded test-harness corrections. The corrections preserve or strengthen provenance, identity, mutation-origin, geometry, role, and provider-denial assertions. No application defect was found in those four failures.

The documentation lifecycle check remains correctly fail-closed because its generated inventory is stale on the supplied baseline. This is an integration-owned documentation artifact drift, not a reason to weaken the lifecycle checker. Regeneration is intentionally not included because this work package owns only failing `scripts/*` checks and this handoff.

## First-pass evidence

All 28 static commands in `.github/workflows/geoai-quality-gate.yml`, from `test:point-to-object` through `test:runtime-source-pack`, were executed once against the clean baseline.

- Passed: 23.
- Failed: 5.
- Loader or source-assertion drift: `test:point-to-object`, `test:point-to-object-autocomplete`, `test:point-to-object-v5-interaction`, and `test:point-to-object-runtime-gate`.
- Correct fail-closed repository drift: `test:document-lifecycle`.
- Local first-pass logs: `/private/tmp/geoai-contract-refresh-logs/`.

## Bounded corrections

### Point-to-object aggregate contract

- The data-URL TypeScript harness now resolves repository aliases before importing the real analysis-provenance module.
- The client parser pins the current V10 prompt and previous V9 prompt while retaining V8 pre-depth and V7 legacy compatibility checks.
- The real provenance parser remains under test; no role/scenario assertion was replaced with a permissive fixture.

### Autocomplete contract

- The route harness now supplies deterministic synthetic identity and mutation-origin adapters for offline execution.
- Static ordering requires identity, mutation-origin, runtime, same-origin, bounded body parsing, request parsing, rate limiting, and only then Photon dispatch.
- Explicit negative cases prove identity and mutation-origin denial before provider access.

### Find-to-analysis interaction contract

- The obsolete direct string-equality assertion now requires `pointObjectAnalysisTargetMatches(...)`, matching the current application implementation.
- The helper validates exact non-empty OSM source identities and is separately covered by the provenance contract suite.

### AI request-size contract

- The isolated request-size harness stubs the newly imported role/scenario normalizer because that check exercises only the UTF-8 request-size fail-closed path.
- Dedicated provenance tests remain authoritative for role/scenario validation.

## Documentation lifecycle residual

Before this handoff was added, the baseline lifecycle inventory omitted 18 existing Sprint 10 Markdown documents and retained three entries for absent `docs/artifacts/*` files. On the final tree, this handoff is the nineteenth missing manifest entry. The checker correctly reports:

`Documentation lifecycle manifest is missing or stale. Run npm run docs:lifecycle:generate.`

Required integration action: regenerate and review `docs/DOCUMENT_LIFECYCLE_MANIFEST.json` and `docs/DOCUMENT_ARCHIVE_INDEX.md` only after the Sprint 10 documentation set is stable. Do not convert missing inventory coverage into an exclusion or passing result.

## Final verification

Environment: macOS local checkout, Node `v24.19.0`, npm `10.8.2`; reviewer: `dev_1`.

- Static workflow contracts: 27 passed, one correctly failed, 28 total. Every point-to-object, data-honesty, API, isolation, report, runtime, and source-pack contract passed. `test:document-lifecycle` remains the explicit fail-closed integration blocker described above.
- TypeScript lint/typecheck: PASS (`npm run lint`).
- Production build: BLOCKED before application compilation because `next/font` attempted to resolve `fonts.googleapis.com` and the authorized environment forbids network access (`getaddrinfo ENOTFOUND`). This is an evidence/infrastructure block, not a product assertion or TypeScript failure; it was not bypassed or retried with network authority.
- Patch integrity: PASS (`git diff --check`).
- Final static logs: `/private/tmp/geoai-contract-refresh-final-logs/`.
- Lint log: `/private/tmp/geoai-contract-refresh-lint.log`.
- Build-block log: `/private/tmp/geoai-contract-refresh-build.log`.

## Authority and data honesty

- No source validator, role/provenance assertion, geometry assertion, security assertion, or provider gate was relaxed.
- No external network or paid-provider action was authorized or completed. The build's automatic Google Fonts DNS lookup was blocked before connection or download.
- No hosted database, Auth, Storage, secret, environment, Preview, Production, `main`, or `release/production` state was read or changed.
- No PR was created or updated and no branch was pushed.
- Mandatory claim boundary: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Rollback

The correction is test-only plus this handoff. Rollback is the single local commit that records these files; application runtime behavior and external systems are unaffected.

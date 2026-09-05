# CR POINT_TO_OBJECT_001-E1-DURABILITY

Status: `LOCAL DURABLE CANDIDATE` · runtime integration held

Work package: `POINT_TO_OBJECT_001-E1-DURABILITY`

Decision owner: `main_1`

Engineering owner: `dev_1`

Released base: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`

Dedicated branch: `codex/point-to-object-e1-durable-v1`

Dedicated worktree: `/private/tmp/geoai-point-object-e1-durable`

## Problem

The validated E1 implementation existed only as an uncommitted local candidate mixed with held external-data artifacts and stale Preview-era documentation. It was not a durable, reviewable Git artifact and therefore could not be handed off safely.

## Business reason

GeoAI needs a traceable deterministic contract foundation for future point-to-object work without implying that real object identity, source rights, runtime integration or customer value has been validated. Durability reduces evidence loss and makes the exact bounded core independently reviewable.

## Accepted input provenance

The source candidate was read from `/private/tmp/geoai-point-object-001` at released HEAD `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`. Before any port, the accepted bytes were re-hashed and matched:

| Input | Accepted SHA-256 |
|---|---|
| Profile `0.1.0-rc.1` JSON Schema | `66cd01ed1991084a8dffde5a431e68e9f0bf891961752438c2e4a508a20b3a57` |
| Source candidate contract runner | `ff924b0a9e0d6b6aeaea555271870ca3c9d8ee8cd731273849f198e0d9342de4` |
| Contract authority manifest | `e042c6e590aa5b18062506406e4935330946dee0ddd22d9cacddfdec101a513d` |

The source runner depended mechanically on held OSM-derived files. The durable runner intentionally removes only that external-data replay dependency. Its new hash is recorded in `E1_DURABILITY_MANIFEST.json`; this is a documented scope normalization, not an unexplained accepted-byte mismatch.

## In scope

- Frozen JSON Schema profile `0.1.0-rc.1` and exact TypeScript contracts.
- Deterministic request parsing, geometry, resolver, context, evidence and composition logic.
- Semantic integrity and byte-cap validation.
- HMAC candidate assertions with tenant/request/point/candidate-set/snapshot binding, expiry and single-use replay protection.
- Dependency-injected synthetic repository and explicit authority quarantine.
- Hard-false runtime feature gate.
- Local contract runner and authority fixture.
- Exact `ajv@8.20.0` and `ajv-formats@3.0.1` dependency closure.
- File-by-file provenance and SHA-256 manifest.

## Explicit exclusions

- All `src/data/point-to-object/**` external or held OSM-derived artifacts.
- Snapshot preparation scripts and source-rights receipts.
- The held-package parser and loader specialized to those external artifacts.
- UI, components, API routes, OpenAI, provider clients, Supabase wiring, feature activation and external data acquisition.
- Preview deployment, merge, Production deployment or alias, and environment/secret changes.
- Dependency-remediation changes outside the exact AJV closure.

## Data and claim boundary

The durable tests use synthetic, non-runtime fixtures only. They do not establish lawful data use, real object identity, official/live integration, hosted readiness, planning status, ownership, zoning, valuation or customer validity.

Mandatory wording:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Engineering impact

The package adds an isolated, unreferenced deterministic library under `src/lib/point-to-object`, its schema and test runner. No application page, component or route imports the library. The production build route inventory must remain unchanged at 66 routes.

## Risks and controls

| Risk | Control |
|---|---|
| Held data accidentally becomes authority | External data, parser and loader are absent; synthetic repositories are explicitly tagged and quarantined. |
| Candidate assertion replay or cross-request use | Keyed binding, expiry, single use and negative tests. |
| False-confident resolution | Complete candidate-set rules, overflow rejection, ambiguity and outside-coverage fail-closed states. |
| Scope drift into runtime | Hard-false gate, no app/API imports, no network/provider/environment reads and unchanged route inventory. |
| Supply-chain overstatement | Candidate and released-baseline advisories are reported separately; remediation is excluded. |

## Acceptance criteria

1. Dedicated worktree starts at the exact released SHA.
2. Accepted input hashes match before porting.
3. Final diff contains only the deterministic E1 core, synthetic-only tests, documentation and AJV dependency closure.
4. Clean install, typecheck, contract tests and production build pass on the final exact commit.
5. Data-honesty, secret, server-credential and route-inventory guards pass.
6. Git status is clean after a bounded local commit.
7. Any Draft PR remains Draft and produces no authorized Preview or runtime activation.
8. Production, Supabase, Auth, Storage, secrets and environment remain unchanged.

## Rollback

The immutable rollback point is `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`. Reverting the single bounded durability commit removes the complete E1 artifact. No database, user-data, Auth, Storage, Preview or Production rollback is required because none is changed.

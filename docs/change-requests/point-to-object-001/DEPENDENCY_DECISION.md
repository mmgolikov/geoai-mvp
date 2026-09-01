# POINT_TO_OBJECT_001 dependency and licence decision

Status: E1 durable Candidate decision · runtime, Preview and optional-model dependencies blocked

Date: 2026-09-01

Released base: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`

## Direct additions

| Package | Pinned version | Licence | Purpose | Runtime boundary |
|---|---:|---|---|---|
| `ajv` | `8.20.0` | MIT | Compile and execute the frozen JSON Schema profile. | Server contract validation only. |
| `ajv-formats` | `3.0.1` | MIT | Strict timestamp/URI format validation for evidence receipts. | Server contract validation only. |

The bounded UTM calculation is implemented locally from the declared WGS84/UTM formula and emits an explicit method/version receipt; no GIS runtime package or network provider is added. Contract tests use the native Node 22–24 TypeScript stripping path, so no TypeScript runner dependency is added.

Transitive closure added by the two direct pins is limited to `fast-deep-equal@3.1.3` (MIT), `fast-uri@3.1.6` (BSD-3-Clause), `json-schema-traverse@1.0.0` (MIT) and `require-from-string@2.0.2` (MIT). No existing lockfile package node changes version or integrity.

No dependency receives a client-supplied URL, source endpoint, filesystem path, credential or tool instruction. No OpenAI SDK, model adapter, provider client, route, renderer, Preview integration, or real-source activation is in the E1 package.

## Baseline maintenance excluded from this E1 package

| Package | From | To | Licence | Reason |
|---|---:|---:|---|---|
| `lighthouse` | `13.4.0` | unchanged | Apache-2.0 | No maintenance upgrade is authorized in E1. |
| `postcss` | `^8.5.19` | unchanged | MIT | No maintenance upgrade is authorized in E1. |

Next.js, React, Supabase, Mapbox, Lighthouse, PostCSS, and Product UI dependencies remain at the immutable Released baseline. The durable dependency decision is not complete until `package.json` and `package-lock.json` are consistent and a clean Node 22–24 install passes. Registry audit evidence is reported separately from install/build evidence. The exact source-candidate and released-baseline audit receipt found the same 3 production findings and the same 21 full-tree findings; the E1 lock delta added no advisory name. A no-escalation refresh may be recorded as `BLOCKED_BY_POLICY/NETWORK` and must not be converted into a PASS.

## Licence and source-data separation

Application dependencies retain their upstream licences. No source-data artifact is present in the durable E1 tree. Future source attribution, licence and display requirements remain a separate rights-gate obligation; package licences cannot satisfy or relicense them.

## Rollback

Discard the isolated E1 worktree or revert a future bounded E1 commit to the immutable Released base. No database, Auth, Storage, secret, Preview, or Production rollback is required because none is authorized or performed here.

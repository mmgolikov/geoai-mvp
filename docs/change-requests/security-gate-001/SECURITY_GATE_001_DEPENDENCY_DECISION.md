# SECURITY-GATE-001 — Dependency Decision

Status: ACCEPT_LOCAL_REMEDIATION_CANDIDATE · Local only · Not Released
Version: 1.0.0
Decision date: 2026-09-01
Decision owner: GeoAI Engineering (`dev_1`)
Exact base: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`

## Decision

Use the smallest same-major dependency correction:

- `postcss`: `8.5.19` → exact `8.5.23`;
- `nanoid`: lock resolution `3.3.12` → `3.3.18`;
- `next`: remain at `15.5.21`;
- existing `overrides.postcss = "$postcss"`: unchanged;
- no separate Nano ID override.

The dependency diff is technically coherent and independently classified `CONDITIONAL_ACCEPT_DEPENDENCY_DIFF`. Main then executed the missing standard registry-backed audits against the same physical candidate: the production audit passed with zero findings and the full audit retained 18 development-tool findings. The local dependency candidate is therefore accepted for one bounded local commit.

## Exact before-state evidence

Exact released dependency files:

- `package.json` SHA-256: `413c8139895145997e08356c7d22ba47b1475d0ee586a287f82b03923ef5bf5b`.
- `package-lock.json` SHA-256: `c69d93015f2d91332f823d16cd545f2220357602d3a5b483d401983cb0245416`.

Independent standard audit read-back on 2026-09-01:

- production: 3 findings — moderate 2, high 1;
- full: 21 findings — moderate 19, high 2;
- affected production closure: `next@15.5.21` → released root override `postcss@8.5.19` → `nanoid@3.3.12`.

The `next` audit record is derivative through PostCSS; no separate Next advisory was found in this production closure.

## Advisory and package metadata

Official sources accessed 2026-09-01:

| Package/advisory | Evidence | Decision relevance |
| --- | --- | --- |
| PostCSS `GHSA-fxqj-rqcc-2cmp` | https://github.com/advisories/GHSA-fxqj-rqcc-2cmp | Affected `<=8.5.22`; first patched release `8.5.23` |
| PostCSS 8.5.23 release | https://github.com/postcss/postcss/releases/tag/8.5.23 | Source-map loading is disabled when `opts.from` is absent |
| PostCSS 8.5.23 package metadata | https://github.com/postcss/postcss/blob/8.5.23/package.json | MIT; Node `^10 || ^12 || >=14`; Nano ID dependency `^3.3.16` |
| Nano ID `GHSA-28wg-ghj8-5hjv` | https://github.com/advisories/GHSA-28wg-ghj8-5hjv | 3.x patched at `3.3.16` |
| Nano ID `GHSA-2v37-7h3g-55p8` | https://github.com/advisories/GHSA-2v37-7h3g-55p8 | 3.x patched at `3.3.18` |
| Nano ID 3.3.18 package metadata | https://github.com/ai/nanoid/blob/3.3.18/package.json | MIT; Node compatible with GeoAI engine |
| Next 15.5.21 package metadata | https://github.com/vercel/next.js/blob/v15.5.21/packages/next/package.json | Declares PostCSS 8.4.31; the released GeoAI override already replaces it |
| npm override contract | https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#overrides | `$postcss` references the direct dependency specification |

Cached npm registry metadata was observed at `2026-09-01T07:06:05Z`. Exact cached tarball coordinates and lock integrities:

| Coordinate | Registry URL | SHA-512 integrity |
| --- | --- | --- |
| `postcss@8.5.23` | `https://registry.npmjs.org/postcss/-/postcss-8.5.23.tgz` | `sha512-g50586zr4bZmwFiTlflMu8E0bDTb5I5gertgwAKmsdUlTQIhZtunzUlD1WSzwcVWPoAVpsrA6vlfCD7oXvRwgg==` |
| `nanoid@3.3.18` | `https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz` | `sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w==` |

Independent byte verification confirmed both cached tarball SHA-512 values match the lock entries.

## Compatibility review

All installed PostCSS consumers accept 8.5.23 except that Next declares an exact internal version which is already superseded by the released root override:

| Consumer | Declared PostCSS constraint | Result |
| --- | --- | --- |
| Autoprefixer 10.5.3 | `^8.1.0` | admits 8.5.23 |
| Tailwind CSS 3.4.19 | `^8.4.47` | admits 8.5.23 |
| postcss-import 15.1.0 | `^8.0.0` | admits 8.5.23 |
| postcss-js 4.1.0 | `^8.4.21` | admits 8.5.23 |
| postcss-load-config 6.0.1 | `>=8.0.9` | admits 8.5.23 |
| postcss-nested 6.2.0 | `^8.2.14` | admits 8.5.23 |
| Next 15.5.21 | exact `8.4.31` | resolved to 8.5.23 by unchanged released override; requires project tests |

Clean offline `npm ci`, `npm ls`, TypeScript and the 66-route production build pass on Node 24.19.0/npm 10.8.2. `npm ci` reports 281 installed packages. The independent standard production audit uses a different counting lane and reports 318 total dependencies, including 31 production dependencies. No package coordinate is added and the licence distribution is unchanged.

## Alternatives considered

| Option | Decision | Reason |
| --- | --- | --- |
| Keep released versions | Reject | Leaves known production audit findings open |
| Lock PostCSS 8.5.23 and Nano ID 3.3.18 | Select conditionally | First fixed floor; two-node same-major closure; no new package or policy |
| Lock current PostCSS 8.5.26 | Do not select | Also patched, but adds later changes without evidence that they are needed for this gate |
| Add a separate Nano ID override | Reject | Clean lock already resolves 3.3.18; an extra policy is unnecessary |
| Update to a later Next 15 backport | Reject for this gate | Later Next 15 metadata still pins PostCSS 8.4.31 and introduces unrelated SWC/native lock churn |
| Upgrade to Next 16 | Reject/HOLD | Major upgrade is not demonstrated necessary to close this production advisory closure |
| Suppress findings or lower threshold | Prohibited | Would weaken the gate instead of remediating it |

## Verification status

| Gate | Result |
| --- | --- |
| Clean offline install | PASS — 281 packages installed |
| Exact dependency tree | PASS — all PostCSS consumers dedupe to 8.5.23; sole Nano ID is 3.3.18 |
| Lock/tarball integrity | PASS |
| TypeScript | PASS |
| Production build | PASS — 66/66 routes |
| Permanent static contracts | PASS |
| Standard production audit after change | PASS — 0 info/low/moderate/high/critical; 31 production dependencies; 318 total tree |
| Standard full audit after change | PARTIAL — 18 development-tree findings: 17 moderate, 1 high, 0 critical |
| TypeScript/build/route inventory | PASS — 66/66 build routes and 66 API routes |
| Relevant permanent security/data/API guards | PASS |

The accepted production audit was executed by `main_1` through the standard registry-backed path on 2026-09-01; the exact execution timestamp was not supplied in the handoff. Earlier sandbox `ENOTFOUND` attempts and an offline empty report remain non-evidence and are not used.

The full-audit delta is `21 → 18`, removing the three production findings. The residual set is development-only. The direct follow-up indicated by npm is Lighthouse `13.4.0 → 13.4.1`; the residual transitive set also includes `brace-expansion` in the affected `2.0.0–2.1.3` range. Those changes are deliberately excluded here and assigned to `SECURITY-GATE-002-DEV-TOOLING` so the production-gate fix remains atomic.

## Final decision for this attempt

`ACCEPT_LOCAL_REMEDIATION_CANDIDATE` — create one local commit only. Do not push, open or modify a PR, trigger/inspect a Preview, or claim that PR #146/hosted CI/Production is fixed. Main must integrate this commit separately and rerun the complete hosted exact-head Quality Gate.

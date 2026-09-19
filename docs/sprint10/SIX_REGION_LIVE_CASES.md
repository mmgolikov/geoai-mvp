# Sprint 10: six regional live-case definitions

Status: local harness definitions only. This document is not a live receipt, qualitative-value acceptance, cloud-persistence evidence, or a Production authorization.

## Scope model

The existing `journey` scope is unchanged: Dubai Analyse, Dubai Find/Compare, and Singapore Create/reopen, with exactly one Standard Analyse POST and one Standard Create POST. The three complementary cases are separately selectable so one case can stop without expanding or replaying the combined journey:

| Scope | Market and mode | Exact selected input | Paid POST ceiling |
|---|---|---|---|
| `singapore-analyse` | Singapore Analyse | Public Photon query `Marina Bay Sands Tower 1`; only a returned label matching Marina Bay Sands Tower 1 and its exact runtime OSM `sourceFeatureId` may be selected | Analyse Standard: 1; Create: 0 |
| `singapore-find` | Singapore Find/Compare | `consultant_broker` / `b2b_commercial_real_estate` / `commercial_office`; fixed 1440×1000 harness viewport; exact runtime request bounds must be echoed by the response and remain inside `[103.855, 1.278, 103.868, 1.289]` | Analyse: 0; Create: 0 |
| `dubai-create` | Dubai Create/reopen | GeoJSON Polygon `[[55.27015,25.20515],[55.27065,25.20515],[55.27065,25.20565],[55.27015,25.20565],[55.27015,25.20515]]`; programme `Business towers`; Standard | Analyse: 0; Create Standard: 1 |

The Singapore place and envelope come from the reviewed `singapore-marina-bay-v1` public OSM case pack. The Dubai AOI comes from the already tested Create offline fixture. Those assets justify a stable public input only. Their 2026-08-31 frozen observations are not relabelled as live: the live branches accept only the source identity, context and timestamps returned by that future runtime execution.

## Per-case technical acceptance

Every PASS requires an ordinary authenticated protected-Preview session, the selected market, exact source/request identity, current source contract, the expected product role/scenario where the product exposes them, and strict current-route provider telemetry for paid routes. Analyse requires the V10 Standard role/scenario/depth receipt. Find requires two distinct returned OSM identities before Compare; fewer than two is `INCONCLUSIVE_LIVE_COVERAGE`, never a fabricated cohort. Create requires one strict current A/B concept and preserves the submitted market/depth/AOI.

Each case then verifies one browser-local artifact, exact payload/domain identity and view revision, opens it from Projects, and proves zero additional source or paid provider requests. Create additionally reloads the reopened B result without regeneration. The store remains `browser_local_on_this_device`; Auth namespacing does not establish cloud, cross-browser or cross-device persistence.

The optional structured Analyse evidence writer remains limited to the previously reviewed Dubai Analyse case (`journey` or `dubai-analyse`). `singapore-analyse` deliberately cannot opt into that writer in this change.

## Honest limitations

- These definitions have not been executed against Preview, source providers, OpenAI, Auth, or the real spend ledger in this change.
- This is technical local-live acceptance only. It does not judge decision usefulness, comparable-field quality, or the substantive value of A/B alternatives.
- Find stops at shortlist comparison and does not add the separately identified individual-Analyse/value path.
- A source error, a missing exact Analyse candidate, or fewer than two Find candidates is not converted into fallback data.
- Area Context may truthfully return `empty`; that does not by itself establish Create value.
- Conceptual Create geometry is not BIM, planning approval, zoning, feasibility, valuation, or investment evidence.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Root integration seam

The root-owned launcher/bridge must add exactly `singapore-analyse`, `singapore-find`, and `dubai-create` to its explicit scope allowlist and retain scope-bound approval text. It must consume the existing receipt plans exported by `scripts/sprint10-live-journey-run.mjs`; it must not introduce wildcard scopes or duplicate reserve arithmetic. Root remains the only live executor and must review the exact candidate, protected Preview receipt, active synthetic-persona lifecycle, ledger headroom, retained no-retry behavior, cleanup, and terminal receipt before selecting any new scope.

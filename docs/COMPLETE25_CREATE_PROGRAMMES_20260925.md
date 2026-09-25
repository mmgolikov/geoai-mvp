# COMPLETE25 Create programme expansion

Status: local implementation and offline verification; not release acceptance.
Date: 25 September 2026.
Scope: founder-authorized COMPLETE25 completion, bounded Create vertical slice.
Baseline/rollback: `487c635` before this change. Main/Production unchanged.

## Implemented behaviour

Create now offers five programmes in English and Russian. The three existing IDs, numerical defaults, geometry paths and saved-result formats remain compatible. The existing mixed-use option is labelled explicitly as mixed-use to distinguish it from the new residential option.

| Programme ID | Typology | Primary buildings | Levels | Coverage target | Open-space allowance | Setback |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `residential_mixed_use` | Courtyard | 5 | 6–12 | 38% | 35% | 8 m |
| `commercial_hub` | Towers on podiums | 4 | 14–32 | 42% | 25% | 10 m |
| `civic_green` | Civic campus | 6 | 3–8 | 28% | 50% | 12 m |
| `residential_quarter` | Distributed residential quarter | 8 | 4–8 | 32% | 45% | 8 m |
| `hospitality_recreation` | Low-rise hospitality pavilion campus | 7 | 2–5 | 22% | 60% | 14 m |

The new residential programme has residential and neighbourhood-retail uses; the hospitality programme has guest accommodation and retail uses. Existing conceptual use shares remain programme targets, not certified floor-area allocations.

The two new programmes use the existing disjoint site-cell allocator at neighbourhood scale as well as on large sites. It retains concave arms and produces L/U/chamfered and rectangular footprints. Open-space settings influence separation; coverage, building count, height and setback remain active geometry inputs. Alternative B changes geometry locally. Every generated candidate continues through the existing exact geometry checks; exhausted search is not relabelled as feasibility.

A canonical template ID list/type predicate now governs programme validation, API body validation, saved feature validation, saved editor restoration and the AI schema. Unknown IDs still fail closed. Route auth, challenge, origin, rate limits, provider budget and error handling are unchanged.

Changing the selected programme updates draft settings and preserves the last valid generated model. The prior A/B behaviour, explicit generation and save/reopen paths are unchanged.

## Verification

- `node --experimental-transform-types scripts/complete25-create-programmes-check.ts`: all five programmes × rectangle/concave AOIs; EN/RU validity; independent vertex containment; exact validator; target coverage, count and height; distinct deterministic A/B; actual result/editor/session round trips; invalid IDs; actual route body validator; new-programme preflight; parameter-effect and infeasible-small-site checks. No provider/source requests.
- `npm run test:point-to-object-create`: existing geometry, preflight, actual offline route security/budget tests and local preview contract passed.
- `node --experimental-transform-types scripts/sprint20-create-geometry-check.ts`: existing large L/U, narrow, skew and rotated geometry cases passed.
- `node --experimental-transform-types scripts/sprint20-create-preflight-parity-check.ts`: existing browser/server hash and preflight parity passed.
- New `tests/e2e/complete25-create-programmes.spec.ts`: four optimized HTTPS cases passed with zero retries, Chrome/WebKit × EN 1440px/RU 390px. All five programme selections, both new generations, preserved prior result, local A/B, actual preview readiness and seven rendered model features, save/reopen B, no extra provider POST, no horizontal page overflow, no unexpected external requests.
- Typecheck passed; optimized build generated 81 routes. Desktop/mobile WebKit screenshots inspected after preview readiness.

Browser evidence resides in the worker's ignored `artifacts/complete25-programmes/` directory; JUnit is `artifacts/complete25-programmes-junit.xml`. Root must register the new script/spec in its owned CI/config files and validate the integrated exact candidate. No paid API, hosted Auth/data changes, push or deployment occurred here.

## Limits and next step

These remain conceptual massing programmes. They do not model parks, materials, façades, roads, licensed planning constraints or BIM; an open-space allowance is not generated green-space evidence. Offline synthetic AOIs do not close the founder's unrecovered exact-AOI or live-provider acceptance gates. Root integrates, registers the new checks, and includes the five programmes in the unchanged broader acceptance catalogue.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

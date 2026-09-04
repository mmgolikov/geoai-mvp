# POINT_TO_OBJECT_001 V5.1 Preview Release Receipt

Status: `EXACT_PREVIEW_TECHNICALLY_VERIFIED_FOUNDER_ACCEPTANCE_PENDING` — the exact V5.1 code head is deployed to a Ready protected Preview and passed the full Quality Gate; founder manual acceptance, Production promotion and pilot-readiness evidence remain outside this receipt

Last verified: 2026-09-04

Owner: GeoAI Release Engineering

Authority: Exact point-in-time evidence for the V5.1 candidate on PR #147 only; it does not authorize merge, Production promotion, hosted Supabase changes or a pilot-ready claim

Successor: `docs/CURRENT_RELEASE_STATE.md`; this receipt is bounded Preview evidence and does not replace released-runtime authority

## Scope and exact candidate

| Item | Verified value |
| --- | --- |
| Branch | `codex/point-to-object-clickable-prototype-v1` |
| Verified code head | `789b197e4dcd3dbd03fc3d4aa594bdcb23ab1794` |
| Git tree | `373d32dfd076fa89ceca846f92f458841f865845` |
| Commit subject/time | `test: match language control semantics`, 2026-09-04 16:32:12 +03:00 |
| Functional V5.1 commit | `2124379e62954fd9ef7dfa2fadcdc1c485b888fc`; focused-AI reliability and exact-head corrections continue through the verified code head |
| Pull request | [#147](https://github.com/mmgolikov/geoai-mvp/pull/147), open Draft, code head exact at verification, base `main` |
| Exact Preview | `dpl_EjHRrkghsrPFXCZZc4cnQWbxWXRa`, target `preview`, Ready at [geoai-dzld8pgm6-geoaidev.vercel.app](https://geoai-dzld8pgm6-geoaidev.vercel.app) |
| Stable branch alias | [geoai-mvp-git-codex-point-to-object-clickable-p-3c2c85-geoaidev.vercel.app](https://geoai-mvp-git-codex-point-to-object-clickable-p-3c2c85-geoaidev.vercel.app) |
| Primary route | `/prototype/point-to-object` on the exact deployment and stable alias |

The deployment ID, Preview target, Ready status, exact URL and alias were independently read through Vercel inspection. GitHub Quality Gate evidence below binds the code head to deterministic contracts, Chrome journeys, production build, API/route smoke and database replay. Ready deployment status is not treated as founder acceptance, Production authority or proof of external-provider completeness.

### Documentation-only successor before V6

After the verified V5.1 application head, the same branch advanced to documentation-only commit `d85ef69624bc79c50af788c165c0760dcab01c8f`, tree `80719472a4a941b59cfb5298c3aaa4d7e0f86d98`. This successor did not change the V5.1 runtime implementation. It is therefore recorded separately and must not replace `789b197e4dcd3dbd03fc3d4aa594bdcb23ab1794` as the verified application head.

| Documentation-only evidence | Verified value |
| --- | --- |
| Branch head immediately before V6 | `d85ef69624bc79c50af788c165c0760dcab01c8f` |
| Git tree | `80719472a4a941b59cfb5298c3aaa4d7e0f86d98` |
| Quality Gate | [Run `33880472031`](https://github.com/mmgolikov/geoai-mvp/actions/runs/33880472031), successful |
| Quality artifact | `9940176837`, SHA-256 `ecfc5f9e4b971d5e522a73a7b16b2ecbdbb65fb5ba735989b82ddd17e1f4324a`, 32,639,084 bytes |
| Database artifact | `9939757253`, SHA-256 `62054dde95bb45dbe08e81722da37fb6317e461cef0d1f23954751f03e73b75c`, 7,045 bytes |
| Preview | `dpl_BH4us5PwSs7yw98JfbG9C1GnZgbz`, target `preview`, Ready at [geoai-4thdsrhia-geoaidev.vercel.app](https://geoai-4thdsrhia-geoaidev.vercel.app) |

The later branch head and its successful checks close the documentation state that followed V5.1. They do not retroactively turn V5.1 into a released, founder-accepted or Production-active version. V6 uses `d85ef696...` as its rollback point and creates a new evidence chain.

## Delivered V5.1 delta

- `Analyse`, `Find` and `Create` own separate interaction modes. Normal map clicks select objects only in Analyse; idle Find/Create clicks do not create misleading highlights. Background, land-cover and anomalously broad viewport geometries are rejected, preventing the former giant-square selection.
- Search-as-you-type uses a server-only Photon adapter after two normalized CJK characters or three other normalized characters. It applies selected-market country/bounds/coordinate bias, locale and result caps, while the client supplies debounce, superseded-request abort, session cache and keyboard/localized states.
- Existing explicit-submit Nominatim search remains separate and is not used for autocomplete.
- Find combines audience, role and scenario intent with bounded current-view Overpass predicates, observed-only shortlist fields and comparison without composite ranking or completeness claims.
- A Find candidate carries its expected OSM identity into Analyse. Exact identity is re-resolved server-side and changed or spoofed identity fails closed instead of silently switching to a nearby object.
- Find state remains browser-session preserved. The implemented path is `Back to map`, then select `Find`; no dedicated analysis-to-Find CTA is claimed.
- Create can draw or upload one guarded AOI, request bounded area context, replace intersecting rendered source-building layers and render conceptual massing. Original layer filters are snapshotted, composed with the AOI exclusion and restored exactly on A/B view, reset, mode exit and style reload. OpenAI proposes the bounded programme; application geometry produces deterministic massing.
- Profile is localized for English/Russian and reuses the B2B/B2C-compatible role preference contract without treating user-editable preferences as authorization. Its point-object header has a separate semantic marker from the legacy Product shell and is verified for both locales.

## Source and data boundary

- Photon, Nominatim and Overpass return OpenStreetMap-derived community-map context. `© OpenStreetMap contributors` / ODbL 1.0 attribution is required.
- Public provider coverage and tagging may be incomplete or uneven, and the public services provide no GeoAI product SLA.
- Find and AOI responses are bounded samples, not complete inventories. Source-identity order is not a suitability rank.
- OpenFreeMap is the rendered map presentation; it does not make the returned context official.
- No result establishes official parcel identity, cadastral boundary, zoning, title, ownership, availability, valuation, financial feasibility or development approval.
- Concept massing is a reversible screening visualization, not BIM, architectural design or an approved plan.
- No V5.1 source response, analysis or generated geometry is persisted to hosted Supabase in this candidate.

## Verification completed on the exact code head

### Local deterministic verification

| Check | Result | Evidence boundary |
| --- | --- | --- |
| TypeScript / `npm run lint` | PASS | Static type check only |
| Next.js production build | PASS, 79/79 static pages generated | Local build on bundled Node.js 24.19.0 |
| Point-to-object evidence contract | PASS on bundled Node.js 24.19.0 | Deterministic contract; explicitly `HOLD_NOT_IDENTITY_ACCEPTANCE` for fixture pack evidence |
| Photon autocomplete contract | PASS for 9 markets on bundled Node.js 24.19.0 | Deterministic parser/request/negative contract without live network |
| V5 interaction contract | PASS | Static/source behavior contract, not rendered-browser proof |
| Find contract | PASS | Deterministic predicate/response/source-lineage contract |
| AOI area-context contract | PASS on bundled Node.js 24.19.0 | Bounded deterministic contract |
| Create contract | PASS on bundled Node.js 24.19.0 | Programme/schema/massing contract, not architectural validation |
| MapLibre replacement contract | PASS on bundled Node.js 24.19.0 | Geometry/filter restoration contract, not every live basemap style |
| Trusted exact-identity contract | PASS on bundled Node.js 24.19.0 | Exact OSM anchor/spoof-rejection contract |
| Persistence contract | PASS | Preview-only caller/project/RLS contract remains blocked from hosted apply |
| User-profile contract | PASS | Static preference/storage/account-action contract, not real-user hosted Auth evidence |
| Exact-head Chrome V5 flow | PASS, 1/1 in 29.3 s | Offline deterministic route-mocked journey covering autocomplete, Find, comparison, Create replacement/reset and Profile |
| Exact-head Chrome Auth/session suite | PASS, 35/35 in 8.8 min | Browser-local/demo journeys, responsive states, accessibility and visual contracts; no real hosted user persona |

The first direct TypeScript-script invocation used the system Node.js 20 runtime and could not recognize `--experimental-strip-types`. The affected deterministic scripts were rerun with bundled Node.js 24.19.0 and passed. This is a verification-runtime correction, not a source-code failure.

### Live route and model evidence available from the delivery task

- Live Photon/OpenStreetMap suggestion response was exercised on the protected candidate.
- Live selected-object context resolution was exercised with the expected OSM identity.
- A spoofed or mismatched expected identity was rejected fail-closed.
- Live bounded Find returned observed OpenStreetMap candidates without a synthetic score.
- Standard location analysis succeeded for Shangri La with a 400 m context sample of 283 records using `gpt-5.6-terra`, medium reasoning, 3,363 tokens, one attempt and an estimated API cost of `$0.010059`.
- Focused development-screening analysis succeeded for Dubai Marina Mall with exact OSM identity, a 400 m context sample of 194 records and a structured decision brief using `gpt-5.6-sol`, medium reasoning, 4,408 tokens, one model attempt and an estimated API cost of `$0.0185516`.
- Quick Create succeeded for a bounded residential/mixed-use concept with three generated blocks using `gpt-5.6-terra`, low reasoning, 1,133 tokens, one attempt and an estimated API cost of `$0.004486`.
- Exact deployment logs for the focused-analysis correction recorded one bounded deterministic recovery of a known context-binding mismatch and no fatal runtime event in the inspected window.

The paid live AI checks were executed on exact deployed ancestors with unchanged AI/Create server code relative to the verified head. They are supporting route evidence, not proof that public providers are complete or continuously available and not a substitute for founder manual review.

## CI and hosted verification state

GitHub Quality Gate run [`33878620781`](https://github.com/mmgolikov/geoai-mvp/actions/runs/33878620781) for exact code head `789b197e4dcd3dbd03fc3d4aa594bdcb23ab1794` completed successfully:

- `Static, API and data-honesty checks`, job `101041520799`: SUCCESS in 14 min 03 s. It includes all focused point-to-object contracts, V5 Chrome `1/1`, Auth/session Chrome `35/35`, production build, Vercel output tracing and built-app API/route smoke.
- Quality artifact `9939388650`: SHA-256 `b5ef2c14e306f60575d35dc88e7de8398165f73910e3684f58f45fdb15052554`, 32,637,766 bytes.
- `Supabase clean replay, synthetic upgrade rehearsal and pgTAP personas`, job `101041520958`: SUCCESS in 4 min 00 s.
- Database artifact `9939020813`: SHA-256 `1c3fb640c9a5556ed28d677bb6e9e4a38cb366bdc069f606d0b8083e2e30b600`, 7,046 bytes.
- Vercel Preview deployment: SUCCESS / Ready, `production_environment=false`; GitHub deployment `6265420509` and status `17819683893` point to the exact URL listed above.

Earlier runs exposed stale documentation, demo-button, hover-state, Profile CTA and shell-marker test contracts. They were corrected without weakening assertions. The first long browser run was cancelled at the job timeout; subsequent failures were bounded and traceable. None is represented as a product acceptance failure, and the exact successor run above is the governing CI result.

## Pending evidence

- Founder manual verification and acceptance of the stable alias, including live public-provider variability.
- Manual exact-head Chrome review from the desktop task is not claimed: the browser-control security policy could not be verified and automation correctly stopped rather than bypassing it. Exact-head CI Chrome evidence is recorded separately above.
- Broader live-provider coverage, throttling and outage testing across all nine market presets.
- Deployment-scoped final-head runtime-log review beyond the inspected supporting AI/Create window.
- Confluence synchronization/read-back, if performed after exact evidence; none is claimed here.
- Figma synchronization or refreshed production-node authority; none is claimed here.

## Rollback and unchanged systems

- Roll back this candidate by reverting the isolated V5.1 commit chain beginning at `2124379e62954fd9ef7dfa2fadcdc1c485b888fc`, or by restoring the previously verified protected Preview deployment. Do not reset or rewrite `main`.
- Create replacement is browser-rendered and reversible; reset or leaving the state restores source-layer filters. It does not delete or mutate OpenStreetMap data.
- PR #147 remains an open Draft at this snapshot and is not merged by this receipt. No `main` write or Production promotion was performed.
- The released Production source pack remains the separately governed disabled/count-only baseline. This candidate does not change the Production alias, Production environment or released-runtime authority in `docs/CURRENT_RELEASE_STATE.md`.
- No Supabase migration, Auth/Storage policy, hosted row, source registry or environment was applied or changed by this receipt or the V5.1 application commit.
- The predecessor V5 receipt remains immutable historical evidence and is not overwritten by this V5.1 record.

## Current verdict

The exact V5.1 code head is a **technically verified protected Preview candidate**: deployment is Ready and the full exact-head Quality Gate is green. Founder manual acceptance, external-provider reliability/coverage, hosted real-user Auth, Production promotion and pilot evidence remain open. It is not merged, Production-ready or pilot-ready.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

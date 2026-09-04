# POINT_TO_OBJECT_001 V5.1 Preview Release Receipt

Status: `CORRECTIVE_DELTA_LOCAL_VERIFIED_PREVIEW_CI_BROWSER_PENDING` — the last exact Vercel Preview is Ready, but a focused-analysis reliability correction and lifecycle fix are not yet represented by an exact Preview or successful Quality Gate

Last verified: 2026-09-04

Owner: GeoAI Release Engineering

Authority: Exact point-in-time evidence for the V5.1 candidate on PR #147 only; it does not authorize merge, Production promotion, hosted Supabase changes or a pilot-ready claim

Successor: `docs/CURRENT_RELEASE_STATE.md`; after all pending gates close, a final exact-head update to this receipt may record the bounded Preview verdict without changing Production authority

## Scope and exact candidate

| Item | Verified value |
| --- | --- |
| Branch | `codex/point-to-object-clickable-prototype-v1` |
| Last deployed application commit | `2124379e62954fd9ef7dfa2fadcdc1c485b888fc` |
| Git tree | `080b2c489bf34e5b08dbe42688c4ef63aeb9ea34` |
| Commit subject/time | `feat: complete point-to-object v5.1 interactions`, 2026-09-04 14:10:42 +03:00 |
| Pull request | [#147](https://github.com/mmgolikov/geoai-mvp/pull/147), open Draft, head exact on the application commit, base `main` |
| Exact Preview | `dpl_HrJxAKZsjR4rWf26t9c7rkLQpWih`, target `preview`, Ready at [geoai-bobptx78h-geoaidev.vercel.app](https://geoai-bobptx78h-geoaidev.vercel.app) |
| Stable branch alias | [geoai-mvp-git-codex-point-to-object-clickable-p-3c2c85-geoaidev.vercel.app](https://geoai-mvp-git-codex-point-to-object-clickable-p-3c2c85-geoaidev.vercel.app) |
| Primary route | `/prototype/point-to-object` on the exact deployment and stable alias |

The deployment ID, Preview target, Ready status, exact URL and alias were independently read through Vercel inspection. A local corrective delta now adds deterministic recovery for two focused-answer context-binding failures and regenerates the lifecycle manifest; its successor commit, CI run and Preview tuple must be recorded before this receipt can become exact-head evidence. This receipt does not infer route correctness, browser acceptance or runtime-log cleanliness from a Ready build status.

## Delivered V5.1 delta

- `Analyse`, `Find` and `Create` own separate interaction modes. Normal map clicks select objects only in Analyse; idle Find/Create clicks do not create misleading highlights.
- Search-as-you-type uses a server-only Photon adapter after two normalized CJK characters or three other normalized characters. It applies selected-market country/bounds/coordinate bias, locale and result caps, while the client supplies debounce, superseded-request abort, session cache and keyboard/localized states.
- Existing explicit-submit Nominatim search remains separate and is not used for autocomplete.
- Find combines audience, role and scenario intent with bounded current-view Overpass predicates, observed-only shortlist fields and comparison without composite ranking or completeness claims.
- A Find candidate carries its expected OSM identity into Analyse. Exact identity is re-resolved server-side and changed or spoofed identity fails closed instead of silently switching to a nearby object.
- Find state remains browser-session preserved. The implemented path is `Back to map`, then select `Find`; no dedicated analysis-to-Find CTA is claimed.
- Create can draw or upload one guarded AOI, request bounded area context, hide intersecting rendered source-building layers reversibly and render conceptual massing. OpenAI proposes the bounded programme; application geometry produces deterministic massing.
- Profile is localized for English/Russian and reuses the B2B/B2C-compatible role preference contract without treating user-editable preferences as authorization.

## Source and data boundary

- Photon, Nominatim and Overpass return OpenStreetMap-derived community-map context. `© OpenStreetMap contributors` / ODbL 1.0 attribution is required.
- Public provider coverage and tagging may be incomplete or uneven, and the public services provide no GeoAI product SLA.
- Find and AOI responses are bounded samples, not complete inventories. Source-identity order is not a suitability rank.
- OpenFreeMap is the rendered map presentation; it does not make the returned context official.
- No result establishes official parcel identity, cadastral boundary, zoning, title, ownership, availability, valuation, financial feasibility or development approval.
- Concept massing is a reversible screening visualization, not BIM, architectural design or an approved plan.
- No V5.1 source response, analysis or generated geometry is persisted to hosted Supabase in this candidate.

## Verification completed on the exact application commit

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

The first direct TypeScript-script invocation used the system Node.js 20 runtime and could not recognize `--experimental-strip-types`. The affected deterministic scripts were rerun with bundled Node.js 24.19.0 and passed. This is a verification-runtime correction, not a source-code failure.

### Live route evidence available from the delivery task

- Live Photon/OpenStreetMap suggestion response was exercised on the protected candidate.
- Live selected-object context resolution was exercised with the expected OSM identity.
- A spoofed or mismatched expected identity was rejected fail-closed.
- Live bounded Find returned observed OpenStreetMap candidates without a synthetic score.

These are task-context route checks. They do not replace the pending exact-head focused browser journey, manual visual review, provider-coverage study or CI artifact.

## CI and hosted verification state

GitHub Quality Gate run [`33866719371`](https://github.com/mmgolikov/geoai-mvp/actions/runs/33866719371) for commit `2124379e62954fd9ef7dfa2fadcdc1c485b888fc` completed with one documentation-packaging failure:

- `Supabase clean replay, synthetic upgrade rehearsal and pgTAP personas`, job `101003140261`: SUCCESS.
- `Static, API and data-honesty checks`, job `101003139854`: FAILURE only at `Documentation lifecycle manifest`; all prior static, security, API and point-to-object checks passed, while build/smoke were skipped by fail-fast.
- Root cause: the V5.1 Change Request was added without regenerated `docs/DOCUMENT_LIFECYCLE_MANIFEST.json` and `docs/DOCUMENT_ARCHIVE_INDEX.md`. The local corrective delta regenerates both and passes the lifecycle test.
- Vercel status for the exact deployment: SUCCESS / Ready.

Therefore commit `2124379e62954fd9ef7dfa2fadcdc1c485b888fc` did not pass the full Quality Gate. This receipt must not be upgraded to a fully verified release-candidate verdict until the successor corrective commit completes successfully and its evidence artifact ID/digest are recorded.

## Pending evidence

- Exact SHA/tree, Quality Gate run and quality artifact for the successor corrective commit.
- Focused rendered-browser V5.1 test on the exact commit, including autocomplete keyboard/empty/error states; Find result/comparison/return-state; Create replacement/reset; Profile localization; and 1440×900, 834×1112 and 390×844 coverage.
- Deployment-scoped route/security smoke and error/fatal runtime-log review on the exact Preview.
- Founder manual verification and acceptance of the stable alias.
- Confluence synchronization/read-back, if performed after exact evidence; none is claimed here.
- Figma synchronization or refreshed production-node authority; none is claimed here.

## Rollback and unchanged systems

- Roll back this candidate by reverting commit `2124379e62954fd9ef7dfa2fadcdc1c485b888fc` on its isolated branch or restoring the previously verified protected Preview deployment.
- Create replacement is browser-rendered and reversible; reset or leaving the state restores source-layer filters. It does not delete or mutate OpenStreetMap data.
- PR #147 remains an open Draft at this snapshot and is not merged by this receipt. No `main` write or Production promotion was performed.
- The released Production source pack remains the separately governed disabled/count-only baseline. This candidate does not change the Production alias, Production environment or released-runtime authority in `docs/CURRENT_RELEASE_STATE.md`.
- No Supabase migration, Auth/Storage policy, hosted row, source registry or environment was applied or changed by this receipt or the V5.1 application commit.
- The predecessor V5 receipt remains immutable historical evidence and is not overwritten by this V5.1 record.

## Current verdict

The exact V5.1 application commit is deployed to a Ready protected Preview and has passed the listed local deterministic checks. It is **not yet a fully verified Preview release candidate** because the application CI job, focused exact-head rendered-browser evidence, hosted route/log matrix and founder manual acceptance remain open. It is not merged, Production-ready or pilot-ready.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

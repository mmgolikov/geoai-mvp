# Sprint07 — Acceptance and Remaining Field Checks

Status: Local candidate verified; exact-head CI exposed a Find camera lifecycle defect, corrected in successor; final CI pending; not released
Last verified: 2026-09-10
Owner: GeoAI Main
Authority: [Approved CR](SPRINT07_USER_JOURNEY_RECOVERY_CR.md)
Baseline / rollback reference: `46f6f658c8742fc50b8c9d1548a1a80d33872390`
Delivery lane: `codex/sprint06-mobile-decision-v1`, Draft PR #148; no merge or Production authority

## Evidence boundary

Founder screenshots from September 10 reopen the earlier mobile and web acceptance. The isolated local tests use intercepted synthetic provider responses, the real application and MapLibre renderer, and the existing local-only demo identity. Chrome and WebKit were explicitly authorised. No hosted identity, dataset, source policy, environment, secret or paid provider was changed. WebKit on macOS is not the founder's physical iPhone 15 Pro / iOS 27 RC Safari.

The administration policy prevents agent browser inspection of the protected Preview. No alternate browser, fetch client or proxy was used to bypass that denial. Allowed deployment metadata and logs are separate evidence, not rendered Preview acceptance. Public provider availability and the founder's exact live AOI remain field checks.

## Consolidated feedback ledger

| Founder observation | Implemented response | Verification / remaining limitation |
|---|---|---|
| Previous generated objects remain after regeneration | Existing generation layers are replaced/cleared by operation and style lifecycle; original Create reliability invariant retained | Local synthetic Create and map lifecycle tests; exact live AOI still to retest |
| Broken 3D on complex buildings; some clicks do nothing | Match native source height/base, honour `hide_3d`, stop overlapping copied extrusion; select a whole unambiguous Polygon member; do not gate taps on unrelated pending tiles | Chrome/WebKit map tests; missing/ambiguous geometry remains honest, not invented |
| Object context fails and button stays Resolving | An explicit deadline listener sets recoverable error state before aborting the request; owned cancellation is silent and late responses are ignored | Native WebKit deadline/retry repeated three times; provider availability is not guaranteed |
| Area fails after leaving and returning | Preserve AOI and explicit retry; deadline/cancellation follow the same state rule | Native WebKit deadline/retry repeated three times; no background paid rerun |
| Selected tower becomes a nearby fountain/POI in analysis | Original selected identity remains separate from resolved context; exact lookup requires canonical original OSM ID and matching evidence | Pure identity checks and browser assertions; historical receipt bytes are not rewritten |
| Infrastructure outside 400 m described as inside | Radius-bound group observations and more distant nearest observations use separate clauses | English/Russian semantic regression with a 759 m item |
| Find errors / unclear result location / comparison | Numbered matching list and map markers, focus and fit; saved criteria and result preserved; gate the search on completed session reconciliation and acknowledged camera transition; empty/limited/unavailable states remain distinct | Local Find/overview tests; ten focused camera/search repetitions passed without retries. No complete inventory or new ranking claim |
| Projects should be one Hub with three widgets | One Analyse/Find/Create report hub, query/type/sort; no Data readiness peer path; real local results only | Existing unified-Hub tests plus new restore/overview tests |
| Workspace opens old version | Common product navigation targets current point-to-object workspace; legacy route remains directly addressable for compatibility, not the new navigation destination | Route assertions; old-route compatibility not removed |
| Open map shows previous object and asks to analyse again | Explicit all-project overview wins over stale selection; saved result action restores exact result, not a new run | Hash/owner validation; mixed-market and coincident-coordinate overview tests |
| Projects/Profile appear inactive or open slowly | Immediate visible opening feedback; current Hub target; accessible controls; one shared guard prevents duplicate post-sign-in document navigation | Exact one-navigation assertion passed in the integrated Chrome and WebKit runs. Authentication methods, safe redirect resolver and server access guards are unchanged; no measured hosted latency improvement claimed |
| Header heights, round profile, + New, storage copy | 44 px aligned controls, rounded-square profile, bare bold plus with a hit target, device icon and truthful explanatory tooltip | Desktop/mobile visual and geometry checks; cloud storage not activated |
| Large blank mobile sheet and drawing-control gaps | Content-sized collapsed panel, compact controls and safe-area treatment | Local 393 px and responsive checks; physical browser chrome still to retest |
| Camera stays open after outside interaction | Outside pointer and Escape dismiss, camera controls remain interactive | Map browser tests |
| Unclear finish-drawing step | Explicit Finish area / Edit drawing labels and ready state | Create interaction tests; no ambiguous Select action in this flow |
| Generated result has no clear next action | Primary Show result on map action preserves the chosen A/B result | Create saved-result tests |
| Hide removes one building only | Partition fully interior Polygon members; preserve whole crossing/outside members and holes; mask original only after retained geometry source is ready | Pure topology/cap tests and real renderer on synthetic features. No arbitrary clipping or complete physical-building inventory claim |
| Rectangular massing does not respond to polygon | One bounded campus profile adds nearest-boundary orientation on eligible multi-direction polygons; existing fallback byte-seed and validators retained | Determinism, containment, setback, overlap, coverage and timing checks; full urban-design intelligence remains deferred |
| Landing blurry, over-zoomed, huge image/top gap | Use unmodified high-resolution founder capture through existing image optimisation; bounded desktop/mobile frame and selection-adjacent action group | Founder before/current candidate compared together at desktop/mobile review sizes; complete image loading and bounded geometry asserted; real source, no fabricated geography |
| Landing needs Open map / Leave a request | Clear existing CTAs; new short form documented separately | [Form proposal](LANDING_REQUEST_FORM_PROPOSAL.md) only; no new lead submission/storage |
| Text-heavy analytics lack role/scenario value | Six evidence-bound cards plus two deterministic presentation views; full B2B/B2C role/scenario/source/visual matrix | [Versioned matrix](ROLE_SCENARIO_DASHBOARD_MATRIX_V1.md); no claim all personas or commercial decision packs are implemented |
| Future collaboration and MCP | Separate professional personas from project permissions; common evidence/result contracts and headless gates specified | Design/research only; no hosted RBAC, cloud sync or live MCP service |

## Local verification register

- Map lane: final Chromium 2/2 and WebKit 2/2, pure replacement/partition/selection/grouping checks, original Create replacement invariant, TypeScript and diff checks passed before integration.
- Source/data: trusted-identity, source recovery 429/504/cooldown, runtime boundaries, English/Russian context narration, immutable analysis/project receipt, dashboard missing-value and sample-denominator checks passed.
- Security: server credential boundaries, secret hygiene, owner/project isolation and data-honesty static checks passed. A UI change does not change server authorisation.
- Local project-capacity review: all 600 supported saved results can enter the overview; exact receipt bytes stay unchanged. Identity switching during integrity verification rejects the old owner's queued intent and clears transient overview state. Creating a new project clears both exact-result and overview intents; a regression verifies that previous saved artifact bytes remain identical.
- Integrated workflow static contracts: 52/52 passed; optimized build generated 80/80 pages. Final post-navigation-guard build also passed.
- Integrated point-to-object and global-navigation browsers on the final runtime candidate: Chrome **55/55**, WebKit **55/55**, both with retries disabled. Machine-readable receipts are `sprint07-final-chromium-v5-junit.xml` and `sprint07-final-webkit-v5-junit.xml` under the private sprint evidence directory. Synthetic evidence is not live-provider or physical-device acceptance.
- Broader Chrome Auth/session, responsive, accessibility, legacy-route and printable-report compatibility: **35/35 passed** with retries disabled (`sprint07-final-auth-v6-junit.xml`).
- Final standard optimized build generated **80/80 pages**; all **13** server trace budgets passed. Built-app API contracts and security-header checks passed; route inventory covers **76 routes** and **6** runtime cases. Production dependency audit reported **0 vulnerabilities** at the moderate threshold. These are scoped checks, not security certification.
- Exact-head CI/deployment and the immutable commit binding will be recorded in Draft PR #148 and the operational Hub after push, not inferred from local results. This in-commit receipt cannot self-certify its own SHA.

Failed development runs remain diagnostic evidence: an invalid synthetic receipt hash, obsolete CTA expectations, one invalid fixture enum, WebKit local-HTTP CSP upgrade and a concurrent development-chunk replacement were corrected at their actual scope. None is relabelled as a successful acceptance run. Tests retain hash, geometry, identity and owner checks.

The broader compatibility suite also exposed stale Sprint06 landing-image expectations and the historical 40 px circular profile badge assertion. Tests now explicitly assert the approved current capture and 44 px / 12 px-radius badge while preserving the historical primitive fixture. A long-print capture differed at 165 rounded-corner pixels out of 2,547,480, with no text or layout displacement; only the full-page candidate capture waits up to five seconds for a stable consecutive pair. Its original maximum channel delta of 2 and changed-pixel bound remain unchanged, accepted evidence is hashed only after convergence, and non-convergence still fails with the final pair attached.

The deadline diagnosis used a native one-second `AbortSignal.timeout` with a delayed local response and an invocation counter, without replacing `AbortSignal.any` or fabricating a UI error. The former app flow intermittently accepted the late response. The corrected application owns its timeout transition and cancels its request controller; both deadline paths passed three consecutive WebKit runs. Navigation initially passed six local-HTTPS/CSP-preserving repetitions but later failed on plain Chrome too, disproving an exclusively transport-only explanation. The duplicate UI navigation was then guarded; the exact-request-count assertion and full regressions are final acceptance gates, not inferred from the earlier TLS run.

Find had two independent early-interaction races. Session/profile reconciliation could invalidate a just-started search; the CTA and handler now wait for it. Separately, the delayed 3D-to-2D map `movestart` could disable an already pressed CTA before its click completed. Find now arms its movement gate in the mode-change event and waits for the map's acknowledgement, including already-2D and not-yet-loaded paths. The original direct-click regression and explicit camera-transition/no-op regression each passed five consecutive Chrome runs. A temporary diagnostic delay was not retained as the fix. Responsive geometry assertions wait for the settled layout without loosening pixel or touch-target thresholds.

## Exact-head CI recovery

CI run `34531474169` on `797536b8b1b0b5b9050f5e16568e20c705a2bad8` passed the isolated database job and static checks but failed the browser stage: 51 point-to-object tests passed, one failed and one was flaky. The subsequent Auth/build/route/PDF stages did not run in that CI and must not be credited to it.

The failed marker test exposed a real lifecycle bug after the 350 ms focus animation: camera movement made the prior search area stale and removed its still-valid returned coordinates. The successor separates criteria mismatch from viewport-only staleness. It preserves numbered candidates and Fit for the prior-area result, keeps the Stale/Update search notice, and still hides candidates when role/scenario/market/locale/group/level criteria change. Saved query bounds and immutable results are not rewritten, and no request is introduced.

The strengthened regression waits for completed focus bounds, verifies retained markers/Fit, changes level criteria to verify removal, then restores them without a request. The camera-transition test now waits for the real initial 3D map to be ready: its earlier CI flaky attempt entered Find before map initialization, where the deliberate no-map acknowledgement correctly had no disabled animation state to observe. Original CI and local development failures remain diagnostic evidence. Final successor local and CI results are recorded in PR #148 and the Hub; earlier full-suite counts remain bound to the pre-successor runtime above.

## Cost and release controls

New paid API calls in Sprint07: **0**. The founder's USD2.50 weekly product-API ceiling is not an additional allowance. Earlier unpriced attempts prevent an exact remaining-dollar claim. Profile/language presentation changes and saved-result opening do not automatically call AI; an update is explicit. Account-wide Codex quota is separate from the product API budget and cannot be attributed to this sprint without a start/end baseline.

No Production promotion, merge, hosted database/auth/storage mutation, source acquisition, lead submission, outreach, program application, incorporation or financial commitment is included. The founder's nationality and budget research remains private, outside the public application repository.

## Founder field retest

Source-building replacement operates on available loaded native building geometry at zoom 13 or above. It preserves whole boundary-crossing/outside members, never clips a building boundary, and leaves unsupported or over-cap aggregates native. Preparation is bounded to 32 mixed features per source / 24,000 coordinates overall, with 512 members / 8,000 coordinates per feature. These safety limits mean complete hiding of the founder's exact live AOI is not claimed from synthetic tests.

1. Open the eventual exact Preview candidate, reload once, then repeat the original selected building and Al Jaddaf AOI cases.
2. On physical Safari, switch Analyse/Create, leave and return, simulate a failed context request if possible, retry, and confirm the selected boundary/question survives without endless loading.
3. Generate A/B, hide/show existing buildings, change camera/style/zoom, clear and reopen the saved result. Compare all interior buildings, not one visible feature.
4. Find a bounded set, identify each numbered map marker, select 2–4 comparable candidates, save and reopen the same result.
5. Open Hub overview with results at the same coordinates; choose each exact result. Test Profile/Projects and keyboard/back navigation.
6. Review desktop/mobile landing and the six-card dashboard for readability and source interpretation. These are founder acceptance checks, not confirmation of PMF.

## Working methods used

Product Design audit grounded the changes in the founder's captures and before/after visual comparisons; Data Analytics dashboard and data-quality skills shaped evidence-bound cards and missing-data states. Deep Research structured primary-source verification and commercial/jurisdiction uncertainty. Playwright and Vercel verification/deployment guidance separated local browser evidence, exact-head build/CI and protected Preview field acceptance. Next.js and React guidance supported bounded component/state changes; existing OpenAI integration guidance kept provider configuration and paid calls unchanged.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

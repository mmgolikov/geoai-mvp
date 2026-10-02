# REVIEW02 — Workspace return and context admission correction

Status: Residual and final C2 targeted verification PASS in separate receipts; integration, full CI and hosted acceptance pending
Owner: dev_1
Verified: 2026-10-02 UTC / 2026-10-03 Europe/Moscow
Scope: Main-routed bounded correction; no new feature or design authority

The first-correction record below is historical. Its 12-case PASS did not cover the subsequently reproduced restored Analyse and held Create-area locale defects. The residual section at the end governs current handoff; no historical result is deleted or promoted.

## Authority and recovery

- Assigned checkout: `/Users/mmgolikov/.codex/.chatgpt-projects/g-p-69ad6f8f8f4881919685beb94a855ac6/worktrees/review02-map`.
- Assigned branch: `codex/review02-map`.
- Frozen integrated input: `0ce4ad2a113001fd37e093dfc9d6c84c3bf3027c`.
- Local pre-correction parent: `7e861f1c0a6513315c4d51cd783fae82b4f3d958`.
- Both input trees are exactly `f3286de74eb86882cc3e5d2c2e4b371c4b97f952`. History was preserved by applying the five missing integration commits, without duplicating the earlier map correction. No reset, overwrite, clean, force operation or pruning was used.
- Main remains the sole integrator. Integrate only the corrective commit containing this receipt, not the five local synchronization commits.
- The old `/private/tmp/geoai-cycle05-dev05.JgQfVo/worktree` is absent. DEV-05 already has a historical R2 acceptance at `3d7540f44e2f338c1965027aa7f3109e5775335e`; it was not recreated or reimplemented. This correction continues the current assigned REVIEW02 work.

## Reproduced defects and correction

1. **Saved Create mobile return:** closing the result dashboard left the Task sheet at `peek`, hiding parameters. The shared Back/Escape handler now opens the sheet at `full` and persists only dashboard visibility. Generated alternatives, active A/B, AOI and draft are not reset.
2. **Hidden old-object context refresh:** Find draft locale changes cleared the held Analyse snapshot and admitted another Context POST. Locale edits outside Analyse now retain the original snapshot. Context acquisition runs only in Analyse, with admission bound to selection interaction, browser identity and explicit Retry version. Admission is recorded when the debounced request actually starts, not at effect setup, preserving React Strict Mode cancellation semantics.

Fresh locale-bound cache reuse, exact identity parsing/merge guards, restoration generation checks, five-minute cache expiry, cancellation, request generations, the 30-second UI deadline and Retry-After cooldown remain in place. A denied implicit refresh surfaces a recoverable error; explicit Retry and a new map selection are positively tested. No source library, route, scoring, Auth, Storage, cloud persistence, dependency, environment or design files changed.

## File manifest and tested bytes

| File | Role | SHA-256 of tested file |
| --- | --- | --- |
| `components/point-to-object/prototype-client-v5.tsx` | Bounded transition/admission correction | `5dc9b3601afbd20097329b3e31f32203e26afc5c364ec5e9c7b263319173f778` |
| `tests/e2e/review02-workspace-return.spec.ts` | Six journeys, run in both browser engines | `76df5c6a4bba388563cb05ccdaabff476dedac9d2a5eabfe53bdd3d9dfa24245` |
| `tests/e2e/review02-workspace-return.config.ts` | Isolated two-engine matrix; zero retries | `ccaa1957230affa1dd522ebcd19a054f8f4fb94b18120d17d51664579185b1a2` |
| This receipt | Local engineering evidence and integration boundary | Bound by its containing Git commit |

## Final verification

Environment: isolated local development server `http://127.0.0.1:3132`; Node `24.19.0`, Next.js `15.5.25`, React `19.2.7`, Playwright `1.61.1`. Reviewer: dev_1 (owner verification, not independent acceptance).

```sh
GEOAI_E2E_BASE_URL=http://127.0.0.1:3132 \
PLAYWRIGHT_JUNIT_OUTPUT_FILE=artifacts/review02-workspace-return/junit-run5.xml \
./node_modules/.bin/playwright test \
  --config=tests/e2e/review02-workspace-return.config.ts \
  --workers=1 --fail-on-flaky-tests --reporter=line,junit \
  --output=artifacts/review02-workspace-return/results-run5
```

- Single complete targeted matrix: **12 passed, 0 failures, 0 errors, 0 skipped**, zero retries. JUnit total time `274.789398` seconds; Chromium 6/6, WebKit 6/6. This is not a full application aggregate or hosted evidence.
- JUnit SHA-256: `fa9fc13a08200aab933616657e47d65bd0d26b777bc7b2141130dc38e2b43f52`.
- Create: EN/RU at 390x900 and 1440x900; keyboard Back and Escape; Task visible and non-inert; all six parameter values checked by accessible label; B, exact saved geometry/generated result/editor snapshot retained; dirty prompt survives; document overflow <=1px; zero prototype source/AI requests and zero page errors.
- Compare: 390x900; held insight, Escape, RU/EN, scenario change, original artifact restore and explicit dashboard reopening; saved insight byte-equivalent; zero prototype source/AI requests and zero page errors.
- Analyse positive admission: 1440x900; one mocked initial Context POST, none for RU/EN/Find/Analyse view transitions, one for explicit Retry and one for a new map selection; all requests intercepted locally; zero page errors.
- Browser tests block external HTTP requests and use synthetic, schema-validated browser-local artifacts. No real source or provider call was made by these tests. The initial generic dev smoke used the existing public basemap surface and is not evidence of zero tile reads.
- `npm run lint -- --incremental false`: PASS.
- `npm run test:point-to-object-trusted-identity`: PASS.
- `npm run test:point-to-object-source-deadline`: PASS with injected deadlines, no real provider/source acquisition.
- `npm run test:point-to-object-projects`: PASS.
- `npm run test:data-honesty`: PASS, 486 files, zero findings. Scan artifact SHA-256: `d0313cf62d6953f5a9860a9594fe041f698cb0d68a37aa1dcf98088bf2ffbdea`.
- `git diff --check` and staged diff check: PASS. `npm run test:secret-hygiene`: PASS, 1,441 tracked/indexed paths, including all four corrective files; operator environment remains ignored and example credentials empty.
- Own server stopped; port 3132 verified free. Own browser smoke session closed.

## Retained failures and rework

No timeout, value assertion, no-request oracle or visual tolerance was relaxed.

| Attempt | Retained JUnit evidence | Classification |
| --- | --- | --- |
| run1 | 0 collected tests | Invalid initial nested browser configuration; not PASS |
| run2 | tests=12, failures=1, errors=7, skipped=4 | Invalid fixture schema / comparison reopen precondition; interrupted after diagnosis |
| run3 | tests=12, failures=8, errors=0, skipped=0 | Test queried sliders inside the intentionally closed parameter disclosure; Compare and positive admission passed |
| run4 | tests=12, failures=5, errors=0, skipped=5 | Test assumed persistence order equalled UI order; interrupted after diagnosis |
| run5 | tests=12, failures=0, errors=0, skipped=0 | Complete final matrix PASS |

All attempts remain under `artifacts/review02-workspace-return/`. Run5 is the authoritative local browser receipt; earlier supporting passes are not substituted for it. Initial forecast and total task elapsed cannot be reconstructed reliably and remain unverified; run-specific measured times are retained.

## Limits, handoff and rollback

- Root's independent timeout/repeat sequence is supplied evidence, not a journey rerun here. This matrix starts with a held saved insight and tests the exact local transition cut that previously triggered hidden Context work.
- The offline empty-basemap fixtures verify state/geometry preservation and local transitions, not real-map replacement or live-source visual quality. Maximum labels, broader viewports, full accessibility, physical PDFs and the complete application aggregate are outside this bounded correction.
- Test selection expands to broad review because of the shared page and new isolated config/spec. Main must integrate, wire the dedicated matrix into the integrated plan as appropriate, then run its single final full build/CI and independent acceptance. Workers did not bypass a gate or change the shared CI/test-impact registry.
- Main reported run `37061020664` failing a legacy context expectation (2 versus combined 1). The separate Data owner handles that contract; this worker did not edit it or claim the hosted failure closed.
- Production/main, hosted services, Supabase/Auth/Storage, environment/secrets, Figma/Confluence and public deployments were not changed by this correction. No push, CI dispatch, deploy, paid call or outreach occurred. No secret or personal-data access occurred.
- Existing source labels and the exact caveat remain: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.” Synthetic fixtures and device-local saving are not official/live evidence or protected cloud custody.
- Higher readiness is not promoted. Full integration and independent QA remain pending; domain due-diligence status is PARTIAL.
- Rollback: revert only the corrective commit on the Candidate branch. No migration, stored browser-data deletion, Auth/environment change or hosted rollback is needed.
- Downstream handoff: main_1, ready for controlled local integration only. Preserve current map/source/Compare integration and run the final exact-head gates before any separately authorized Preview action.

## Residual correction — 2026-10-03

### Exact input and ownership

- Root's frozen input: `ceecad261fde5abe995fd46be1e09ef5cea8b711`, reported clean/build PASS (81 routes), not pushed. Root's build is supplied evidence, not a fresh worker build.
- Local input: `001aaa5b5f5e30cfc3c3adcf3664f7848a264a7d`; clean before editing. Its tree and Root's input tree are both exactly `cc3c6681e3441ee4f079c79dd087e3ae8691a17a`.
- Only the two missing Root test/integration changes were synchronized: `73fcf6f` as `d98458b`, and `ceecad2` as `001aaa5`. No duplicate implementation, reset, branch switch, force operation, overwrite or pruning occurred. Root must integrate only the new final correction, not these synchronization commits.
- Root initially assigned page/spec/receipt only. A subsequent explicit delta authorized only the obsolete client assertion in `scripts/point-to-object-source-deadline-check.ts`; preceding injected route/Auth/deadline/error tests and budgets remain byte-unchanged.
- Independent input retained: `test_1/final-ceecad2/independent.spec.ts` SHA-256 `f59d7256b78deb519d3ea3a0657bdd3fe4fc170261aa35b2a69f16d22ee6575d`; `results.json` SHA-256 `f31d9207ddb234351c82f42c59923e19be790e2cc606c8adf8174932bc93af48`. Root reported 22 cases (11 pass, 10 fail, one expected skip) plus eight C3 continuation failures. These are counter-evidence against the former coverage, not a current independent PASS.

### Correction and invariant proof

1. **Restored Analyse:** presentation locale no longer erases `resolvedObject` in any mode. A valid held/restored snapshot seeds selection-interaction/identity/Retry admission; local transitions cannot implicitly reacquire it. Original facts, receipt, source locale, timestamps and evidence lease are not rewritten.
2. **Held Create area:** the one-shot restoration suppression now seeds persistent admission keyed by market, AOI ID/coordinates, browser identity and explicit Retry version. Locale, mode, draft, A/B and Back/Escape do not admit another request. Failed/cancelled admission remains recoverable through Retry; a genuinely new AOI remains positively admitted.
3. **Retention versus new-response parity:** retention compares the actual geometry/market while preserving the held snapshot's original source locale. A changed geometry/market clears the old snapshot. New responses still must match the actual request, including locale, after cancellation/current-generation checks. No source identity, paid-analysis freshness, cooldown or deadline policy is relaxed.
4. **Guard reconciliation:** the existing source-deadline gate executes the real extracted client retention expression, proving same-geometry/market identity retention, null handling, no metadata mutation and changed-market/AOI rejection. It separately requires strict real-response request parity and retains the original deadline/current-generation/late-Auth/no-paid-escalation tests.

### Current file manifest

| File | Role | SHA-256 of tested bytes |
| --- | --- | --- |
| `components/point-to-object/prototype-client-v5.tsx` | Residual held-source admission correction | `76e311bd2fe848903c5b499c672730a693559dc1960f44550efebdeccbe583c8` |
| `tests/e2e/review02-workspace-return.spec.ts` | 13 journeys per engine; held and failed source paths | `508d2129ce5ef1172251879fcbc3d21c9268705ad7c887e6e8a636b2521bfee8` |
| `scripts/point-to-object-source-deadline-check.ts` | Authorized client assertion reconciliation only | `c00dd7fe721b2e107d47316ce7be88cf9da37eeada86c2345ce42e9acf4c5f89` |
| This receipt | History, measured evidence and integration boundary | Bound by containing Git commit |

The browser configuration is unchanged (`ccaa1957230affa1dd522ebcd19a054f8f4fb94b18120d17d51664579185b1a2`), with one worker, zero retries and `--fail-on-flaky-tests`.

### Current verification

- Collection sanity: PASS, 26 tests in one spec; saved fixtures validate during collection before browsers launch.
- Final complete targeted browser run: **26 passed, 0 failures, 0 errors, 0 skipped**, zero retries; Chromium 13/13 and WebKit 13/13. JUnit time `332.44447499999995` seconds; CLI 5.5m. Receipt: `artifacts/review02-workspace-return/junit-residual-run3.xml`, SHA-256 `7fefb92cc8660a071cb5b48bdf643b43a207dcef5aaf1c5931000668ebfc17cc`; outputs under `results-residual-run3/`. This single complete targeted run, not earlier supporting passes, is authoritative locally.
- Matrix: EN/RU, 390x900 and 1440x900, Chromium and WebKit. Create preserves dirty prompt, B, exact saved AOI/generated result/editor snapshot/area context and visible parameter return; Analyse preserves the entire held resolved snapshot; explicit failed-source Retry and new map selection each admit once. New AOI, failed-source quiet transitions, successful explicit area Retry and subsequent new AOI are tested separately. Compare's held insight remains covered.
- Negative oracles wait 800ms, beyond the existing 250ms Context and 600ms suggestion debounce. All prototype endpoints are intercepted; other HTTP/WebSocket destinations are blocked except the exact mocked empty basemap style. Browser tests make no real source or model-provider acquisition.
- `npm run lint -- --incremental false`: PASS on current page/spec/guard.
- `npm run test:point-to-object-trusted-identity`: PASS.
- `npm run test:point-to-object-projects`: PASS.
- `npm run test:point-to-object-source-deadline`: PASS after authorized assertion reconciliation; injected Auth/source operations only, no hosted query or enforcement change.
- `npm run test:data-honesty`: PASS, 486 files, zero findings; scan artifact SHA-256 remains `d0313cf62d6953f5a9860a9594fe041f698cb0d68a37aa1dcf98088bf2ffbdea`.
- Existing local server/fixture environment: Node 24.19.0, Next.js 15.5.25, React 19.2.7, Playwright 1.61.1, `http://127.0.0.1:3132`; reviewer dev_1. Generic agent-browser smoke rendered the homepage without the error overlay, captured `/private/tmp/review02-residual-smoke.png` and closed its isolated browser. It does not prove zero public-basemap reads.

### Retained current failures

| Receipt | Exact terminal classification | Correction |
| --- | --- | --- |
| `junit-residual-run1.xml` | tests=26, failures=1, skipped=19, errors=0; 6 passed, one interrupted; 198.133929s | Mobile new selection intentionally leaves Task at peek; explicitly open Task before asserting Retry. |
| `junit-residual-run2.xml` | tests=26, failures=0, skipped=15, errors=2; 9 passed; 369.713956s | Upload is intentionally absent while an AOI exists; remove the old AOI through the UI before uploading the new one. |
| Initial source-deadline run | FAIL at obsolete source-shape regex, line 437 | Root authorized the minimal client-assertion reconciliation; complete gate then PASS. |
| `junit-residual-run3.xml` | tests=26, failures=0, skipped=0, errors=0; 26 passed; 332.44447499999995s | Complete terminal matrix PASS, no focused substitution. |

No Product-code change was required by these two browser-harness preconditions. No timeout, expected request count, snapshot equality, visual tolerance or error oracle was weakened. All historical and current failures remain available. Initial task forecast/total elapsed are unknown; run-specific measured times are retained.

### Current limits and downstream boundary

- Root owns the full integrated build, CI, exact-head Preview and new independent test_1 acceptance. None is run or claimed here; the bounded package explicitly excludes broad CI/build/deploy and live paid/cloud work.
- The 26-case matrix is not the full application aggregate, real-map visual quality, hosted evidence or the exact founder-artifact acceptance. Original source receipt metadata remains frozen; translated fixture geometry in positive synthetic AOI cases is test-only and is not a new source observation.
- Playwright guided real user transitions and strict request oracles; Next.js guidance kept source admission in the existing client state boundary without adding server operations.
- Only the four assigned files and local verification artifacts are changed. No dependency/lockfile, shared test config/CI, route/source library, Auth enforcement, environment/secret, Supabase/Storage, Figma/Confluence or Production/main change; no push, deployment, paid call or outreach. Main coordination messages carry no secret or personal data.
- Exact caveat unchanged: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.” Local persistence/fixtures are not official/live evidence or protected custody; domain DD remains PARTIAL.
- Rollback: revert only the final residual corrective commit. No migration, browser-data deletion or hosted rollback is required. Handoff: main_1 for controlled integration, final full gates and independent acceptance.
- After the terminal 26/26 receipt, Root authorized a separate C2 Auto/Fixed correction in the same iteration. The server is retained only for that bounded follow-up; it must be stopped at final handoff. C2 code/test changes will be a separate commit and are not claimed by this residual receipt.

## C2 Auto/Fixed follow-up — 2026-10-03

### Authority and bounded outcome

- Explicit Root follow-up after the terminal residual receipt; same REVIEW02 iteration, not a new feature or design. Ownership: Create panel and minimum editor/preflight/browser tests, plus this existing engineering receipt.
- Exact clean commit parent: `61c1fa68f975a32893141d8fd221c68655b0e824`. Its residual 26/26 receipt remains separate historical exact-tree evidence, not a 40-test aggregate on the C2 tree.
- Fresh AOI, template and Reset defaults are Auto numeric starting points. A manual edit fixes only that control, plus a level endpoint when needed to keep the range consistent. Existing saved explicit locks are restored unchanged.
- A visible keyboard-accessible **Use Auto parameters / Вернуть параметры в Авто** action releases locks without changing the numeric seeds or previous generated result. Each control identifies **Auto / Fixed** or **Авто / Задано**. The bilingual brief distinguishes a draft from the last explicit generation.
- Only explicit Generate may replace geometry. Auto, parameter edits, template selection, A/B, locale and saved-result reopening do not generate or reacquire sources. Invalid coverage/open-space combinations remain blocked after Auto; Reset is an explicit correction. Worker-unavailable, deadlines, cancellation, solver budgets, negative preflight, locked intent and route/paid guards are unchanged.
- Auto is not a quality, capacity, planning-rights or provider-success guarantee. Adaptive paid generation and exact frozen source-context use still require Root's separately authorized evidence.
- Before commit, Root identified a legacy duplicate-start gap inherited from the earlier editor preservation change: a saved result with no original committed draft key could be misclassified as a changed draft immediately on Back/reopen. The added guard disables both the Generate action and handler until a real parameter/prompt/template/Auto/Reset choice. It explicitly labels the original inputs unavailable, invents no original prompt/locks/receipt, does not rewrite saved bytes, and does not replace strict key parity for known snapshots. A new fresh Auto draft without a result remains admissible. One synthetic historical compatibility journey runs in both engines, with EN/RU presentation changes inside the same journey; no wider matrix is added.

### Tested file manifest

| File | Role | SHA-256 |
| --- | --- | --- |
| `components/point-to-object/create-panel.tsx` | Auto defaults, explicit locks, visible release/status/brief, legacy admission guard | `1177fb3b16df8138c697cd50650d932d9fe26b1f6c7830c4d945e8658e9dab6b` |
| `scripts/point-to-object-create-preflight-check.ts` | Auto eligibility, legacy truth table and action/handler guard; negative gates retained | `d92fdaf54bbf07a6c0c82e475b1275e4e7b116fa51d8f0de1d040103e87c98a4` |
| `tests/e2e/point-to-object-create-reliability.spec.ts` | Eight C2 cells, two legacy compatibility cells, six existing journey cells | `81e65e9e29eefb44ba71a3956ce88461b9e62c16988f715afaf4060f61ae8568` |
| This receipt | Separate exact-tree evidence and limits | Bound by containing commit |

### Terminal local verification

Environment and reviewer remain Node 24.19.0 / Next.js 15.5.25 / React 19.2.7 / Playwright 1.61.1 / local loopback `127.0.0.1:3132` / dev_1 owner verification. The temporary untracked config `/private/tmp/review02-c2-local.config.ts` (SHA-256 `2a9c39e11ab4cd2c909859f7907080ba903b70bc6f0101baa5a9a1575e84b226`) imports the unchanged existing two-engine matrix and selects only C2 plus the three directly affected legacy journeys. Shared CI/configuration is not modified.

```sh
GEOAI_E2E_BASE_URL=http://127.0.0.1:3132 \
PLAYWRIGHT_JUNIT_OUTPUT_FILE=artifacts/review02-c2/junit-run5-legacy.xml \
./node_modules/.bin/playwright test \
  --config=/private/tmp/review02-c2-local.config.ts \
  --workers=1 --fail-on-flaky-tests --reporter=line,junit \
  --output=artifacts/review02-c2/results-run5-legacy
```

- Pre-legacy bounded matrix **14/14 PASS**: Chromium 7/7 and WebKit 7/7, failures=0, errors=0, skipped=0, zero retries. JUnit total `571.116736s`, CLI 9.5m; SHA-256 `17ebe2983e10afe555ec7f14577114b9beb80be79f146f724a972fe8e8d7ab11`. This receipt predates the additional guard and is not final exact-tree evidence.
- Final complete bounded matrix **16/16 PASS** on the current manifest bytes: Chromium 8/8 and WebKit 8/8; failures=0, errors=0, skipped=0, zero retries, one worker and `--fail-on-flaky-tests`. JUnit `junit-run5-legacy.xml`, total `525.5700610000001s`, CLI 8.8m; SHA-256 `17d09c2904e64804f6063de125e191605390a3ba7327260934cd8c7b5771aa5c`. The original 14 cases and two legacy cells ran together; no focused-pass substitution or combined-with-residual aggregate claim.
- New journeys cover EN/RU at 390x900 and 1440x900 in both engines, initial/template Auto, partial manual locks including the dependent levels pair, keyboard Auto release, full manual locks, three distinct saved operations, actual `/projects` UI reopening, preserved saved editor/geometry/generated payload, invalid-input blocking, explicit Reset, A/B and locale continuity. There are exactly three mocked GET challenges and three mocked Create POSTs per new journey, all from explicit Generate; quiet oracles wait 800ms. No lock/project/session state is injected.
- The local app's real demo identity writes owner-scoped Saved Projects. Tests read those UI-written payloads and reopen through the visible Hub action; they do not incorrectly claim anonymous guest persistence. The new persistence fixtures use the actual deterministic geometry producer, not the legacy display-only metric fixture. External HTTP is intercepted/blocked; no paid call, provider/source acquisition or hosted write is made by the tests.
- Existing draft/committed-geometry separation, explicit coverage proposal and unavailable-worker preservation/retry journeys passed in both engines. Numeric assertions, geometry equality, source request counts, timeouts and visual overflow limit were not relaxed.
- The synthetic legacy case starts from a schema/hash-validated saved artifact with `editorSnapshot:null`, reopens through the Hub UI and returns Back to parameters. Both engines verify Generate disabled, no false changed-draft label, A/B and EN/RU keep the guard, exact saved AOI/generated/absent-editor preservation, and zero prototype requests. Explicit keyboard Auto then enables the new draft without generation or saved-byte mutation. This compatibility fixture is not independent acceptance of the founder's actual historical artifact.
- `npm run lint -- --incremental false`, full `test:point-to-object-create`, `test:point-to-object-projects`, `test:point-to-object-source-deadline`, `test:point-to-object-trusted-identity`, `test:data-honesty` and `test:secret-hygiene`: PASS. Data-honesty: 486 files, 0 findings, scan hash `d0313cf62d6953f5a9860a9594fe041f698cb0d68a37aa1dcf98088bf2ffbdea`; secret hygiene: 1,441 tracked paths, no secret values output. Diff checks PASS.
- Endpoint navigation `/prototype/point-to-object` and `/projects` passed in the final mocked local browser journeys. Screenshots remain in run4 and `results-run5-legacy`. Inspection of the pre-legacy RU390 and EN1440 end states is supporting observation only, not golden visual comparison, real AI quality or fresh hosted-map evidence. After the guard, agent-browser verified the restarted homepage has content, expected interactive elements and no framework error overlay; `/private/tmp/review02-c2-legacy-server-smoke.png` is retained and that isolated browser closed before the matrix. This generic smoke does not prove zero public-basemap reads.

### Retained failures / differentiated diagnosis

| Attempt | Exact JUnit terminal receipt | Classification |
| --- | --- | --- |
| `junit-run1.xml` | 14 tests, 0 failures, 0 errors, 14 skipped; 24.051316000000003s | Interrupted after lint detected a removed enum import still needed by unchanged template comparison. Import restored; lint then PASS. |
| `junit-run2.xml` | 14 tests, 0 failures, 3 errors, 8 skipped; 200.993297s | New harness incorrectly sought a guest session in a demo-owner environment. Legacy three journeys passed; incomplete, not accepted. |
| `junit-run3.xml` | 14 tests, 0 failures, 6 errors, 3 skipped; 873.329627s | Same wrong guest oracle after a geometry-fixture correction, plus WebKit loopback navigation/transport timeouts. No Product or Auth bypass applied; not PASS. |
| `junit-diagnosed-demo-owner.xml` | 1 test, 0 failures, 1 error, 0 skipped; 147.001124s | Read-only Auth/state diagnosis replaced the wrong guest assumption. Save and Hub reopen progressed, but the harness tried to operate the underlying Task while the real result dialog was open. Corrected by the visible Back to parameters action, not force-click or timeout extension. |
| `junit-run4.xml` | 14 tests, 0 failures, 0 errors, 0 skipped; 571.116736s | Complete pre-legacy targeted matrix PASS; superseded for final-tree acceptance by the new 16-case run. |
| `junit-run5-legacy.xml` | 16 tests, 0 failures, 0 errors, 0 skipped; 525.5700610000001s | Complete final exact-manifest C2 matrix PASS, including the additional legacy guard. |

All attempts and failure traces remain retained. Initial forecast and total historical elapsed remain unknown; measured run-specific times above are not hidden. Repeated precondition errors were diagnosed differently rather than labeled flaky or fixed by weakening gates.

### Handoff, rollback and evidence boundary

- Root integrates residual commit `61c1fa68f975a32893141d8fd221c68655b0e824` and this separate C2 commit only; synchronization commits are not duplicate work to integrate. Root owns the full final build/CI, exact-head hosted Preview, independent QA and frozen area-context parity. Test selection reports `fullCiRequired:true`; the targeted receipts do not close that gate.
- The worker does not run or claim a fresh whole-application build, hosted acceptance, adaptive-provider quality, rights/capacity, or Source Area binding. Root must stop paid proof if the exact frozen `areaContextUsed` receipt is null/mismatched. The earlier 81-route Root build is not current C2 evidence.
- React/Next.js guidance keeps Auto in an existing client event handler, without network effects or a storage-schema migration. Playwright verifies actual UI actions, restored explicit locks and strict no-request behavior.
- Only the four files in this C2 manifest and local ignored verification artifacts change. No new dependency/lockfile, source/route/worker, Auth enforcement, environment/secret, rate/paid settings, shared CI, hosted Supabase/Storage, Figma/Confluence, main/Production, push or deployment mutation. Commercial interviews/WTP/proposals/paid pilots and outreach in this package: 0.
- Mandatory caveat unchanged: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.” Browser-local saving is on this device; fixtures and generated scenarios are not official evidence or cloud custody. Domain DD remains PARTIAL.
- Rollback is a revert of this C2 corrective commit, keeping the residual source-preservation commit and all original browser saved bytes. No data deletion, migration, hosted/Auth/env rollback is necessary. Own loopback server is stopped at final handoff; no browser runner remains active.

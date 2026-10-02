# REVIEW02 — Workspace return and context admission correction

Status: Residual targeted verification PASS; integration, full CI and hosted acceptance pending
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

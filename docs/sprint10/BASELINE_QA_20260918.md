# Sprint10 baseline evidence — 18 September 2026

Status: LOCAL BASELINE ONLY; not candidate acceptance, Preview or Production verification.

Base SHA: `21b91c43c2fc8dd61b08962e562601b29dd89c76`.
Checkout: `/private/tmp/geoai-four-sprints-20260918`.
Runtime: Node 24.19.0, pinned npm lockfile. No API credentials loaded into this baseline server; no paid-provider calls.

## Executed

| Check | Result | Boundary |
| --- | --- | --- |
| npm ci | PASS | Locked dependencies, not an independent dependency/security audit |
| lint | PASS | Static checks |
| production build/types | PASS after network-enabled retry | Initial font download DNS failure was environmental; 80 static pages generated |
| point-to-object runtime gate | PASS | Offline policy/routes/recovery/middleware contracts, including historical budget helper only |
| map replacement checks | PASS | Deterministic geometry/partition/cycle tests, not physical-device/map-provider coverage |
| API route inventory | PASS | Static 76-route inventory, not live authorization acceptance |
| data-honesty scan | PASS | 437-file rule scan, not factual certification |
| sprint06-security-compat Chrome | 4/4 PASS | Landing EN/RU 390/430/1440 and mobile mode buttons; scripted fixture checks |
| Eight-suite Chrome baseline | 52/56 PASS | Local browser fixture coverage; four failures below |

The baseline server ran at `http://127.0.0.1:3100` with the released default `demo_public` auth mode. Baseline is not the new authenticated candidate.

## Four failing browser cases

1. `point-to-object-geocontext-v6.spec.ts:544`: fresh-guest identity expected null but received browser-local `demo:demo-user-geoai`.
2. `point-to-object-geocontext-v6.spec.ts:862`: optional Supabase subscription failure expected login screen; default demo mode navigated to workspace.
3. `point-to-object-v5-offline-flow.spec.ts:1244`: true-guest Create restoration case failed.
4. `sprint07-ux.spec.ts:404`: resolving-account Find case expected preparation status but received blank status.

Auth owner classified all four as auth-mode/persona drift: default demo mode resolves synchronously, creates a browser-local demo identity, does not fetch the mocked session endpoint, and does not load the Supabase subscription chunk. The latter three tests depend on behavior absent in that mode. This is a code-based diagnosis, not a re-run under the corrected environment and not evidence of hosted authority or a protected identity leak. Do not discard these failures, weaken anonymous assertions or call the full baseline green. Run the intended persona under a correct isolated environment and retain both demo and anonymous/authenticated coverage. Protected-route guest denial supersedes old tests expecting unauthenticated product rendering; move any still-needed loading-state check to a component/provider fixture.

Trace/screenshot artifacts: `artifacts/sprint10-baseline-full/`. Landing artifacts: `artifacts/sprint10-baseline-chrome/`. Control viewed the full-page EN 1440px and RU 390px landing captures for overall layout: ordered sections, bounded hero map and no obvious collapsed/overlapping block in those captures. The tall mobile image was downscaled by the viewer, so detailed text/touch-target acceptance is not established by this glance. Independent candidate regression remains separate.

## Next gate

Compare integrated changes against this baseline. Run new analysis transitions, authenticated UI/direct API/persona cases and complete customer journeys. Paid-provider, hosted DB/RLS, restore, Preview and physical iPhone checks remain unexecuted by this receipt.

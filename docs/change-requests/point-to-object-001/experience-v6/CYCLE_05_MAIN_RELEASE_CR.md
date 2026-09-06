# Cycle 05 — Controlled Main Release

Date: 2026-09-06
Status: Implementing; not yet released

Update: accepted DEV and landing corrections are integrated for protected Preview verification. After disclosure that the public site allows anonymous visitors to invoke paid AI/Create using the existing server key, and that process-local limits do not guarantee a global monetary ceiling, the founder explicitly answered yes to public Production AI/Create activation. Production activation of the named context/search/suggest/find/area-context source endpoints remains under a separate pending approval card; do not activate them until that response is received. Preview authentication remains unchanged; no new credential or paid service is included. The founder separately authorized a temporary Vercel access link for automated protected-Preview verification, without publication of that link or any change to Production access.

## Authority and purpose

The founder explicitly requested the current product to be published to Preview, tested with real requests and generations, then promoted to main as the primary product branch. The founder confirmed reuse of the existing OpenAI credential. This supersedes earlier no-main/no-Production instructions for this bounded release only. No new OpenAI key, paid subscription, unrelated authentication change, hosted database migration, or source integration is authorized by this change.

## Problem and business outcome

Deliver the accepted map-first Analyse / Find / Create experience, reliable device-local projects, and the new bilingual landing page as the main product. A successful build alone is not acceptance: real geocontext, OpenAI analysis, Create geometry, restore, and Production routes must work.

## Scope and inputs

- Candidate baseline: 032b9d88a0511a15f5e8f91a5a526eed36670dfa, branch codex/point-to-object-clickable-prototype-v1, PR 147.
- Accepted DEV-05 commits, in order: 5a41abc843abab5879c800a6422b34e285baa359, adf63764f6604b17e71d1c5e56e042ac6cba1559, cfc06d756c521e5c139810cac7c7140913730363, 0002f0c4ea230a1f370132a3045d5b5778571e3c, 3d7540f44e2f338c1965027aa7f3109e5775335e.
- Landing candidate: 2c4ac288b789cf5aa005e48bcc814eca24f711c3, conditional on correcting the data-honesty contract and small touch targets.
- Runtime: introduce explicit point-to-object Production surface and AI gates. Preserve Preview behavior, existing server-only key, request validation, challenge/origin checks, rate controls and cost bounds. Do not activate unrelated legacy upstream paths or hosted persistence.
- Preserve the current map replacement status, zoom-required behavior, boundary containment and restore fixes during DEV integration.
- Real-source acceptance found a semantic defect: generic/unknown OSM amenities can be counted as civic/cultural uses. Correct this conservative classification in point and area context, with regression fixtures, before accepting the resulting geographic narrative. Do not tune rules to force a desired city result.
- Classifier correction integrated as `ef2f485` from source commit `fc54b8a459feffca28a9272c612a6a30ab74a9ab`; explicit amenity/accommodation classification replaces generic fallbacks. Unknown amenities and parking cannot create civic, major-road or public-transport signals. Synthetic point/AOI parity coverage is part of the existing geocontext CI check; saved-result bytes and district thresholds are unchanged. Live acceptance is still required.

## Users, screens and contracts

Public visitors: bilingual landing and primary workspace entry. Prototype users: Analyse, Find, Create, profile and projects. Project persistence remains device-local; cloud persistence is not claimed. All route, locale, selection, generated geometry and immutable saved-result contracts remain in force.

## Exclusions

Wikimapia integration and Maxis-inspired design exploration are separate unaccepted tracks. No commercial rights claim, official cadastral/planning validation, cloud project storage, new Supabase/Auth configuration or expansion of the source catalogue is part of this release.

## Risks and safeguards

- Production was hard-disabled in several point-to-object routes. Centralize a narrowly scoped explicit Production policy; default remains closed without its flags.
- Existing process-local limits are not a deployment-wide billing cap. Inspect available platform controls without enabling a paid plan or overwriting existing firewall state. Report any remaining exposure accurately.
- Keep exact rollback tuples, preserve user work, and never treat mocked tests as proof of a live provider call.

## Acceptance and release sequence

1. Integrate only accepted commits and the bounded landing/runtime corrections. Resolve overlapping parent UI changes deliberately.
2. Pass lint, relevant source/access/project/Create contracts, production build and bounded browser regression checks. Verify responsive EN/RU landing and workspace layout.
3. Push the candidate; verify exact-head CI and a Ready Preview deployment.
4. On that Preview, perform real geocontext, OpenAI analysis and Create requests. Check response identity, useful result, valid visible geometry, hide/restore behavior and saved-project reopening without another billable request.
5. Only after these checks, merge the tested candidate into main and follow the Production deployment. Repeat real-route smoke and essential live flows; rollback on a critical regression.
6. Record actual commit, deployment, evidence, models/cost telemetry if available, known limitations and documentation updates.

## Rollback points

- Pre-release main: 7f323c4227f2409f3fe2d4d68be48a30176f4e2a.
- Production: dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE, https://geoai-mvp.vercel.app.
- Accepted pre-integration Preview: dpl_3gGjnY4X8CrvTr63HD5rqD3yj8X3, https://geoai-r8yam0wqu-geoaidev.vercel.app.

Main owns integration, hosted configuration, publication and final release acceptance. Implementation lanes produce local commits and focused evidence only.

## Completed integrated checks before the runtime increment

- DEV and landing integration: build passed, 79 routes; TypeScript passed.
- Browser: 15/15 tests passed, one worker, zero retries (2.4 minutes); includes real MapLibre containment rendering with controlled data, compact drawer breakpoints, Find comparison, saved Analyse locale restoration, Create A/B and zero-call local actions.
- Source/access/credential/honesty/Find/geocontext/project/Create contracts passed. Two static test assertions were updated for the approved landing entry and the stronger immutable Find shortlist validation.
- A geometry timing check was initially run concurrently with other CPU-heavy checks and exceeded its 2.5-second ceiling. An isolated repeat passed at 2,375.4 ms for the 24-vertex concave case. Preserve the performance guard; do not increase its threshold to hide load sensitivity.
- Authenticated Preview API readiness returned ready using the existing Vercel access. A real Dubai source response resolved Shangri-La, way/125848292, 246 nearby mapped objects and a coordinate-bound Wikidata entity Q3751975. This is evidence for that source response only, not final release acceptance.
- Vercel firewall inspection found no custom active/draft rules. No firewall change or paid plan activation was made. Existing in-process quotas are not distributed or a hard billing cap.

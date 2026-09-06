# Cycle 05 — Controlled Main Release

Date: 2026-09-06
Status: Implementing; not yet released

Update: accepted DEV and landing corrections are integrated for protected Preview verification. After disclosure that the public site allows anonymous visitors to invoke paid AI/Create using the existing server key, and that process-local limits do not guarantee a global monetary ceiling, the founder explicitly answered yes to public Production AI/Create activation. In a separate approval card, the founder also explicitly approved public address search/suggestions, Find, and point/polygon geocontext through the existing public-source integrations: "Разрешаю поиск и геоконтекст в Production". This completes the named context/search/suggest/find/area-context scope approval. Activation still requires final technical acceptance. Preview authentication remains unchanged; no new credential or paid service is included. The founder separately authorized a temporary Vercel access link for automated protected-Preview verification, without publication of that link or any change to Production access.

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

## Protected Preview live probe and follow-up

- Candidate `af46254ff8a3b52d5913691085bf6fbaceae133c` was pushed to the existing PR 147 branch and became Ready Preview `dpl_6WyxFQ4pEAB7JZLBavacF3Rxn3Ra` at `https://geoai-g427r1yy9-geoaidev.vercel.app`. This tuple is evidence for that candidate only, not a successor or Production release.
- Real Dubai EN and Singapore RU context/AI calls returned HTTP 200 with matching OSM identity. Dubai Shangri-La returned 223 classified nearby objects; the corrected civic count was 1 and the transparent district rule returned commercial/business context. Singapore selected Garden Bay Bridge, a mapped footway/LineString, with 178 classified nearby objects; do not describe this test as building identification.
- Both initial analyses used `gpt-5.6-terra` / `medium`, one actual provider attempt each. A real Create request used `gpt-5.6-sol` / `medium`, one attempt, and returned two distinct five-block alternatives. Canonical geometry validation accepted both: 6–12 levels, 28% coverage, containment and setback. Both alternatives in this probe used rectangular footprints; complex-footprint quality is not established by this request.
- Summed API telemetry estimate for these three operations: USD 0.0354893, not an invoice or global spending ceiling. Browser-rendered saved-result acceptance remains separate.
- An earlier local source check resolved the object and Wikidata but returned unavailable Overpass context. The deployed probe subsequently obtained observed context. This confirms an external availability limitation, not complete or guaranteed coverage.
- CI `34043253939` failed at obsolete old-landing assertions; its database job passed. The narrow follow-up updates only landing composition/CTA expectations in existing tests and retains independent Auth, protected-route and public-request no-transmit/no-storage checks. A complete successor CI run is required.
- Independent AI/Create runtime support is integrated locally as `4b8253f` from source `d1ea1d5244199a2ec307e6c3cf5f05a0857b528b`. Both Production flags and the existing server key are required; no hosted flag has been set. Create additionally enforces 20 attempts per ten minutes within one warm process, not across all deployments or instances.
- Following the resolved source approval, `c546f03` integrates source commit `bf6318f0d1d00cd94188cc7e48910fb55ea16599`: only context/search/suggest/find/area-context gain the explicit Production surface gate. Offline actual-route and middleware checks preserve default denial, same-origin rules, input bounds and quotas; source-only requests do not require an OpenAI key. Auth, database and unrelated endpoints are unchanged.

## Real-browser Create defect and correction

- The protected Preview browser probe received HTTP 200 for a real Create request but displayed a generation failure. Therefore the earlier API/geometry receipt is not evidence of successful visible generation or persistence.
- Root cause: the result parser capped the deterministic massing seed at 256 characters, whereas the real producer emitted 389-character seeds. This rejected otherwise valid results before rendering and saving. The additional real browser call incurred provider usage, but its response telemetry was not retained; the three-operation USD 0.0354893 subtotal above excludes it.
- The correction accepts bounded seeds up to 1,024 characters while retaining geometry, programme, telemetry and identity validation. The saved real Preview response now parses; a regression using the actual producer confirms parse → device-local save → integrity-verified reopen with exact seed preservation. Empty or over-limit primary/alternative seeds remain rejected. No seed algorithm or generated layout changed.
- Root-landing browser expectations were also aligned with the approved bilingual landing and real map/Projects links; independent Auth, protected routes and public-request no-transmit checks remain. Final exact-candidate CI and real browser rendering/save/reopen acceptance are still required.

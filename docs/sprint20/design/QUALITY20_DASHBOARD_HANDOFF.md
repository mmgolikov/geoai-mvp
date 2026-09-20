# QUALITY20 — Scenario dashboard handoff

Version: 1.0 · 2026-09-20 · Owner: design_1 · Integrator: control
Status: Candidate / Not Released. Local fixture evidence is not live source or commercial acceptance.
Base: `1dab55817e1664870ace88278aaed8f7558ece83`.
Branch: `codex/quality20-dashboard`.

## Delivered scope

The typed goal/depth registry selects the layout from the **completed analysis receipt**, never draft controls. Four existing goals have distinct ordered modules. Quick shows one leading module, Standard six (custom question four), and Deep adds returned challenge/alternatives. The original outcome stays above the dashboard. Previous-result, cancellation, retry, identity and saved-request logic is unchanged.

| Completed goal | Leading module | Standard modules |
| --- | --- | --- |
| Object profile | Surrounding uses | Surroundings, district, access, buildings, coverage, validation |
| Development screening | Surrounding uses | Surroundings, buildings, access, risks, coverage, validation |
| Redevelopment | Alternatives to validate | Alternatives, buildings, surroundings, risks, coverage, validation |
| Due diligence | Known & missing evidence | Coverage, risks, validation, surroundings, access, buildings |

`PointObjectDecisionCards` accepts context, generatedAt, reportPerspective, places, groupLabels, districtLabels, **request** and **content**. The last two are the validated completed receipt and returned content. Result identity keys reset local category state when a new result replaces the old one. No API schema, route, Auth, session, persistence or paid-request path is added.

## Data-to-UI contract

| UI | Input / grain | Meaning and limits |
| --- | --- | --- |
| Returned features | geoContext.sampleSize | Count of returned OSM features in the 400 m sample; not complete coverage |
| Category bars | groups count / sharePct | Count and share of **all returned features**, not the displayed subset, land area or population |
| Category detail | selected group | Count, sample share, nearest straight-line distance; no route or geometry supplied |
| Buildings | mappedBuildingCount | Returned sample buildings, not the selected building's dimensions |
| Median levels | medianMappedLevels + known count | Shown only with known levels; denominator is visible |
| Access | nearestTransitM / nearestMajorRoadM | Metres straight-line; not travel time, quality or capacity |
| District | districtCharacter | Returned rule-derived type and low/medium confidence; not an official class |
| Risks / validation | risks / nextValidation | Returned claims with evidence refs, source and next action |
| Alternatives / challenge | matching depthReview | Screening hypotheses from the same snapshot; not A/B geometry or economic outcomes |
| Freshness | generatedAt | Report-generation time only; source-update date remains explicitly unknown |

Invalid or inconsistent category percentages are withheld, not repaired or re-normalised. One-decimal rounding tolerance is 0.11 percentage points. A real zero-distance observation remains zero; missing distance is an em dash. Unavailable context does not become zero buildings/features. Reached sample cap is explicitly partial. Empty categories do not establish absence. No prices, returns, zoning permission, title or valuation are inferred.

The existing analysis surface retains the exact caveat:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Interaction, responsive and visual contract

- Category buttons select/deselect one aggregate and open its local drilldown. Enter/Space use native button behaviour. `aria-pressed`, a named detail region and a polite announcement expose state.
- More than six categories can be expanded; the accessible table contains every returned category and the method. Local disclosure/filtering performs no AI POST.
- Aggregate data does not provide object geometry: map-layer highlighting is **not implemented**, rather than simulated. Control accepted this as a data-contract limitation.
- Wide surrounding-use / challenge / validation modules; compact three-KPI row. Two columns above 600 px, one below. Category labels wrap; table scrolling is local.
- White large surfaces; accent `#087f8c`, light `#e5fafa`, pale `#f4fbfb`. Geist is explicitly bound through the existing `--font-geist` variable inside the dashboard only. No global style or shared token changed.
- Category targets are at least 48 px; local actions/disclosures at least 44 px. Focus has an explicit 2 px outline with 3 px offset. The measured accent/white contrast is 4.746:1; accent/pale is 4.529:1. Bars against their track are 3.926:1. Text on selected aqua uses dark ink, not the accent (accent/aqua is only 4.381:1).
- EN/RU labels live only in the two owned renderer/registry files; no central translation file changed. Existing generated report content remains in its saved language when the UI language changes. Translation is not silently regenerated.

## Figma registry and parity limit

File: `TAzDqOvRCw1mQGMU3Y4S9H`.
[QH-05 Candidate contract](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H?node-id=2380-147), on page `2362:11`.

| Node | Purpose |
| --- | --- |
| 2380:147 | QUALITY20 Candidate wrapper |
| 2380:148 | Authority / baseline / owner |
| 2380:153 | Completed Quick / Standard / Deep composition |
| 2380:158 | Four goal priorities |
| 2380:163 | Interactive surrounding-use contract |
| 2380:168 | Missing / partial / error / responsive contract |

Each card is an instance of existing main component `2029:43`. Its text descendants use `I<instance-id>;2029:44` through `;2029:47`. These are the complete created root/instance/text IDs of the contract. The wrapper and instance heights were adjusted to prevent contract-text clipping. No new main components, styles or variables were created. No changes to old Hub `1975:11`, DS `1976:11`, handoff `1976:17`, or Maxis concept `2317:12`.

Live read-back confirms Candidate, not Released, and the completed-request ownership contract. `figma-contract-verified.png` records the verified contract. A later request to add eight rendered-evidence frames was rejected by permission review before execution, citing the separate DESIGN-05 concept-only boundary. No nodes were returned/created by that call; no retry or alternate write path was used. Control was notified for an explicit QUALITY20-only authorization. **Visual Figma upload / full editable screen parity remains blocked, not PASS.** The local renderer screenshots remain the precise visual evidence.

## Verification and reproducibility

Environment: local worktree, Next.js 15.5.25, Node 20.19.6, Chrome through Playwright. Node 25.5.0 runs the existing strip-types contract script. No live AI/source execution.

Commands:

```sh
npm run lint
npm run build
/opt/homebrew/opt/node/bin/node --experimental-strip-types scripts/point-to-object-dashboard-contract-check.ts
GEOAI_E2E_BASE_URL=http://127.0.0.1:3210 node_modules/.bin/playwright test tests/e2e/quality20-dashboard.spec.ts tests/e2e/sprint10-analysis-state.spec.ts tests/e2e/sprint10-analysis-provenance.spec.ts --reporter=line
```

The new test checks exact aggregate arithmetic/immutability, four goals × three depths, draft/completed distinction, keyboard selection, local disclosure/no extra POST, missing/partial states, EN/RU at 390/834/1440, no page/dashboard overflow, Geist and target sizes. Existing state/provenance suites cover 429, malformed response, retry, timeout, cancel, late response, role/scenario drift and saved reopen without another request.

Earlier failures retained in the work session: sandbox Chrome launch denial; malformed fixture receipt caused by extra request keys; incorrect uppercase RU selector; inherited system font. These were corrected without weakening runtime validation. Final optimized result is recorded in the completion receipt. Build emits the existing Node <=20 Supabase deprecation warning; no dependency change is in this scope.

Final local outcome: lint PASS; optimized build PASS; existing dashboard contract PASS; Chrome **25/25 PASS in 20.0 seconds**, including keyboard selection. Screenshots were refreshed from the optimized build, without the development indicator. Reviewer: design_1 self-review; not independent acceptance. WebKit remains integration-owned and unclaimed here.

Screenshots: `dashboard-{en,ru}-{390,834,1440}.png`, matching `surroundings-*`, plus `dashboard-unavailable.png` and `dashboard-partial.png`. All are synthetic fixture renderings, not verified live OSM observations. The displayed fixture feature counts sum to 20, shares to 100%; no external source licence/coverage/right is established by these images.

## Remaining acceptance / handoff to control

1. Integrate this exact bounded commit, then run integrated Chrome/WebKit against the existing fixed TLS3443 optimized harness. Do not filter page errors or weaken CSP. The root owns that listener; this worker does not replace it.
2. Perform assigned real-site/AI acceptance and paid-ledger checks. This worker made zero paid/live AI calls.
3. Resolve the explicit Figma permission boundary before adding visual evidence. Keep Candidate until root supplies release evidence.
4. Use root-owned Confluence Current Product `26574901` v17 and Hub `98425` v261 (versions reported by control, not independently published by this worker). Do not equate documentation read-back with runtime release.

Rollback: omit/revert the bounded commit; no data migration or hosted mutation occurred. Work remains additive to the exact assigned base. Production/main changed: false. External outreach: false. Secrets/personal data accessed: false. Domain DD: PARTIAL (live acceptance, integrated WebKit and Figma visual parity outstanding).

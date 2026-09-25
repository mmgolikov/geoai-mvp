# COMPLETE25 scenario dashboard slice

Date: 2026-09-25. Status: local candidate; integration and exact Preview acceptance remain with Control.

## Change request and scope

The founder requested completion of useful scenario/question/depth-specific dashboards and full journeys. This bounded slice changes the existing React Analyse product, with no artifact publication, new provider, AI call, authentication, cloud write or source-contract change. Base: `487c635`. Owner: COMPLETE25 dashboard worker; Control integrates and owns deployment.

The existing dashboard had a category chart and goal-specific module order, but every goal displayed the same three hero measures. This slice chooses measures from the completed request, puts building evidence first for development, prioritizes everyday categories for B2C, and adds local evidence-class inspection and an ordered validation plan.

## Source and metric model

All input is the already parsed completed `PointObjectAiResponse`: `request`, `content.geoContext`, `content.depthReview`, `content.nextValidation` and `content.answerToQuestion`. Draft form state is excluded. The existing analysis component keys the dashboard by evidence-pack ID plus result time, resetting local selections when a different result completes. Reload uses the existing saved report; local drilldowns make no requests.

| Completed goal | Hero measures | Leading module |
| --- | --- | --- |
| Object profile | Returned features, buildings, nearest returned transit; B2C features + transit | Category mix |
| Development screening | Buildings, nearest major road, nearest transit | Building sample |
| Redevelopment | Buildings, median mapped levels, buildings with level data | Alternative hypotheses |
| Due diligence | Buildings with level data, returned features | Known/missing evidence and typed checks |
| Custom | Returned features | Saved question answer, its support status and missing evidence |

These are neighbourhood sample measures, not selected-asset dimensions. Distances are straight-line metres, not journeys. Counts/shares do not describe land area, population, demand or valuation. Known/total levels are source coverage for that sample, not a confidence or quality score. Missing values remain null; genuine zero distance remains zero. Invalid counts/coverage and inconsistent/overlapping group totals cannot produce plausible percentage bars.

Quick exposes one lead module, Standard the existing decision modules, and Deep adds the existing uncertainty/trigger and alternative review. All three remain the completed receipt's depth. An unsent draft cannot change the layout or measures. Evidence-class filters operate on matching-depth analytic checks (or saved signals for legacy results), preserving source labels rather than relabelling hypotheses as observed facts.

## Visual contract

The delivery surface is the existing React product. Existing native HTML/CSS category bars remain; no plotting library or separate dashboard runtime is added.

| Visual | Question / encoding | Bounds and fallback |
| --- | --- | --- |
| Category bars | Which mapped functions were returned? Horizontal bars encode share of the complete returned sample; labels show exact counts and nearest distance in drilldown | Zero-to-100 scale; no subset renormalization; all categories available. B2C changes category order, not numbers. Unavailable/invalid shares display a dash |
| Level coverage meter | How many sampled buildings have level data? Known versus total building count | Zero-to-total; exact known and unknown counts labelled. No meter when denominator absent/zero or counts inconsistent |
| Evidence checks | Which checks rely on source observations, derivations or hypotheses? Local filter with explicit type and expandable implication/evidence | Native buttons with pressed state, keyboard focus and live result region; no ratings |
| Validation steps | What should be checked next, where and why? Ordered list, critical/high/medium priority from saved result | Stable order within equal priority; first action and detailed sequence agree; no implied completion tracking |

Palette: `#087F8C`, `#E5FAFA`, `#F4FBFB`, plus neutral text/borders. Labels and pressed states remain meaningful without colour. Same-unit sparse proximity measures stay as exact KPIs rather than adding an underpowered chart. Existing basemaps and original stored evidence remain intact.

## Verification

Dedicated regression: `tests/e2e/complete25-dashboard.spec.ts`; synthetic fixtures are explicitly not real-provider acceptance. Coverage includes all five goals × three depths, draft/result separation, category denominator/total checks, zero/null/invalid values, keyboard evidence filtering, zero additional AI requests for drilldowns and reload, EN/RU at 390/834/1440, and local screenshots.

Existing dashboard matrix: `tests/e2e/quality20-dashboard.spec.ts`. Control owns final integrated build, broader scenario matrix, and exact-candidate live verification. This slice does not assert overall MVP acceptance or elimination of source gaps.

Local Node 24 validation: TypeScript/lint and the existing dashboard contract passed. Combined new/existing Chrome dashboard suite passed 18/18. Screenshot inspection of EN desktop and RU mobile caught an empty half-row; deterministic packing now preserves DOM order without leaving an isolated half-row. A single returned alternative spans its container. Evidence-class details open by default for due diligence/custom and remain one local disclosure for other goals. The custom answer is rendered once, retaining support status, confidence, horizon and missing evidence.

Final candidate screenshots are retained locally under `output/playwright/complete25-dashboard-final/`: five Standard goal views and EN/RU at all three widths. These contain labelled synthetic fixture text and developer-mode chrome; they prove layout/interaction, not provider semantics. Browser geometry checks assert no horizontal page/dashboard overflow and 44px evidence-filter targets. The final focused suite is the integration handoff gate; full build is deliberately delegated to Control's single integrated build.

Integration note: `point-to-object-geocontext-v6.spec.ts` contains a literal Standard development module-order expectation. Control must change it from `surroundings, buildings, access, risks, coverage, validation` to `buildings, access, surroundings, risks, coverage, validation`; shared tests are outside this worker's ownership. Module counts and draft/completed binding remain unchanged.

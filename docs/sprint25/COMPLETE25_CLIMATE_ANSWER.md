# COMPLETE25 — scoped regional climate answers

## Change request and reproduced defect

Base `db3bca2` includes NASA snapshot acquisition. A valid January T2M value of 20.48 °C reached model projection, but focused prose citing NASA plus object evidence failed `focused_answer_novel_number`; NASA-only evidence failed `focused_answer_ref_outside_scope`. The former could recover to unrelated object prose; the latter could enter paid repair. No paid reproduction was needed.

`node scripts/complete25-climate-answer-check.mjs --repro` loads the exact base core from Git into memory and demonstrates both failures. It does not modify the checkout or call a provider.

## Minimal contract

- New `regional_climate` focused scope. The raw model statement is a strict selector `{ metric: T2M | T2M_MAX | RH2M, month: 1..12 | null }`, **not prose or numeric values**. Null month means all twelve source months.
- A narrow EN/RU source-value question parser determines the allowed selector before the model call. The JSON schema fixes the metric/month, scope, low confidence, answered status and sole NASA reference. The server independently repeats those checks after the response.
- The unique NASA evidence receipt, normalized climate and requested coordinates must already pass the existing model-projection binding. Unavailable, absent, duplicated or mismatched evidence cannot produce a climate answer.
- Only the server reads and renders the frozen temperature/humidity field, month label, sign and unit. The answer names NASA, source year, regional MERRA-2 and 2 m air; it expressly disclaims site measurement, forecast, absolute extreme and thermal comfort.
- General numerical admission is unchanged. Other focused scopes cannot cite NASA. No response-hash digits, acquisition timestamps or unrelated numbers become allowed climate values.
- Raw selectors never enter the saved/result contract. The completed response remains a rendered string plus the new scope; the existing strict saved parser rejects an object statement. Historical scopes and absent climate remain valid.
- A separate `REGIONAL_CLIMATE_ANSWER_V1` policy marker identifies this extension in the model input. Existing result-schema and legacy prompt-version compatibility are retained; the candidate SHA and frozen evidence still bind acceptance.

## Intentionally bounded language support

Supported examples: `What is the regional monthly air temperature in January?`, `RH2M 2025`, `Температура воздуха в январе`, `Максимальная температура в июле` (source T2M_MAX metric, not an absolute extreme).

Only the frozen year is accepted if a year is explicit. Mixed metrics/months, unknown words, other years, conversions, forecasts, surface/site measurements, comfort, comparisons and absolute extremes do not enter this typed lane. This is not a general natural-language climate reasoning engine. Unrecognized questions retain existing non-climate answer handling; no NASA numerical claim is allowed there. Expanding language coverage requires further bounded grammar/tests, not relaxing numerical grounding.

## Offline evidence — 2026-09-25, Node 24.19

- Original defect: `--repro` PASS against exact base.
- Dedicated regression: **141 checks PASS**, including EN/RU × three metrics × all months/full year; wrong month/metric/unit/sign/value/ref; absent/unavailable/tampered evidence; prompt/schema agreement; negative source temperatures; immutable input; full legacy/current Q/S/D content validation; complete saved-response restoration and selector rejection.
- Existing NASA adapter/parser/frozen lease suite: **37 checks PASS** (offline fixtures).
- `npm run test:point-to-object-geocontext`: PASS — context, Wikidata, semantic numerical grounding, V5/V6 sessions, dashboard, depth.
- `npm run test:point-to-object`: PASS — full strict contract and provenance.
- `npm run lint`: PASS. `git diff --check`: PASS.

No API, credential inspection, paid calls, database/hosted writes, deployment, operational ledger or financial-core changes. These are implementation/fixture results, not live model acceptance, source reliability or Production readiness. Root owns integration and any separately authorized paid acceptance.

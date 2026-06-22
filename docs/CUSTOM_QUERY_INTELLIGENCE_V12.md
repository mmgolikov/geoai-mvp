# Custom Query Intelligence v1.2

Date: 2026-06-22

GeoAI Custom Query Intelligence v1.2 makes the Custom Query field a real analysis modifier for single-site analysis, comparison, report preview and printable reports. It remains deterministic and useful without OpenAI.

Important UX rule: Custom Query does not create a standalone dashboard report block. It acts as an analysis lens that updates the existing Executive Summary, Screening Signals, Key Factors, Opportunities, Risks, Next Actions, Evidence and limitations.

## Intent Model

The intent detector lives in `src/lib/custom-query/query-intent.ts`.

Supported intents:

- `what_to_build`
- `site_suitability`
- `investment_decision`
- `risk_review`
- `comparison_preference`
- `due_diligence`
- `construction_monitoring`
- `climate_risk`
- `custom`

The detector also records language (`en`, `ru`, `mixed`, `unknown`), normalized question, decision question, requested output and confidence. It uses simple keyword detection only.

## Supported Query Examples

Russian examples:

- `а что лучше тут строить?` -> `what_to_build`
- `что построить` -> `what_to_build`
- `стоит ли инвестировать` -> `investment_decision`
- `какие ключевые риски?` -> `risk_review`
- `что проверить перед покупкой?` -> `due_diligence`
- `какой вариант лучше и почему?` -> `comparison_preference`

English examples:

- `What should we build here?` -> `what_to_build`
- `Should we invest?` -> `investment_decision`
- `What are the risks?` -> `risk_review`
- `What should a bank validate before financing this asset?` -> `due_diligence`
- `best elite options` -> `site_suitability`
- `Which site is better?` -> `comparison_preference`

## Deterministic Fallback

The deterministic answer generator lives in `src/lib/custom-query/query-answer.ts`.

It returns:

- user question
- intent
- direct screening answer
- recommended direction
- reasoning
- key risks
- validation needed
- next actions
- source basis
- confidence note

For `what_to_build`, GeoAI returns a screening development hypothesis. Examples:

- Dubai Marina / premium coastal context: serviced apartments, hospitality or premium residential, subject to official validation.
- Dubai South / growth corridor context: residential-led mixed-use, logistics-adjacent or phased development pipeline, subject to infrastructure and planning validation.
- Business Bay / business-core context: office, mixed-use or serviced apartment concept, subject to traffic/access and saturation checks.
- Risk-sensitive context: hold or validate before build.

## OpenAI Optional Path

`/api/analyze` receives the deterministic custom-query intent and baseline answer. If `OPENAI_API_KEY` is configured, the prompt asks OpenAI to return `custom_query_answer` in the same shape.

If OpenAI is missing, unavailable or returns invalid JSON, the deterministic answer is used. The OpenAI key stays server-only and is never exposed as a public environment variable.

## Report Integration

Single-object analysis stores the structured custom-query answer as metadata and merges its content into existing memo sections. The effect appears in:

- Express Analysis dashboard
- report preview
- browser print report
- saved printable report route
- project saved analysis payload

## Comparison Integration

Comparison stores the structured custom-query answer as metadata and merges its content into existing comparison sections. It does not replace the winner/recommendation; it strengthens:

- recommended option
- why it wins
- when another option may be better
- validation needed
- next actions

## Data Honesty Limits

Custom Query Intelligence must use screening language only:

- screening hypothesis
- preliminary recommendation
- subject to validation
- based on available demo/sample/uploaded/open context
- not a legal, cadastral, zoning, title, valuation or approval conclusion

It must not claim:

- official suitability
- approved zoning
- verified ownership
- valid parcel status
- guaranteed best use
- certified valuation

## QA Checklist

- Russian what-to-build query produces a concrete screening recommendation and validation caveat.
- English what-to-build query produces a concrete screening recommendation and validation caveat.
- Risk query produces risk-focused answer.
- Comparison preference query produces query-specific comparison response.
- Comparison what-to-build query differentiates development concepts across sites.
- Report preview updates existing memo content with the query lens and does not show a standalone custom-query block.
- Printable report includes query-refined memo content after export/reload.
- CTA returns to Export Report or Export Comparison after Continue.
- Editing the query makes the visible result stale and changes CTA back to Continue.
- `npm run build` passes.

# GeoAI Pilot UX v3.4 - Dashboard Viewport Alignment

## Summary

GeoAI Pilot UX v3.4 aligns the analysis and comparison dashboard first-screen viewport with the right command panel footer. The workspace shell now owns the shared `100vh - top navigation` height, while dashboard content fills that contract and moves drill-down/detail modules below the first viewport.

## Dashboard Viewport Contract

- The workspace shell uses the 64px top navigation height as the single viewport baseline.
- The right command panel fills the shared workspace height and keeps the primary CTA/footer pinned at the bottom.
- The analysis dashboard first screen fills the same workspace height.
- The comparison dashboard first screen follows the same contract.
- Dense dashboard detail sections use internal scroll regions when required instead of expanding the first viewport.
- BI drill-down modules, comparison tables, evidence and next actions start below the first viewport.

## Text Safety

The v3.3 text-safe dashboard protections remain in place. Dynamic dashboard and comparison values continue to render through safe wrapping components where needed.

## Verification Scope

- `/`, `/workspace`, `/projects`, `/explore`, `/demo`
- `/api/health`, `/api/db/health`
- Map-first analysis dashboard alignment
- Criteria-first comparison dashboard alignment
- Candidate dashboard switching alignment
- Right command panel footer pinning
- `npm run lint`
- `npm run build`

## Known Limitations

Outputs remain screening hypotheses requiring official/client validation. This release does not add production deployment, official data connectors, cadastral/zoning/legal validation or durable production storage guarantees.

# GeoAI Pilot UX v3.1 - BI Dashboard and Candidate Comparison Flow

GeoAI Pilot UX v3.1 continues the workspace-first pilot flow from v3.0 and focuses on decision clarity:

- The workspace command panel is more compact so the selected scenario, candidate preview and Custom Query control fit higher in the first screen.
- Criteria-first Explore runs now open a ranked candidate comparison when multiple candidates are available and no specific candidate is selected.
- The comparison view is styled as a decision-intelligence shortlist with ranked candidates, score bars, winner rationale, trade-off framing and direct candidate dashboard actions.
- Individual analysis dashboards use BI-style gauges, score bars, signal matrices and scenario-specific sections instead of mostly generic text blocks.
- Candidate dashboards opened from a comparison include a shortlist switcher and a route back to the ranked comparison.
- The landing page remains lightweight while adding a clearer product narrative around spatial decision intelligence, screening layers and expected outputs.

## User Flow

1. Open `/workspace` or `/explore`.
2. Use criteria-first scenario filters without selecting a map object.
3. Click `Compare Candidates` to open the ranked shortlist.
4. Open any candidate dashboard from the comparison.
5. Switch between candidates or return to the ranked shortlist.

Map-first and selected-candidate flows still open the individual Express Analysis dashboard directly.

## Validation

All v3.1 outputs remain screening hypotheses. They use sample/open/demo context unless official or customer-approved sources are connected and validated. The UI must not be treated as legal, cadastral, zoning, planning, ownership, valuation, title, entitlement, lending, purchase, rental or development advice.

## Known Limitations

- Candidate ranking uses deterministic MVP scoring and sample/open context.
- Official Dubai planning, cadastral, transaction, title and risk-layer connectors are not yet production-connected.
- OpenAI analysis remains optional; deterministic fallback keeps the workspace usable without `OPENAI_API_KEY`.

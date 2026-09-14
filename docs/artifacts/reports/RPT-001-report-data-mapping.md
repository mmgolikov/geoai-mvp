# RPT-001 Report Data Mapping

Status: Review source artifact  
Confluence: 02.08 Report Data Mapping

## Mapping

| Report section | Source data block | Required fields |
|---|---|---|
| Cover | project and analysis context | project name, scenario, geography, date |
| Summary | result.summary | headline, summary, confidence |
| Map context | selected context | context label, geometry reference, map snapshot |
| Scores | result.scores | score type, value, explanation, confidence |
| Risks | result.risks | risk type, severity, evidence reference, next action |
| Evidence | result.evidence | source, observation, confidence, link |
| Recommendations | result.recommendations | action, priority, reason, validation note |
| Appendix | sources and limitations | source mode, confidence, caveat, assumptions |

## Rules

- Report must match the visible dashboard snapshot.
- Export belongs to the active project only.
- Sources and confidence must be included.
- Demo, fallback and user-provided data must be labeled.
- Export failure must preserve analysis state.

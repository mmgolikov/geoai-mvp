# Workspace CTA State Model

Date: 2026-06-21

The Workspace command panel bottom CTA is the primary next-best-action control. It must be derived from current workspace state, not hardcoded from whether any result exists.

## Inputs

The CTA model uses:

- selected point/object availability;
- selected scenario;
- trimmed Custom Query;
- last analyzed Custom Query, scenario and target signature;
- comparison set item ids;
- last compared Custom Query, scenario and comparison-set signature;
- current analysis result;
- current comparison result;
- export/preparation loading state.

## CTA Matrix

| State | CTA label | Action |
| --- | --- | --- |
| No target and fewer than 2 comparison items | Run Express Analysis disabled | Wait for target selection |
| Target selected, no analysis, fewer than 2 comparison items | Run Express Analysis | Run analysis |
| Analysis exists and query/scenario/target are unchanged | Export Report | Prepare saved/session report and navigate same tab to printable route |
| Analysis exists and query/scenario/target changed | Continue Analysis | Rerun analysis with current target, scenario and Custom Query |
| 2+ comparison items and no comparison result | Compare Selected | Generate comparison dashboard |
| Comparison exists and query/scenario/comparison set are unchanged | Export Comparison | Prepare saved/session comparison and navigate same tab to printable route |
| Comparison exists and query/scenario/comparison set changed | Continue Comparison | Regenerate comparison with current comparison set, scenario and Custom Query |

Continue Analysis must update the current report content with query-specific Executive Summary, Screening Signals, Key Factors, Opportunities, Risks, Next Actions, Evidence and limitations, not only refresh the CTA label.

Continue Comparison must update the comparison dashboard and report payload with query-specific rationale, risks and next actions, not only refresh the CTA label.

## Freshness Rules

- Custom Query is normalized with `trim()`.
- Clearing Custom Query to an empty string is not treated as a pending query change.
- Changing scenario makes the current result stale.
- Changing selected target clears analysis freshness.
- Changing comparison items clears comparison freshness.
- Export is available only when the currently visible result matches the latest target/set, scenario and query.

## Export Rule

Footer export actions must not use popups. They prepare or save the report payload first, store a same-session fallback payload, and navigate the current tab to `/reports/[id]/print`.

If preparation fails, the workspace should show an inline error and should not open a print route.

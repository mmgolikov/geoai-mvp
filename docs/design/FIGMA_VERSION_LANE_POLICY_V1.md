# Figma Version Lane Policy v1

Status: active design governance rule  
Date: 2026-07-07  
Branch: `design-audit-v1`

## Executive summary

The Product Design page had a version preservation issue: earlier passes cleared active frames and did not preserve prior versions as visible side-by-side references.

This is now corrected at the governance level.

## Rule

For every active Figma section:

- current version stays at x = 0 and opens first;
- previous versions are placed to the left of the current version;
- versions are arranged in chronological order from current to older when moving left;
- versions must never be layered on top of one another;
- versions must never be deleted during routine updates.

## Product Design lane

`01 — Product Design` now includes a version lane rule and restore slots:

- current v0.8 at x = 0;
- previous v0.7 to the left;
- previous v0.6 restore slot further left;
- previous v0.5 restore slot further left.

## Important note

Exact older frames from some earlier active-page states were not fully preserved because earlier tool passes cleared the page. These exact versions must be restored manually from Figma file history if pixel-perfect recovery is required.

From this point forward, before editing current, duplicate the current version and move the duplicate to the left as the previous version.

## Decision

No implementation handoff is approved. This is design governance only.

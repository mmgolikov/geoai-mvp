# Product System v3.2 Shared Shell QA Receipt

Status: Implementation complete; exact-head CI and Preview receipt pending
Change request: CR 10.02
Control: GitHub issue #110
Starting baseline: `d788ea4ddeecc719b5ffcecdd6aab8539cc9b755`
Starting documentation head: `82641b4f848230ce0b277ec3da92c785fa5cb98e`

## Implemented boundary

- scoped Product System v3.2 token contract;
- approved 32 px identity in the shared Product shell;
- adapted `TopNavigation`, `ProductNavigation`, and `AccessStatusBadge`;
- bounded Button, StatusChip, SegmentSwitch, and ValidationCaveat primitives;
- separate exact component-compatibility tokens for Figma nodes `202:68`, `203:24`, `204:73`, `205:41`, and `219:425`, without changing the 16 semantic tokens;
- permanent structured token/design contract, shell evidence, non-public primitive-state evidence, and route-body invariance evidence.

Workspace, Projects, Explore, Request Access, and Profile bodies are not migrated. Auth, API, Supabase, Storage, sources, maps, dashboards, reports, and print behavior are unchanged.

## Permanent assertions

- exact 64 px header at `1440×900`, `1024×900`, `768×1024`, and `390×844`;
- correct Workspace / Projects / Explore active route;
- 40 px desktop/tablet and 44 px mobile menu targets;
- no overlap, clipping, horizontal overflow, or duplicate navigation landmark;
- deterministic double-capture for each canonical state;
- Escape, outside-pointer, route-close, focus restoration, and visible keyboard focus;
- zero serious/critical Axe findings on covered shell states;
- repository-owned identity asset hash and exact Figma node traceability;
- Page 90 and Page 99 excluded from implementation authority.
- exact Button, StatusChip, SegmentSwitch, ValidationCaveat, and authenticated-profile state/geometry contracts;
- deterministic 29-state primitive matrix with exact bounds, visible focus, disabled/loading behavior, no clipping, and zero serious/critical Axe findings;
- machine-readable `20/20` body-only equality manifest for five routes at four viewports, with the baseline/candidate hashes and reproducible commands;
- the body-only capture suppresses the shared shell and browser-dependent dynamic map, corner, and shadow raster effects while retaining route layout, controls, text, and all other body pixels.

## Evidence status

Local corrective evidence passed on 2026-07-22:

- `npm run lint`, production `npm run build`, Product System v3.2 drift contract, Auth/session wiring contract, data-honesty scan, secret-hygiene scan, documentation truth/lifecycle checks and API inventory `66/66`;
- the permanent component-token contract passes with 16 unchanged semantic tokens and five structured compatibility adapters;
- targeted Chromium corrective checks pass `2/2` with zero retries: 29 primitive states and route-body invariance `20/20`;
- the existing shell evidence remains 21 canonical states across `1440×900`, `1024×900`, `768×1024` and `390×844` with zero serious/critical Axe findings;
- 20 normalized body-only images below the shared header have equal SHA-256 hashes across Workspace, Projects, Explore, Request Access and Profile at the four declared viewports;
- API contract, security headers and ten-route local HTTP smoke passed in `demo_public` mode;
- physical print evidence passed for 12 PDFs and 82 rendered page rasters;
- read-only hosted counts before commit remained development `10` migrations / `0` Auth users and rehearsal `18` migrations / `1` pre-existing Auth user. No identifying user data was read.

Exact-head permanent Quality Gate results, artifact IDs/digests, exact Preview deployment, route smoke and logs are recorded in the Draft PR after execution. Founder visual acceptance remains a separate human gate before any Ready-for-review transition.

No merge or Production action is authorized by this receipt.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

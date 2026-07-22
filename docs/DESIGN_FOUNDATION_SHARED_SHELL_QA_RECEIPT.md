# Product System v3.2.1 Shared Shell QA Receipt

Status: Accessibility correction implemented locally; exact-head CI and Preview receipt pending
Change request: CR 10.02
Control: GitHub issue #110
Starting baseline: `d788ea4ddeecc719b5ffcecdd6aab8539cc9b755`
Starting documentation head: `82641b4f848230ce0b277ec3da92c785fa5cb98e`

## Implemented boundary

- scoped Product System v3.2.1 component contract over the unchanged 16-token v3.2 semantic baseline;
- approved 32 px identity in the shared Product shell;
- adapted `TopNavigation`, `ProductNavigation`, and `AccessStatusBadge`;
- bounded Button, StatusChip, SegmentSwitch, and ValidationCaveat primitives;
- separate exact component-compatibility tokens for Figma nodes `202:68`, `203:24`, `204:73`, `205:41`, and `219:425`, plus accessibility receipt `1819:11`, without changing the 16 semantic tokens;
- separate enabled inactive `#606f83` and disabled `#667587` text tokens, with no Axe/WCAG exception;
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
- deterministic 56-state primitive matrix: Button 30, StatusChip 8, SegmentSwitch 12, ValidationCaveat 4 and authenticated profile badge 2;
- exact computed palettes, typography, geometry, focus, disabled/loading semantics, compact/full composition, no clipping and zero serious/critical Axe findings;
- machine-readable `20/20` body-only equality manifest for five routes at four viewports, with the baseline/candidate hashes and reproducible commands;
- the body-only capture suppresses the shared shell and browser-dependent dynamic map, corner, and shadow raster effects while retaining route layout, controls, text, and all other body pixels.

## Evidence status

Local corrective evidence on 2026-07-23 proves:

- `npm run lint`, production `npm run build`, Product System v3.2.1 drift contract, Auth/session wiring contract, data-honesty scan, secret-hygiene scan, documentation truth/lifecycle checks and API inventory `66/66`;
- the permanent component-token contract passes with 16 unchanged semantic tokens, the approved accessibility token separation and five structured compatibility adapters;
- the first exact-head CI retry exposed newly published high-severity advisory `GHSA-f88m-g3jw-g9cj` through Next.js optional `sharp <0.35.0`; the lockfile now pins the compatible transitive override `sharp 0.35.3`, and production-only `npm audit` returns zero vulnerabilities without changing Next.js;
- targeted Chromium primitive evidence passes `1/1` with zero retries: all 56 states, two deterministic captures per state, exact palettes/typography/geometry, loading and disabled semantics, compact/full composition, no clipping and zero serious/critical Axe findings;
- neutral StatusChip and enabled inactive SegmentSwitch text compute to `rgb(96, 111, 131)` (`#606f83`); disabled SegmentSwitch text remains `rgb(102, 117, 135)` (`#667587`);
- all six Button Loading combinations preserve approved Primary, Secondary and Quiet palettes at desktop/touch sizes while remaining natively disabled with `aria-busy=true` and a 14 px spinner;
- the focused shared-shell Chromium regression passes locally; route-body equality remains governed by the committed Linux/Chrome baselines and the final permanent Linux Quality Gate;
- the existing shell evidence remains 21 canonical states across `1440×900`, `1024×900`, `768×1024` and `390×844` with zero serious/critical Axe findings;
- 20 normalized body-only images below the shared header have equal SHA-256 hashes across Workspace, Projects, Explore, Request Access and Profile at the four declared viewports;
- API contract, security headers and ten-route local HTTP smoke passed in `demo_public` mode;
- physical print evidence passed for 12 PDFs and 82 rendered page rasters;
- read-only hosted counts before commit remained development `10` migrations / `0` Auth users and rehearsal `18` migrations / `1` pre-existing Auth user. No identifying user data was read.

Exact-head permanent Quality Gate results, the authoritative Linux `20/20` route-body result, artifact IDs/digests, exact Preview deployment, route smoke and logs are recorded in the Draft PR after execution. Founder visual acceptance remains a separate human gate before any Ready-for-review transition.

No merge or Production action is authorized by this receipt.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

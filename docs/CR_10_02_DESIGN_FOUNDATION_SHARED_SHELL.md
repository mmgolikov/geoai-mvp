# CR 10.02 — Design Foundation and Shared Shell

Status: **Approved for bounded implementation**  
Owner approval: Maxim Golikov, Founder, GeoAI  
Approval date: 2026-07-21  
Control issue: GitHub #110  
Implementation branch: `design/cr-10-02-foundation-shared-shell`

## 1. Exact baseline

- Repository: `mmgolikov/geoai-mvp`
- Exact starting SHA: `d788ea4ddeecc719b5ffcecdd6aab8539cc9b755`
- Baseline ref: `baseline/public-demo-audited-pre-design-2026-07-21`
- Baseline meaning: merged PR #108; final audited public-demo implementation before Product System v3.2 migration
- Product stage: `public_demo_prototype`

Stop if the branch does not start from this exact SHA.

## 2. Design authority

- Figma file: `https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H/GeoAI`
- File key: `TAzDqOvRCw1mQGMU3Y4S9H`
- Approved version: **Product System v3.2 — Founder Approved Design Baseline**
- Start Here / approval record: `1797:2`
- Executable prototype authority: `1482:2`
- Product Component Library: `1672:17867`
- Runtime alignment reference: `1749:21157`
- Design approver: Maxim Golikov — Founder, GeoAI

Never implement from Page 90 or Page 99.

## 3. Founder identity decision

Identity option 1 is approved:

- Identity Symbol authority: `468:84`
- 32 px Top Navigation symbol: `468:57`
- Approved for CR 10.02 implementation, Vercel Preview and a future separately approved public runtime release.

This approval removes the prior public-use block for this bounded implementation. Merge and Production remain separately controlled.

## 4. Problem

The current audited Product has stable behavior but a historically evolved visual shell. Later screen migration would be unsafe without one implemented semantic token contract, one responsive shared shell, one navigation contract and one permanent design-conformance test layer.

## 5. Business reason

Create the minimum controlled foundation needed for subsequent screen-by-screen migration to Product System v3.2 without changing business logic, browser-local public-demo containment, API/security contracts, source-lineage caveats or protected-pilot gates.

## 6. Authorized scope

### 6.1 Semantic token contract

Implement and permanently validate:

- `ink`: `#06122e`
- `muted`: `#4d6694`
- `line`: `#ccdef5`
- `surface`: `#f4f9ff`
- `brand / focus / spatial`: `#064fcf`
- `accent / primary Product action`: `#06717a`
- `personal`: `#5b48d8`
- `risk / validation`: `#a63f00`
- Product header: `64px`
- desktop actionable control: minimum `40px`
- primary touch target: `44px` where specified
- control radius: `12–14px` by role
- card radius: `16px`
- large panel radius: `24px`
- Product Core typography: Geist through the existing application font architecture

Do not globally migrate or recolor non-shell page bodies.

### 6.2 Shared shell

Primary component authority:

- `GeoAI/TopNavigation · v3.2 Runtime-Aligned Adapter`: `219:425`

Required variants:

- Desktop: `219:356`, `219:368`, `219:380`, `1733:186`
- Tablet: `1755:472`, `1755:497`, `1755:522`, `1755:547`
- Mobile: `219:392`, `219:403`, `219:414`, `1733:199`

Implement only:

- 64 px white Product header;
- approved identity block;
- Workspace / Projects / Explore navigation;
- correct active-route states;
- existing runtime-aligned profile/access-status entry;
- desktop, tablet and mobile layouts;
- mobile closed/open menu;
- Escape and outside-click closure;
- focus restoration;
- approved header divider and spacing.

Adapt existing runtime behavior. Do not copy Figma absolute-position output verbatim.

### 6.3 Minimum shared primitives

Only where required by the shell or immediate migration foundation:

- `GeoAI/Button`: `202:68`
- `GeoAI/StatusChip`: `203:24`
- `GeoAI/SegmentSwitch`: `204:73`
- `GeoAI/ValidationCaveat`: `205:41`
- `GeoAI/TopNavigation`: `219:425`

Input, select, metric, candidate, map-control and screen-level composites are excluded unless a direct dependency is proven and documented before implementation.

### 6.4 Visual QA foundation

Add permanent evidence for:

- exact Figma node traceability;
- viewports `1440`, `1024`, `768`, `390`;
- all active-route shell states;
- mobile menu closed/open states;
- supported profile/access states;
- deterministic screenshots;
- no overlap, clipping or horizontal overflow;
- keyboard and focus behavior;
- minimum target sizes;
- zero serious/critical Axe findings on covered shell surfaces;
- visual artifacts suitable for founder review.

### 6.5 Component compatibility and independent-review evidence

The approved 16 semantic/design tokens remain unchanged. Exact state values that differ from the broad semantic layer are implemented in a separate machine-readable component-compatibility contract for:

- Button `202:68`;
- StatusChip `203:24`;
- SegmentSwitch `204:73`;
- ValidationCaveat `205:41`;
- authenticated profile state within TopNavigation `219:425`.

Permanent evidence uses imported source components in a test-only server-rendered harness. It does not add an application route or API. The Quality Gate must publish deterministic state screenshots and a manifest with node, state, bounds and SHA-256 for each primitive state.

Route-body invariance is measured below the shared shell for Workspace, Projects, Explore, Request Access and Profile at `1440×900`, `1024×900`, `768×1024` and `390×844`. The baseline is `d788ea4ddeecc719b5ffcecdd6aab8539cc9b755`; any normalized body-image hash mismatch fails the Quality Gate. Capture normalization suppresses the shared shell, animation, dynamic map raster pixels and browser-dependent corner/shadow antialiasing only; route layout, controls, text and all other body pixels remain compared.

## 7. Affected routes

Only the shared shell on:

- `/workspace`
- `/projects`
- `/explore`
- `/request-access` where the shared Product header is used
- `/profile` where the shared Product header is used

No page-body redesign or migration is authorized.

## 8. Required preservation

Preserve without weakening:

- demo/request journey separation;
- browser-local public-demo containment;
- existing Auth/session behavior;
- authority-layer separation;
- route behavior;
- current API and security contracts;
- project isolation;
- data-honesty wording;
- source-lineage caveats;
- physical PDF/print evidence;
- fail-closed protected-pilot gates.

Shell/profile presentation must not authorize protected APIs.

## 9. Out of scope

- Landing redesign
- Request Access body redesign
- Login/Profile body redesign
- Workspace/Explore body redesign
- Projects body, Project Hub or Data Room migration
- dashboards, comparison, evidence or reports redesign
- map behavior changes
- Auth/provider changes
- Supabase migrations or writes
- membership/RBAC/RLS
- Storage or signed URLs
- secrets/environment changes
- live-source activation
- Code Connect or Figma writes
- merge
- Production promotion

## 10. Acceptance criteria

### Traceability

- Every visible change references Product System v3.2 and exact Figma nodes.
- No Page 90/Page 99 source is used.
- No undocumented visual deviation exists.
- Identity approval is referenced in implementation receipts.

### Tokens

- Exact semantic values are implemented.
- A permanent drift test rejects token divergence.
- Non-shell page bodies remain visually unchanged unless an unavoidable inherited dependency is explicitly evidenced.

### Shared shell

- Header is exactly 64 px at declared viewports.
- Workspace, Projects and Explore remain reachable and correctly highlighted.
- Desktop/tablet actions are at least 40 px.
- Specified touch targets are 44 px.
- Mobile menu is keyboard-operable, closes on Escape/outside navigation and restores focus.
- Existing profile/access authority behavior is preserved.
- No routing, session, Auth or authorization behavior changes.

### Primitives

- APIs are typed and documented.
- Required default/focus/disabled/loading states are represented.
- Decision-critical text is not truncated.
- No duplicate canonical implementation is introduced.
- Old-to-new component mapping and deprecation path are documented.

### Visual and accessibility QA

- Exact-head Preview evidence at `1440`, `1024`, `768`, `390`.
- No text overlap, clipping or horizontal overflow.
- Zero serious/critical Axe findings on covered states.
- Focus indicators use approved `brand` semantics.
- Reduced-motion and deterministic capture controls remain active.
- Founder/design review receipt is required before Ready-for-review.

### Regression

- Full permanent Quality Gate passes.
- Browser suite is clean with zero flaky tests.
- API inventory remains `66/66` unless separately authorized.
- Physical PDF evidence remains passing and unchanged outside approved shared dependencies.
- Production remains unchanged.
- Hosted Supabase remains read-only and unchanged.

## 11. Delivery rules

- Work only on `design/cr-10-02-foundation-shared-shell`.
- Open one Draft PR to `main` only after all required evidence passes.
- Keep the PR Draft until independent delivery review.
- Stop on scope expansion or Figma/runtime conflict.
- Do not merge or promote Production.

## 12. Required final receipt

Return:

1. starting and final SHAs;
2. Draft PR URL;
3. exact changed files grouped by Figma node/component;
4. token manifest and drift-test result;
5. old-to-new component mapping;
6. browser, Axe and visual evidence;
7. Quality Gate run/jobs/artifacts/digests;
8. exact Vercel Preview deployment and route smoke;
9. Production unchanged confirmation;
10. hosted Supabase read-only before/after counts;
11. Figma unchanged confirmation;
12. remaining deviations and deferred components.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

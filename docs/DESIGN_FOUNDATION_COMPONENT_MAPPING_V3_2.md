# Product System v3.2.1 Component Mapping

Status: Implementation mapping for CR 10.02
Authority: GitHub issue #110 and Figma Product System v3.2.1 accessibility receipt `1819:11`

Enabled inactive text uses `#606f83`; disabled text remains separately `#667587`. The correction applies to neutral StatusChip `203:24` and SegmentSwitch `204:73` without changing component ownership or migration scope.
Baseline: `d788ea4ddeecc719b5ffcecdd6aab8539cc9b755`
Branch: `design/cr-10-02-foundation-shared-shell`

## Source audit disposition

The audited runtime already has one shared `TopNavigation`, one `ProductNavigation`, and one authority-aware `AccessStatusBadge`. Their routing, session presentation, mobile menu, Escape handling, outside-pointer closure, and focus restoration are retained. CR 10.02 adapts those components instead of introducing a second navigation tree.

The existing shell identity is an improvised blue `G` tile and does not match the approved identity. It is replaced only inside `TopNavigation` by a repository-owned export of Figma node `468:57`. Landing, report, and print identities remain outside this change request.

No generic Button, StatusChip, SegmentSwitch, or ValidationCaveat component exists at the audited baseline. The bounded Product System components are introduced under `components/design-system/`; existing page-local buttons, `components/ui/safe-badge.tsx`, segment controls, and caveat renderings remain temporarily supported and are not bulk-migrated.

## Mapping

| Figma authority | Existing runtime | Resulting runtime | Change type | Old API | New API | Compatibility and deprecation |
| --- | --- | --- | --- | --- | --- | --- |
| Button `202:68` | Page-local `button` / `Link` styles | `components/design-system/button.tsx` | Introduced canonical primitive | Ad hoc element props/classes | `Button` with `variant`, `size`, `isLoading`, native button props | Existing page controls remain unchanged; migrate only in separately approved body waves. |
| StatusChip `203:24` | `components/ui/safe-badge.tsx` and page-local badges | `components/design-system/status-chip.tsx` | Introduced canonical primitive | `SafeBadge` plus caller classes | `StatusChip` with `tone`, `size`, and text children | `SafeBadge` remains supported for non-migrated screens and is not deprecated globally in this CR. |
| SegmentSwitch `204:73` | Page-local paired buttons | `components/design-system/segment-switch.tsx` | Introduced canonical primitive | Caller-managed paired buttons | `SegmentSwitch<T>` with typed options, `value`, `onChange`, `size`, `disabled` | Existing Workspace and Project Hub segment controls remain untouched pending body migration approval. |
| ValidationCaveat `205:41` | Page-local caveat blocks | `components/design-system/validation-caveat.tsx` | Introduced canonical primitive | Repeated caveat strings/classes | `ValidationCaveat` with `tone`, `mode`, and optional message | Existing report, dashboard, and source-lineage caveats remain authoritative and unchanged. |
| TopNavigation `219:425` | `TopNavigation` + `ProductNavigation` + `AccessStatusBadge` | Same shared components, visually adapted | Adapted existing canonical component and wrapped existing behavior | No public component props | No public API change | One canonical navigation implementation remains; legacy visual classes are replaced only in the shell. |
| Identity family `468:84`; 32 px `468:57` | Improvised `G` tile in `TopNavigation` | `components/design-system/identity-symbol.tsx` + `/public/brand/geoai-identity-symbol-32.svg` | Controlled replacement | Inline decorative tile | `IdentitySymbol` with optional class name | Only the migrated shared shell changes. Marketing and report identities remain outside scope. |

## Retained runtime authority

- `AccessStatusBadge` remains the sole profile/sign-in destination and continues to derive its state from `AuthProvider`.
- `ProductNavigation` remains the sole Workspace / Projects / Explore navigation contract.
- Route gates, session resolution, demo behavior, logout, and API authorization are unchanged.
- Page 90 and Page 99 are excluded as implementation authorities.

## Deferred components

InputField, SelectField, MetricCard, CandidateCard, MapControlDock, and screen-level composites remain deferred. No dependency on them was found for the bounded shell.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

# Sprint 09 — Complete decision journeys and controlled Production release

Date: 2026-09-12
Status: Implementing; not released

## Authority and baseline

The founder approved the consolidated desktop/mobile five-hour sprint and explicitly requested reaching Production today. This supersedes earlier no-main/no-Production restrictions for this bounded change only. The founder also authorized real functional tests using the existing paid OpenAI project connection. No new key, secret/configuration change, paid subscription, hosted migration, Auth/RBAC expansion, outreach, interview or application is included.

Verified starting candidate: `1ea50a507d3c4cf7e73442adeba1e6b5baf69875`, branch `codex/sprint06-mobile-decision-v1`, existing draft PR 148. GitHub main is `42c68171aaec6ff2f875c1c98f4ba4527c8f4232`. Existing untracked `.playwright-cli/` and `output/` are preserved. Fresh Production rollback tuple: `dpl_9D6c6t2hcSkGm4iFwt5V3EjKmdKc`, Ready / Production, exact main commit above, alias `https://geoai-mvp.vercel.app`; recheck immediately before release.

## Outcome and scope

- Reliable reversible native-building hiding inside Create areas, including tile/style/zoom lifecycle and a documented boundary-overlap policy. The initial 50% proposal was replaced after live tile inspection: the founder also explicitly allowed hiding objects intersecting the area, and tile fragments cannot support a reliable whole-building percentage. The visual action hides positively intersecting footprint members; mere boundary touch stays visible. Aggregated tile IDs must never remove unrelated outside-area members. Preserve those members unchanged and keep clipped/unknown geometry coverage explicit; visual hiding is not a demolition, cadastral or complete-inventory claim.
- Complete Find selection → comparison → full dashboard → map return journey; search criteria changes and selection changes have distinct primary actions. Use confirmed footprints when available; do not invent geometry for business POIs or infer that a business is an available property.
- Useful Analyse infrastructure cards, explicit meaningful Quick/Standard/Deep outputs, honest missing/partial evidence, consistent style and bilingual presentation.
- Create A/B full result dashboard and exact map return without repeat billing. Further alternatives require an explicit generation action and are not an automatic navigation side effect.
- Mobile Camera closes on an outside tap without selecting an object/drawing a vertex; replace ambiguous Half text with an accessible standard split/expand control. Preserve camera gestures and safe areas.
- Project renaming and intelligible saved results, remove the redundant storage icon beside the bare plus, preserve project/artifact identities and immutable results. Collaboration remains a future contract, not working cloud membership.
- Regress prior landing, project routing/reopen, drawing completion, color, viewport and error recovery fixes.

## Ownership and delivery

Main owns integration, API/budget gates, project metadata, release and rollback. Independent lanes own map geometry/mobile camera and dashboard/Find/Create UI respectively; shared-file edits require explicit coordination. Do not rewrite history or alter unrelated branches.

## Product contracts for this release

### Result navigation and paid work

Opening a stored Analyse, Find or Create result is navigation, not a paid generation. In Find, changing criteria or explicitly adopting the current map area makes Search the primary action; selecting at least two current candidates makes comparison primary. Passive panning, fitting results and selecting a marker do not silently replace the search bounds. Compact comparison, full comparison, individual analysis and map return preserve selection. The full comparison currently compares observed source attributes, not a new AI investment recommendation. Individual object analysis remains the explicit route to paid grounded synthesis.

Create keeps the draft, last successful result and displayed A/B alternative separate. Its full dashboard shows a proportion-preserving plan and geometric KPIs from the saved result. It is not a photorealistic rendering, BIM model or a newly analysed five-option study. Additional independently analysed alternatives and multi-object AI comparison are follow-on scope, not simulated working features.

Quick, Standard and Deep review the same captured evidence at increasing structural depth: identity/evidence checks; decision criteria and one alternative; then counterarguments, uncertainties, two distinct alternatives and decision triggers. Increasing model reasoning alone is not evidence enrichment. The result must state the existing-evidence basis; missing routing, valuations, permissions, capacity and official boundaries remain unknown. Changing a viewing profile only rearranges available facts.

### Project collaboration foundation — design only

Keep `projectId`, artifact IDs, immutable payload hashes and initiating owner identity stable across metadata changes. Renaming may update only project metadata and must reject cross-tab or mid-flight identity conflicts. A future hosted project should introduce explicit owner/editor/viewer memberships, invitation state and server-verified authorization independently of the local browser identity. Viewer reads must include every permitted Analyse/Find/Create artifact and revision; editor writes must never rewrite historical results. Until that separate server-side authorization and migration is approved and tested, do not expose working invitations, cloud sync or shared memberships. This sprint implements renaming and verifies historical result preservation; it does not activate collaboration.

## Acceptance

Reserve the final 75 minutes of the five-hour sprint for QA and release. Run type checks, build, targeted contract/negative tests, desktop Chrome and mobile WebKit flows, EN/RU visual checks and live geodata/OpenAI end-to-end tests with usage receipts. Controlled data tests are not evidence of working live sources. Reopening, local A/B switching and returning to the map must cause zero extra paid calls. The founder explicitly authorized a separate ceiling of USD 2 for today's live tests, including retries. Reserve a conservative maximum before every paid operation; keep unknown charges reserved, and stop before the ceiling. This does not reconcile historical weekly usage or authorize an increased ongoing product budget. No unbounded retries.

Verify exact-head CI and Preview before merging PR 148. Follow the exact Production deployment, run post-release smoke and retain a rollback target. Do not claim release or full live coverage from a local build, screenshots or HTTP 200 alone. Defer features rather than consuming the QA reserve; report any blocked real-provider coverage explicitly.

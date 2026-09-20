# NIGHT21 — Current Point-to-Object Design Alignment

Status: Candidate · Not Released

Owner: design_1

Verified: 2026-09-20

Code baseline: `codex/night21-design@4d179f485612d7ebfbaa357a84f21dd13ff33f50`

Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`

Current Candidate page: [10.09 — NIGHT21 / CURRENT ALIGNMENT / CANDIDATE](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H?node-id=2386-11)

## Outcome

The existing Figma file now contains a separate, preserved Current Candidate page aligned to the implemented point-to-object shell and dashboard evidence. No existing Released or prior Candidate node was edited.

The visual contract is intentionally narrow:

- one map-first shell with Analyse, Find and Create modes;
- exact 1440 desktop frames with a 430 px decision drawer;
- one exact 430 mobile decision-first frame;
- Geist typography;
- one action/focus accent, `#087F8C`;
- white large surfaces with two light supporting tones;
- source, confidence, partial/unavailable and caveat states remain explicit.

Mandatory boundary:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Current implementation evidence

The local route `http://127.0.0.1:3130/prototype/point-to-object` was inspected in the in-app Browser. The inspection confirmed the current Analyse, Find and Create shell, the map-first layout, the single teal accent, white decision surfaces and current English copy. Live object resolution was unavailable during inspection; this is recorded as a runtime/source limitation, not redesigned away.

Eight integrated local QA captures were imported into Figma as immutable raster evidence:

| Evidence | Figma node | SHA-256 |
|---|---:|---|
| `dashboard-en-1440.png` | `2387:18` | `fffcc92ffb5af02e67aacea8cec7e8bac2dcd05c7e2b9c97a5a3168d99a5a84d` |
| `dashboard-en-834.png` | `2387:22` | `6ce25592123dd9a7d36f0acbec9d521d6ec620b9185ca5fb2c015ef33f9c5966` |
| `dashboard-en-390.png` | `2387:27` | `1118a509bffdf4e501ea8c3331a6f9ba57eafdc301d2fea0fe03a5142b2b3f98` |
| `dashboard-partial.png` | `2387:31` | `36d171d162e74685f9294a2642e11f87947ea2e8c23b2fcedf109f8d4266df61` |
| `dashboard-unavailable.png` | `2388:15` | `6999b9138e4811b8423395dfedee883cd1be524f4e3a50b842f4e3ec2d2c943e` |
| `surroundings-en-1440.png` | `2388:19` | `06489217e8d2c05b309836f9fb8c8a0bd4566099dab07c63d78f051ef0700a05` |
| `surroundings-en-834.png` | `2388:24` | `2974804bc3ce360806ea416406c23c5f35e3f3038119275cc69b0af36be6267a` |
| `surroundings-en-390.png` | `2388:28` | `ca5a26dccf7f22f2406b242009977e3f40fbae12f2b480202dfe0f68ef24ab6d` |

The editable shell reuses the preserved authentic map capture from node `2364:17`; no synthetic map geometry was drawn.

## Exact Figma registry

| Purpose | Node |
|---|---:|
| Page | `2386:11` |
| Alignment root | `2386:12` |
| Authority header | `2386:13` |
| Current navigation contract | `2386:26` |
| Mandatory caveat | `2386:40` |
| Eight-capture evidence section | `2387:11` |
| Editable shell section | `2389:11` |
| Analyse desktop 1440 | `2389:15` |
| Analyse drawer 430 | `2389:23` |
| Find desktop 1440 | `2389:43` |
| Find drawer 430 | `2389:51` |
| Create desktop 1440 | `2389:75` |
| Create drawer 430 | `2389:83` |
| Analyse mobile 430 | `2389:103` |
| Handoff / gap map | `2391:11` |
| Candidate registry | `2391:33` |
| Final authority boundary | `2391:39` |

Preserved and read back without mutation:

- Sprint06 Current Candidate: `2362:12`;
- QUALITY20 QH-05 contract: `2380:147`;
- Project Hub registry: `1975:11`;
- DESIGN13-001 component system: `1976:11`;
- DESIGN-05 concept page: `2317:11`.

## Code-to-Figma contract

| Runtime area | Figma representation | Acceptance |
|---|---|---|
| Global shell | `2389:15`, `2389:43`, `2389:75` | 1440 × 900, map 1008 px, drawer 430 px, header inside 1438 px content width. |
| Analyse | `2389:15` | Map-first selection, question field, disabled CTA before selection. |
| Find | `2389:43` | Current Role, Scenario and Search settings hierarchy; no new Product priority invented. |
| Create | `2389:75` | Draw/upload/use-object entry; conceptual massing boundary remains visible. |
| Mobile | `2389:103` | 430 × 820; decision content and CTA precede map detail. |
| Dashboard | `2387:11` | Desktop/tablet/mobile, partial and unavailable evidence retained as rendered captures. |
| Context chart | `2388:19`, `2388:24`, `2388:28` | Substantive category distribution and context hierarchy, not decorative charting. |

## Targeted QA

PASS:

- all 114 text layers on the new page use Geist;
- zero text nodes exceed a clipping ancestor;
- zero unnamed critical Frame/Text/Rectangle nodes;
- three desktop screens are exactly 1440 × 900;
- all three desktop decision drawers are exactly 430 px;
- mobile frame is exactly 430 × 820;
- twelve raster surfaces are present: eight QA captures plus four reused authentic map surfaces;
- the mandatory caveat is present exactly once on the authority surface;
- no component or variable was created on the NIGHT21 page;
- previous Released/Candidate authority nodes retain their names and dimensions.

Screenshots reviewed after final mutation:

- authority header and caveat;
- first four regression captures;
- final four regression captures;
- Analyse 1440;
- Find 1440;
- Create 1440;
- Analyse mobile 430;
- handoff / gap map.

## Known limitations

- Fresh live-tile screenshots are inspection-only. Persisted Figma evidence is the integrated local fixture bundle.
- Persisted responsive runtime evidence is 390, 834 and 1440. The 430 frame is a structural Figma validation, not a new runtime-test claim.
- The current Find default still uses “Buildings and construction sites”. Design did not reinterpret it as a validated commercial priority.
- Create remains conceptual massing assistance; it is not planning, zoning, valuation or investment authority.
- Candidate is not Released and does not change code, Product rules, source rights, Production, Auth or data readiness.

## Engineering acceptance checklist

- Preserve the 1440 map-first shell and approximately 430 px decision drawer.
- Preserve white/light major surfaces, `#087F8C` actions/focus and 44 px minimum touch targets.
- At 430 mobile, place decision posture and next action before larger map/detail content.
- Keep long text wrapping and explicit partial/unavailable states.
- Never hide source lineage, confidence, freshness, limitations or the mandatory caveat.
- Treat the eight Figma raster captures as regression evidence, not as live-source proof.

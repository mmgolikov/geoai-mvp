# GeoAI Manual QA Checklist

Use this checklist before demos, Vercel deployments, and milestone checkpoints.

## Environment

- [ ] `.env.local` exists locally when running Mapbox.
- [ ] `.env.local` is not committed.
- [ ] `.env.example` contains only safe placeholder keys.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured locally.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured in Vercel.
- [ ] `OPENAI_API_KEY` is not required for current MVP behavior.
- [ ] `npm run build` passes.

## Map Loading

- [ ] `/workspace` opens without runtime errors.
- [ ] Mapbox basemap loads when token is configured.
- [ ] Safe placeholder appears if Mapbox token is missing or invalid.
- [ ] Map remains centered on Dubai on initial load.
- [ ] Map does not jump after point selection.
- [ ] Map does not reinitialize on every click.

## Spatial Layers

- [ ] Spatial layers control is collapsed by default.
- [ ] Active layer count is visible.
- [ ] User can expand layers.
- [ ] User can toggle each layer on and off.
- [ ] `Show all` works.
- [ ] `Hide all` works.
- [ ] Legend is visible when layers are expanded.
- [ ] Layer styles are readable and not overly saturated.

## Point Selection

- [ ] Clicking empty map area selects a point.
- [ ] Marker appears at selected point.
- [ ] Coordinates update in the right command panel.
- [ ] `Run Express Analysis` becomes enabled.
- [ ] Map zoom and center are preserved.

## Object Selection

- [ ] Clicking a demo polygon selects the object.
- [ ] Clicking a demo point selects the object.
- [ ] Clicking a demo line/corridor selects the object.
- [ ] Selected object is highlighted.
- [ ] Right panel shows object name, type, layer, and coordinates.
- [ ] User can run Express Analysis for selected object.

## Scenario Analysis

- [ ] Scenario selector is visible.
- [ ] Each scenario can be selected.
- [ ] Scenario description updates.
- [ ] Custom Query requires a question before analysis.
- [ ] Express Analysis opens dashboard.
- [ ] Dashboard title and content change by scenario.
- [ ] No OpenAI API call is made.

## Dashboard

- [ ] Dashboard renders immediately without a large blank area.
- [ ] User does not need to scroll to force layout correction.
- [ ] Score cards are visible.
- [ ] Map card is bounded and does not reserve full viewport height.
- [ ] Back to map works.
- [ ] Export report opens report preview.

## Comparison

- [ ] User can add a selected point to comparison.
- [ ] User can add a selected object to comparison.
- [ ] Duplicate selections are prevented.
- [ ] Comparison set is limited to 3 items.
- [ ] Compare button is disabled until at least 2 items exist.
- [ ] Comparison dashboard opens.
- [ ] Winner recommendation is visible.
- [ ] Score table and cards render correctly.
- [ ] Remove item works.
- [ ] Back to map works.

## Report Preview

- [ ] Express Analysis report preview opens.
- [ ] Comparison report preview opens.
- [ ] Report preview includes GeoAI branding.
- [ ] Report preview includes map window.
- [ ] Report preview includes demo/mock evidence notes.
- [ ] Back to dashboard works.
- [ ] Print / Save as PDF opens browser print dialog.
- [ ] Print layout hides navigation and command panel.

## Vercel Deployment

- [ ] Repository is connected to Vercel.
- [ ] Build succeeds on Vercel.
- [ ] Environment variables are configured in Vercel.
- [ ] `/` renders.
- [ ] `/workspace` renders.
- [ ] Map loads in deployed environment.
- [ ] Demo layers and analysis flows work after deployment.

## Responsive Checks

- [ ] Homepage renders on desktop.
- [ ] Workspace renders on desktop.
- [ ] Workspace remains usable on tablet width.
- [ ] Right command panel remains readable.
- [ ] Buttons do not overflow their containers.
- [ ] Report preview remains printable.

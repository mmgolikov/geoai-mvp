# Codex Workflow Instructions

Follow this workflow for all future GeoAI MVP tasks.

## Before Editing

1. Understand the current GeoAI MVP state before editing.
2. Preserve working functionality unless explicitly asked to change it.
3. Do not change product UI, Mapbox behavior, analysis behavior, comparison behavior, report behavior, deployment configuration, or data flow unless the user explicitly requests it.

## Secrets And Environment

1. Never hardcode tokens or secrets.
2. Use `NEXT_PUBLIC_MAPBOX_TOKEN` for Mapbox.
3. Keep `OPENAI_API_KEY` server-only when implemented later.
4. Never commit:
   - `.env`
   - `.env.local`
   - `.env*.local`
   - `node_modules`
   - `.next`
   - `.DS_Store`

## GeoAI Brand Baseline

The approved GeoAI brand baseline is documented in `docs/geoai-brand-guidelines.md`.

1. Preserve the current premium, light, enterprise SaaS visual identity unless the user explicitly requests a brand change.
2. Never redesign GeoAI into a heavy dark theme unless explicitly requested.
3. Use existing Tailwind tokens:
   - `ink`: `#172033`
   - `muted`: `#5f6b7a`
   - `line`: `#dde3ea`
   - `surface`: `#f6f8fb`
   - `brand`: `#174f63`
   - `accent`: `#c5a76a`
4. Preserve current primary colors and avoid random new palettes, neon colors or toy-like map colors.
5. Investor-facing screens must remain clean, board-ready and readable.
6. Map and report screens must remain credible for UAE real estate / development intelligence.
7. Keep CTA rows focused: maximum 2 key actions, short labels, helper copy outside buttons.
8. Do not expose unfinished `Coming soon` / `Later` blocks as primary UI.
9. Before changing major UI style, explain why in the PR summary.

## Build, Git, And Deployment Workflow

After every completed feature or fix:

1. Run `npm run build`.
2. If the build fails, fix errors before proceeding.
3. Run `git status`.
4. Verify no secrets are tracked or staged.
5. Commit changes with a meaningful message.
6. Push to `origin main`.

Do not push if the build fails.

Do not push if secrets are staged.

Keep Vercel deployment compatibility.

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

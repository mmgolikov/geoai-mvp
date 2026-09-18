# GeoAI self-hosted candidate packet

This packet runs one non-root, read-only Next.js standalone container behind one Caddy container. It is for a bounded candidate with 5–10 named testers. It does not deploy Production, create infrastructure, configure DNS/Auth, apply database migrations, enable cloud artifact persistence, or authorize paid provider calls.

## Fixed boundaries

- Runtime identity is `self_hosted_candidate`; never set or imitate `VERCEL_ENV`.
- Managed Supabase target is exactly `pphdqkurxneyagvnnjdt`; the application accepts only a browser-safe modern publishable key and each user's cookie/JWT.
- Do not place database URLs/passwords, Supabase service-role/secret keys, `GEOAI_OPERATOR_*`, `OPENAI_API_KEY`, migration flags, or storage-write flags in `.env.runtime`.
- The first packet requires hard access, disables public demo, local Supabase, provider execution, storage readiness, and point-object cloud persistence.
- Caddy is the only published ingress. The application port is not published.

## Prepare without launching

1. Copy `ops/self-host/runtime.env.example` to the Git-ignored `ops/self-host/.env.runtime` and set only the approved public values, exact authorized host, and exact 40-hex release commit.
2. Leave both fingerprint values empty temporarily. With Node 22 or 24, compute the canonical public configuration fingerprint without printing its inputs:

   ```sh
   node --env-file=ops/self-host/.env.runtime scripts/self-host-runtime-contract-check.mjs --print-public-fingerprint
   ```

3. Put the returned 64-hex digest in both `GEOAI_PUBLIC_BUILD_FINGERPRINT` and `NEXT_PUBLIC_GEOAI_BUILD_FINGERPRINT`. The Docker build writes an immutable image seal containing that digest and the exact `GEOAI_RELEASE_COMMIT_SHA`. The container entrypoint validates the runtime environment against the seal and exits nonzero before importing the Next server if either changes. Next instrumentation repeats the validation as defense in depth.
4. Run the offline source contract and type/build checks before any host work:

   ```sh
   npm run test:self-host-runtime
   npm run lint
   docker compose --env-file ops/self-host/.env.runtime -f compose.self-host.yml config --quiet
   docker compose --env-file ops/self-host/.env.runtime -f compose.self-host.yml build
   ```

The pinned multi-architecture image digests were read from the official Docker Hub registry on 2026-09-19: Node `22.20.0-bookworm-slim` index `sha256:b21fe589dfbe5cc39365d0544b9be3f1f33f55f3c86c87a76ff65a02f8f5848e`; Caddy `2.10.2-alpine` index `sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`. Reverify the tag-to-digest mapping before a later rebuild; changing a digest is a reviewed dependency change.

## Root-owned launch acceptance

Only after an authorized host and DNS record point at it:

```sh
docker compose --env-file ops/self-host/.env.runtime -f compose.self-host.yml up -d
docker compose --env-file ops/self-host/.env.runtime -f compose.self-host.yml ps
```

- `/api/health` is liveness only and makes no dependency call.
- `/api/runtime/readiness` performs one bounded, read-only `api.healthcheck()` against managed Supabase and returns only sanitized state. A 503 must not restart the application.
- Verify Caddy's certificate, exact public origin, Auth callback allowlist, login/logout/session refresh, cross-origin rejection, two-user isolation, and token-free logs. Real Auth/API execution is outside this packet and remains root-owned.
- Do not enable AI or persistence flags in this first packet. Those need their separately accepted contracts and, for provider calls, explicit paid-call authority.
- Keep the image command at `node server.js`: the build replaces that entry file with the mandatory sealed pre-server gate and retains Next's generated entry as internal `next-server.js`. A rejected configuration exits with code 78 before application code can open the listen socket; invoking `next-server.js` directly is an unsupported bypass.

## Logs and rollback

Access logs are JSON, mode `0600`, bounded by size/count/age, and delete known Auth/invitation query values plus credential headers. Never enable request/response body logging. Review logs for internal authorities and token-shaped values before accepting the host.

Record the accepted application image digest. Rollback means restoring the prior reviewed image/Compose commit and recreating only these two containers; do not delete Caddy data/config volumes. This packet makes no database migration, so rollback has no database action.

## Capacity limitation

One instance on approximately 2 vCPU, 4 GB RAM, and 50–80 GB SSD is only a sizing hypothesis. Measure clean-build memory, image size, runtime RSS/CPU, p95 latency, cache/log/disk growth, restart time, and 10-user concurrency before calling it sufficient. Do not add a second instance until cache, rate-limit, and idempotency coordination are designed and verified.

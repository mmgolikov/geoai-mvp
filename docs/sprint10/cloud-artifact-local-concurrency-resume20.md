# Cloud artifact local concurrency acceptance — Resume 20

Status: **PASS** on 2026-09-19. Scope was one isolated local PostgreSQL clone over the Colima Unix socket; no hosted project, network API, paid service, or source database was mutated.

## Exact run

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node scripts/sprint10-cloud-concurrency-check.mjs

GEOAI_SPRINT10_CLOUD_RACE_DATABASE=geoai_cloud_artifacts_race_20260919_resume20 GEOAI_SPRINT10_CLOUD_RACE_CONFIRM=clone-from-geoai_cloud_artifacts_20260919_r2:geoai_cloud_artifacts_race_20260919_resume20 PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node scripts/sprint10-cloud-concurrency-check.mjs --run-local

shasum -a 256 supabase/migrations/20260918203424_point_object_project_artifacts_v1.sql scripts/sprint10-cloud-concurrency-check.mjs supabase/tests/sprint10_point_object_project_artifacts.sql
```

Docker target: `geoai-sprint10-restore` via `unix:///Users/mmgolikov/.colima/geoai-sprint10/docker.sock`. Source database: `geoai_cloud_artifacts_20260919_r2`. Retained clone: `geoai_cloud_artifacts_race_20260919_resume20`.

## Checksums and source preservation

- Held migration SHA-256: `9c832b821ca0adff9b10cc4ab61a5f3d2195e85f6d0aef3ca05fdcf4bd31f958` (`32,727` bytes).
- Harness SHA-256: `a89b6343b8b789e225e0eb71458cca09f8946cce8167256e85701b45e90876ca`.
- pgTAP SQL SHA-256: `728f09d0304cccb039691d918c305a5a4073e40da3af3babd1978d3f5b95540f`.
- Source before/after: `0` artifact rows; row digest `d41d8cd98f00b204e9800998ecf8427e`; put-function digest `187c73f361e5f437e4fe6f492a211400`; scope digest `13ed08176945b98dae5f98d9b8f460e0`. All matched exactly.
- The clone receipt confirmed `incoming_view_revision > saved.view_revision` and absence of the old one-step predicate.

## Runtime results

- pgTAP: `62` planned, `62` passed, `0` failed.
- Count quota: committed 29→30 race produced exactly `30` rows and one winner; the loser received SQLSTATE `54000`.
- 8 MiB quota: current `7,195,324` bytes; each candidate `1,098,851` bytes; one fit, both exceeded; exactly one committed winner and one SQLSTATE `54000` loser.
- Different actors: two committed rows with the same browser-local keys, without mutual blocking.
- CAS: one committed winner, one `stale_cloud_revision` loser, one retained row at cloud revision `2` and view revision `1`.
- Deadlocks: `0` before and `0` after.
- Deactivation: `2` idempotent passes; `38` rows retained with digest `580ec69da67a89b238f98a6148fe7a5f`; APIs/private functions/policies removed, RLS and FORCE RLS retained, scope disabled, authenticated RPC denied.

Errors: no SQL, pgTAP, assertion, timeout, or deadlock failures. The container health label was `unhealthy` during the read-only preflight, but the bounded PostgreSQL acceptance completed successfully in about eight seconds. The synthetic clone was intentionally retained for review.

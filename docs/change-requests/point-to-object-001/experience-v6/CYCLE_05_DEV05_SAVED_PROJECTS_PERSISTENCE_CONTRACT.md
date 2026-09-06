# CYCLE-05 DEV-05 Saved Projects Persistence Contract

Status: Candidate implementation contract · browser-local active · cloud persistence deferred/default-off
Authority baseline: `833b575561853942530bb4766d04c2ad8ae06b31`
Product surface: Point-to-Object Analyse / Find / Create and `/projects`

## Current deploy-safe behavior

Completed Point-to-Object operations are saved only in versioned browser `localStorage` scoped to the current browser identity (`demo:<user-id>` or `user:<user-id>`). The UI must state **on this device** and must not imply cloud sync, tenant durability, collaboration, backup or official evidence custody.

Each completed operation is stored as a discriminated `schemaVersion: 1` envelope with:

- project and artifact IDs;
- operation kind (`analyse`, `find`, or `create`);
- locale and market;
- completion timestamp;
- stable retry `idempotencyKey`;
- canonical SHA-256 `payloadHash`;
- the bounded operation payload needed to reopen without another source or AI request.

The store is bounded to 20 projects, 30 completed artifacts per project, 768 KiB per artifact and 4 MiB per identity-scoped store. Drafts do not replace completed artifacts. A repeated save with the same key and hash replays the prior receipt; the same key with a different hash fails closed as a conflict. A failed browser write keeps the in-memory pending envelope so Retry uses the same key and never repeats the source or AI operation.

Auth transitions clear transient selection/question/analysis/find/restore session keys. Saved project stores remain identity-scoped and are never enumerated across identities.

## Reopen contract

- Analyse restores the validated selection and completed analysis session, then opens the analysis route. The analysis client must not auto-run AI when a valid completed result exists.
- Find restores the completed result, shortlist and comparison state, then opens the map in Find mode. It performs no automatic source request.
- Create restores the AOI, editor snapshot, full generation receipt (`mode`, `generatedAt`, `promptVersion`), generated alternatives, active alternative and captured area context. The first restored render suppresses automatic area-context fetching.

Every surface retains the mandatory caveat:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Deferred cloud envelope

Cloud persistence is **not implemented or activated in DEV-05**. A later Main-approved remediation package may adapt the same logical envelope only after all prerequisites below are physically verified on an exact named environment:

1. canonical migration replay and the July identity/Admin project-create chain;
2. request-scoped verified user identity and active project membership;
3. an API-only PostgREST allowlist and least-privilege grants;
4. caller-owned project creation and project/member isolation;
5. immutable operation-key semantics: identical hash replay, mismatched hash conflict, no last-write-wins overwrite;
6. bounded JSON validation before database calls and server-owned actor/project scope;
7. no-session, wrong-user, wrong-project, disabled-member, viewer, analyst and owner/admin personas;
8. retention/deletion, backup/recovery, audit and protected Storage decisions.

The remote operation shape should remain discriminated and versioned:

```ts
type PointObjectCloudOperationV1 = {
  schemaVersion: 1;
  projectKey: string;
  operationKind: "analyse" | "find" | "create";
  idempotencyKey: string;
  payloadHash: string;
  completedAt: string;
  payload: unknown; // replaced by the exact per-kind validated DTO before activation
};
```

The server must derive actor and permitted project scope from the verified caller; it must never accept them from this payload. Hosted Supabase schema, RLS, Auth, Storage and source custody remain unverified for this Candidate until a separately authorized physical read-back and replay proves them.

## Rollback

Code rollback is a revert of the DEV-05 Saved Projects commit. Browser-local data is additive and isolated by a new key prefix; rollback leaves it dormant and does not delete user browser data. No remote schema, row, policy, Auth, Storage, environment or deployment rollback is required because DEV-05 performs none of those mutations.

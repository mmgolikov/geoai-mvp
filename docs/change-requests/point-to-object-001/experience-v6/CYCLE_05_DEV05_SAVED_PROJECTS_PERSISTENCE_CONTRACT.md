# CYCLE-05 DEV-05 Saved Projects Persistence Contract

Status: Candidate implementation contract · correction R1 · browser-local active · cloud persistence deferred/default-off
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

The store is bounded to 20 projects, 30 completed artifacts per project, 768 KiB per artifact and 4 MiB per identity-scoped store. Existing completed artifacts are never evicted, reset or overwritten to make space. The 31st completed operation returns an actionable capacity result and remains in a bounded, per-operation pending queue. Retry retains the operation's original identity, destination project, immutable payload and idempotency key even if another operation succeeds or the active project changes. If the destination remains full, the user may explicitly choose **New project & save**; ordinary Retry never moves the result. Queue saturation is reported before accepting another pending operation and never silently drops an accepted result.

Find shortlist/comparison changes and Create A/B selection are non-generative view state. They update a numbered view revision on the same saved completed artifact only after confirming that its source result or generated concept is byte-equivalent to the saved immutable payload. They do not create another completed artifact, consume project capacity, or call a source/model. Distinct Find source responses, Analyse responses and paid Create generations remain distinct completed artifacts. A repeated completed-operation save with the same key and hash replays the prior receipt; the same key with a different immutable result fails closed as a conflict.

The browser store read contract distinguishes `missing`, `ready`, `damaged` and `inaccessible`. Strict per-kind runtime validators and SHA-256 verification run before result-dependent fields are displayed, restored or extended. A malformed, partially damaged or hash-mismatched namespace is never normalized to an empty store and never overwritten. Original bytes remain untouched; the UI provides a controlled error and blocks writes until the namespace is repaired outside this package.

Auth transitions clear transient selection/question/analysis/find/restore session keys. Saved project stores remain identity-scoped and are never enumerated across identities. Every async save captures its initiating identity and destination project. Completion revalidates the current browser identity marker before writing; an identity change leaves that operation pending under the original identity.

## Reopen contract

- Analyse restores the validated selection and completed analysis session, synchronizes the shared locale context before client navigation and marks the initial saved-result hydration explicitly. The analysis client must not auto-run AI for that hydration. A later explicit language change retains the existing regeneration behavior.
- Find restores the completed result, non-default market and viewport, shortlist and comparison state, then opens the map in Find mode. It performs no automatic source request.
- Create restores the AOI, editor snapshot, full generation receipt (`mode`, `generatedAt`, `promptVersion`), generated alternatives, active alternative and captured area context. The first restored render suppresses automatic area-context fetching.

Reopen verifies the initiating identity again after asynchronous hashing and catches selection/session/restore storage failures. EN→saved-RU and RU→saved-EN SPA navigation, reload and back navigation must preserve the saved result without an implicit AI/source call.

Save failures expose a compact accessible recovery control at 390, 768, 1280 and 1440 px in EN/RU. The control reports whether the action is Retry, New project & save, or a blocked damaged/inaccessible store; no permanent developer banner is shown.

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

# Legacy local-only migration drafts

Status: historical, excluded from the canonical Supabase CLI replay chain.

These SQL files predate the migration ledger that was actually applied to the
development Supabase project. They are retained only for provenance and must
not be replayed by `supabase db reset`, `supabase migration up`, CI, Preview,
or an operator runbook.

The clean-replay chain lives in `supabase/migrations` and starts with the
pre-ledger reconciliation artifact `20260705100000`. The exact ten-entry live
ledger starts at `20260705102844`; applied filenames, names, byte counts and
checksums are recorded in `supabase/migration-ledger-baseline.json` and
enforced by CI. The reconciliation still requires a project-bound ledger
repair receipt before any remote push.

Do not move a file back into `supabase/migrations` or repair the live ledger
without an explicit DB-01 history decision, clean replay evidence and a
documented rollback procedure.

# Project Hub Runtime Status Reconciliation v1

## Control

- Change Request: `CR-DEV6-006`
- Confluence: `02.11 Project Hub Runtime Status Reconciliation v1`
- Status: isolated implementation candidate
- Base: current `main` at `24b542c0fc4f3bdb01496483f62ff17d890fd504`
- Merge and Production release: not approved

## Problem corrected

The previous Project Hub diagnostics could conflate public-demo availability, confidential-pilot readiness, authentication and physical Supabase state. Initial client state could also display a false blocked sample-pilot message before runtime data loaded.

## Canonical model

The pilot backend now returns an `executiveStatus` object that separates:

- environment;
- public demo workflow;
- confidential pilot readiness;
- access mode;
- repository mode;
- Supabase runtime reachability;
- Storage runtime reachability;
- detailed canonical status rows.

## Project Hub presentation

- `Public demo workflow` and `Confidential pilot` are independent rows.
- Demo mode is labelled `Public demo access`, never `Pilot access`.
- Loading state is shown as `Checking`, not as a false blocked state.
- The development Supabase schema and buckets are described as not connected/reachable in the current runtime rather than physically missing.
- Manual source readiness is described as an import path, not as an attached snapshot.
- Report cards use `Review-ready screening memo previews`, not client-ready wording.

## Data and security impact

No environment configuration, secret, migration, database write, Auth user, membership, RLS policy, Storage policy or hard-access change. Production remains public-demo/local-fallback until separately approved and activated.

## Required validation

- TypeScript check;
- runtime-status source contract;
- Next.js build;
- `/api/pilot-backend/status` JSON contract;
- `/projects` route smoke;
- Vercel Preview review;
- data-honesty review.

## Required caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

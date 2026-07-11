# Report Contract and Data Honesty Corrections v1

## Control

- Change Request: `CR-DEV6-005`
- Confluence: `02.10 Report Contract and Data Honesty Corrections v1`
- Status: isolated implementation candidate
- Base: current `main` at `24b542c0fc4f3bdb01496483f62ff17d890fd504`
- Merge and Production release: not approved

## Corrections

1. The printable route applies a display-normalization layer to existing and legacy report records.
2. Analysis scenarios use the analysis scenario ID instead of repeating the selected target name.
3. Report timestamps are labelled as saved report timestamps.
4. Scores are labelled as demo deterministic screening scores.
5. Decision/recommendation outputs are labelled as screening posture or screening preference.
6. Static print maps are labelled as schematic context.
7. Canonical caveats are deduplicated while the full required caveat remains visible.
8. Manual source availability is described as an import path, not as an attached/verified snapshot.
9. Printable output is described as a review-ready screening memo preview, not a client-approved deliverable.

## Data impact

No new data source, ingestion, schema, migration or storage write. Existing saved/demo records remain readable. The changes affect presentation and legacy-record normalization only.

## Required validation

- TypeScript check
- Next.js build
- source-contract check
- analysis print route 200
- comparison print route 200
- Preview HTML/visual review
- data-honesty review

## Out of scope

- Production deployment
- new PDF engine
- official/live integration
- Supabase Production activation
- Auth/RLS/hard access
- certified valuation, legal, cadastral, zoning or planning conclusion

## Required caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

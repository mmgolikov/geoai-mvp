# GeoAI Release Authority Lifecycle Decision

Status: Active release-governance decision
Last verified: 2026-07-21
Owner: GeoAI Release Engineering
Authority: Merge-safe release-authority lifecycle model
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Release Authority Policy](RELEASE_AUTHORITY_POLICY.json) · [Historical Last Verified Snapshot](LAST_VERIFIED_RELEASE_SNAPSHOT.json)

## Decision

GeoAI separates three concepts:

1. `RELEASE_AUTHORITY_POLICY.json` is stable repository policy and schema. It contains no exact future Production tuple.
2. `LAST_VERIFIED_RELEASE_SNAPSHOT.json` is historical point-in-time evidence. It is explicitly `historical_last_verified_snapshot` and is superseded whenever newer external release evidence exists.
3. Current operational runtime authority is external post-deployment evidence: GitHub default-branch/merge state, GitHub Deployments or Production environment, the Vercel Production alias and the Project Hub post-release receipt.

Repository CI validates the policy, schema, lifecycle, caveats and historical/current distinction. It cannot claim that it queried live GitHub or Vercel state, and it cannot declare a committed pre-merge SHA or deployment to be future current Production.

## Authority Precedence

| Precedence | Authority | Role |
| ---: | --- | --- |
| 1 | GitHub default branch and merge state | Establishes what has actually merged |
| 2 | GitHub Deployment / Production environment | Binds release workflow evidence to a commit |
| 3 | Vercel Production alias | Identifies the currently served Production deployment |
| 4 | Project Hub post-release receipt | Records owner-reviewed cross-system evidence |
| 5 | Repository historical snapshot | Preserves the last verified point in time only |

An external post-release receipt may supersede the committed snapshot without editing validator source. A later repository change may refresh the historical snapshot for convenience, but freshness is not required for CI correctness and does not create live authority.

## Post-Release Receipt Contract

The external receipt must record: verification timestamp, merged PR, exact main SHA, exact post-merge Quality Gate run, Production deployment ID and URL, READY state, route smoke, runtime log inspection and the required data-honesty caveat. The policy schema defines these fields without pinning any exact release tuple.

## Permanent CI Contract

Permanent CI must reject:

- a historical snapshot labelled current;
- repository-CI claims of live GitHub/Vercel inspection;
- missing policy/snapshot lifecycle fields;
- Production-ready or pilot-ready language;
- missing required caveat.

Fixtures prove that a historical snapshot passes, the same shape labelled current fails, a future main merge needs no validator-source edit, false live-query claims fail, and an external receipt may supersede the repository snapshot.

## Non-Authorizations

This decision does not authorize a merge, Production deployment, Supabase migration/write, Auth/provider/Storage activation, secret change, Figma/design work, real-user execution or protected-data operation.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

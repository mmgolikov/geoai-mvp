# COMPLETE26 — source-scoped copy corrections from actual A01/A02 review

## Change request and boundary

Actual saved A01/A02 responses from the ongoing protected Preview acceptance run
on `1723d95fe80541f6d8b03381683b13c895e3751f` revealed two P2 overgeneralizations.
These corrections are prepared in the isolated successor worktree. They do not
change the frozen control checkout, current Preview or running acceptance batch.
No live/provider/Auth/data call was made to reproduce or test the corrections.

1. A01 had unavailable 400 m urban-fabric aggregates but valid separate nearby
   transport/road records. The server brief incorrectly denied all returned
   distances. The absence phrase now explicitly concerns the area-context sample;
   its radius is included only when the summary is source-bound. Nearby objects
   are not promoted to a complete inventory, nearest-road determination or route.
2. A02 had a Polygon, calculated footprint/perimeter and `building=yes`, but no
   mapped height, floor count or start date. Quick recovery incorrectly said all
   physical attributes were absent. The new EN/RU copy names exactly those three
   missing fields; known geometry and tags remain available and unchanged.

Product commits: `e06f907e444582b611df5662378ed58a3c90542e` and
`5e28e5985ec545bfa8ccd9d4d9fc964586272797`. Only three localized phrase entries
change. Source retrieval, calculations, evidence joins, provider model/prompt
settings, fact validation, recovery allowlists, access and budgets do not change.
The former wording was reproduced failing before each correction.

## Automated regression gates

Node 24, no network:

```sh
node scripts/complete26-access-summary-scope-check.mjs
node scripts/complete26-missing-form-fields-copy-check.mjs
```

- Access: 336 assertions, EN/RU × Q/S/D, unavailable/available/partial access,
  nearby present/absent, frozen-input equality, source/ref/distance negatives,
  no borrowed radius when the aggregate receipt is absent.
- Missing fields: 1333 assertions across 144 combinations. When any relevant
  field is present, old/new full recovery output is identical; otherwise only
  the bounded absence phrase changes. Polygon, 66 m² / 40 m synthetic metrics,
  building tag, source facts and source input remain unchanged.

Both checks are wired into the existing fail-fast CI stage with captured output.
Root and independent reviewers reran both checks. Existing context/point-to-object,
screening-depth, missing-attribute and part-scope checks were also run by the
implementer. These are synthetic regression proofs, not new hosted acceptance.

## Not solved or claimed

The reason A01 urban-fabric acquisition was unavailable is not present in retained
evidence. A01 Standard/Deep used deterministic recovery after a numeric guard
rejection; the original rejected text is absent. A02 Quick also used recovery;
its Standard/Deep model answers were accepted. These copy changes do not establish
unobserved provider content, repair data acquisition, or prove full model quality.

The existing full matrix must finish without being restarted or rebound mid-run.
Then root must reconcile all content findings and validate the exact successor
before release. Prior candidate/CI/live results must keep their original identity.
Initial AI, fresh cloud chain, additional Find/Create, design/document consistency
and Production smoke/rollback remain separate gates. No release is claimed here.

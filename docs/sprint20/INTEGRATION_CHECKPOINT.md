# QUALITY20 integration checkpoint — 2026-09-20 12:26 UTC

Candidate only. Production still `main@21b91c43c2fc8dd61b08962e562601b29dd89c76`, deployment `dpl_AYePGoJLbHmcie2H7sX1biJbbavo`. No promotion/merge implied.

## Exact local evidence

- Optimized build of product code through `87bf3d9`: 81 routes, types/build PASS. Later commits through `4db488c` add tests/harness only.
- Integrated WebKit via loopback HTTPS: 26/26 PASS, QH05 goals/depth/local interactions/EN-RU/390-834-1440, exact Find/comparison regression, prior analysis provenance/state. Synthetic controlled-source responses, not live API acceptance. Evidence `/private/tmp/geoai-quality20-integrated-webkit`.
- Full Chrome 87-case older+new suite: 78 PASS, 9 FAIL. Six Create cases attempt infeasible old small-site fixtures before their controlled response; worker diagnosis/fix pending. One dashboard test expects a superseded local viewing-profile dropdown; `4db488c` replaces with completed-request immutability assertions. One legacy Find reopened a cached exact polygon as Point: root correction pending retest. One saved-Create update changes block count to an infeasible footprint: retain update-failure intent using a height-only edit, pending retest. Evidence `/private/tmp/geoai-quality20-integrated-chrome`. These failures are retained, not a green overall receipt.
- Independent product review found P2 overlapping/duplicate multipolygon shells accepted as complete geometry, and worker-execution failures described as placement failure. Both assigned for correction; no independent release acceptance yet.
- Dashboard test screenshots now go to test-specific output directories, not tracked design evidence. Original Chrome design images preserved; newly rendered WebKit images retained separately.

## Approved environment preparation (not deployed)

Founder explicitly approved existing geoai-dev `pphdqkurxneyagvnnjdt` for closed-MVP Production. Root added and read back these exact Production settings: `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEOAI_ACCESS_ENFORCEMENT_MODE`, `GEOAI_ALLOW_DEMO_PUBLIC`, `GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY`, `GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE`, `NEXT_PUBLIC_AUTH_PASSWORD_ONLY`.

Values enforce Supabase existing-account login, hard authorization, no public demo, dedicated scoped persistence and password-only entry. URL, existing public publishable key and existing project scope reused from the approved protected Preview, in memory. No secret copy, key rotation, Auth-provider alteration, schema/data mutation or email. Preview received only branch-specific password-only build flag. Pre-existing environment metadata, Production deployment and Preview SSO protection read back unchanged. No configuration values or credentials recorded here.

Added environment IDs for exact-target rollback (remove only after root approval/check, never delete a shared scope by name):

| Target | Key | ID |
| --- | --- | --- |
| Production | NEXT_PUBLIC_AUTH_MODE | JCnD3eQUZ0iYhqB9 |
| Production | NEXT_PUBLIC_SUPABASE_URL | wgJkWxIW0pHmz6AY |
| Production | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | YKRaBp75GTylOb2G |
| Production | GEOAI_ACCESS_ENFORCEMENT_MODE | WwbsxSLYdpZhtfT8 |
| Production | GEOAI_ALLOW_DEMO_PUBLIC | rzwXYJgV95XQAulH |
| Production | GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY | nEap4QzOJan9qDzH |
| Production | GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE | JqJjewGmbWlr0B4I |
| Production | NEXT_PUBLIC_AUTH_PASSWORD_ONLY | RLjuyHEe3zJpBsDz |
| Preview, codex/sprint10-control-20260918 | NEXT_PUBLIC_AUTH_PASSWORD_ONLY | wPewUvTTtjfLR4yr |

The Vercel CLI array-body request returned HTTP400 Invalid JSON with zero creations on read-back. The documented single-object form succeeded, each field checked before the next. No blind retry of an unknown mutation.

## Documentation/design and budget

Confluence canonical Current Product & Release `26574901` v17 and Hub `98425` v261 were updated/read back with QH01–05 expected/actual gates; complete previous bodies retained as Historical. Figma candidate contract `TAzDqOvRCw1mQGMU3Y4S9H/2380:147` read back; later rendered-evidence write blocked by old concept-only authority. Root asked founder for exact QUALITY20 clarification; do not claim completed Figma sync.

Codex current 27% vs initial 17%; hard stop42%, feature cutoff31%, planned stop39%. Shared API ledger generation27, accounted estimated-or-reserved USD0.8491575/15; no new paid calls this sprint yet. Receipt13 original uncertainty preserved and entire USD0.30 counted by specific founder approval.

Next: finish remaining core corrections, clean fresh candidate build/CI, actual protected-Preview multi-object API matrix and hosted persistence/isolation, independent acceptance; only then exact Production deployment and post-deploy checks. No claim of bug-free/MVP accepted from these local receipts.

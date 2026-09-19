# Auth default entry corrective change

Scope: protected Preview only; no Production, hosted Auth, membership or storage changes.

The founder's real password login succeeded but bare `/login` sent them to the retained legacy `/workspace`. Prior verification explicitly set `next=/prototype/point-to-object`, so it did not cover the delivered bare login link.

Correction: the default bounded continuation is `/prototype/point-to-object` for the server-rendered login, callback, and defensive page/client gates. Unscoped demo/explore, request-access, registration and onboarding links converge on the current product. Existing explicit approved continuations, including `/workspace?projectKey=...&openAnalysis=...`, remain unchanged. The legacy shell and local data are not migrated or removed.

Verification before publishing: supported Node 24 optimized build (81 routes), Auth/Admin plus new default/hostile/deep-link regression, Auth session/source contracts, and 46 Chrome/WebKit protected-entry/boundary tests passed with zero retries at 390/834/1440 px. The first build was blocked by sandbox font DNS; a subsequent compile exposed the new check's TypeScript extension issue, corrected by making the Node-only check an `.mjs` script. Type settings were not relaxed.

Live acceptance must use bare `/login`, the persistent approved demo user, no synthetic session injection, and assert the actual current-product tabs after login and reload. Publication and live evidence are recorded separately by root against the exact deployed commit; this document alone does not certify deployment or the full MVP.

# Public-demo regression persona alignment

Candidate only; no Production changes or authentication-policy change.

GitHub run `35389954743` at `66a4e61a03e3f034009f3d293923ac4bbf92a5d3` failed the legacy public-demo browser suite (22 passed, 10 failed, 1 not run). The database and protected browser jobs succeeded. The failed expectations awaited an obsolete manual demo-credential form: current explicit `demo_public` already has its public demo identity and `/login?next=…` continues automatically.

This patch changes tests, not the product's access policy. Public-demo suites now assert continuation and keep keyboard-only project creation, comparison, printable reports, mobile navigation, visual captures, corrupted-store containment and logout namespace cleanup. A storage-denied browser may view the explicitly public app but cannot create a durable project: the warning, disabled creation and recovery action are asserted. Public-demo logout clears only its owned data; it does not pretend to protect a public deployment.

Real login coverage remains in the separate `supabase_auth` localhost HTTPS persona. Its entry test adds 834px tablet coverage, keyboard email-field access and serious/critical Axe checks, alongside 390px/1440px checks and screenshots. It does not submit email or use real credentials.

## Evidence before commit

- Local optimized public-demo app, unchanged application source from `b6819ba`: **33/33 Chrome PASS**, 2.1 minutes, retries 0.
- The first restricted-sandbox invocation could not launch Chrome (SIGABRT/EPERM); this was not counted as product failure or acceptance. The normal approved standalone-browser invocation reached the app.
- First functional run: 32/33; the new storage warning locator also matched Next.js's empty route announcer. The selector was scoped to its warning text; the complete 33-test suite then passed.
- TypeScript, Auth/session static contracts, secret hygiene and diff checks passed.
- Root inspected the generated mobile landing visual: readable content and actions without horizontal overflow. Existing visual capture suites passed their layout assertions.
- Protected build and expanded HTTPS browser tests: recorded separately after execution; not inferred from this public-demo result.

These are local/fixture regression receipts. They prove neither paid-provider behavior nor hosted login, cloud persistence, transactional email delivery or pilot readiness. Existing strict server Auth assertions and source/provider guards are unchanged.

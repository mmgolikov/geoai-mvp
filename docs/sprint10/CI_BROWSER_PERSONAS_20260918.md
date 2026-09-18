# Sprint 10 browser-persona correction

The Quality Gate now separates two real application configurations. A browser mock of `/api/auth/session` is never treated as authority to bypass a server-rendered route guard.

## Demo lane

`test:e2e:point-to-object-v5:demo` retains all nine previous suites and adds Sprint 10 analysis lifecycle/provenance, Find persistence races and saved Create 3D. `test:e2e:auth-session:demo` retains the twelve previous product/responsive/accessibility/visual/resilience suites. Both require an explicit `demo_public` server. The request form test now checks the actual `/demo` link instead of an obsolete login URL; no application behavior was changed.

## Anonymous protected lane

The separate `protected-browser` CI job uses `supabase_auth`, hard enforcement and disabled browser-demo access. Its synthetic public key is constructed at runtime and its Supabase URL is loopback-only, with no real credentials or hosted requests.

`test:e2e:auth-persona:protected` preserves the four redirect/local-byte-preservation cases. `test:e2e:auth-boundary:protected` uses the optimized loopback HTTPS harness: Chrome runs the complete original `auth-session-flow` suite plus Sprint 10 entry and API/SSR boundaries; WebKit retains the entry and API/SSR boundaries. The enumerated HTTPS total is 22 cases. OTP tests intercept requests locally; they do not deliver email or SMS.

The normal demo build and API/report checks remain independent. No test is skipped or removed, and failures retain their status. Hosted authenticated identity, real API quality and database isolation still require separate live acceptance; this wiring does not establish those results.

## Local evidence before CI dispatch

- Application `59a18fb` (Create integration on accepted Find/analysis): optimized build 80/80 PASS.
- Updated test wiring: static auth-session and public-request contracts PASS; secret hygiene PASS; diff check PASS.
- Chrome: 21/21 PASS, 49.0 seconds, no retries (Create, analysis lifecycle, Find races, request form).
- WebKit: 16/16 PASS, 23.4 seconds, no retries (Create, analysis lifecycle, Find races).
- Root visually inspected fresh desktop B and mobile A 3D captures: base and tower tops are visible, with no horizontal overflow.
- Full system-stabilization evidence check remains incomplete locally because the PDF evidence bundle was not generated in this run. Its missing-artifact failure was not suppressed; the full CI step generates the required files first.
- Full new CI and hosted Preview verification are pending at this document's initial commit.

The Supabase CLI's local link cache is ignored explicitly; it must never be staged or used as source-controlled configuration.

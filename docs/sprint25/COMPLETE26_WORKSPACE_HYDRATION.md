# COMPLETE26 — preserve active workspace choices during metadata hydration

## Change request

Root-owned correction on the existing integration branch. The existing CI run
36187347629 at 2da333717500c18eead88edc26d164cac8ce9b89 failed the unchanged
Product-primary test after completing a candidate analysis. The selected
Criteria-first button became inactive, not a different selected colour.

The trace contains a successful `/api/projects` response after 1,922 ms. Its
callback reapplied initial role/scenario/mode/filter defaults after the user had
already searched and analysed a candidate. The JSON-error catch did the same.
The callback also restored the project captured before any intervening user
project selection.

## Intended correction

Apply initial defaults once in the existing initialization effect. A subsequent
project-list response refreshes metadata for the **currently selected** project,
without changing its identity or resetting scenario, mode, filters, shortlist
or completed analysis. Failed metadata refresh keeps already initialized local
state. Explicit user project/audience/scenario changes retain their existing
reset behavior. No authorization, persistence, palette or provider changes.

## Verification

Add deterministic browser cases for a response held until after a completed
analysis (successful JSON and malformed JSON), and a response held until after
a user project switch. Assertions cover `aria-pressed`, the existing teal
token, the exact completed dashboard identity, refreshed metadata and selected
project identity. No mock response is presented as live API acceptance.

Before correction: the two completed-analysis cases reproduce Criteria-first
becoming false, and the project-switch case reproduces a return to Dubai
Investment Screening; the original failed CI receipt is retained. Test setup's first
cold-server attempt missed automatic login navigation; the helper now waits for
the existing redirect before trying manual demo entry. That setup failure is
not counted as product evidence.

After correction: three deterministic race cases plus the original unchanged
Product-primary case passed in Chromium (4/4, no retries); TypeScript and the
project-isolation contract passed. The delayed successful response still updates
project names, so the test does not pass by suppressing metadata hydration.

Final verification results and exact integrated commit are recorded in the
COMPLETE25 execution state and fresh CI. Main/Production are unchanged by this
local correction; release remains acceptance-gated.

## Independent review correction: project-only links

The first correction did not resolve a `projectId`-only cloud link when the
identifier was absent from the initial local list. The exact optimized build
50a5115 reproduced this: after server metadata arrived, the selected project
remained Dubai Investment Screening instead of the requested synthetic remote
project. An explicit intervening project selection was correctly preserved.
CI36191628554 was cancelled rather than accepting that known defect.

Resolve the initial identifier against local projects, then once against server
metadata if still unresolved. Track intervening explicit user choices so this
one-time resolution never overwrites a user-selected project, target, scenario,
mode, filter, query or guided demo. The existing history callback also receives
a defensive guard, but it currently has no rendered UI caller: no runtime
history-reopen defect is claimed. Access checks and project memberships are
unchanged; this is client selection, not permission to read a remote project.

Two new remote-link tests cover default resolution and an intervening project
change. A separate independent spec covers a local project-key-only link with
a different saved active project, and an intervening mode change while a remote
identifier is pending. All are explicitly synthetic local browser regressions.

Independent Chromium before-check on optimized50a5115: local identity fails both
before and after the delayed metadata response; explicit Criteria-first is
preserved (1 FAIL / 1 PASS). Root WebKit before-check: remote UUID resolution
fails while explicit project switching is preserved (1 FAIL / 1 PASS). Browser
sandbox launch failures and the first helper's incorrect Map-first setup
assertion are retained separately, not counted as product failures.

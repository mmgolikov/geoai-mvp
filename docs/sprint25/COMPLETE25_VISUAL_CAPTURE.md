# COMPLETE25 — scoped public-result visual capture

This is an opt-in evidence helper, not a claim that the live 58-case batch, its AI quality, or cloud persistence has passed. Main alone owns the live invocation, private output directories, credentials, accounting and integration. No product code or provider call is added by this change.

## Exact integration contract

`captureNight21AnalysisDashboard(page, writer)` is exported by `tests/e2e/helpers/night21-visual-evidence.ts`. `writer` is the existing `createVisualEvidenceWriter` instance or `null`; null does nothing. Call after the actual `ai-success` visible assertion and completed-depth assertion, before local save/reopen. The helper does not create another writer or revalidate an already populated directory.

The existing opt-in token `write-public-map-png-evidence-v1` and private directory variables remain unchanged for compatibility. The newly accepted scope is exactly `quality20-analyse`. It permits exactly these two additional views, captured sequentially:

| View | Actual locator | What it proves visually when reviewed |
| --- | --- | --- |
| `analysis-dashboard` | `ai-success` → direct `section` containing `analysis-caveat` | Completed AI decision brief: headline, summary, returned answer when present, caveat |
| `analysis-decision-cards` | `ai-success` → `role-decision-cards` | Actual visual dashboard: hero metrics, scenario-specific modules and charts, returned/unknown evidence states |

Both views require the exact `/prototype/point-to-object/analysis` path and one visible successful result. The second requires `SCENARIO_DECISION_DASHBOARD_V3`, a hero-metric container and at least one module. Its scenario and depth must match `analysis-request-state`'s completed attributes, with no request in flight. Draft controls do not determine the screenshot identity. A `passed` analysis index requires both views; a later failure can retain the first view only under failed/inconclusive outcome.

The existing four map views and their scope permissions are unchanged. In FA Find→Analyse cases, skip the Find screenshot because the scope is `quality20-analyse`, then capture both analysis panels after the AI assertions. Separate F cases keep their Find comparison screenshot. Main wires the opt-in and a distinct private directory for every case; this helper never creates directories or launches a batch.

## Capture and privacy boundaries

- Only locator screenshots of these two whole panels. No full-page capture, header/navigation/profile/auth capture, page screenshot, viewport resizing, visual restyling, clipping, hidden content removal, opened drilldowns, input edits, navigation or AI replay. Scrolling the exact locator into view is the sole presentation action.
- Before and after each screenshot, require the exact public panel ancestry, useful finite dimensions, no overlap with header/navigation/forms/profile/auth/dialog content, no embedded image/iframe/form/editable input in the panel, and no private-shaped email/credential text in rendered panel text or overlapping inputs. These are conservative leakage guards, not a general personal-data classifier: only reviewed public-source/synthetic-question cases are authorized inputs.
- Width/height at most 8192 pixels and area at most 16,777,216 pixels. Existing limits stay **six images per writer and 5 MiB per PNG**. A panel exceeding a cap fails explicitly; it is never silently cropped, reduced or substituted. PNG dimensions must match the observed panel before and after capture. Any post-capture guard failure prevents writing those bytes.
- Existing canonical 0700 real-directory requirements, 0600 exclusive files, symlink/no-overwrite checks, fsync, read-back and SHA-256 indexing remain. No output path, account identifier, email, prompt or text body is added to the index.
- The index keeps `geoai.public-map-visual-evidence.v1` for compatibility. Analyse explicitly uses `capture: real_browser_public_analysis_panels_after_assertions`; old map scopes retain `real_browser_map_canvas_after_assertions`. `authOrProfileCaptured:false` remains a guard-backed scope assertion, not a claim of unrestricted sanitization.

## Offline verification and remaining live work

`scripts/night21-visual-evidence-check.mjs` tests opt-in/scope boundaries, both-view completion, private file/hash read-back and unchanged map guards. Synthetic DOM callbacks test wrong pages, hidden/duplicate panels, completed-scenario/depth mismatch, in-flight state, missing modules, wrong ancestry, tiny/oversized dimensions, private overlap/embedded content/text, changing text after capture, PNG mismatch, sequential capture and duplicate suppression. The mock buffers are not rendered product screenshots or acceptance evidence.

No browser, network, live AI or account is invoked by this check. Main must still run the authorized exact-candidate cases, inspect the actual two images per analysis case and retain honest failure indices. These captures do not cover the entire long report, every collapsed detail, local reopen, cloud persistence, mobile responsiveness or EN/RU by themselves.

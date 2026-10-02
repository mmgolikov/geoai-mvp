# REVIEW02 — Map and Create Geometry Local Receipt

Status: Candidate / Local verification PASS / Integration and hosted acceptance pending

Date: 2026-10-02

Owner: dev_1 (`01a01607-80cd-7fa1-a1eb-48fc8d37c4b4`)

Scope: M1 / C1 / C2 only

## Authority and decision

The assigned checkout is `worktrees/review02-map`, branch `codex/review02-map`, based on exact clean commit `649df98d9550c5c7f7f6d1b8c508641424f0fedb`. The controlling brief is `deliverables/2026-10-02-preview-review/CHANGE_REQUEST.md`; `REVIEW_STATE.json` records REVIEW02 as RUNNING and assigns this worker map rendering, selection, Create geometry and panel ownership. Historical DEV-G2A and DEV-05 are not resumed.

Decision: ready for Root integration and independent QA, **not** accepted as an exact-founder-case fix or a hosted release. Root is the sole integrator/deployer. No push, deployment, paid provider call, cloud write, Auth change, environment/secret change, or main/Production action was performed by this worker.

## Bounded corrective implementation

| Item | Change | Safety boundary |
| --- | --- | --- |
| M1 | Resolve a uniquely hit roof/wall member of the same rendered MultiPolygon; add thin, depth-tested known-height wire edges. | Ambiguous/unprojectable hits remain unresolved; no nearby POI reassignment, height inference or canonical-footprint upgrade. |
| C1 | Keep the flat/generalized AOI mask through the z13–14 presentation transition and reconcile both transition thresholds. | Native conflict suppression at z14+ remains fail-closed; saved GeoJSON is not regenerated. |
| C2 | Fresh/reset geometric defaults scale block count/setback with site geometry, retaining the existing 12-block cap. Recover clustered/no-fit non-tower layouts between 5 and 15 ha using validated distributed cells. | Preserve successful legacy local layouts, requested manual controls, exact clearance/coverage validators and small-site single-podium tower behavior. |
| Invalid controls | Mark invalid coverage/open-space, courtyard block count and podium levels immediately with red treatment, explanation, `aria-invalid` and `aria-describedby`; disable generation. | Values and the last committed/saved result remain intact; stale worker replies are rejected. Only untouched fresh defaults may adopt a validated coverage suggestion, with a visible explanation. |

The custom layer explicitly configures premultiplied blend/read-only depth, restores all modified GL state in `finally`, restores upload bindings, and deletes its owned resources on removal/style recreation. The installed MapLibre 6.9.0 public custom-layer render input supplies the projection matrix. Implicit Mercator is recognized from `shaderData.variantName`; unsupported non-Mercator projection fails closed. Reference: [MapLibre public custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/).

## File manifest

Product files:

- `components/point-to-object/create-panel.tsx`
- `components/point-to-object/create-result-preview-3d.tsx`
- `components/point-to-object/live-object-map.tsx`
- `src/lib/prototype/point-to-object-create.ts`
- `src/lib/prototype/point-to-object-map-selection.ts`
- `src/lib/prototype/point-to-object-volume-edges.ts`

Regression files:

- `scripts/review02-create-geometry-check.ts`
- `scripts/review02-map-selection-check.ts`
- `tests/e2e/point-to-object-create-reliability.spec.ts`
- `tests/e2e/review29-map-persistence.spec.ts`

This receipt is the eleventh file. Package/lockfile, CI, source/rate contracts, routes, shared i18n, Auth and dashboard/data-lane files are unchanged.

## Local verification lane

Final tests and build used bundled Node **24.19.0**, Next **15.5.25**, React **19.2.7**, MapLibre **6.9.0**, Playwright **1.61.1** and TypeScript **5.9.3**. Browser tests ran against the isolated dev server at `http://127.0.0.1:3132`; that server was started under Node 20, while the runner and subsequent production build/smoke used Node 24. Both local servers and the smoke browser were stopped after use. Reviewer: dev_1; independent integrated QA is pending.

| Check | Result / exact boundary |
| --- | --- |
| `npm run lint` | PASS (TypeScript no-emit contract). |
| `npm run build` | PASS; 81/81 static pages generated. Expected webpack cache-size performance warnings only. |
| Final targeted browser aggregate | **19 passed / 0 failed / 0 skipped / 0 errors**, one worker, `--fail-on-flaky-tests`, no focused-pass substitution. Three specs: `review29-map-persistence`, `point-to-object-create-reliability`, `sprint10-create-preview`. Not the whole-app aggregate or hosted CI. |
| Browser continuity | EN desktop/RU mobile invalid fields, save → Projects → Show on map → result Show on map, no extra generation, zoom 13.25/14.25/16/17, A/B, style recreation, 2D/3D and persisted geometry continuity PASS. |
| Geometry script | 16 synthetic 6.63 ha alternatives, fresh defaults at 3 area scales × 5 programmes, plus 10 large-site default alternatives PASS. Large defaults retain count 12 and primary-center span >0.35 in both axes. Zero network calls. |
| Selection/GL script | 12 roof/wall/hole/ambiguity/unknown-height/edge checks plus 2 success/throw state-restoration cases PASS. Zero network calls. |
| Existing Create/replacement contracts | `test:point-to-object-create`, `test:point-to-object-map-replacement`, large-site L/U/narrow/skew/rotated cases, five-programme and tower-distribution oracles PASS. |
| Stability/performance | Three geometric performance runs 415.3/418.9/411 ms; golden SHA remains `4146b81d324d8fdef9ea706706eaec2ae18854b884e7241f3aa0bbcfc06d22eb`. |
| Safety contracts | Request-scoped project read, SOURCE connector foundation and AOI integrity (11 personas) PASS; no Auth/SOURCE/persistence expansion. |
| Data honesty | AST scan 479 files / 0 findings; 111 reviewed matches. |
| Diff / secret hygiene | PASS; final staged secret-hygiene scan covers 1,427 tracked paths. |
| Built localhost routes | `/`, `/workspace`, `/projects`, `/prototype/point-to-object` HTTP 200. `/explore` and `/demo` retain baseline HTTP 307 to `/prototype/point-to-object`. |
| Built localhost APIs | Health, DB health, activation and pilot status HTTP 200; `public_demo_prototype`, `diagnostics_withheld`, read/write false, `public_demo_only`, confidential pilot false, `browser_local`, `not_production_ready_or_pilot_ready`. Sanitized local diagnostics, not hosted read-back. |

Authoritative local browser artifact: `artifacts/auth-session-e2e-junit.xml`, tests=19, failures=0, skipped=0, errors=0, recorded time=110.02188399999999s; first suite timestamp `2026-10-02T19:41:23.316Z`. SHA-256: `9b38ae116addb27060e65467928f00232f60d01d6daab090f56c0623c3f64eca`.

Data-honesty artifact: `artifacts/data-honesty-claim-scan.json`, SHA-256 `6d19d24171671ae973fe3d0f65a607faaf8374c87b858e421b1a359526ff1df8`. Screenshots are under `artifacts/playwright-auth-session/`, including `review02-pitched-roof-selected.png`, EN/RU invalid-control and saved-Show-on-map captures, intermediate zoom captures and saved 2D/3D previews.

The sorted array of `{path,sha256}` for the ten product/regression files above has SHA-256 **`b9981326e7b8453cb27b4547f86311111dbb5cc8122904be5cb4366e6b876b24`**. Verification ran on baseline plus that exact working tree before commit; verifying the committed blobs against this digest binds the local commit to the tested code. The new receipt is excluded from this code digest. The JUnit itself does not contain a commit SHA and must not be relabelled as hosted exact-head evidence.

Intermediate failures were corrected rather than hidden: adaptive-count fixtures reported inconsistent floor extrema; a validation description changed accessible field names; the first broader cell-allocation attempt broke legacy single-podium/oriented-campus contracts and was narrowed. Final existing contracts and the unified 19-case run passed. No assertion tolerance, timeout or native-conflict safety policy was weakened.

## Facts, hypotheses and unverified acceptance

- Confirmed locally: synthetic geometry recovery, site-scale default distribution, selection identity, saved artifact continuity, immediate invalid-field treatment and tested zoom/style behavior.
- Main recovered the founder's saved concept through the existing browser UI: reported 66,268 m² / 6.63 ha / 5 blocks / 23% coverage / 149,475 m². Baseline screenshots show missing concepts. Exact AOI/geometry was not exported to this worker.
- **Unverified:** the precise cause and resolution of C1 for that same saved founder artifact. A similar synthetic polygon is not exact-case acceptance. The old intermediate-zoom test already passed before hardening.
- **Unverified:** integrated hosted Preview, broad CI, independent usefulness/visual QA, full browser unknown-height stress and globe/terrain behavior. Helpers reject unknown/nonpositive heights; no full unknown-height browser certification is claimed.
- C3 normalized source context and meaningful demand/capacity guidance belong to Root/data integration, not this change. No invented school requirement, planning rule, source custody, demand or financial assumption was added.
- Geometry defaults are local starting hypotheses, not zoning, demand, feasibility or official planning conclusions. A synthetic distribution test does not prove every real AOI can fit every programme.
- Interviews, WTP observations, proposals and paid pilots performed by this worker: **0 / 0 / 0 / 0**. No research economics entered runtime output. No new dataset, licence, residency or official-live status was asserted.

Required caveat remains: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Root handoff, rollback and measurement

Root should integrate the scoped local commit with the data lane and register the two new script checks, then run one broad integrated CI and independent QA. Hosted acceptance must reopen the **same saved founder artifact** without regeneration and verify visible concept count, unchanged AOI/massing hashes, native collision status, scale/style/A/B/reopen continuity and EN/RU layouts. If the exact case still fails, diagnose that gate without weakening native overlap containment.

Rollback: revert this scoped local commit in the integration branch if necessary; preserve saved GeoJSON and the last working Preview. No destructive reset or production rollback was executed or authorized here.

Main cycle start: `2026-10-02T18:42:32Z`; first locally observed work timestamp `18:45:28Z`; final evidence review at approximately `19:51:31Z` (~66 minutes observed local elapsed). Exact active/wait time and tokens are unavailable (`null`), not inferred from account counters. Main's assignment records `gpt-6.1-sol / xhigh`; actual runtime model telemetry was not independently exposed. No model escalation or subagent was used. The initial worker forecast of 60–90 minutes is preserved; integration/hosted acceptance time is separate.

Production/main changed: **false**. External outreach performed: **false**. Secrets/personal data accessed: **false**. Domain DD status: **PARTIAL**. External mutations by this worker: **none**; only assigned local code, tests, generated local artifacts and a scoped local commit.

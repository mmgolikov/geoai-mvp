# COMPLETE26 focused-answer provenance — local UI correction

Status: isolated candidate on `codex/complete26-answer-provenance-ui` from `ebf7c348b7eefba357630b0c54d0b406ec891dd3`. Not integrated, deployed or accepted on the active frozen batch. The observed P2 and evidence limits are in `deliverables/2026-09-20-product-quality/evidence/COMPLETE26_EBF7C34_A01_CONTENT_REVIEW.md`; the A01 Standard result carried `answerProvenance.kind=deterministic_recovery`, while its visible PARTIAL/confidence labels did not disclose the answer's origin. The rejected model prose was not retained, so this change makes no claim about why validation rejected it.

Only a parsed focused result with `answerProvenance.kind === "deterministic_recovery"` displays one short note immediately after the answer statement: “This answer uses source evidence because the model response could not be verified.” / «Этот ответ опирается на данные источников, поскольку ответ модели не удалось проверить.» The note applies both to the main focused-answer box and the custom-question result in decision cards. It does not display the internal rejection code, imply official validation, claim absent context as zero, change the general Completed analysis heading, or trigger a retry. `model_validated`, legacy missing-provenance, no-question and non-answer rendering are unchanged. Existing session storage already persists the provenance field; no schema/parser/cache/provider modification was made.

## Bounded offline proof

- Before UI edits, the new Chrome fixture test failed in both EN 1440 and RU 390 exactly at the missing note (`Expected: 1; Received: 0`).
- After edits, `complete26-answer-provenance-ui.spec.ts`: Chrome 2/2 and WebKit 2/2 PASS on loopback. It covers legacy absence, model-validated absence, recovery presence at both answer locations, no raw rejection code, unchanged saved bytes after reload, no automatic extra request and no horizontal overflow. The screenshots are local synthetic fixture evidence, not real AI or cloud evidence.
- `npm run lint` (TypeScript) PASS. `npm run build` did **not** pass: the offline environment could not resolve `fonts.googleapis.com` for `next/font` Geist. No network permission was sought to work around the restriction. A later run of the older adjacent provenance browser spec was stopped after stalling at its fourth case; it is not claimed PASS. The targeted new suite was rerun successfully after restarting the local dev server.
- The new spec is added to the existing complete25 and product-HTTPS Playwright spec lists. Collection-only checks found both EN/RU cases in both configurations; this is CI scheduling, not execution on protected Preview.

No Auth, source, provider, paid, private-ledger or hosted operation occurred. Exact-head CI/Preview and full product acceptance remain Main-owned after the active batch.

## Main verification, 26 September 2026, 23:05–23:09 UTC

The earlier blocked build and stopped adjacent run above are preserved as history. On unchanged product commit `8cc09c79a1d8466166fd16b4d273cf2f1b8afbcd`, Main obtained a successful optimized build after allowing its normal font download:81/81 pages, TypeScript/build PASS, build ID `Mtw53Hho-V87mMVENd5h2`. No product code or environment files were changed to obtain this result.

Against that separate loopback production-mode build, the new UI spec and existing `complete26-answer-provenance.spec.ts` both completed: Chromium6/6 in11.2s, WebKit6/6 in15.4s, zero failures/skips/errors/retries. This includes the formerly unfinished adjacent invalid-provenance case; its past stall was not reproduced, but its historical cause is not established. JUnit artifacts: `artifacts/complete26-ui-root-optimized-{chromium,webkit}.xml`. Main inspected fresh readable EN1440/RU390 recovery-answer screenshots; the note wraps without clipping. Fixture data, local persistence and the loopback-only WebKit HTTP transport exception do not prove live AI, cloud, Hosted TLS or all viewport/locales.

The local server was stopped and port3216 released. The active hosted batch and frozen control/Production were untouched. Main also detected the newly added Markdown file was absent from the generated documentation navigation; only those generated sidecars were refreshed before future integration. Final exact-head CI/Preview and remaining release gates are still required.

## Locale/viewport regression extension, 23:19–23:23 UTC

The focused UI spec now covers EN and RU at390,834 and1440 pixels in both Chromium and WebKit. All12 executions passed, zero retries (Chrome12.8s, WebKit14.5s), against the same optimized product build above. Tests additionally keep the displayed recovery origin stable while the user changes the draft depth, require no automatic request, check both preset/custom note visibility, preserve saved bytes on reopen, and capture both answer locations. JUnit hashes: Chromium `b733fb4fc5b937761baabdc31b2691e8e1ba3f8926efbf9deacd2262a793b789`; WebKit `e9dd82bae925c8aeda144e68fcbda0b59e714367d615be5e6028a41cfb7ed884`.

Main inspected readable screenshot crops including both mobile locales and834/1440 layouts: the note wraps and the cards have no observed horizontal clipping. Synthetic English response prose in a RU interface is retained fixture content, not evidence of a live Russian model answer. Product files did not change; only regression coverage changed. The second isolated server was also stopped after testing. This does not close the new A08 server-copy issue, full-map visual acceptance, hosted TLS, cloud or final-head CI.

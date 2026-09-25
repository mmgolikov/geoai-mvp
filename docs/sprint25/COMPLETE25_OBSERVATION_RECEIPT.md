# COMPLETE25 — Analyse observation receipt parity

The existing E2E producer emits `responseHash`, `resultHash`, and `analysisEvidenceCaptured`; the root runner rejected these otherwise valid annotations as unknown keys after the paid test. This fix accepts only the complete trio on registered Analyse IDs. Both hashes must be exactly 64 lowercase hexadecimal characters and the capture flag must be a JSON boolean. Unknown keys, raw content, arbitrary evidence, invalid values, partial trios and use on Find/Create remain rejected. Historical observations without the trio remain readable.

The fields preserve the producer's meanings: untouched AI wire-response hash, sanitized result hash, and whether the optional private evidence file was written. The flag is not model correctness, cloud persistence or release acceptance.

Offline checks: **59 PASS** in `node --experimental-strip-types scripts/complete25-observation-check.mjs`; adjacent `sprint10-live-journey-runner-offline-check.mjs`, `sprint10-live-journey-diagnostics-check.mjs`, `sprint10-hosted-auth-probe-check.mjs`, and `sprint10-hosted-auth-live-check.mjs` all PASS. Hosted lifecycle tests use injected transport/personas, not actual accounts or network. `git diff --check` PASS.

No change to persona lifetime/one-child guard, paid dispatch, budget, source hashing, retry authority or external state. Root must still resolve the distinct two-persona batch and Create source acquiredAt issues before executing the full matrix.

# COMPLETE26: preserve bounded fabric acquisition diagnostics

COMPLETE25 follow-up, isolated candidate only; no claim that current frozen 1723d95 or real A01/A03 availability is fixed.

## Problem and bounded change

The server pack already records `source.fabricDiagnostic.failureCode`, but Context omitted it. Forward an optional `subject.fabricDiagnostic` containing exactly that enum from the same frozen pack. `available` permits only null; `unavailable` permits timeout, rate_limited, invalid_response, response_too_large or unavailable. Source status must also match the pack's geoContext coverage.

The server omits absent, malformed or inconsistent optional diagnostics without changing the valid subject or coverage. It never invents a cause. The client preserves historical absence, and intentionally returns null for a response that explicitly supplies malformed/inconsistent metadata, matching its strict optional climate/receipt behavior. It does not replace that response with valid empty context. No UI changes or automatic retries are introduced.

## Evidence and invariants

`complete26-fabric-diagnostic-check.mjs` first failed on the original real Context route: a synthetic frozen timeout diagnostic became undefined. The new check exercises all five codes, success-null, absence, malformed/extra-key values, status mismatches, stripping unrelated source metadata and the real client parser. It runs the installed Next cache with synthetic RAM source/Auth ports: Context acquisition and repeated lease reads retain the same receipt/hash/diagnostic with only one source-builder call per fixture.

No Auth enforcement, source query, TTL, evidence hash, HTTP cache header, model, cost or paid retry changes. The extra data is not added to model prompts or saved AI response schemas. The existing session test loader maps the real new lightweight module; assertions are unchanged.

Offline Node24 results: new diagnostic check 129 PASS; existing evidence lease 40 PASS; source retrieval 13 PASS; source budget 6 PASS; full `test:point-to-object-geocontext` (including the actual session dataURL loader) and `test:point-to-object` PASS; TypeScript, lint and diff check PASS. Source-builder counts in the new test are synthetic ports, not network calls. No browser, deployed execution or real upstream diagnosis was performed.

This preserves the reason observed at original acquisition, not a new observation or proof of current service health. A valid partial pack can retain unavailable fabric during its existing 15-minute lease. Raw errors, endpoints, credentials and coordinates are never included in the diagnostic. Historical causes cannot be reconstructed; the actual A01/A03 failure remains unknown from their earlier captured responses.

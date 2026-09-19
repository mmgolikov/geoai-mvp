# Create Area Context timeout adjustment

Status: Candidate-only handoff; no hosted execution or release claim  
Date: 19 September 2026

## Evidence and bounded decision

The retained Singapore Create run reached the authenticated Area Context source and ended around 7.2 seconds with a retryable HTTP 504, while the browser reported an aborted response. The prior provider query declared a six-second maximum execution time. A separate root-operated, ordinary public-provider diagnostic used the exact same query once and returned HTTP 200 in 6,471 ms with 49 valid elements, 17,155 response bytes and query SHA-256 `ef5b83214d148b9568e0d09cb4c2716f40fa18deb531b40f803d257839005c5c`.

This proves the source and query were accessible during the later diagnostic. It does not prove whether the earlier failure was provider load shedding, a caller cancellation, or another transient transport condition. The Overpass documentation describes the query timeout as a declared maximum execution time; transient load shedding remains possible.

The candidate therefore extends only the Area Context query declaration from 6 to 12 seconds. Twelve seconds remains strictly inside the unchanged 24-second physical upstream cancellation, 40-second route deadline and 50-second browser deadline. Find is unchanged. The endpoint, one-attempt policy, memory budget, response-size cap, selector set, 300-element upstream cap, 80-feature return cap and one-square-kilometre AOI cap are unchanged. Runtime timeouts remain retryable HTTP 504 and require an explicit user Retry; there is no automatic retry, fallback source or paid escalation.

The adjacent caller-cancellation correction remains in place so a disconnected or expired caller is no longer mislabeled as an upstream failure. This improves future evidence but cannot retroactively establish the earlier root cause.

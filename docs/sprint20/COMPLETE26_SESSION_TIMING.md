# Session confirmation timing, COMPLETE25 candidate correction

Status: candidate diagnostics only, not a released fix
Date: 2026-09-26
Baseline: 61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9

The current live batch ended3/58: token exchange succeeded but the following session GET was aborted after10019ms. The browser had not entered the live driver's additional session check. Existing Vercel entries show invocation statuses, not the duration of each verification dependency. The exact slow stage remains unknown.

The added server-only diagnostics record start/finish/error and monotonic duration for the exact `/api/auth/session` middleware claims and route claims/user/profile operations. IDs are generated UUIDs, not user identities; cookie/header/response/exception contents are never recorded. `finish` means a fulfilled promise, not successful authentication. Middleware and route IDs are separate and require platform/time correlation. Diagnostics cannot change authorization, return values, errors or cookie handling. Other middleware paths retain the original code.

Local validation: timing privacy/result/error/inactive-path/logger-failure/pending-operation regression; auth SSR, request-scoped project read, source connector, AOI integrity, original source-middleware deadline and TypeScript checks. Independent review confirmed the scoped delta. One initial static source matcher failed after wrapping all ordinary middleware paths; restricting the wrapper to the exact session path restored the unchanged adjacent contract. This historical failure is not a runtime Auth defect.

The10s browser limit and all claims/permanent-user/active-profile/expected-UUID requirements remain unchanged. This change does not prove successful live login, fix the observed no-response delay, complete the58-case matrix, or authorize release without fresh evidence.

# Sprint 10 Static Contract Refresh Review

Status: **GO**

Reviewed candidate: `e5fd1194adcd5157ec92b7c338cebd9b329917ed`  
Compared with: `dd96946f38dcee4a2769c29cbeb06c0538a70650`  
Review mode: bounded read-only source review plus previously completed offline checks; no live keys, provider calls, browser work, external writes, or application changes.

## Decision

The four static-harness corrections are suitable for integration. The diff is limited to the four check scripts and `docs/sprint10/CONTRACT_REFRESH_HANDOFF.md`; it does not change application, source, provider, geometry, identity, authorization, or mutation-origin runtime modules.

No blocking finding was identified. The corrections restore the harnesses to the current contracts without weakening fail-closed behavior:

1. The request-size harness stubs only role/scenario normalization so that it can reach the UTF-8 body-size guard. It still proves the 80,000-byte boundary, typed `413`, and zero upstream/provider calls. Real role/scenario behavior remains covered by the dedicated provenance check.
2. The autocomplete harness keeps its synthetic identity and mutation-origin stubs scoped to the isolated data-URL route fixture. Static ordering now requires identity, mutation-origin, runtime, same-origin, body parsing, rate limiting, and provider execution in the intended sequence, and explicit `401`/`403` negative cases remain present.
3. The aggregate point-to-object contract now registers the TypeScript/alias hooks needed by the current source tree and imports the real `point-to-object-ai-provenance.ts` module rather than replacing it with a permissive provenance stub. Prompt-version fixtures are refreshed while retaining the declared compatibility cases.
4. The V5 interaction check now asserts the real `pointObjectAnalysisTargetMatches(...)` helper. That is stronger than the former raw-string equality assertion because the helper requires a valid, non-empty OSM `node|way|relation/<positive integer>` identity and exact match.

Source-real-module coverage remains intact: the provenance helper and current route/source modules are loaded from the repository; test doubles are limited to the intended route-fixture boundaries. Existing geometry assertions, provider-call suppression, provenance/identity checks, and fail-closed no-result behavior were not relaxed.

## Offline evidence already completed

The following checks passed on the reviewed candidate with Node 24:

- `npm run test:point-to-object`
- `npm run test:point-to-object-autocomplete`
- `npm run test:point-to-object-v5-interaction`
- `npm run test:point-to-object-runtime-gate`
- `node --experimental-transform-types scripts/point-to-object-analysis-provenance-check.ts`
- `npm run test:api-access-guards`
- `npm run test:data-honesty`
- `git diff --check dd96946..e5fd119`

The runtime-gate evidence included Production fail-closed cases, actual-route identity/origin rejection before body parsing or upstream work, source-route offline checks, default-deny Production surfaces, source recovery, Production middleware, the 80,000-byte request limit, typed failure, zero provider calls on rejection, and the Sprint 09 budget assertions.

## Non-blocking observation

`scripts/point-to-object-analysis-provenance-check.ts` is a dedicated substantive role/scenario and target-identity check and passed when invoked directly, but it is not currently a named `package.json` static-gate command. This is pre-existing and is not caused by `e5fd119`; do not interpret the aggregate static command alone as exhaustive coverage of every registry pair. Wiring that dedicated check into a future gate would improve discoverability, but it is not required to accept this bounded harness refresh.

## Integration note

The expected stale root lifecycle artifact remains a root-owned regeneration step. Regenerate it after integrating the candidate and before treating lifecycle validation as current; the known stale artifact does not convert this review into a NO-GO for the four harness fixes themselves.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const fixtureGlobal = globalThis as typeof globalThis & {
  __pointObjectOversizedRequest?: unknown;
};

fixtureGlobal.__pointObjectOversizedRequest = {
  // The JavaScript string is under 80,000 UTF-16 code units while its UTF-8
  // representation is over 80,000 bytes, so the check cannot regress to `.length`.
  evidenceProjection: "🙂".repeat(21_000)
};

const source = readFileSync(new URL("../src/lib/prototype/point-to-object-ai.ts", import.meta.url), "utf8")
  .replace('import "server-only";', "")
  .replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";',
    "const getPointObjectUpstreamStatus = () => ({ enabled: true });")
  .replace(/import \{[\s\S]*?\} from "\.\/point-to-object-ai-core";/,
    "const buildPointObjectResponsesRequest = () => globalThis.__pointObjectOversizedRequest;")
  .replace(/import type \{ GroundablePointObjectEvidencePack \} from "\.\/point-to-object-live-evidence";/, "")
  .concat("\nexport { requestOpenAi as __requestOpenAiForCheck };\n");

const service = await import(`data:text/javascript;base64,${Buffer.from(
  stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })
).toString("base64")}`) as {
  POINT_OBJECT_AI_MAX_REQUEST_BYTES: number;
  PointObjectAiServiceError: new (...args: any[]) => Error & { code: string; httpStatus: number };
  __requestOpenAiForCheck(...args: any[]): Promise<unknown>;
};

assert.equal(service.POINT_OBJECT_AI_MAX_REQUEST_BYTES, 80_000);

const originalFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = (async () => {
  providerCalls += 1;
  throw new Error("The oversized request must fail before fetch.");
}) as typeof fetch;

try {
  await assert.rejects(
    () => service.__requestOpenAiForCheck(
      "offline-placeholder-not-a-credential",
      {},
      { depth: "deep", goal: "redevelopment", perspective: "developer", horizon: "current", question: null, locale: "en" },
      { model: "gpt-5.6-sol", reasoningEffort: "high", verbosity: "low", maxOutputTokens: 5_200, timeoutMs: 82_000 },
      Date.now() + 90_000,
      null
    ),
    (error: unknown) => error instanceof service.PointObjectAiServiceError &&
      error.code === "AI_REQUEST_TOO_LARGE" && error.httpStatus === 413
  );
  assert.equal(providerCalls, 0, "An oversized serialized request must fail closed without dispatching fetch.");
} finally {
  globalThis.fetch = originalFetch;
  delete fixtureGlobal.__pointObjectOversizedRequest;
}

console.log("point-to-object-ai-request-limit-check: PASS (UTF-8 80k cap, typed failure, zero provider calls)");

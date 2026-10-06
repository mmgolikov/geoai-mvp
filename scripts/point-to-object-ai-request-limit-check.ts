import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";

const comparisonCoreUrl = new URL("../src/lib/prototype/point-to-object-comparison-core.ts", import.meta.url);
const contractsUrl = new URL("../src/lib/point-to-object/contracts.ts", import.meta.url);
const provenanceUrl = new URL("../src/lib/prototype/point-to-object-answer-provenance.ts", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === comparisonCoreUrl.href && specifier === "./point-to-object-normalized-context") {
      return nextResolve(new URL("./point-to-object-normalized-context.ts", comparisonCoreUrl).href, context);
    }
    if (context.parentURL === comparisonCoreUrl.href && specifier === "../point-to-object/contracts") {
      return nextResolve(contractsUrl.href, context);
    }
    return nextResolve(specifier, context);
  }
});

const fixtureGlobal = globalThis as typeof globalThis & {
  __pointObjectOversizedRequest?: unknown;
};

fixtureGlobal.__pointObjectOversizedRequest = {
  // The JavaScript string is under 80,000 UTF-16 code units while its UTF-8
  // representation is over 80,000 bytes, so the check cannot regress to `.length`.
  evidenceProjection: "🙂".repeat(21_000)
};

const serviceSource = readFileSync(new URL("../src/lib/prototype/point-to-object-ai.ts", import.meta.url), "utf8");
function loadableService(input: string): string {
  let transformed = input;
  function one(pattern: RegExp, replacement: (match: string, names: string) => string) {
    assert.equal([...transformed.matchAll(pattern)].length, 1, `Missing/duplicate service import: ${pattern.source}`);
    transformed = transformed.replace(pattern, replacement);
  }
  one(/^import "server-only";/gm, () => "");
  one(/^import \{ getPointObjectUpstreamStatus \} from "@\/src\/lib\/ai\/openai-upstream-gate";/gm, () => "const getPointObjectUpstreamStatus = () => ({ enabled: true });");
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-ai-core";/gm, () => "const buildPointObjectResponsesRequest = () => globalThis.__pointObjectOversizedRequest;");
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-answer-provenance";/gm, (_match, names) => `import {${names}} from ${JSON.stringify(provenanceUrl.href)};`);
  one(/^import \{ pointObjectAnalysisRoleScenarioOrUnspecified \} from "\.\/point-to-object-ai-provenance";/gm, () => 'const pointObjectAnalysisRoleScenarioOrUnspecified = () => ({ role: "unspecified", scenario: "unspecified" });');
  one(/^import \{([^{}]*?)\} from "\.\/point-to-object-comparison-core";/gm, (_match, names) => `import {${names}} from ${JSON.stringify(comparisonCoreUrl.href)};`);
  one(/^import \{ LIVE_POINT_CAVEAT \} from "\.\.\/point-to-object\/contracts";/gm, () => `import { LIVE_POINT_CAVEAT } from ${JSON.stringify(contractsUrl.href)};`);
  const javascript = stripTypeScriptTypes(transformed, { mode: "transform", sourceMap: false });
  const permitted = new Set([provenanceUrl.href, comparisonCoreUrl.href, contractsUrl.href]);
  for (const match of javascript.matchAll(/\b(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)) assert.ok(permitted.has(match[1]), `Unresolved/unapproved service import: ${match[1]}`);
  assert.doesNotMatch(javascript,/\bimport\s*\(/,"Unresolved/unapproved service import: dynamic imports are not supported");
  assert.match(javascript, /const getPointObjectUpstreamStatus =/);
  return javascript;
}
const reorderImports = /^import \{[^{}]*?\} from "(?:\.\/point-to-object-answer-provenance|\.\/point-to-object-comparison-core|\.\.\/point-to-object\/contracts)";/gm;
const declarations = [...serviceSource.matchAll(reorderImports)].map(match => match[0]);
assert.equal(declarations.length, 3);
for (const declaration of declarations) {
  const coreDeclaration = serviceSource.match(/^import \{[^{}]*?\} from "\.\/point-to-object-ai-core";/m)![0];
  for (const move of [declaration + "\n" + serviceSource.replace(declaration, ""), serviceSource.replace(declaration, "").replace(coreDeclaration,coreDeclaration+"\n"+declaration), serviceSource.replace(declaration, "") + "\n" + declaration]) loadableService(move);
  assert.throws(() => loadableService(serviceSource.replace(declaration, "")), /Missing\/duplicate/);
  assert.throws(() => loadableService(serviceSource + "\n" + declaration), /Missing\/duplicate/);
}
for (const extra of ['import { absent } from "./unknown-runtime";', 'await import("@/unknown-runtime");']) assert.throws(() => loadableService(serviceSource + "\n" + extra), /Unresolved\/unapproved/);
for(const pattern of [/^import "server-only";/m,/^import \{ getPointObjectUpstreamStatus \} from "@\/src\/lib\/ai\/openai-upstream-gate";/m,/^import \{[^{}]*?\} from "\.\/point-to-object-ai-core";/m,/^import \{ pointObjectAnalysisRoleScenarioOrUnspecified \} from "\.\/point-to-object-ai-provenance";/m]){const declaration=serviceSource.match(pattern)![0];assert.throws(()=>loadableService(serviceSource.replace(declaration,"")),/Missing\/duplicate/);assert.throws(()=>loadableService(serviceSource+"\n"+declaration),/Missing\/duplicate/);}
const source = loadableService(serviceSource) + "\nexport { requestOpenAi as __requestOpenAiForCheck };\n";

const service = await import(`data:text/javascript;base64,${Buffer.from(
  source
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

console.log("point-to-object-ai-request-limit-check: PASS (9 import-order cases, 16 rejected import mutations; UTF-8 80k cap, typed failure, zero provider calls)");

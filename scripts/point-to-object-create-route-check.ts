import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, repositoryRoot).href, context);
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Canonical resolution below. */ }
    }
    return nextResolve(specifier, context);
  }
});

const repositoryRoot = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}/`) : new URL("../", import.meta.url);
const { conceptTemplate } = await import(new URL("src/lib/prototype/point-to-object-create.ts", repositoryRoot).href);
const controls = { blockCount: 10, levelsMin: 10, levelsMax: 53, targetSiteCoveragePct: 42, openSpacePct: 32, setbackM: 10 };
const allKeys = Object.keys(controls);
const negative = [[[37.62, 55.75], [37.62063845, 55.75], [37.62063845, 55.75036186], [37.62, 55.75036186], [37.62, 55.75]]];
const feasible = [[[37.62, 55.75], [37.621596, 55.75], [37.621596, 55.750905], [37.62, 55.750905], [37.62, 55.75]]];
const fixtureGlobal = globalThis as typeof globalThis & { __geoaiCreateSourceCalls?: number };
const previousSourceCalls = fixtureGlobal.__geoaiCreateSourceCalls;
fixtureGlobal.__geoaiCreateSourceCalls = 0;

// Execute the actual handler and geometry. Only platform/source adapters and
// network transport are fixtures; no environment file or live key is accessed.
const source = readFileSync(new URL("app/api/prototype/point-to-object/create/route.ts", repositoryRoot), "utf8")
  .replace('import { NextResponse } from "next/server";', `
    const process = { env: { VERCEL_ENV: "preview", OPENAI_API_KEY: "offline-placeholder-not-a-credential" } };
    const NextResponse = { json(body, init = {}) { return new Response(JSON.stringify(body), {
      status: init.status ?? 200, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    }); } };
  `)
  .replace('import { getPointObjectPreviewUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";',
    'const getPointObjectPreviewUpstreamStatus = () => ({ enabled: true });')
  .replace('import { resolvePointObjectAreaContext } from "@/src/lib/prototype/point-to-object-area-context";',
    'const resolvePointObjectAreaContext = async () => { globalThis.__geoaiCreateSourceCalls += 1; return null; };')
  .replace(/from "@\/([^\"]+)";/g, (_match, relative: string) =>
    `from ${JSON.stringify(new URL(`${relative}.ts`, repositoryRoot).href)};`);
const route = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })).toString("base64")}`) as {
  GET(request: Request): Promise<Response>;
  POST(request: Request): Promise<Response>;
};
const origin = "https://preview.example.test";
const url = `${origin}/api/prototype/point-to-object/create`;
let providerCalls = 0;
let providerBehavior: "success" | "no-retail" | "network-error" = "success";
const providerInputs: Array<Record<string, unknown>> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  assert.equal(String(input), "https://api.openai.com/v1/responses", "All network attempts must terminate in the offline provider fixture.");
  providerCalls += 1;
  const requestBody = JSON.parse(String(init?.body));
  providerInputs.push(JSON.parse(requestBody.input[1].content[0].text));
  if (providerBehavior === "network-error") throw new TypeError("Offline network failure");
  const programme = { ...conceptTemplate("commercial_hub", "en"), ...controls };
  if (providerBehavior === "no-retail") {
    programme.useMix = [{ use: "office", sharePct: 70 }, { use: "hospitality", sharePct: 24 }, { use: "open_space", sharePct: 6 }];
    programme.summary = "Office and hospitality programme without retail.";
  }
  return new Response(JSON.stringify({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(programme) }] }],
    usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120, input_tokens_details: { cached_tokens: 0 } }
  }), { status: 200, headers: { "Content-Type": "application/json", "x-request-id": "offline-request" } });
};

async function invoke(aoiCoordinates: number[][][], ip: string, requestOrigin = origin, requestedControls = controls, customPrompt: string | null = null) {
  const challengeResponse = await route.GET(new Request(url));
  assert.equal(challengeResponse.status, 200);
  const { challenge } = await challengeResponse.json() as { challenge: string };
  const cookie = challengeResponse.headers.get("Set-Cookie")?.split(";")[0];
  assert.ok(cookie);
  return route.POST(new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: cookie, "x-forwarded-for": ip },
    body: JSON.stringify({ marketKey: "moscow", locale: "en", depth: "standard", templateId: "commercial_hub",
      customPrompt, controls: requestedControls, lockedControlKeys: allKeys, aoiCoordinates, challenge })
  }));
}

try {
  const denied = await invoke(feasible, "203.0.113.91", "https://other.example.test");
  assert.equal(denied.status, 403);
  assert.equal(providerCalls, 0);
  assert.equal(fixtureGlobal.__geoaiCreateSourceCalls, 0);

  const nofit = await invoke(negative, "203.0.113.92");
  assert.equal(nofit.status, 422);
  const nofitBody = await nofit.json();
  assert.equal(nofitBody.telemetry.providerCalls, 0);
  assert.equal(nofitBody.telemetry.estimatedCostUsd, 0);
  assert.equal(providerCalls, 0, "The actual handler must return fixed no-fit before calling the provider.");
  assert.equal(fixtureGlobal.__geoaiCreateSourceCalls, 0);

  // The 100 m square inset cannot cover 60% at a 20 m setback. Unlike the
  // elongated baseline fixture, this probe must remain a suggestion after
  // future placement improvements rather than freezing the old solver bug.
  const suggestionControls = { ...controls, blockCount: 4, targetSiteCoveragePct: 60, setbackM: 20 };
  const suggested = await invoke(feasible, "203.0.113.93", origin, suggestionControls);
  assert.equal(suggested.status, 422);
  const suggestedBody = await suggested.json();
  assert.equal(suggestedBody.mode, "programme_adjustment_required");
  assert.ok(suggestedBody.suggestion.suggestedValue < suggestionControls.targetSiteCoveragePct);
  assert.equal(suggestedBody.telemetry.providerCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(fixtureGlobal.__geoaiCreateSourceCalls, 0);

  const success = await invoke(feasible, "203.0.113.94");
  assert.equal(success.status, 200);
  const successBody = await success.json();
  assert.equal(successBody.mode, "openai_concept");
  assert.equal(providerCalls, 1);
  assert.equal(fixtureGlobal.__geoaiCreateSourceCalls, 1);
  for (const key of allKeys) assert.equal(successBody.program[key], controls[key as keyof typeof controls]);
  assert.equal(successBody.massing.generatedBlockCount, 10);
  assert.equal(successBody.telemetry.totalTokens, 120);

  providerBehavior = "network-error";
  const failure = await invoke(feasible, "203.0.113.95");
  assert.equal(failure.status, 502);
  const failureBody = await failure.json();
  assert.equal(providerCalls, 2);
  assert.equal(failureBody.telemetry.attempts, 1);
  assert.equal(failureBody.telemetry.estimatedCostUsd, null, "Unknown provider usage must not become zero billed cost.");

  providerBehavior = "no-retail";
  const customPrompt = "Keep towers on a podium, with no retail.";
  const custom = await invoke(feasible, "203.0.113.96", origin, controls, customPrompt);
  assert.equal(custom.status, 200, "Numeric locks must not force the template use mix over custom intent or trigger a repair.");
  const customBody = await custom.json();
  assert.equal(providerCalls, 3, "A valid custom programme requires one provider attempt, not a template-mismatch repair.");
  assert.equal(providerInputs.at(-1)?.customIntent, customPrompt);
  assert.equal(providerInputs.at(-1)?.requestedUseMix, null);
  assert.deepEqual(providerInputs.at(-1)?.requestedParameters, controls);
  assert.ok(customBody.program.useMix.every((item: { use: string }) => item.use !== "retail"));
  assert.ok(customBody.massing.featureCollection.features.every((item: { properties: { use: string } }) => item.properties.use !== "retail"));
  assert.equal(customBody.telemetry.attempts, 1);
  console.log("Create actual-route offline checks passed: origin, no-fit, suggestion, success, unknown-usage failure and custom intent without template override. No live network or credentials used.");
} finally {
  globalThis.fetch = originalFetch;
  if (previousSourceCalls === undefined) delete fixtureGlobal.__geoaiCreateSourceCalls;
  else fixtureGlobal.__geoaiCreateSourceCalls = previousSourceCalls;
}

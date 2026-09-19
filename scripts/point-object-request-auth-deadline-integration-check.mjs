import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/src/lib/auth/auth-mode") return {
      url: "data:text/javascript,export%20const%20getEffectiveAuthMode%20%3D%20()%20%3D%3E%20%27supabase_auth%27",
      shortCircuit: true
    };
    if (specifier === "@/src/lib/supabase/ssr-server") return {
      url: `data:text/javascript,${encodeURIComponent(`
        export const createRequestScopedSupabaseClient = async (signal) => {
          globalThis.__geoaiRequestAuthDeadlineSignals.push(signal);
          return null;
        };
      `)}`,
      shortCircuit: true
    };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return {
      format: "module",
      shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url })
    };
    return nextLoad(url, context);
  }
});

globalThis.__geoaiRequestAuthDeadlineSignals = [];

const { withPointObjectSourceRequestDeadline } = await import("../src/lib/prototype/source-request-deadline");
const { createRequestAuthContext } = await import("../src/lib/auth/request-context");

const controller = new AbortController();
const sourceRequest = new Request("https://geoai.example.test/api/prototype/point-to-object/find", { method: "POST" });
const boundRequest = withPointObjectSourceRequestDeadline(sourceRequest, controller.signal);
const boundedContext = await createRequestAuthContext(boundRequest);
assert.equal(boundedContext.status, "public_config_missing");
assert.equal(globalThis.__geoaiRequestAuthDeadlineSignals[0], controller.signal,
  "the real request-context must pass the exact route deadline signal into the scoped Supabase client");

const ordinaryRequest = new Request("https://geoai.example.test/api/auth/session");
const ordinaryContext = await createRequestAuthContext(ordinaryRequest);
assert.equal(ordinaryContext.status, "public_config_missing");
assert.equal(globalThis.__geoaiRequestAuthDeadlineSignals[1], undefined,
  "ordinary Auth callers must retain the no-deadline client path");

const requestContextSource = readFileSync(new URL("../src/lib/auth/request-context.ts", import.meta.url), "utf8");
assert.match(requestContextSource, /pointObjectRequestAuthDeadlineSignal\(request\)/);
assert.doesNotMatch(requestContextSource, /Symbol[.]for\("geoai[.]point-object[.]request-auth-deadline-signal"\)/,
  "request-context must not retain an independent signal channel");

console.log("point-object request Auth deadline integration: exact signal wiring and ordinary-path isolation PASS");

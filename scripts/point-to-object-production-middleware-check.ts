import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, repositoryRoot).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Canonical resolution below. */ }
    }
    return nextResolve(specifier, context);
  }
});

const repositoryRoot = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}/`) : new URL("../", import.meta.url);
const { getRequestedAuthMode } = await import(new URL("src/lib/auth/auth-mode.ts", repositoryRoot).href);
const fixtureGlobal = globalThis as typeof globalThis & {
  __geoaiMiddlewareAuthMode?: string;
  __geoaiMiddlewareSessionCalls?: number;
};
fixtureGlobal.__geoaiMiddlewareSessionCalls = 0;

const source = readFileSync(new URL("middleware.ts", repositoryRoot), "utf8")
  .replace('import { NextResponse, type NextRequest } from "next/server";', `const NextResponse = {
    next() { return new Response(null, { status: 200, headers: { "x-geoai-middleware": "next" } }); },
    json(body, init = {}) { return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: init.headers }); }
  };`)
  .replace('import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";',
    'const getEffectiveAuthMode = () => globalThis.__geoaiMiddlewareAuthMode;')
  .replace('import { updateSupabaseSession } from "@/src/lib/supabase/update-session";',
    'const updateSupabaseSession = async () => { globalThis.__geoaiMiddlewareSessionCalls += 1; return NextResponse.next(); };')
  .replace(/from "@\/([^\"]+)";/g, (_match, relative: string) =>
    `from ${JSON.stringify(new URL(`${relative}.ts`, repositoryRoot).href)};`);
const loaded = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })).toString("base64")}`) as {
  middleware(request: unknown): Response | Promise<Response>;
};

const paths = ["context", "search", "suggest", "find", "area-context"];
function request(path: string, origin = "https://geoai.example.test") {
  const url = `https://geoai.example.test/api/prototype/point-to-object/${path}`;
  return {
    method: "POST",
    url,
    nextUrl: new URL(url),
    headers: new Headers({
      Origin: origin,
      Host: "geoai.example.test",
      "sec-fetch-site": origin === "https://geoai.example.test" ? "same-origin" : "cross-site",
      "x-forwarded-host": "geoai.example.test",
      "x-forwarded-proto": "https"
    })
  };
}

process.env.VERCEL_ENV = "production";
delete process.env.NEXT_PUBLIC_AUTH_MODE;
delete process.env.OPENAI_API_KEY;
assert.equal(getRequestedAuthMode(), "demo_public", "The default public Production auth mode must remain demo_public.");
fixtureGlobal.__geoaiMiddlewareAuthMode = getRequestedAuthMode();
for (const path of paths) {
  const response = await loaded.middleware(request(path));
  assert.equal(response.status, 200, `${path} must pass global middleware in the default public mode.`);
  assert.equal(response.headers.get("x-geoai-middleware"), "next");
}
assert.equal(fixtureGlobal.__geoaiMiddlewareSessionCalls, 0);

fixtureGlobal.__geoaiMiddlewareAuthMode = "supabase_auth";
for (const path of paths) {
  const response = await loaded.middleware(request(path));
  assert.equal(response.status, 200, `${path} must pass same-origin middleware interception when Supabase Auth is effective.`);
  assert.equal(response.headers.get("x-geoai-middleware"), "next");
}
assert.equal(fixtureGlobal.__geoaiMiddlewareSessionCalls, paths.length);

const crossOrigin = await loaded.middleware(request("context", "https://other.example.test"));
assert.equal(crossOrigin.status, 403, "The existing global cross-origin interception must remain enforced.");
assert.match(crossOrigin.headers.get("Cache-Control") ?? "", /no-store/);

console.log("Point-to-object Production middleware checks passed: all five named routes continue in default public and same-origin authenticated modes, while cross-origin interception remains denied.");

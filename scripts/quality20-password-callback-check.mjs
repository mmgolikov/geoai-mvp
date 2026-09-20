import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");
const originalLoad = Module._load;
const originalFlag = process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
let clientCalls = 0;
let exchangeCalls = 0;

Module._load = function (name, parent, isMain) {
  if (name === "next/server") {
    return {
      NextResponse: {
        redirect: (url) => new Response(null, { status: 307, headers: { Location: String(url) } })
      }
    };
  }
  if (name.endsWith("/src/lib/supabase/ssr-server")) {
    return {
      createRequestScopedSupabaseClient: async () => {
        clientCalls += 1;
        return {
          auth: {
            exchangeCodeForSession: async (code) => {
              exchangeCalls += 1;
              assert.equal(code, "valid-pkce-code");
              return { error: null };
            }
          }
        };
      }
    };
  }
  return originalLoad.call(this, name, parent, isMain);
};

require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(
  readFileSync(filename, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_all, _quote, path) =>
    JSON.stringify(new URL(`../${path}`, import.meta.url).pathname)),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
).outputText, filename);

try {
  const callback = require("../app/auth/callback/route.ts");

  process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = "true";
  const blocked = await callback.GET(new Request(
    "https://geoai-mvp.vercel.app/auth/callback?code=valid-pkce-code&next=%2Fprojects"
  ));
  assert.equal(blocked.status, 307);
  assert.equal(
    blocked.headers.get("location"),
    "https://geoai-mvp.vercel.app/login?auth_error=password_only_required&next=%2Fprojects"
  );
  assert.equal(blocked.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.match(blocked.headers.get("vary") ?? "", /Cookie/);
  assert.equal(clientCalls, 0, "password-only callback must stop before creating a Supabase client");
  assert.equal(exchangeCalls, 0, "password-only callback must never exchange a PKCE code");

  const missingCode = await callback.GET(new Request(
    "https://geoai-mvp.vercel.app/auth/callback?next=https%3A%2F%2Fevil.example"
  ));
  assert.equal(missingCode.status, 307);
  assert.equal(missingCode.headers.get("location"), "https://geoai-mvp.vercel.app/login?auth_error=invalid_callback");
  assert.equal(clientCalls, 0);
  assert.equal(exchangeCalls, 0);

  process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = "false";
  const allowed = await callback.GET(new Request(
    "https://geoai-mvp.vercel.app/auth/callback?code=valid-pkce-code&next=%2Fprojects"
  ));
  assert.equal(allowed.status, 307);
  assert.equal(allowed.headers.get("location"), "https://geoai-mvp.vercel.app/projects");
  assert.equal(clientCalls, 1);
  assert.equal(exchangeCalls, 1);

  console.log("quality20-password-callback-check: PASS (password-only fails before client/code exchange; normal PKCE and existing callback negatives preserved)");
} finally {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
  else process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = originalFlag;
  Module._load = originalLoad;
}

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const load = (path, dependencies) => {
  const module = { exports: {} };
  vm.runInNewContext(transpile(fs.readFileSync(path, "utf8")), { module, exports: module.exports, process, require: (name) => dependencies[name] ?? require(name) });
  return module.exports;
};
const previous = process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
try {
  const policy = load("src/lib/auth/password-only-policy.ts", {});
  for (const value of [undefined, "false", "1", "yes"]) {
    if (value === undefined) delete process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
    else process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = value;
    assert.equal(policy.isPasswordOnlyAuthEnabled(), false);
  }
  process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = "true";
  assert.equal(policy.isPasswordOnlyAuthEnabled(), true);

  // Execute the actual provider function bodies, with all network access fatal.
  const providerText = fs.readFileSync("components/auth/auth-provider.tsx", "utf8");
  const ast = ts.createSourceFile("provider.tsx", providerText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const provider = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "AuthProvider");
  const names = ["signIn", "signInWithPhone", "verifyPhoneCode", "requestEmailChange", "register"];
  const bodies = provider.body.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map((node) => node.getText(ast)).join("\n");
  assert.equal(provider.body.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).length, names.length);
  const context = {
    ...policy,
    authStatus: { effectiveMode: "supabase_auth" },
    session: { user: { email: "fixture@example.test" }, isDemo: false },
    // The real phone-code handler checks an in-progress logout before its
    // password-only guard. Exercise the ordinary settled-session branch.
    logoutPendingRef: { current: false },
    loadSupabaseBrowserClient: () => { throw new Error("Network/client access forbidden"); }
  };
  vm.createContext(context);
  vm.runInContext(transpile(bodies), context);
  for (const name of names) {
    const result = await context[name]("fixture@example.test", "123456");
    assert.equal(result.ok, false, name);
    assert.equal(result.message, policy.passwordOnlyAuthMessage, name);
  }

  // Render the real login component with controlled React state and auth actions.
  // This is a component/handler contract, not a hosted or browser persona.
  for (const [flag, mode, identifier, password, expected] of [
    ["true", "supabase_auth", "demo@geoai.space", "fixture-password", "password"],
    ["true", "supabase_auth", "fixture@example.test", "", null],
    ["false", "supabase_auth", "demo@geoai.space", "fixture-password", "password"],
    ["false", "supabase_auth", "fixture@example.test", "", "email"],
    ["false", "demo_public", "demo@geoai.space", "fixture-password", "demo"]
  ]) {
    process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = flag;
    const calls = [];
    let index = 0;
    const states = [null, "email", identifier, password, "", false, null, false];
    const action = (name) => async () => { calls.push(name); return { ok: false, message: "Synthetic response" }; };
    const { LoginPanel } = load("components/auth/login-panel.tsx", {
      react: { useState: () => [states[index++], () => {}], useEffect: () => {}, useRef: () => ({ current: false }), useCallback: (callback) => callback },
      "@/components/auth/auth-provider": { useAuth: () => ({ authStatus: { effectiveMode: mode }, isAuthenticated: false, signIn: action("email"), signInWithPassword: action("password"), signInDemo: action("demo"), signInWithPhone: action("phone"), verifyPhoneCode: action("verify") }) },
      "@/src/lib/auth/mock-demo-session": { mockDemoEmail: "demo@geoai.space", mockDemoPassword: "fixture-password" },
      "@/src/lib/auth/password-only-policy": policy
    });
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(LoginPanel({ destination: "/prototype/point-to-object" }));
    const form = nodes.find((node) => node.type === "form");
    assert.ok(form);
    assert.equal(nodes.find((node) => node.props?.id === "login-password").props.required, flag === "true");
    assert.equal(nodes.some((node) => node.props?.["aria-label"] === "Sign-in method"), flag !== "true");
    await form.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(calls, expected ? [expected] : []);
  }
  console.log("PASS: password-only provider guards, blank-password denial, real-account demo-email routing, and flag-off legacy component contracts; zero network calls.");
} finally {
  if (previous === undefined) delete process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
  else process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = previous;
}

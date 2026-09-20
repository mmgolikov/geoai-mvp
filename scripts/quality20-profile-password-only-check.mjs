import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(file, dependencies) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(output, {
    module, exports: module.exports, process,
    fetch: () => { throw new Error("Network is forbidden in this offline profile check"); },
    require: name => dependencies[name] ?? require(name)
  });
  return module.exports;
}
function collect(tree) {
  const nodes = [], text = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node === "string") return text.push(node);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { nodes, text: text.join(" ") };
}
const previous = process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
const policy = load("src/lib/auth/password-only-policy.ts", {});
try {
  for (const locale of ["en", "ru"]) {
    for (const flag of ["true", "false"]) {
      for (const isDemo of [false, true]) {
        process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = flag;
        const calls = [];
        const { ProfilePanel } = load("components/auth/profile-panel.tsx", {
          react: { useState: initial => [initial, () => {}], useEffect: () => {}, useRef: initial => ({ current: initial }) },
          "next/link": () => null,
          "@/components/point-to-object/locale-provider": { usePointObjectLocale: () => ({ locale }) },
          "@/src/lib/auth/password-only-policy": policy,
          "@/src/lib/auth/profile-local-store": { maxProfileAvatarBytes: 1_000_000 },
          "@/src/lib/explore/scenarios": { getDefaultRoleForAudience: () => "developer", getExploreRolesByAudience: () => [{ id: "developer", label: "Developer" }] },
          "@/components/auth/auth-provider": { useAuth: () => ({
            isAuthenticated: true, isDemo,
            user: { id: "synthetic-profile", email: "fixture@example.test", phone: null, profile: { fullName: "Synthetic profile", defaultAudience: "b2b", defaultRole: "developer" } },
            requestEmailChange: async () => { calls.push("email"); return { ok: true }; },
            saveProfile: async () => { throw new Error("Profile mutations are outside this check"); },
            changePassword: async () => { throw new Error("Password mutations are outside this check"); },
            signOut: async () => { throw new Error("Sign-out is outside this check"); }
          }) }
        });
        const result = collect(ProfilePanel());
        assert.ok(result.text.includes("fixture@example.test"), "Registered email remains visible");
        const emailInput = result.nodes.find(node => node.type === "input" && node.props.type === "email");
        const expectedEmailForm = flag === "false" && !isDemo;
        assert.equal(Boolean(emailInput), expectedEmailForm);
        const confirmation = locale === "en" ? "Send confirmation" : "Отправить подтверждение";
        assert.equal(result.text.includes(confirmation), expectedEmailForm);
        const unavailable = locale === "en" ? "Email changes are currently unavailable." : "Смена email пока недоступна.";
        assert.equal(result.text.includes(unavailable), flag === "true" && !isDemo);
        assert.equal(result.nodes.filter(node => node.type === "input" && node.props.type === "password").length, isDemo ? 0 : 2);
        if (expectedEmailForm) {
          const form = result.nodes.find(node => node.type === "form" && collect(node).nodes.includes(emailInput));
          assert.ok(form);
          await form.props.onSubmit({ preventDefault() {} });
          assert.deepEqual(calls, ["email"], "Flag-off email action keeps its existing provider route");
          calls.length = 0;
          process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = "true";
          await form.props.onSubmit({ preventDefault() {} });
          assert.deepEqual(calls, [], "A stale handler must recheck the policy before invoking the provider");
        } else assert.deepEqual(calls, []);
      }
    }
  }
  console.log("quality20-profile-password-only-check: PASS (8 EN/RU rendered component states, flag-off routing and stale-handler denial; no network or account mutations)");
} finally {
  if (previous === undefined) delete process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY;
  else process.env.NEXT_PUBLIC_AUTH_PASSWORD_ONLY = previous;
}

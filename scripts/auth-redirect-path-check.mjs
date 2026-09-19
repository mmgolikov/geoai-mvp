import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSafeAuthRedirectPath } from "../src/lib/auth/redirect-path.ts";

const currentProduct = "/prototype/point-to-object";
for (const input of [undefined, null, "", " ", "https://example.invalid/private", "//example.invalid", "/\\example.invalid", "/unknown", "/profile#bad", "/%2f%2fexample.invalid"]) {
  assert.equal(getSafeAuthRedirectPath(input), currentProduct, `Unsafe or absent continuation: ${input}`);
}
for (const input of ["/profile", "/projects", "/onboarding", "/admin", "/prototype/point-to-object?mode=find", "/prototype/point-to-object/analysis?id=saved", "/workspace?segment=b2b", "/workspace?projectKey=dubai-investment-screening-demo&openAnalysis=saved"]) {
  assert.equal(getSafeAuthRedirectPath(input), input, `Explicit approved continuation must survive: ${input}`);
}
assert.equal(getSafeAuthRedirectPath(undefined, "/profile"), "/profile");
const login = readFileSync("app/login/page.tsx", "utf8");
assert(!login.includes('"/workspace"'), "Ordinary login must not override the current-product default");
const navigation = readFileSync("components/product-navigation.tsx", "utf8");
assert(navigation.includes('{ href: "/prototype/point-to-object", label: "Workspace"'), "Workspace navigation must open the current product");
const landing = readFileSync("components/landing/geoai-landing-page.tsx", "utf8");
assert(landing.includes('const mapHref = "/prototype/point-to-object";'), "Landing must use the guarded current-product entry");
console.log("Auth entry regression: default current product, hostile URLs rejected, explicit continuations preserved, landing/navigation current.");

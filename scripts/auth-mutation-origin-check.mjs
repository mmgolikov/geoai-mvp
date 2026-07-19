import {
  evaluateApiMutationOrigin,
  isUnsafeApiMutation
} from "../src/lib/auth/api-mutation-origin.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const base = {
  method: "POST",
  pathname: "/api/aois",
  requestUrl: "https://geoai.example/api/aois",
  origin: "https://geoai.example",
  secFetchSite: "same-origin",
  host: "geoai.example",
  forwardedHost: "geoai.example",
  forwardedProto: "https"
};

function decision(patch = {}) {
  return evaluateApiMutationOrigin({ ...base, ...patch });
}

assert(isUnsafeApiMutation("POST", "/api/aois"), "POST API requests must be treated as mutations");
assert(isUnsafeApiMutation("TRACE", "/api/aois"), "Unknown unsafe API methods must fail closed");
assert(!isUnsafeApiMutation("GET", "/api/aois"), "GET must remain a safe method");
assert(!isUnsafeApiMutation("HEAD", "/api/aois"), "HEAD must remain a safe method");
assert(!isUnsafeApiMutation("OPTIONS", "/api/aois"), "OPTIONS must remain available for protocol handling");
assert(!isUnsafeApiMutation("POST", "/workspace"), "Non-API page requests must remain outside the mutation gate");

assert(decision().allowed, "Matching Origin and same-origin Fetch Metadata must pass");
assert(decision({ secFetchSite: null }).allowed, "A non-browser client with an exact Origin may omit Fetch Metadata");
assert(decision({
  requestUrl: "https://geoai.example:443/api/aois",
  origin: "https://geoai.example:443",
  host: "geoai.example:443",
  forwardedHost: "geoai.example:443"
}).allowed, "Default ports must normalize to the same origin");
assert(decision({ method: "GET", origin: null, secFetchSite: "cross-site" }).allowed, "Safe API methods must not require Origin");
assert(decision({ pathname: "/workspace", origin: null }).allowed, "Page requests must not require Origin");

assert(decision({ origin: null }).reason === "missing_origin", "Missing Origin must fail closed");
assert(decision({ origin: "null" }).reason === "invalid_origin", "Opaque Origin must fail closed");
assert(decision({ origin: "https://attacker.example" }).reason === "origin_mismatch", "Cross-origin requests must fail closed");
assert(decision({ origin: "https://geoai.example.attacker.example" }).reason === "origin_mismatch", "Origin suffix spoofing must fail closed");
assert(decision({ origin: "https://geoai.example/path" }).reason === "invalid_origin", "Origin values with a path must fail closed");
assert(decision({ origin: "https://user@geoai.example" }).reason === "invalid_origin", "Credential-bearing Origin must fail closed");
assert(decision({ secFetchSite: "cross-site" }).reason === "cross_site_fetch_metadata", "Cross-site Fetch Metadata must fail closed");
assert(decision({ secFetchSite: "same-site" }).reason === "cross_site_fetch_metadata", "Same-site but cross-origin mutation must fail closed");
assert(decision({ secFetchSite: "same-origin, cross-site" }).reason === "cross_site_fetch_metadata", "Ambiguous Fetch Metadata must fail closed");
assert(decision({ host: "other.example" }).reason === "invalid_request_authority", "Conflicting Host must fail closed");
assert(decision({ forwardedHost: "other.example" }).reason === "invalid_request_authority", "Conflicting forwarded host must fail closed");
assert(decision({ forwardedHost: "geoai.example, attacker.example" }).reason === "invalid_request_authority", "Ambiguous forwarded host must fail closed");
assert(decision({ forwardedProto: "http" }).reason === "invalid_request_authority", "Conflicting forwarded protocol must fail closed");
assert(decision({ forwardedProto: "javascript" }).reason === "invalid_request_authority", "Invalid forwarded protocol must fail closed");

console.log("Auth mutation-origin contract passed: unsafe Supabase-cookie API requests require an exact same-origin authority and reject cross-site Fetch Metadata.");

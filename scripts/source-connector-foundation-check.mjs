import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(run, message) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function loadIsolatedTypeScriptModule(relativePath, imports = {}) {
  const source = readFileSync(resolve(relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: relativePath,
    reportDiagnostics: true
  });
  const diagnostics = output.diagnostics ?? [];
  assert(diagnostics.length === 0, `${relativePath} isolated transpilation produced diagnostics`);
  const module = { exports: {} };
  const isolatedRequire = (request) => {
    if (request in imports) return imports[request];
    if (request === "server-only") return {};
    if (request === "node:crypto") return awaitlessCrypto;
    if (request === "node:net") return awaitlessNet;
    throw new Error(`Isolated contract unexpectedly required ${request}`);
  };
  const evaluate = new Function("exports", "module", "require", output.outputText);
  evaluate(module.exports, module, isolatedRequire);
  return module.exports;
}

const awaitlessCrypto = await import("node:crypto");
const awaitlessNet = await import("node:net");
const contractVersion = "source_connector_v1";
const source = loadIsolatedTypeScriptModule("src/lib/sources/source-connector.ts", {
  "./contracts": { sourceConnectorContractVersion: contractVersion }
});

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const actorProfileId = "33333333-3333-4333-8333-333333333333";
const otherActorProfileId = "44444444-4444-4444-8444-444444444444";
const otherProjectId = "55555555-5555-4555-8555-555555555555";
const receiptId = "66666666-6666-4666-8666-666666666666";

function endpoint(patch = {}) {
  return {
    endpointKey: "snapshot",
    origin: "https://api.provider.example",
    path: "/v1/snapshots",
    method: "GET",
    requestBodyPolicy: "none",
    maximumRequestBytes: 0,
    allowedQueryParameters: ["format", "from", "to"],
    allowedResponseMediaTypes: ["application/json"],
    maximumResponseBytes: 1_000,
    timeoutMs: 5_000,
    redirectPolicy: "reject",
    networkPolicy: "https_public_dns_and_ip_recheck",
    ...patch
  };
}

function connector(patch = {}) {
  return {
    contractVersion,
    connectorId: "controlled-provider-v1",
    sourceId: "controlled-source-v1",
    providerId: "controlled-provider",
    lifecycle: "approved_disabled",
    rightsStatus: "approved",
    visibility: "project_private",
    contentClass: "tabular",
    credentialPolicy: {
      mode: "broker_reference",
      referenceId: "controlled-provider-primary",
      allowedHeaderNames: ["authorization"]
    },
    rightsEvidenceId: "rights-review-receipt-v1",
    parserContractId: "controlled-parser-v1",
    endpoints: [endpoint()],
    ...patch
  };
}

function activationEvidence(patch = {}) {
  return {
    requested: true,
    environment: "preview",
    connectorId: "controlled-provider-v1",
    canonicalReplayVerified: true,
    sourceCustodyVerified: true,
    sourcePersonasVerified: true,
    trustedWorkerAuthenticated: true,
    ownerApprovalBound: true,
    exactDeploymentShaVerified: true,
    distributedRateBudgetReady: true,
    crossInstanceCircuitBreakerReady: true,
    credentialBrokerReady: true,
    publicDistributionVerified: false,
    geometryScopeVerified: false,
    imageryScopeVerified: false,
    ...patch
  };
}

function intent(patch = {}) {
  return {
    scope: { organizationId, projectId, projectKey: "project-alpha", actorProfileId },
    connectorId: "controlled-provider-v1",
    endpointKey: "snapshot",
    query: { to: "2026-07-15", format: "json", from: "2026-07-01" },
    body: null,
    releaseVersion: "2026-07-v1",
    schemaVersion: "normalized-v1",
    acquisitionWindow: { from: "2026-07-01", to: "2026-07-15" },
    ...patch
  };
}

assert(source.sourceConnectorRegistry.size === 0, "The shipped SOURCE-02 registry must contain zero live connectors");
assert(source.sourceConnectorActivationDefaults.requested === false, "Default activation must be false");
assert(source.sourceConnectorActivationDefaults.canonicalReplayVerified === false, "Default evidence must not imply DB replay");

const mutableEndpoint = endpoint();
const mutableConnector = connector({ endpoints: [mutableEndpoint] });
const registry = source.createSourceConnectorRegistry([mutableConnector]);
mutableEndpoint.allowedQueryParameters.push("later-added");
assert(registry.size === 1 && Object.isFrozen(registry), "Registry must be immutable");
assert(Object.isFrozen(registry.resolve("controlled-provider-v1").connector), "Resolved connector definitions must be immutable");
assert(!registry.resolve("controlled-provider-v1").connector.endpoints[0].allowedQueryParameters.includes("later-added"), "Registry must defensively copy caller definitions");
assert(registry.resolve("unknown-provider-v1").code === "connector_not_registered", "Unknown connectors must fail closed");
assert(registry.resolve("../../metadata").code === "invalid_connector_id", "Malformed connector IDs must fail closed");

expectThrow(() => source.createSourceConnectorRegistry([connector(), connector()]), "Duplicate connector IDs must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector(), connector({ connectorId: "controlled-provider-v2" })]), "Ambiguous source IDs must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ credentialValue: "must-never-enter-registry" })]), "Unknown connector fields must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ endpoints: [endpoint({ origin: "http://api.provider.example" })] })]), "Non-HTTPS endpoints must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ endpoints: [endpoint({ origin: "https://127.0.0.1" })] })]), "Literal-IP endpoints must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ endpoints: [endpoint({ origin: "https://metadata.internal" })] })]), "Internal DNS endpoints must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ endpoints: [endpoint({ path: "/v1/%2e%2e/secrets" })] })]), "Encoded endpoint traversal must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ endpoints: [endpoint({ allowedQueryParameters: ["from", "access_token"] })] })]), "Credential-bearing query parameters must be rejected");
expectThrow(() => source.createSourceConnectorRegistry([connector({ rightsStatus: "approved", rightsEvidenceId: null })]), "Approved rights without evidence must be rejected");

const defaultDecision = source.evaluateSourceConnectorActivation(source.sourceConnectorRegistry, source.sourceConnectorActivationDefaults);
assert(!defaultDecision.allowed && defaultDecision.blockers.includes("activation_not_requested"), "Default gate must deny execution");
assert(defaultDecision.persistence === "forbidden_by_source_02", "SOURCE-02 must never authorize custody writes");
const malformedDecision = source.evaluateSourceConnectorActivation(registry, { ...activationEvidence(), credentialValue: "forbidden-extra-field" });
assert(!malformedDecision.allowed && malformedDecision.blockers.includes("activation_evidence_invalid"), "Activation evidence with unknown fields must fail closed");
const missingBroker = source.evaluateSourceConnectorActivation(registry, activationEvidence({ credentialBrokerReady: false }));
assert(!missingBroker.allowed && missingBroker.blockers.includes("credential_broker_not_ready"), "Credentialed connectors require a broker boundary");
const productionDecision = source.evaluateSourceConnectorActivation(registry, activationEvidence({ environment: "production" }));
assert(!productionDecision.allowed && productionDecision.blockers.includes("production_not_supported_by_source_02"), "SOURCE-02 must deny Production");
const activation = source.evaluateSourceConnectorActivation(registry, activationEvidence());
assert(activation.allowed && activation.blockers.length === 0, "Complete Preview evidence should produce a pure readiness decision");
assert(activation.persistence === "forbidden_by_source_02", "A readiness decision must still forbid persistence");
const publicRegistry = source.createSourceConnectorRegistry([connector({ visibility: "public_demo" })]);
const publicDenied = source.evaluateSourceConnectorActivation(publicRegistry, activationEvidence());
assert(!publicDenied.allowed && publicDenied.blockers.includes("public_distribution_not_verified"), "Public distribution requires separate evidence");
const geometryRegistry = source.createSourceConnectorRegistry([connector({ contentClass: "geometry" })]);
const geometryDenied = source.evaluateSourceConnectorActivation(geometryRegistry, activationEvidence());
assert(!geometryDenied.allowed && geometryDenied.blockers.includes("geometry_scope_not_verified"), "Geometry acquisition requires separate scope evidence");

const disabledPlan = source.prepareSourceConnectorRequest(registry, source.sourceConnectorActivationDefaults, intent());
assert(!disabledPlan.ok, "A denied activation decision must prevent request planning");
const invalidScopePlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({
  scope: { organizationId, projectId: "not-a-uuid", projectKey: "project-alpha", actorProfileId }
}));
assert(!invalidScopePlan.ok && invalidScopePlan.code === "invalid_tenant_scope", "Invalid tenant scope must fail before provider resolution");
const unknownEndpointPlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({ endpointKey: "other-endpoint" }));
assert(!unknownEndpointPlan.ok && unknownEndpointPlan.code === "endpoint_not_registered", "Unknown endpoint keys must fail closed");
const unknownQueryPlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({ query: { from: "2026-07-01", unexpected: "value" } }));
assert(!unknownQueryPlan.ok && unknownQueryPlan.code === "query_parameter_not_allowlisted", "Unknown provider query parameters must fail closed");
const duplicateQueryPlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({ query: { from: ["2026-07-01", "2026-07-02"] } }));
assert(!duplicateQueryPlan.ok && duplicateQueryPlan.code === "duplicate_query_parameter", "Duplicate query parameters must fail closed");
const credentialQueryPlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({ query: { access_token: "credential" } }));
assert(!credentialQueryPlan.ok && credentialQueryPlan.code === "credential_material_forbidden", "Credential-looking query material must fail closed before allowlist lookup");
const unexpectedBodyPlan = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({ body: { filter: "value" } }));
assert(!unexpectedBodyPlan.ok && unexpectedBodyPlan.code === "request_body_not_allowed", "GET connector bodies must fail closed");

const planned = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent());
assert(planned.ok, "Reviewed allowlisted request planning failed");
const plan = planned.plan;
assert(plan.url === "https://api.provider.example/v1/snapshots?format=json&from=2026-07-01&to=2026-07-15", "Request URL must derive from registry order and exact endpoint metadata");
assert(plan.redirectPolicy === "reject" && plan.networkPolicy === "https_public_dns_and_ip_recheck", "Request plans must carry redirect and connect-time IP controls");
assert(plan.credentialInjection.mode === "broker_only" && !("value" in plan.credentialInjection), "Plans may expose only an opaque credential reference, never a value");
assert(plan.idempotencyKey.startsWith("source02:") && plan.idempotencyKey.length === 73, "Idempotency key must use a versioned SHA-256 contract");
assert(plan.persistence === undefined, "Request plans must not imply persistence authority");

const reordered = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({
  query: { from: "2026-07-01", to: "2026-07-15", format: "json" }
}));
assert(reordered.ok && reordered.plan.requestSha256 === plan.requestSha256 && reordered.plan.idempotencyKey === plan.idempotencyKey, "Query insertion order must not affect request identity");
const otherActor = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({
  scope: { organizationId, projectId, projectKey: "project-alpha", actorProfileId: otherActorProfileId }
}));
assert(otherActor.ok && otherActor.plan.requestSha256 !== plan.requestSha256, "Request receipts must bind the actor identity");
assert(otherActor.ok && otherActor.plan.idempotencyKey === plan.idempotencyKey, "Idempotency must deduplicate the same tenant acquisition across actors");
const otherTenant = source.prepareSourceConnectorRequest(registry, activationEvidence(), intent({
  scope: { organizationId, projectId: otherProjectId, projectKey: "project-beta", actorProfileId }
}));
assert(otherTenant.ok && otherTenant.plan.idempotencyKey !== plan.idempotencyKey, "Idempotency must be tenant scoped");

const postRegistry = source.createSourceConnectorRegistry([connector({
  endpoints: [endpoint({
    method: "POST",
    requestBodyPolicy: "canonical_json",
    maximumRequestBytes: 256
  })]
})]);
const postPlan = source.prepareSourceConnectorRequest(postRegistry, activationEvidence(), intent({
  body: { limit: 10, filter: { collection: "reviewed-collection" } }
}));
const reorderedPostPlan = source.prepareSourceConnectorRequest(postRegistry, activationEvidence(), intent({
  body: { filter: { collection: "reviewed-collection" }, limit: 10 }
}));
assert(postPlan.ok && postPlan.plan.body === '{"filter":{"collection":"reviewed-collection"},"limit":10}', "POST bodies must use bounded canonical JSON");
assert(postPlan.ok && postPlan.plan.requestMediaType === "application/json", "Canonical POST plans must declare JSON request media type");
assert(postPlan.ok && reorderedPostPlan.ok && postPlan.plan.idempotencyKey === reorderedPostPlan.plan.idempotencyKey, "POST body key order must not affect idempotency");
const missingPostBody = source.prepareSourceConnectorRequest(postRegistry, activationEvidence(), intent({ body: null }));
assert(!missingPostBody.ok && missingPostBody.code === "request_body_required", "Required POST bodies must fail closed when missing");
const credentialPostBody = source.prepareSourceConnectorRequest(postRegistry, activationEvidence(), intent({ body: { access_token: "must-not-pass" } }));
assert(!credentialPostBody.ok && credentialPostBody.code === "credential_material_forbidden", "Credential material must not enter provider bodies");

assert(source.canonicalSourceJson({ b: 2, a: [1, "x"] }) === source.canonicalSourceJson({ a: [1, "x"], b: 2 }), "Canonical JSON key ordering must be deterministic");
assert(source.sha256Hex("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 implementation changed unexpectedly");
expectThrow(() => source.canonicalSourceJson({ invalid: Number.NaN }), "Non-finite JSON numbers must fail closed");
assert(!source.checksumMatches(new TextEncoder().encode("abc"), "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"), "Non-canonical checksum formats must fail closed");

const responseBytes = new TextEncoder().encode('{"records":[1,2]}');
const responseSha256 = source.sha256Hex(responseBytes);
const resultEvidence = {
  responseBytes,
  declaredContentSha256: responseSha256,
  mediaType: "application/json; charset=utf-8",
  recordCount: 2,
  sourceUri: plan.url,
  extractedAt: "2026-07-15T00:00:00.000Z",
  retrievedAt: "2026-07-16T01:00:00.000Z",
  coverageState: "within_approved_scope",
  freshnessState: "current",
  schemaState: "valid",
  qualitySummary: { validation: "passed" },
  lineageSummary: { parserContractId: "controlled-parser-v1" },
  caveat: "Screening context; official validation remains required."
};
const startedAt = "2026-07-16T00:59:00.000Z";
const finishedAt = "2026-07-16T01:01:00.000Z";
const success = source.finalizeSourceConnectorSuccess(plan, resultEvidence, startedAt, finishedAt);
assert(success.outcome === "succeeded" && success.persistence === "not_attempted", "Valid evidence must yield a non-persisted release candidate");
assert(success.releaseCandidate.contentSha256 === responseSha256 && success.releaseCandidate.byteSize === responseBytes.byteLength, "Success result must retain verified integrity metadata");
assert(success.releaseCandidate.sourceUriSha256 === source.sha256Hex(plan.url), "Success result must hash, not expose, the provider URI");
assert(!JSON.stringify(success).includes(plan.url) && !JSON.stringify(success).includes("responseBytes"), "Result receipts must omit raw provider URLs and payload bytes");

const checksumMismatch = source.finalizeSourceConnectorSuccess(plan, {
  ...resultEvidence,
  declaredContentSha256: "0".repeat(64)
}, startedAt, finishedAt);
assert(checksumMismatch.outcome === "quarantined" && checksumMismatch.errorCode === "content_checksum_mismatch", "Checksum mismatch must quarantine");
const stale = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, freshnessState: "stale" }, startedAt, finishedAt);
assert(stale.outcome === "quarantined" && stale.errorCode === "stale_source_release", "Stale releases must quarantine");
const outOfCoverage = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, coverageState: "out_of_coverage" }, startedAt, finishedAt);
assert(outOfCoverage.outcome === "quarantined" && outOfCoverage.errorCode === "out_of_coverage", "Out-of-coverage releases must quarantine");
const wrongUri = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, sourceUri: "https://attacker.example/v1/snapshots" }, startedAt, finishedAt);
assert(wrongUri.outcome === "quarantined" && wrongUri.errorCode === "malformed_normalized_payload", "Provider URI substitution must quarantine");
const wrongMediaType = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, mediaType: "text/html" }, startedAt, finishedAt);
assert(wrongMediaType.outcome === "quarantined" && wrongMediaType.errorCode === "response_media_type_not_allowed", "Unexpected response media types must quarantine");
const unsafeLineage = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, lineageSummary: { storage_object_path: "private/raw.json" } }, startedAt, finishedAt);
assert(unsafeLineage.outcome === "quarantined" && unsafeLineage.errorCode === "malformed_normalized_payload", "Internal paths must not enter release projection metadata");
const invalidTimestamp = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, retrievedAt: "2026-02-31T00:00:00Z" }, startedAt, finishedAt);
assert(invalidTimestamp.outcome === "quarantined" && invalidTimestamp.errorCode === "timestamp_contract_invalid", "Normalized invalid calendar timestamps must quarantine");
const preRequestRetrieval = source.finalizeSourceConnectorSuccess(plan, { ...resultEvidence, retrievedAt: "2026-07-16T00:58:59.000Z" }, startedAt, finishedAt);
assert(preRequestRetrieval.outcome === "quarantined" && preRequestRetrieval.errorCode === "timestamp_contract_invalid", "Retrieval timestamps must be bound to the worker execution window");
expectThrow(() => source.finalizeSourceConnectorSuccess(plan, resultEvidence, finishedAt, startedAt), "Invalid worker timing must not create a receipt");

const failure = source.createFailedSourceConnectorResult(plan, "provider_timeout", startedAt, finishedAt);
assert(failure.outcome === "failed" && failure.errorCode === "provider_timeout" && !("message" in failure), "Failures must expose only stable generic codes");
expectThrow(() => source.createFailedSourceConnectorResult(plan, "provider said secret=value", startedAt, finishedAt), "Raw provider error messages must be rejected");
const duplicate = source.createDuplicateSourceConnectorResult(plan, receiptId, startedAt, finishedAt);
assert(duplicate.outcome === "duplicate" && duplicate.existingReceiptId === receiptId, "Duplicate acquisitions must point to the existing receipt without a second release");

const implementation = readFileSync(resolve("src/lib/sources/source-connector.ts"), "utf8");
const contracts = readFileSync(resolve("src/lib/sources/contracts.ts"), "utf8");
const combined = `${implementation}\n${contracts}`;
assert(!combined.includes("fetch("), "SOURCE-02 must not implement live provider networking");
assert(!combined.includes("process.env"), "SOURCE-02 must not read runtime secrets or flags implicitly");
assert(!combined.includes("SUPABASE_SERVICE_ROLE_KEY") && !combined.includes("SUPABASE_DB_URL"), "SOURCE-02 must not reference privileged Supabase credentials");
assert(!combined.includes("@supabase") && !combined.includes("source_releases).insert"), "SOURCE-02 must not implement custody persistence");
assert(implementation.startsWith('import "server-only";'), "SOURCE-02 worker planning must remain server-only");
assert(implementation.includes("createSourceConnectorRegistry([])"), "The shipped connector allowlist must remain empty");
assert(implementation.includes('persistence: "forbidden_by_source_02"'), "Activation must explicitly deny persistence");
assert(implementation.includes('"https_public_dns_and_ip_recheck"'), "Plans must require DNS and connect-time IP revalidation from the future executor");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "strict_immutable_empty_default_registry",
    "unknown_connector_and_endpoint_fail_closed",
    "https_exact_origin_and_path_allowlist",
    "ssrf_literal_ip_internal_dns_and_traversal_rejection",
    "credential_broker_reference_only",
    "disabled_default_and_production_denial",
    "objective_activation_evidence_matrix",
    "tenant_and_actor_bound_request_identity",
    "cross_actor_tenant_bound_idempotency",
    "canonical_json_and_sha256_integrity",
    "checksum_media_type_freshness_coverage_and_timestamp_quarantine",
    "stable_failure_and_duplicate_result_model",
    "no_fetch_no_env_no_privileged_write_boundary"
  ],
  caveat: "This is a pure SOURCE-02 planning and receipt foundation. It performs no DNS resolution, provider request, credential injection or custody write."
}, null, 2));

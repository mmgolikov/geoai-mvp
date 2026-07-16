import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type {
  JsonValue,
  SourceConnectorActivationBlocker,
  SourceConnectorActivationDecision,
  SourceConnectorActivationEvidence,
  SourceConnectorDefinition,
  SourceConnectorFailureCode,
  SourceConnectorIntent,
  SourceConnectorLookup,
  SourceConnectorPlanResult,
  SourceConnectorQuery,
  SourceConnectorRegistry,
  SourceConnectorRequestPlan,
  SourceConnectorResult,
  SourceConnectorSuccessEvidence,
  SourceEndpointPolicy,
  SourceTenantScope
} from "./contracts";
import { sourceConnectorContractVersion } from "./contracts";

const identifierPattern = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const projectKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256Pattern = /^[0-9a-f]{64}$/;
const endpointKeyPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const queryNamePattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const mediaTypePattern = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/;
const credentialLikeNamePattern = /(?:^|[-_.])(api[-_.]?key|authorization|bearer|credential|password|private[-_.]?key|secret|signature|sig|token)(?:$|[-_.])/i;
const internalLocationNamePattern = /(?:^|[-_.])(bucket|cookie|filename|headers?|local[-_.]?path|object[-_.]?path|source[-_.]?uri|source[-_.]?url|storage[-_.]?path)(?:$|[-_.])/i;
const forbiddenHostSuffixes = [".internal", ".invalid", ".local", ".localhost"];
const maximumUrlLength = 4096;
const maximumQueryValueLength = 1024;

function hasExactKeys(value: object, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

const stableFailureCodes = new Set<SourceConnectorFailureCode>([
  "provider_timeout",
  "provider_network_error",
  "provider_non_success",
  "provider_response_too_large",
  "provider_invalid_utf8",
  "provider_invalid_payload",
  "provider_redirect_rejected",
  "provider_dns_policy_rejected",
  "credential_broker_failure",
  "rate_budget_exhausted",
  "circuit_open"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifierPattern.test(value);
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const day = value.slice(0, 10);
  return new Date(timestamp).toISOString().slice(0, 10) === day;
}

function isCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function cloneJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item)]));
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

function canonicalizeJsonValue(value: JsonValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non_finite_json_number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJsonValue).join(",")}]`;
  if (!isRecord(value)) throw new Error("non_plain_json_object");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeJsonValue(value[key] as JsonValue)}`).join(",")}}`;
}

export function canonicalSourceJson(value: JsonValue) {
  return canonicalizeJsonValue(value);
}

export function sha256Hex(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function checksumMatches(value: Uint8Array, expectedSha256: string) {
  if (!sha256Pattern.test(expectedSha256)) return false;
  const actual = Buffer.from(sha256Hex(value), "ascii");
  const expected = Buffer.from(expectedSha256, "ascii");
  return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
}

export function isValidSourceTenantScope(scope: unknown): scope is SourceTenantScope {
  return isRecord(scope) && hasExactKeys(scope, ["organizationId", "projectId", "projectKey", "actorProfileId"]) &&
    typeof scope.organizationId === "string" && typeof scope.projectId === "string" &&
    typeof scope.projectKey === "string" && typeof scope.actorProfileId === "string" &&
    uuidPattern.test(scope.organizationId) &&
    uuidPattern.test(scope.projectId) &&
    uuidPattern.test(scope.actorProfileId) &&
    projectKeyPattern.test(scope.projectKey);
}

function normalizeOrigin(rawOrigin: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" ||
      parsed.search || parsed.hash || parsed.port || !hostname.includes(".") || hostname === "localhost" ||
      isIP(hostname) !== 0 || forbiddenHostSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    return null;
  }
  return parsed.origin;
}

function isSafeEndpointPath(path: string) {
  if (!path.startsWith("/") || path.length > 512 || path.includes("\\") || path.includes("%") || path.includes("//") || /[?#\u0000-\u001f\u007f]/.test(path)) {
    return false;
  }
  return !path.split("/").some((part) => part === "." || part === "..");
}

function isSafeMediaType(mediaType: unknown): mediaType is string {
  return typeof mediaType === "string" && mediaTypePattern.test(mediaType) && mediaType === mediaType.toLowerCase();
}

function validateEndpoint(endpoint: SourceEndpointPolicy) {
  if (!isRecord(endpoint)) return false;
  if (!hasExactKeys(endpoint, [
    "endpointKey",
    "origin",
    "path",
    "method",
    "requestBodyPolicy",
    "maximumRequestBytes",
    "allowedQueryParameters",
    "allowedResponseMediaTypes",
    "maximumResponseBytes",
    "timeoutMs",
    "redirectPolicy",
    "networkPolicy"
  ])) return false;
  if (typeof endpoint.endpointKey !== "string" || typeof endpoint.origin !== "string" || typeof endpoint.path !== "string" ||
      !Array.isArray(endpoint.allowedQueryParameters) || !Array.isArray(endpoint.allowedResponseMediaTypes)) return false;
  if (!endpointKeyPattern.test(endpoint.endpointKey) || !normalizeOrigin(endpoint.origin) || !isSafeEndpointPath(endpoint.path)) return false;
  if (endpoint.method !== "GET" && endpoint.method !== "POST") return false;
  if (endpoint.requestBodyPolicy !== "none" && endpoint.requestBodyPolicy !== "canonical_json") return false;
  if (endpoint.method === "GET" && endpoint.requestBodyPolicy !== "none") return false;
  if (!Number.isSafeInteger(endpoint.maximumRequestBytes) || endpoint.maximumRequestBytes < 0 || endpoint.maximumRequestBytes > 1_000_000) return false;
  if (endpoint.requestBodyPolicy === "canonical_json" && endpoint.maximumRequestBytes < 2) return false;
  if (endpoint.redirectPolicy !== "reject" || endpoint.networkPolicy !== "https_public_dns_and_ip_recheck") return false;
  if (!Number.isSafeInteger(endpoint.maximumResponseBytes) || endpoint.maximumResponseBytes < 1 || endpoint.maximumResponseBytes > 50_000_000) return false;
  if (!Number.isSafeInteger(endpoint.timeoutMs) || endpoint.timeoutMs < 100 || endpoint.timeoutMs > 60_000) return false;
  if (endpoint.allowedResponseMediaTypes.length === 0 || !endpoint.allowedResponseMediaTypes.every(isSafeMediaType)) return false;
  if (new Set(endpoint.allowedResponseMediaTypes).size !== endpoint.allowedResponseMediaTypes.length) return false;
  if (!endpoint.allowedQueryParameters.every((name) => queryNamePattern.test(name) && !credentialLikeNamePattern.test(name))) return false;
  return new Set(endpoint.allowedQueryParameters).size === endpoint.allowedQueryParameters.length;
}

function cloneEndpoint(endpoint: SourceEndpointPolicy): SourceEndpointPolicy {
  return deepFreeze({
    endpointKey: endpoint.endpointKey,
    origin: normalizeOrigin(endpoint.origin) as string,
    path: endpoint.path,
    method: endpoint.method,
    requestBodyPolicy: endpoint.requestBodyPolicy,
    maximumRequestBytes: endpoint.maximumRequestBytes,
    allowedQueryParameters: [...endpoint.allowedQueryParameters],
    allowedResponseMediaTypes: [...endpoint.allowedResponseMediaTypes],
    maximumResponseBytes: endpoint.maximumResponseBytes,
    timeoutMs: endpoint.timeoutMs,
    redirectPolicy: endpoint.redirectPolicy,
    networkPolicy: endpoint.networkPolicy
  });
}

function validateDefinition(definition: SourceConnectorDefinition) {
  if (!isRecord(definition)) return false;
  if (!hasExactKeys(definition, [
    "contractVersion",
    "connectorId",
    "sourceId",
    "providerId",
    "lifecycle",
    "rightsStatus",
    "visibility",
    "contentClass",
    "credentialPolicy",
    "rightsEvidenceId",
    "parserContractId",
    "endpoints"
  ])) return false;
  if (!Array.isArray(definition.endpoints) || !isRecord(definition.credentialPolicy)) return false;
  if (definition.contractVersion !== sourceConnectorContractVersion || !isIdentifier(definition.connectorId) ||
      !isIdentifier(definition.sourceId) || !isIdentifier(definition.providerId) || !isIdentifier(definition.parserContractId)) return false;
  if (definition.lifecycle !== "review_only" && definition.lifecycle !== "approved_disabled") return false;
  if (!["unreviewed", "approved", "suspended", "expired"].includes(definition.rightsStatus)) return false;
  if (!["public_demo", "project_private", "operator_private"].includes(definition.visibility)) return false;
  if (!["metadata", "tabular", "geometry", "imagery"].includes(definition.contentClass)) return false;
  if (definition.endpoints.length === 0 || !definition.endpoints.every(validateEndpoint)) return false;
  if (new Set(definition.endpoints.map((endpoint) => endpoint.endpointKey)).size !== definition.endpoints.length) return false;
  if (definition.rightsStatus === "approved" ? !isIdentifier(definition.rightsEvidenceId) : definition.rightsEvidenceId !== null) return false;
  if (definition.credentialPolicy.mode === "broker_reference") {
    if (!hasExactKeys(definition.credentialPolicy, ["mode", "referenceId", "allowedHeaderNames"])) return false;
    if (!isIdentifier(definition.credentialPolicy.referenceId) || definition.credentialPolicy.allowedHeaderNames.length === 0) return false;
    if (new Set(definition.credentialPolicy.allowedHeaderNames).size !== definition.credentialPolicy.allowedHeaderNames.length) return false;
    if (!definition.credentialPolicy.allowedHeaderNames.every((name) => ["authorization", "x-api-key", "api-key"].includes(name))) return false;
  } else if (definition.credentialPolicy.mode !== "none") {
    return false;
  } else if (!hasExactKeys(definition.credentialPolicy, ["mode"])) {
    return false;
  }
  return true;
}

function cloneDefinition(definition: SourceConnectorDefinition): SourceConnectorDefinition {
  const credentialPolicy = definition.credentialPolicy.mode === "none"
    ? { mode: "none" as const }
    : {
        mode: "broker_reference" as const,
        referenceId: definition.credentialPolicy.referenceId,
        allowedHeaderNames: [...definition.credentialPolicy.allowedHeaderNames]
      };
  return deepFreeze({
    contractVersion: sourceConnectorContractVersion,
    connectorId: definition.connectorId,
    sourceId: definition.sourceId,
    providerId: definition.providerId,
    lifecycle: definition.lifecycle,
    rightsStatus: definition.rightsStatus,
    visibility: definition.visibility,
    contentClass: definition.contentClass,
    credentialPolicy,
    rightsEvidenceId: definition.rightsEvidenceId,
    parserContractId: definition.parserContractId,
    endpoints: definition.endpoints.map(cloneEndpoint)
  });
}

export function createSourceConnectorRegistry(definitions: readonly SourceConnectorDefinition[]): SourceConnectorRegistry {
  if (!Array.isArray(definitions) || !definitions.every(validateDefinition)) throw new Error("invalid_source_connector_definition");
  const connectorIds = definitions.map((definition) => definition.connectorId);
  const sourceIds = definitions.map((definition) => definition.sourceId);
  if (new Set(connectorIds).size !== connectorIds.length) throw new Error("duplicate_source_connector_id");
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error("ambiguous_source_connector_source_id");
  const connectors = new Map(definitions.map((definition) => [definition.connectorId, cloneDefinition(definition)]));
  const frozenIds = Object.freeze([...connectorIds].sort());
  return Object.freeze({
    contractVersion: sourceConnectorContractVersion,
    size: connectors.size,
    connectorIds: frozenIds,
    resolve(connectorId: string): SourceConnectorLookup {
      if (!isIdentifier(connectorId)) return { ok: false, code: "invalid_connector_id" };
      const connector = connectors.get(connectorId);
      return connector ? { ok: true, connector } : { ok: false, code: "connector_not_registered" };
    }
  });
}

// SOURCE-02 intentionally ships no live provider registrations. A reviewed connector
// must be added explicitly; unknown IDs never fall back to caller-supplied metadata.
export const sourceConnectorRegistry = createSourceConnectorRegistry([]);

export const sourceConnectorActivationDefaults: SourceConnectorActivationEvidence = Object.freeze({
  requested: false,
  environment: "local",
  connectorId: "unregistered-source-connector",
  canonicalReplayVerified: false,
  sourceCustodyVerified: false,
  sourcePersonasVerified: false,
  trustedWorkerAuthenticated: false,
  ownerApprovalBound: false,
  exactDeploymentShaVerified: false,
  distributedRateBudgetReady: false,
  crossInstanceCircuitBreakerReady: false,
  credentialBrokerReady: false,
  publicDistributionVerified: false,
  geometryScopeVerified: false,
  imageryScopeVerified: false
});

export function evaluateSourceConnectorActivation(
  registry: SourceConnectorRegistry,
  evidence: SourceConnectorActivationEvidence
): SourceConnectorActivationDecision {
  const validEvidence = isRecord(evidence) && hasExactKeys(evidence, [
    "requested",
    "environment",
    "connectorId",
    "canonicalReplayVerified",
    "sourceCustodyVerified",
    "sourcePersonasVerified",
    "trustedWorkerAuthenticated",
    "ownerApprovalBound",
    "exactDeploymentShaVerified",
    "distributedRateBudgetReady",
    "crossInstanceCircuitBreakerReady",
    "credentialBrokerReady",
    "publicDistributionVerified",
    "geometryScopeVerified",
    "imageryScopeVerified"
  ]) && typeof evidence.requested === "boolean" &&
    (evidence.environment === "local" || evidence.environment === "preview" || evidence.environment === "production") &&
    isIdentifier(evidence.connectorId) && [
      evidence.canonicalReplayVerified,
      evidence.sourceCustodyVerified,
      evidence.sourcePersonasVerified,
      evidence.trustedWorkerAuthenticated,
      evidence.ownerApprovalBound,
      evidence.exactDeploymentShaVerified,
      evidence.distributedRateBudgetReady,
      evidence.crossInstanceCircuitBreakerReady,
      evidence.credentialBrokerReady,
      evidence.publicDistributionVerified,
      evidence.geometryScopeVerified,
      evidence.imageryScopeVerified
    ].every((value) => typeof value === "boolean");
  if (!validEvidence) {
    return deepFreeze({
      allowed: false,
      connectorId: isRecord(evidence) && isIdentifier(evidence.connectorId) ? evidence.connectorId : "invalid-source-connector",
      environment: isRecord(evidence) && ["local", "preview", "production"].includes(String(evidence.environment))
        ? evidence.environment as SourceConnectorActivationDecision["environment"]
        : "local",
      persistence: "forbidden_by_source_02" as const,
      blockers: ["activation_evidence_invalid" as const]
    });
  }
  const blockers: SourceConnectorActivationBlocker[] = [];
  const lookup = registry.resolve(evidence.connectorId);
  if (!evidence.requested) blockers.push("activation_not_requested");
  if (evidence.environment === "production") blockers.push("production_not_supported_by_source_02");
  if (!lookup.ok) blockers.push("connector_not_registered");
  if (lookup.ok && lookup.connector.lifecycle !== "approved_disabled") blockers.push("connector_not_approved");
  if (lookup.ok && lookup.connector.rightsStatus !== "approved") blockers.push("rights_not_approved");
  if (lookup.ok && !lookup.connector.rightsEvidenceId) blockers.push("rights_evidence_missing");
  if (!evidence.canonicalReplayVerified) blockers.push("canonical_replay_not_verified");
  if (!evidence.sourceCustodyVerified) blockers.push("source_custody_not_verified");
  if (!evidence.sourcePersonasVerified) blockers.push("source_personas_not_verified");
  if (!evidence.trustedWorkerAuthenticated) blockers.push("trusted_worker_not_authenticated");
  if (!evidence.ownerApprovalBound) blockers.push("owner_approval_not_bound");
  if (!evidence.exactDeploymentShaVerified) blockers.push("exact_sha_not_verified");
  if (!evidence.distributedRateBudgetReady) blockers.push("rate_budget_not_ready");
  if (!evidence.crossInstanceCircuitBreakerReady) blockers.push("circuit_breaker_not_ready");
  if (lookup.ok && lookup.connector.credentialPolicy.mode === "broker_reference" && !evidence.credentialBrokerReady) {
    blockers.push("credential_broker_not_ready");
  }
  if (lookup.ok && lookup.connector.visibility === "public_demo" && !evidence.publicDistributionVerified) {
    blockers.push("public_distribution_not_verified");
  }
  if (lookup.ok && lookup.connector.contentClass === "geometry" && !evidence.geometryScopeVerified) {
    blockers.push("geometry_scope_not_verified");
  }
  if (lookup.ok && lookup.connector.contentClass === "imagery" && !evidence.imageryScopeVerified) {
    blockers.push("imagery_scope_not_verified");
  }
  return deepFreeze({
    allowed: blockers.length === 0,
    connectorId: evidence.connectorId,
    environment: evidence.environment,
    persistence: "forbidden_by_source_02" as const,
    blockers
  });
}

function validateQuery(endpoint: SourceEndpointPolicy, query: SourceConnectorQuery) {
  if (!isRecord(query)) return "invalid_request_contract" as const;
  const allowed = new Set(endpoint.allowedQueryParameters);
  for (const [name, rawValue] of Object.entries(query)) {
    if (credentialLikeNamePattern.test(name)) return "credential_material_forbidden" as const;
    if (!allowed.has(name)) return "query_parameter_not_allowlisted" as const;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    if (values.length !== 1) return "duplicate_query_parameter" as const;
    const value = values[0];
    if (typeof value !== "string" || value.length > maximumQueryValueLength || /[\u0000-\u001f\u007f]/.test(value)) {
      return "invalid_request_contract" as const;
    }
  }
  return null;
}

function containsForbiddenMetadata(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenMetadata);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, item]) =>
    credentialLikeNamePattern.test(key) || internalLocationNamePattern.test(key) || containsForbiddenMetadata(item as JsonValue)
  );
}

function prepareRequestBody(endpoint: SourceEndpointPolicy, body: JsonValue | null) {
  if (endpoint.requestBodyPolicy === "none") {
    return body === null
      ? { ok: true as const, body: null, requestMediaType: null }
      : { ok: false as const, code: "request_body_not_allowed" as const };
  }
  if (body === null) return { ok: false as const, code: "request_body_required" as const };
  if (containsForbiddenMetadata(body)) return { ok: false as const, code: "credential_material_forbidden" as const };
  let canonicalBody: string;
  try {
    canonicalBody = canonicalSourceJson(body);
  } catch {
    return { ok: false as const, code: "invalid_request_contract" as const };
  }
  if (Buffer.byteLength(canonicalBody, "utf8") > endpoint.maximumRequestBytes) {
    return { ok: false as const, code: "request_body_too_large" as const };
  }
  return { ok: true as const, body: canonicalBody, requestMediaType: "application/json" as const };
}

function appendQuery(url: URL, endpoint: SourceEndpointPolicy, query: SourceConnectorQuery) {
  for (const name of endpoint.allowedQueryParameters) {
    const rawValue = query[name];
    if (rawValue === undefined) continue;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    url.searchParams.set(name, value);
  }
}

function authorizeExactTarget(endpoint: SourceEndpointPolicy, target: URL) {
  return target.protocol === "https:" &&
    target.username === "" && target.password === "" && target.hash === "" && target.port === "" &&
    target.origin === normalizeOrigin(endpoint.origin) && target.pathname === endpoint.path && target.href.length <= maximumUrlLength;
}

function intentJson(intent: SourceConnectorIntent, sourceId: string): JsonValue {
  const query = Object.fromEntries(Object.keys(intent.query).sort().map((name) => {
    const value = intent.query[name];
    return [name, Array.isArray(value) ? [...value] : value];
  })) as Record<string, JsonValue>;
  return {
    contractVersion: sourceConnectorContractVersion,
    tenant: {
      organizationId: intent.scope.organizationId,
      projectId: intent.scope.projectId,
      projectKey: intent.scope.projectKey,
      actorProfileId: intent.scope.actorProfileId
    },
    connectorId: intent.connectorId,
    sourceId,
    endpointKey: intent.endpointKey,
    query,
    body: intent.body,
    releaseVersion: intent.releaseVersion,
    schemaVersion: intent.schemaVersion,
    acquisitionWindow: intent.acquisitionWindow
      ? { from: intent.acquisitionWindow.from, to: intent.acquisitionWindow.to }
      : null
  };
}

function idempotencyJson(intent: SourceConnectorIntent, sourceId: string): JsonValue {
  const value = intentJson(intent, sourceId) as Record<string, JsonValue>;
  const tenant = value.tenant as Record<string, JsonValue>;
  return {
    ...value,
    tenant: {
      organizationId: tenant.organizationId,
      projectId: tenant.projectId,
      projectKey: tenant.projectKey
    }
  };
}

function invalidIntent(intent: SourceConnectorIntent) {
  if (!isValidSourceTenantScope(intent.scope) || !endpointKeyPattern.test(intent.endpointKey) ||
      !versionPattern.test(intent.releaseVersion) || !versionPattern.test(intent.schemaVersion)) return true;
  if (!intent.acquisitionWindow) return false;
  return !isCalendarDay(intent.acquisitionWindow.from) || !isCalendarDay(intent.acquisitionWindow.to) ||
    intent.acquisitionWindow.from > intent.acquisitionWindow.to;
}

export function prepareSourceConnectorRequest(
  registry: SourceConnectorRegistry,
  activationEvidence: SourceConnectorActivationEvidence,
  intent: SourceConnectorIntent
): SourceConnectorPlanResult {
  if (!isRecord(intent)) return { ok: false, code: "invalid_request_contract" };
  if (!isValidSourceTenantScope(intent.scope)) return { ok: false, code: "invalid_tenant_scope" };
  const activation = evaluateSourceConnectorActivation(registry, activationEvidence);
  if (!activation.allowed) return { ok: false, code: activation.blockers[0] ?? "activation_not_requested" };
  if (activation.connectorId !== intent.connectorId) return { ok: false, code: "connector_not_registered" };
  const lookup = registry.resolve(intent.connectorId);
  if (!lookup.ok) return { ok: false, code: lookup.code === "invalid_connector_id" ? "invalid_request_contract" : lookup.code };
  if (invalidIntent(intent)) return { ok: false, code: "invalid_request_contract" };
  const endpoint = lookup.connector.endpoints.find((candidate) => candidate.endpointKey === intent.endpointKey);
  if (!endpoint) return { ok: false, code: "endpoint_not_registered" };
  const queryError = validateQuery(endpoint, intent.query);
  if (queryError) return { ok: false, code: queryError };
  const requestBody = prepareRequestBody(endpoint, intent.body);
  if (!requestBody.ok) return { ok: false, code: requestBody.code };
  const target = new URL(endpoint.path, endpoint.origin);
  appendQuery(target, endpoint, intent.query);
  if (!authorizeExactTarget(endpoint, target)) return { ok: false, code: "invalid_endpoint_target" };
  const requestSha256 = sha256Hex(canonicalSourceJson(intentJson(intent, lookup.connector.sourceId)));
  const idempotencySha256 = sha256Hex(canonicalSourceJson(idempotencyJson(intent, lookup.connector.sourceId)));
  const credentialInjection = lookup.connector.credentialPolicy.mode === "none"
    ? { mode: "none" as const }
    : {
        mode: "broker_only" as const,
        referenceId: lookup.connector.credentialPolicy.referenceId,
        allowedHeaderNames: [...lookup.connector.credentialPolicy.allowedHeaderNames]
      };
  const plan: SourceConnectorRequestPlan = {
    contractVersion: sourceConnectorContractVersion,
    scope: { ...intent.scope },
    connectorId: lookup.connector.connectorId,
    sourceId: lookup.connector.sourceId,
    providerId: lookup.connector.providerId,
    endpointKey: endpoint.endpointKey,
    method: endpoint.method,
    url: target.href,
    body: requestBody.body,
    requestMediaType: requestBody.requestMediaType,
    requestSha256,
    idempotencyKey: `source02:${idempotencySha256}`,
    releaseVersion: intent.releaseVersion,
    schemaVersion: intent.schemaVersion,
    visibility: lookup.connector.visibility,
    contentClass: lookup.connector.contentClass,
    scoreImpact: "none",
    rightsEvidenceId: lookup.connector.rightsEvidenceId as string,
    maximumResponseBytes: endpoint.maximumResponseBytes,
    timeoutMs: endpoint.timeoutMs,
    redirectPolicy: endpoint.redirectPolicy,
    networkPolicy: endpoint.networkPolicy,
    credentialInjection,
    allowedResponseMediaTypes: [...endpoint.allowedResponseMediaTypes]
  };
  return { ok: true, plan: deepFreeze(plan) };
}

function resultBase(plan: SourceConnectorRequestPlan, startedAt: string, finishedAt: string) {
  return {
    contractVersion: sourceConnectorContractVersion,
    scope: plan.scope,
    connectorId: plan.connectorId,
    sourceId: plan.sourceId,
    providerId: plan.providerId,
    requestSha256: plan.requestSha256,
    idempotencyKey: plan.idempotencyKey,
    startedAt,
    finishedAt,
    persistence: "not_attempted" as const
  };
}

function timestampsValid(startedAt: string, finishedAt: string) {
  return isUtcTimestamp(startedAt) && isUtcTimestamp(finishedAt) && Date.parse(finishedAt) >= Date.parse(startedAt);
}

export function createFailedSourceConnectorResult(
  plan: SourceConnectorRequestPlan,
  errorCode: SourceConnectorFailureCode,
  startedAt: string,
  finishedAt: string
): SourceConnectorResult {
  if (!stableFailureCodes.has(errorCode) || !timestampsValid(startedAt, finishedAt)) throw new Error("invalid_source_connector_failure");
  return deepFreeze({
    ...resultBase(plan, startedAt, finishedAt),
    outcome: "failed" as const,
    releaseCandidate: null,
    errorCode
  });
}

export function createDuplicateSourceConnectorResult(
  plan: SourceConnectorRequestPlan,
  existingReceiptId: string,
  startedAt: string,
  finishedAt: string
): SourceConnectorResult {
  if (!uuidPattern.test(existingReceiptId) || !timestampsValid(startedAt, finishedAt)) throw new Error("invalid_source_connector_duplicate");
  return deepFreeze({
    ...resultBase(plan, startedAt, finishedAt),
    outcome: "duplicate" as const,
    releaseCandidate: null,
    errorCode: null,
    existingReceiptId
  });
}

function quarantine(
  plan: SourceConnectorRequestPlan,
  errorCode: Extract<SourceConnectorResult, { outcome: "quarantined" }>["errorCode"],
  startedAt: string,
  finishedAt: string
): SourceConnectorResult {
  return deepFreeze({
    ...resultBase(plan, startedAt, finishedAt),
    outcome: "quarantined" as const,
    releaseCandidate: null,
    errorCode
  });
}

function jsonValueIsValid(value: JsonValue) {
  try {
    canonicalSourceJson(value);
    return true;
  } catch {
    return false;
  }
}

export function finalizeSourceConnectorSuccess(
  plan: SourceConnectorRequestPlan,
  evidence: SourceConnectorSuccessEvidence,
  startedAt: string,
  finishedAt: string
): SourceConnectorResult {
  if (!timestampsValid(startedAt, finishedAt)) throw new Error("invalid_source_connector_timing");
  if (!isRecord(evidence) || !(evidence.responseBytes instanceof Uint8Array)) {
    return quarantine(plan, "malformed_normalized_payload", startedAt, finishedAt);
  }
  if (!isUtcTimestamp(evidence.extractedAt) || !isUtcTimestamp(evidence.retrievedAt) ||
      Date.parse(evidence.extractedAt) > Date.parse(evidence.retrievedAt) ||
      Date.parse(evidence.retrievedAt) < Date.parse(startedAt) ||
      Date.parse(evidence.retrievedAt) > Date.parse(finishedAt)) {
    return quarantine(plan, "timestamp_contract_invalid", startedAt, finishedAt);
  }
  if (evidence.coverageState !== "within_approved_scope") return quarantine(plan, "out_of_coverage", startedAt, finishedAt);
  if (evidence.freshnessState !== "current") return quarantine(plan, "stale_source_release", startedAt, finishedAt);
  if (evidence.schemaState !== "valid" || !jsonValueIsValid(evidence.qualitySummary) || !jsonValueIsValid(evidence.lineageSummary) ||
      containsForbiddenMetadata(evidence.qualitySummary) || containsForbiddenMetadata(evidence.lineageSummary) ||
      typeof evidence.caveat !== "string" || evidence.caveat.trim().length < 20 || evidence.caveat.length > 2_000) {
    return quarantine(plan, "malformed_normalized_payload", startedAt, finishedAt);
  }
  if (typeof evidence.mediaType !== "string") return quarantine(plan, "response_media_type_not_allowed", startedAt, finishedAt);
  const normalizedMediaType = evidence.mediaType.split(";", 1)[0].trim().toLowerCase();
  if (!plan.allowedResponseMediaTypes.includes(normalizedMediaType)) {
    return quarantine(plan, "response_media_type_not_allowed", startedAt, finishedAt);
  }
  if (!Number.isSafeInteger(evidence.recordCount) || evidence.recordCount < 0) {
    return quarantine(plan, "record_count_invalid", startedAt, finishedAt);
  }
  if (evidence.responseBytes.byteLength > plan.maximumResponseBytes) {
    return quarantine(plan, "content_size_exceeded", startedAt, finishedAt);
  }
  if (!checksumMatches(evidence.responseBytes, evidence.declaredContentSha256)) {
    return quarantine(plan, "content_checksum_mismatch", startedAt, finishedAt);
  }
  let sourceUri: URL;
  try {
    sourceUri = new URL(evidence.sourceUri);
  } catch {
    return quarantine(plan, "malformed_normalized_payload", startedAt, finishedAt);
  }
  if (sourceUri.href !== plan.url || sourceUri.username || sourceUri.password || sourceUri.hash) {
    return quarantine(plan, "malformed_normalized_payload", startedAt, finishedAt);
  }
  return deepFreeze({
    ...resultBase(plan, startedAt, finishedAt),
    outcome: "succeeded" as const,
    releaseCandidate: {
      releaseVersion: plan.releaseVersion,
      schemaVersion: plan.schemaVersion,
      contentSha256: evidence.declaredContentSha256,
      sourceUriSha256: sha256Hex(sourceUri.href),
      byteSize: evidence.responseBytes.byteLength,
      recordCount: evidence.recordCount,
      extractedAt: evidence.extractedAt,
      retrievedAt: evidence.retrievedAt,
      mediaType: normalizedMediaType,
      visibility: plan.visibility,
      contentClass: plan.contentClass,
      rightsEvidenceId: plan.rightsEvidenceId,
      qualitySummary: cloneJson(evidence.qualitySummary),
      lineageSummary: cloneJson(evidence.lineageSummary),
      caveat: evidence.caveat.trim()
    },
    errorCode: null
  });
}

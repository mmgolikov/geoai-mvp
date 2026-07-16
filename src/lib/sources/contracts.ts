export const sourceConnectorContractVersion = "source_connector_v1" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SourceConnectorEnvironment = "local" | "preview" | "production";
export type SourceConnectorLifecycle = "review_only" | "approved_disabled";
export type SourceRightsStatus = "unreviewed" | "approved" | "suspended" | "expired";
export type SourceVisibility = "public_demo" | "project_private" | "operator_private";
export type SourceContentClass = "metadata" | "tabular" | "geometry" | "imagery";
export type SourceHttpMethod = "GET" | "POST";

export type SourceCredentialPolicy =
  | Readonly<{ mode: "none" }>
  | Readonly<{
      mode: "broker_reference";
      referenceId: string;
      allowedHeaderNames: readonly ("authorization" | "x-api-key" | "api-key")[];
    }>;

export type SourceEndpointPolicy = Readonly<{
  endpointKey: string;
  origin: string;
  path: string;
  method: SourceHttpMethod;
  requestBodyPolicy: "none" | "canonical_json";
  maximumRequestBytes: number;
  allowedQueryParameters: readonly string[];
  allowedResponseMediaTypes: readonly string[];
  maximumResponseBytes: number;
  timeoutMs: number;
  redirectPolicy: "reject";
  networkPolicy: "https_public_dns_and_ip_recheck";
}>;

export type SourceConnectorDefinition = Readonly<{
  contractVersion: typeof sourceConnectorContractVersion;
  connectorId: string;
  sourceId: string;
  providerId: string;
  lifecycle: SourceConnectorLifecycle;
  rightsStatus: SourceRightsStatus;
  visibility: SourceVisibility;
  contentClass: SourceContentClass;
  credentialPolicy: SourceCredentialPolicy;
  rightsEvidenceId: string | null;
  parserContractId: string;
  endpoints: readonly SourceEndpointPolicy[];
}>;

export type SourceConnectorRegistry = Readonly<{
  contractVersion: typeof sourceConnectorContractVersion;
  size: number;
  connectorIds: readonly string[];
  resolve(connectorId: string): SourceConnectorLookup;
}>;

export type SourceConnectorLookup =
  | Readonly<{ ok: true; connector: SourceConnectorDefinition }>
  | Readonly<{ ok: false; code: "connector_not_registered" | "invalid_connector_id" }>;

export type SourceTenantScope = Readonly<{
  organizationId: string;
  projectId: string;
  projectKey: string;
  actorProfileId: string;
}>;

export type SourceConnectorActivationBlocker =
  | "activation_evidence_invalid"
  | "activation_not_requested"
  | "production_not_supported_by_source_02"
  | "connector_not_registered"
  | "connector_not_approved"
  | "rights_not_approved"
  | "rights_evidence_missing"
  | "canonical_replay_not_verified"
  | "source_custody_not_verified"
  | "source_personas_not_verified"
  | "trusted_worker_not_authenticated"
  | "owner_approval_not_bound"
  | "exact_sha_not_verified"
  | "rate_budget_not_ready"
  | "circuit_breaker_not_ready"
  | "credential_broker_not_ready"
  | "public_distribution_not_verified"
  | "geometry_scope_not_verified"
  | "imagery_scope_not_verified";

export type SourceConnectorActivationEvidence = Readonly<{
  requested: boolean;
  environment: SourceConnectorEnvironment;
  connectorId: string;
  canonicalReplayVerified: boolean;
  sourceCustodyVerified: boolean;
  sourcePersonasVerified: boolean;
  trustedWorkerAuthenticated: boolean;
  ownerApprovalBound: boolean;
  exactDeploymentShaVerified: boolean;
  distributedRateBudgetReady: boolean;
  crossInstanceCircuitBreakerReady: boolean;
  credentialBrokerReady: boolean;
  publicDistributionVerified: boolean;
  geometryScopeVerified: boolean;
  imageryScopeVerified: boolean;
}>;

export type SourceConnectorActivationDecision = Readonly<{
  allowed: boolean;
  connectorId: string;
  environment: SourceConnectorEnvironment;
  persistence: "forbidden_by_source_02";
  blockers: readonly SourceConnectorActivationBlocker[];
}>;

export type SourceConnectorQuery = Readonly<Record<string, string | readonly string[]>>;

export type SourceConnectorIntent = Readonly<{
  scope: SourceTenantScope;
  connectorId: string;
  endpointKey: string;
  query: SourceConnectorQuery;
  body: JsonValue | null;
  releaseVersion: string;
  schemaVersion: string;
  acquisitionWindow: Readonly<{ from: string; to: string }> | null;
}>;

export type SourceConnectorRequestPlan = Readonly<{
  contractVersion: typeof sourceConnectorContractVersion;
  scope: SourceTenantScope;
  connectorId: string;
  sourceId: string;
  providerId: string;
  endpointKey: string;
  method: SourceHttpMethod;
  url: string;
  body: string | null;
  requestMediaType: "application/json" | null;
  requestSha256: string;
  idempotencyKey: string;
  releaseVersion: string;
  schemaVersion: string;
  visibility: SourceVisibility;
  contentClass: SourceContentClass;
  scoreImpact: "none";
  rightsEvidenceId: string;
  maximumResponseBytes: number;
  timeoutMs: number;
  redirectPolicy: "reject";
  networkPolicy: "https_public_dns_and_ip_recheck";
  credentialInjection:
    | Readonly<{ mode: "none" }>
    | Readonly<{
        mode: "broker_only";
        referenceId: string;
        allowedHeaderNames: readonly ("authorization" | "x-api-key" | "api-key")[];
      }>;
  allowedResponseMediaTypes: readonly string[];
}>;

export type SourceConnectorPlanBlocker =
  | SourceConnectorActivationBlocker
  | "invalid_tenant_scope"
  | "source_id_mismatch"
  | "endpoint_not_registered"
  | "invalid_endpoint_target"
  | "query_parameter_not_allowlisted"
  | "duplicate_query_parameter"
  | "credential_material_forbidden"
  | "request_body_not_allowed"
  | "request_body_required"
  | "request_body_too_large"
  | "invalid_request_contract";

export type SourceConnectorPlanResult =
  | Readonly<{ ok: true; plan: SourceConnectorRequestPlan }>
  | Readonly<{ ok: false; code: SourceConnectorPlanBlocker }>;

export type SourceConnectorFailureCode =
  | "provider_timeout"
  | "provider_network_error"
  | "provider_non_success"
  | "provider_response_too_large"
  | "provider_invalid_utf8"
  | "provider_invalid_payload"
  | "provider_redirect_rejected"
  | "provider_dns_policy_rejected"
  | "credential_broker_failure"
  | "rate_budget_exhausted"
  | "circuit_open";

export type SourceConnectorQuarantineCode =
  | "content_checksum_mismatch"
  | "content_size_exceeded"
  | "response_media_type_not_allowed"
  | "malformed_normalized_payload"
  | "rights_not_approved"
  | "stale_source_release"
  | "out_of_coverage"
  | "record_count_invalid"
  | "timestamp_contract_invalid";

export type SourceConnectorResultBase = Readonly<{
  contractVersion: typeof sourceConnectorContractVersion;
  scope: SourceTenantScope;
  connectorId: string;
  sourceId: string;
  providerId: string;
  requestSha256: string;
  idempotencyKey: string;
  startedAt: string;
  finishedAt: string;
  persistence: "not_attempted";
}>;

export type SourceConnectorSuccessEvidence = Readonly<{
  responseBytes: Uint8Array;
  declaredContentSha256: string;
  mediaType: string;
  recordCount: number;
  sourceUri: string;
  extractedAt: string;
  retrievedAt: string;
  coverageState: "within_approved_scope" | "out_of_coverage";
  freshnessState: "current" | "stale";
  schemaState: "valid" | "malformed";
  qualitySummary: JsonValue;
  lineageSummary: JsonValue;
  caveat: string;
}>;

export type SourceConnectorResult =
  | (SourceConnectorResultBase & Readonly<{
      outcome: "succeeded";
      releaseCandidate: Readonly<{
        releaseVersion: string;
        schemaVersion: string;
        contentSha256: string;
        sourceUriSha256: string;
        byteSize: number;
        recordCount: number;
        extractedAt: string;
        retrievedAt: string;
        mediaType: string;
        visibility: SourceVisibility;
        contentClass: SourceContentClass;
        rightsEvidenceId: string;
        qualitySummary: JsonValue;
        lineageSummary: JsonValue;
        caveat: string;
      }>;
      errorCode: null;
    }>)
  | (SourceConnectorResultBase & Readonly<{
      outcome: "failed";
      releaseCandidate: null;
      errorCode: SourceConnectorFailureCode;
    }>)
  | (SourceConnectorResultBase & Readonly<{
      outcome: "quarantined";
      releaseCandidate: null;
      errorCode: SourceConnectorQuarantineCode;
    }>)
  | (SourceConnectorResultBase & Readonly<{
      outcome: "duplicate";
      releaseCandidate: null;
      errorCode: null;
      existingReceiptId: string;
    }>);

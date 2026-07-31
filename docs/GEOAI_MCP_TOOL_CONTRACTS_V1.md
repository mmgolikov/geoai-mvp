# GeoAI Control-Plane MCP Tool Contracts v1

**Status:** Design specification; no MCP server deployment is included  
**Purpose:** Replace repeated low-level discovery with small, goal-oriented, auditable tools while preserving primary-source authority.

## 1. Principles

1. Tools represent complete operating goals, not raw vendor endpoints.
2. Every result identifies source, environment, version key, verification time and confidence.
3. Read operations are safe by default; protected writes require explicit current approval.
4. Production, Preview, development, rehearsal and supporting storage are distinct types.
5. Derived state and local CI never override fresher primary evidence.
6. Partial provider failures remain visible.
7. Data-honesty rules are evaluated before content is marked shareable.
8. Internal consistency and external Truth Gate results are separate fields.

## 2. Shared types

```ts
type Environment =
  | "production"
  | "preview"
  | "development"
  | "rehearsal"
  | "supporting";

type Confidence = "verified" | "partially_verified" | "unverified";

type Evidence = {
  source:
    | "github"
    | "vercel"
    | "supabase"
    | "figma"
    | "confluence"
    | "google_drive";
  objectId: string;
  environment: Environment;
  verifiedAt: string;
  versionKey: string;
  finding: string;
  confidence: Confidence;
};

type ExternalTruthGate = {
  requiredSystems: Evidence["source"][];
  verifiedSystems: Evidence["source"][];
  incompleteSystems: Evidence["source"][];
  p0Contradictions: string[];
  complete: boolean;
};

type ProtectedActionApproval = {
  approvalId: string;
  approvedBy: string;
  approvedAt: string;
  allowedActions: Array<
    | "merge"
    | "production_deploy"
    | "supabase_migration"
    | "auth_enforcement"
    | "secret_change"
    | "figma_mutation"
  >;
};
```

## 3. `geoai_get_current_authority`

Returns the smallest dependable current-state package.

```ts
type Output = {
  registryVersion: string;
  production: { commitSha: string; pullRequest: number; deploymentId: string };
  activeCandidates: Array<{ name: string; branch: string; classification: string }>;
  dataFoundation: object;
  designAuthority: object;
  documentationAuthority: object;
  driveClassification: object;
  evidence: Evidence[];
  staleFields: string[];
  externalTruthGate: ExternalTruthGate;
};
```

Behavior:

- read derived registry first;
- refresh expired/changed/decision-critical domains;
- never substitute model memory;
- mark external truth incomplete when any required source is unavailable.

## 4. `geoai_compare_registry_delta`

```ts
type Output = {
  changed: Array<{ domain: string; oldVersion: string; newVersion: string }>;
  unchanged: string[];
  conflicts: Array<{ field: string; sources: Evidence[] }>;
  deepReadsRequired: string[];
};
```

The same primary version keys must produce the same delta.

## 5. `geoai_audit_release_candidate`

Produces a decision package without merging or deploying by default.

```ts
type Output = {
  candidate: object;
  currentProduction: object;
  internalConsistency: {
    pass: boolean;
    scope: "repository_only";
    provesExternalTruth: false;
  };
  externalTruthGate: ExternalTruthGate;
  checks: {
    github: object;
    vercelPreview: object;
    visualQa: object;
    routeSmoke: object;
    dataHonesty: object;
    documentationSync: object;
    rollbackPoint: object;
  };
  decision: "GO" | "NO_GO" | "CONDITIONAL";
  blockers: string[];
  evidence: Evidence[];
  actionExecuted: null | object;
};
```

Safety:

- `read_only` is the default;
- a green internal check cannot set `externalTruthGate.complete=true`;
- no automatic merge recommendation is allowed;
- execution is rejected unless approval explicitly covers the exact current action/head.

## 6. `geoai_check_documentation_drift`

Detects disagreement among direct external evidence, Confluence, repository documents and Drive artifact classifications. `prepare_patch` creates reviewable changes only.

Confluence safety: search snippets are discovery-only and may lag. The tool must direct-fetch the current page/version/body before declaring or repairing drift.

## 7. `geoai_validate_data_honesty`

Evaluates UI, reports, proposals, datasets or documentation.

Mandatory statement:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Unsupported claims include official/live/approved/verified/guaranteed, official parcel/zoning/ownership, certified valuation and pilot-ready/production-ready without current evidence.

## 8. `geoai_generate_release_evidence`

Assembles, never fabricates, a release package.

```ts
type Output = {
  manifest: object;
  evidence: Evidence[];
  missingEvidence: string[];
  staleEvidence: string[];
  externalTruthGate: ExternalTruthGate;
  shareable: boolean;
};
```

A missing test, screenshot or provider read is reported as missing. Successful build/CI is not external Truth Gate evidence.

## 9. Error model

```ts
type ToolResult<T> = {
  value?: T;
  partial: boolean;
  errors: Array<{
    provider: string;
    operation: string;
    retryable: boolean;
    code: string;
    message: string;
  }>;
};
```

Timeouts may receive bounded retry. Permission/policy failures are not treated as transient. Missing external evidence keeps the gate incomplete.

## 10. Observability

Emit trace/workflow ID, provider calls, cache hits, version keys, write attempts/approval IDs, contradictions, internal-check scope, external-gate completeness and final confidence.

## 11. Recommended implementation order

1. Read-only registry/delta service.
2. Direct-source documentation-drift validator.
3. Data-honesty validator.
4. Release evidence assembler.
5. Candidate audit orchestrator.
6. Protected write actions only after governance and audit logging are proven.

## 12. Non-goals

- autonomous merge or Production deployment;
- automatic database migrations;
- automatic Figma edits;
- treating local consistency as external truth;
- treating Rovo search snippets as current-page authority;
- creating a second documentation authority in Drive;
- official source certification or legal/cadastral/zoning/planning/valuation conclusions.

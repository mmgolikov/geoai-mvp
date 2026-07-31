# GeoAI Control-Plane MCP Tool Contracts v1

**Status:** Design specification; no MCP server deployment is included  
**Purpose:** Replace repeated low-level discovery calls with small, goal-oriented, auditable tools.

## 1. Design principles

1. Tools represent complete GeoAI operating goals, not raw vendor API endpoints.
2. Every output identifies source, environment, version key and verification time.
3. Read operations are safe by default; writes require explicit approval evidence.
4. Production, Preview, development and rehearsal are separate types, not labels in free text.
5. Derived state never overrides a fresher primary source.
6. Tools must be idempotent where possible and return structured partial results when a provider fails.
7. Data-honesty rules are evaluated before content is marked shareable.

## 2. Shared types

```ts
type Environment = "production" | "preview" | "development" | "rehearsal";
type Confidence = "verified" | "partially_verified" | "unverified";

type Evidence = {
  source: "github" | "vercel" | "supabase" | "figma" | "confluence";
  objectId: string;
  environment: Environment;
  verifiedAt: string;
  versionKey: string;
  finding: string;
  confidence: Confidence;
};

type ProtectedActionApproval = {
  approvalId: string;
  approvedBy: string;
  approvedAt: string;
  allowedActions: Array<
    "merge" | "production_deploy" | "supabase_migration" |
    "auth_enforcement" | "secret_change"
  >;
};
```

## 3. `geoai_get_current_authority`

### Goal

Return the smallest dependable current-state package for downstream agents.

### Input

```ts
{
  domains?: Array<"release" | "data" | "design" | "documentation">;
  forceFresh?: boolean;
}
```

### Output

```ts
{
  registryVersion: string;
  production: { commitSha: string; pullRequest: number; deploymentId: string };
  activeCandidates: Array<{ name: string; branch: string; classification: string }>;
  dataFoundation: object;
  designAuthority: object;
  documentationAuthority: object;
  evidence: Evidence[];
  staleFields: string[];
}
```

### Behaviour

- Read the registry first.
- Refresh only expired or requested domains.
- Return stale fields explicitly; do not substitute memory.

## 4. `geoai_compare_registry_delta`

### Goal

Determine what changed since the last verified registry without deep-reading unchanged systems.

### Input

```ts
{
  registryVersion?: string;
  includePreviews?: boolean;
}
```

### Output

```ts
{
  changed: Array<{ domain: string; oldVersion: string; newVersion: string }>;
  unchanged: string[];
  conflicts: Array<{ field: string; sources: Evidence[] }>;
  deepReadsRequired: string[];
}
```

### Idempotency

The same primary-source version keys must produce the same delta.

## 5. `geoai_audit_release_candidate`

### Goal

Produce a candidate-to-production decision package without merging or deploying.

### Input

```ts
{
  repository: "mmgolikov/geoai-mvp";
  pullRequest?: number;
  branch?: string;
  expectedBase?: "main";
  approval?: ProtectedActionApproval;
  mode: "read_only" | "execute_approved_action";
}
```

### Output

```ts
{
  candidate: object;
  currentProduction: object;
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
}
```

### Safety

`read_only` is the default and cannot merge, deploy or modify data. Execution is rejected unless approval explicitly includes the requested action and remains current.

## 6. `geoai_check_documentation_drift`

### Goal

Detect disagreement among Confluence, repository release docs, GitHub and Vercel.

### Input

```ts
{
  scope?: Array<"release" | "active_work" | "data" | "design">;
  repairMode?: "report_only" | "prepare_patch";
}
```

### Output

```ts
{
  drift: Array<{
    field: string;
    primaryValue: unknown;
    derivedValue: unknown;
    primarySource: Evidence;
    affectedDocuments: string[];
  }>;
  proposedPatches: Array<{ pathOrPageId: string; summary: string }>;
}
```

### Safety

`prepare_patch` creates reviewable changes only. It does not merge or publish release claims without review.

## 7. `geoai_validate_data_honesty`

### Goal

Evaluate UI copy, reports, proposals, datasets or documentation against GeoAI source and claim boundaries.

### Input

```ts
{
  content: string;
  sourceEvidence?: Evidence[];
  audience: "internal" | "client" | "investor" | "public";
}
```

### Output

```ts
{
  pass: boolean;
  unsupportedClaims: Array<{
    text: string;
    reason: string;
    requiredEvidence: string;
    safeReplacement: string;
  }>;
  mandatoryStatementPresent: boolean;
  correctedContent?: string;
}
```

### Mandatory rule

The following statement must be present where screening outputs may be interpreted as official conclusions:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 8. `geoai_generate_release_evidence`

### Goal

Assemble, not fabricate, a release evidence package from verified artifacts.

### Input

```ts
{
  candidate: { pullRequest?: number; branch?: string };
  include: Array<"build" | "routes" | "visual" | "data" | "docs" | "rollback">;
}
```

### Output

```ts
{
  manifest: object;
  evidence: Evidence[];
  missingEvidence: string[];
  staleEvidence: string[];
  shareable: boolean;
}
```

### Rule

A missing test or screenshot is reported as missing. The tool must never infer a pass from a successful build alone.

## 9. Error model

Every tool returns provider-specific failures without discarding verified results:

```ts
{
  partial: boolean;
  errors: Array<{
    provider: string;
    operation: string;
    retryable: boolean;
    code: string;
    message: string;
  }>;
}
```

Rate limits and timeouts should trigger bounded retry with jitter. Authentication, permission and policy failures must not be retried as if transient.

## 10. Observability

Each execution should emit:

- trace ID and parent workflow ID;
- provider call count and elapsed time;
- cache hits/misses;
- version keys read;
- write attempts and approval IDs;
- conflicts and escalation decisions;
- final confidence and completeness.

This makes it possible to measure how much time is spent in reasoning, provider calls, retries, rendering and QA.

## 11. Recommended implementation order

1. Read-only registry/delta service.
2. Documentation-drift validator.
3. Data-honesty validator.
4. Release evidence assembler.
5. Candidate audit orchestrator.
6. Approved write actions only after governance and audit logging are proven.

## 12. Non-goals for v1

- autonomous Production deployment;
- automatic database migrations;
- automatic Figma-wide edits;
- official source certification;
- legal, cadastral, zoning, planning or valuation conclusions;
- replacement of GitHub, Vercel, Supabase, Figma or Confluence as primary sources.
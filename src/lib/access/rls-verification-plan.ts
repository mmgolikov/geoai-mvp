export const rlsVerificationCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type RlsVerificationReadinessStatus =
  | "planned"
  | "mock_validated"
  | "preview_unverified"
  | "preview_verified";

export type RlsVerificationPersona =
  | "owner"
  | "admin"
  | "analyst"
  | "client_viewer"
  | "no_membership"
  | "other_org_member"
  | "inactive_member"
  | "insufficient_role"
  | "no_session";

export type RlsVerificationAction = "read" | "write";
export type RlsVerificationCaseMode = "positive" | "negative";
export type RlsVerificationExpectedResult = "allow" | "deny_401" | "deny_403";

export type RlsRequiredTable =
  | "organizations"
  | "profiles"
  | "project_memberships"
  | "projects"
  | "aois"
  | "analysis_runs"
  | "reports"
  | "comparison_sets"
  | "uploaded_datasets"
  | "data_room_assets"
  | "validation_checklist_items"
  | "pilot_workflows"
  | "pilot_client_inputs"
  | "pilot_deliverables"
  | "source_registry_snapshots"
  | "external_data_snapshots"
  | "ai_decision_scores"
  | "audit_events";

export type RlsTablePlan = {
  table: RlsRequiredTable;
  purpose: string;
  positivePersona: RlsVerificationPersona;
  negativePersona: RlsVerificationPersona;
  noSessionBehavior: string;
  wrongOrganizationBehavior: string;
  insufficientRoleBehavior: string;
  readExpectation: string;
  writeExpectation: string;
  auditExpectation: string;
  rollbackDiagnosticNote: string;
  caveat: string;
};

export type RlsVerificationCase = {
  table: RlsRequiredTable;
  persona: RlsVerificationPersona;
  action: RlsVerificationAction;
  expectedResult: RlsVerificationExpectedResult;
  mode: RlsVerificationCaseMode;
  diagnosticNote: string;
  caveat: string;
};

export const requiredRlsTables: RlsRequiredTable[] = [
  "organizations",
  "profiles",
  "project_memberships",
  "projects",
  "aois",
  "analysis_runs",
  "reports",
  "comparison_sets",
  "uploaded_datasets",
  "data_room_assets",
  "validation_checklist_items",
  "pilot_workflows",
  "pilot_client_inputs",
  "pilot_deliverables",
  "source_registry_snapshots",
  "external_data_snapshots",
  "ai_decision_scores",
  "audit_events"
];

export const rlsTablePlans: RlsTablePlan[] = [
  {
    table: "organizations",
    purpose: "Tenant container for project and profile access.",
    positivePersona: "owner",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read non-demo organization rows.",
    wrongOrganizationBehavior: "Other-organization members must not read the allowed organization.",
    insufficientRoleBehavior: "Read may pass for members; writes remain operator-gated until explicitly approved.",
    readExpectation: "Allowed organization members can read their organization only.",
    writeExpectation: "Writes remain outside browser user policy verification for this harness.",
    auditExpectation: "Organization access checks should record non-secret metadata when wired to route enforcement.",
    rollbackDiagnosticNote: "If cross-organization rows appear, return Preview to soft mode and inspect organization predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "profiles",
    purpose: "Server-verified profile mapping for Supabase Auth users.",
    positivePersona: "owner",
    negativePersona: "no_membership",
    noSessionBehavior: "Anonymous requests must not read profile rows outside public demo allowances.",
    wrongOrganizationBehavior: "Profiles outside the active organization must not be discoverable through project access.",
    insufficientRoleBehavior: "Profile self-read is identity-scoped; role escalation must not broaden reads.",
    readExpectation: "A user can read only the mapped profile or permitted demo profile.",
    writeExpectation: "Profile writes remain outside this Preview harness.",
    auditExpectation: "Profile resolution evidence should avoid raw identity credentials.",
    rollbackDiagnosticNote: "If profile rows leak, inspect auth_user_id mapping and demo read policies.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "project_memberships",
    purpose: "Project role and membership source for authorization decisions.",
    positivePersona: "admin",
    negativePersona: "no_membership",
    noSessionBehavior: "Anonymous requests must not read protected membership rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project membership rows.",
    insufficientRoleBehavior: "Viewer roles must not manage membership rows.",
    readExpectation: "Members can read only their scoped membership evidence.",
    writeExpectation: "Membership writes require an approved admin path outside this harness.",
    auditExpectation: "Membership changes require audit events once a write path exists.",
    rollbackDiagnosticNote: "If negative personas read membership rows, inspect membership predicates and grants.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "projects",
    purpose: "Project workspace and tenancy boundary.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected project rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project rows.",
    insufficientRoleBehavior: "Client viewers may read but must not manage project records.",
    readExpectation: "Allowed project members can read their scoped project.",
    writeExpectation: "Project writes require admin or owner authorization after hard access is approved.",
    auditExpectation: "Project views and updates should record non-secret project metadata.",
    rollbackDiagnosticNote: "If wrong-org users read a project, inspect project_id/project_key predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "aois",
    purpose: "User-drawn or uploaded screening geometries.",
    positivePersona: "analyst",
    negativePersona: "insufficient_role",
    noSessionBehavior: "Anonymous requests must not read protected AOIs.",
    wrongOrganizationBehavior: "Other-organization members must not read or write allowed-project AOIs.",
    insufficientRoleBehavior: "Client viewers may read but must not create or update AOIs.",
    readExpectation: "Allowed project members can read scoped AOIs.",
    writeExpectation: "Analyst, admin or owner can write only after Preview hard-access verification.",
    auditExpectation: "AOI create/update/delete actions should record non-secret audit events.",
    rollbackDiagnosticNote: "If AOI writes pass for viewer roles, inspect write policy checks.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "analysis_runs",
    purpose: "Stored analysis result payloads and source lineage.",
    positivePersona: "analyst",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected analysis rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project analyses.",
    insufficientRoleBehavior: "Client viewers must not create or mutate analysis runs.",
    readExpectation: "Allowed project members can read scoped analysis runs.",
    writeExpectation: "Analysis writes require an approved server route and verified RLS behavior.",
    auditExpectation: "Analysis execution should record run metadata without confidential payload leakage.",
    rollbackDiagnosticNote: "If analysis rows leak, inspect project_key and project_id scoping.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "reports",
    purpose: "Generated screening reports and printable package metadata.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected reports.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project reports.",
    insufficientRoleBehavior: "Read/export roles must not mutate report records.",
    readExpectation: "Allowed project members can read scoped reports.",
    writeExpectation: "Report generation writes require verified server-side authorization.",
    auditExpectation: "Report generation and preview access should record non-secret audit metadata.",
    rollbackDiagnosticNote: "If reports are visible across projects, inspect linked project predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "comparison_sets",
    purpose: "Shortlist and comparison results for candidate assets.",
    positivePersona: "analyst",
    negativePersona: "no_membership",
    noSessionBehavior: "Anonymous requests must not read protected comparison rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project comparisons.",
    insufficientRoleBehavior: "Client viewers may read/export but must not create comparisons.",
    readExpectation: "Allowed project members can read scoped comparison sets.",
    writeExpectation: "Comparison writes require analyst, admin or owner verification in Preview.",
    auditExpectation: "Comparison creation should record non-secret project/action metadata.",
    rollbackDiagnosticNote: "If no-membership reads pass, inspect project membership predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "uploaded_datasets",
    purpose: "Metadata for user-provided datasets and normalized previews.",
    positivePersona: "analyst",
    negativePersona: "insufficient_role",
    noSessionBehavior: "Anonymous requests must not read protected upload metadata.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project upload metadata.",
    insufficientRoleBehavior: "Client viewers must not upload or mutate datasets.",
    readExpectation: "Allowed project members can read scoped dataset metadata.",
    writeExpectation: "Uploads require analyst or higher plus storage path verification.",
    auditExpectation: "Upload metadata creation should record a non-secret audit event.",
    rollbackDiagnosticNote: "If upload metadata leaks, inspect storage and table policy alignment.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "data_room_assets",
    purpose: "Data room asset metadata for project evidence.",
    positivePersona: "analyst",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected data-room metadata.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project data-room rows.",
    insufficientRoleBehavior: "Client viewers may read allowed assets but must not add files.",
    readExpectation: "Allowed project members can read scoped data-room asset metadata.",
    writeExpectation: "Asset writes require verified membership and storage controls.",
    auditExpectation: "Asset add/update/delete actions should record non-secret metadata.",
    rollbackDiagnosticNote: "If data-room rows leak, inspect project and storage path alignment.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "validation_checklist_items",
    purpose: "Validation tasks and required follow-up evidence.",
    positivePersona: "analyst",
    negativePersona: "no_membership",
    noSessionBehavior: "Anonymous requests must not read protected validation checklist rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project validation items.",
    insufficientRoleBehavior: "Client viewers may read but must not update validation status.",
    readExpectation: "Allowed project members can read scoped validation items.",
    writeExpectation: "Checklist updates require analyst or higher after Preview verification.",
    auditExpectation: "Validation status changes should record non-secret audit metadata.",
    rollbackDiagnosticNote: "If checklist rows leak, inspect project_key and project_id predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "pilot_workflows",
    purpose: "Structured project workflow and client decision context.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected workflow rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project workflows.",
    insufficientRoleBehavior: "Client viewers may read but must not manage workflow records.",
    readExpectation: "Allowed project members can read scoped workflow rows.",
    writeExpectation: "Workflow writes require analyst/admin/owner approval path.",
    auditExpectation: "Workflow edits should record non-secret change metadata.",
    rollbackDiagnosticNote: "If workflow rows leak, inspect organization and project scoping.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "pilot_client_inputs",
    purpose: "Requested client inputs and intake evidence metadata.",
    positivePersona: "analyst",
    negativePersona: "no_membership",
    noSessionBehavior: "Anonymous requests must not read protected client-input rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project inputs.",
    insufficientRoleBehavior: "Client viewers may read assigned inputs but must not manage request metadata.",
    readExpectation: "Allowed project members can read scoped input rows.",
    writeExpectation: "Input updates require analyst/admin/owner verification.",
    auditExpectation: "Input changes should record non-secret audit metadata.",
    rollbackDiagnosticNote: "If input rows leak, inspect project and membership predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "pilot_deliverables",
    purpose: "Deliverable checklist and linked analysis/report references.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected deliverable rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project deliverables.",
    insufficientRoleBehavior: "Client viewers may read but must not mutate deliverable status.",
    readExpectation: "Allowed project members can read scoped deliverables.",
    writeExpectation: "Deliverable updates require analyst/admin/owner verification.",
    auditExpectation: "Deliverable status changes should record non-secret audit metadata.",
    rollbackDiagnosticNote: "If deliverables leak, inspect project_key and organization predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "source_registry_snapshots",
    purpose: "Source readiness metadata and lineage status.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests may read only explicitly public/demo rows, not protected project rows.",
    wrongOrganizationBehavior: "Other-organization members must not read project-scoped source rows.",
    insufficientRoleBehavior: "Client viewers may read source readiness but must not mutate snapshots.",
    readExpectation: "Global/public rows and allowed project rows are readable as configured.",
    writeExpectation: "Snapshot writes remain trusted-server ingestion only.",
    auditExpectation: "Snapshot syncs should record source and record-count metadata only.",
    rollbackDiagnosticNote: "If protected source rows leak, inspect null/global row allowances separately from project rows.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "external_data_snapshots",
    purpose: "External normalized snapshot manifests and quality metadata.",
    positivePersona: "client_viewer",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests may read only explicitly public/demo rows, not protected project rows.",
    wrongOrganizationBehavior: "Other-organization members must not read project-scoped snapshot rows.",
    insufficientRoleBehavior: "Client viewers may read manifests but must not import snapshots.",
    readExpectation: "Global/public rows and allowed project rows are readable as configured.",
    writeExpectation: "Snapshot imports remain trusted-server ingestion only.",
    auditExpectation: "Imports should record source, manifest and validation metadata without secrets.",
    rollbackDiagnosticNote: "If protected snapshot rows leak, inspect global allowances and project predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "ai_decision_scores",
    purpose: "AI/deterministic score metadata and decision caveats.",
    positivePersona: "analyst",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected scoring rows.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project scores.",
    insufficientRoleBehavior: "Client viewers may read allowed scores but must not create score rows.",
    readExpectation: "Allowed project members can read scoped score rows.",
    writeExpectation: "Score creation requires a verified server route and audit evidence.",
    auditExpectation: "Score generation should record model/prompt version metadata without unsupported claims.",
    rollbackDiagnosticNote: "If score rows leak, inspect selected AOI and project predicates.",
    caveat: rlsVerificationCaveat
  },
  {
    table: "audit_events",
    purpose: "Non-certified operational audit events.",
    positivePersona: "owner",
    negativePersona: "other_org_member",
    noSessionBehavior: "Anonymous requests must not read protected audit events except explicitly public demo markers.",
    wrongOrganizationBehavior: "Other-organization members must not read allowed-project audit events.",
    insufficientRoleBehavior: "Client viewers may see only scoped read evidence, not broad audit logs.",
    readExpectation: "Actors and allowed project members can read scoped audit events only.",
    writeExpectation: "Audit writes remain trusted-server only and are not certified audit evidence.",
    auditExpectation: "Audit events must not contain secrets, credentials or confidential content.",
    rollbackDiagnosticNote: "If audit events leak, inspect actor and project access predicates.",
    caveat: rlsVerificationCaveat
  }
];

function caseFor(input: Omit<RlsVerificationCase, "caveat">): RlsVerificationCase {
  return {
    ...input,
    caveat: rlsVerificationCaveat
  };
}

export const rlsVerificationCases: RlsVerificationCase[] = rlsTablePlans.flatMap((plan) => [
  caseFor({
    table: plan.table,
    persona: plan.positivePersona,
    action: "read",
    expectedResult: "allow",
    mode: "positive",
    diagnosticNote: plan.readExpectation
  }),
  caseFor({
    table: plan.table,
    persona: "no_session",
    action: "read",
    expectedResult: "deny_401",
    mode: "negative",
    diagnosticNote: plan.noSessionBehavior
  }),
  caseFor({
    table: plan.table,
    persona: plan.negativePersona,
    action: "read",
    expectedResult: "deny_403",
    mode: "negative",
    diagnosticNote: plan.wrongOrganizationBehavior
  }),
  caseFor({
    table: plan.table,
    persona: "insufficient_role",
    action: "write",
    expectedResult: "deny_403",
    mode: "negative",
    diagnosticNote: plan.insufficientRoleBehavior
  })
]);

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function deriveReadinessStatus(input: {
  missingTables: RlsRequiredTable[];
  totalCases: number;
  positiveCases: number;
  negativeCases: number;
}): RlsVerificationReadinessStatus {
  if (input.missingTables.length > 0 || input.totalCases === 0 || input.positiveCases === 0 || input.negativeCases === 0) {
    return "planned";
  }

  return "mock_validated";
}

export function getRlsVerificationPlanSummary() {
  const representedTables = unique(rlsVerificationCases.map((item) => item.table));
  const missingTables = requiredRlsTables.filter((table) => !representedTables.includes(table));
  const positiveCases = rlsVerificationCases.filter((item) => item.mode === "positive").length;
  const negativeCases = rlsVerificationCases.filter((item) => item.mode === "negative").length;
  const readinessStatus = deriveReadinessStatus({
    missingTables,
    totalCases: rlsVerificationCases.length,
    positiveCases,
    negativeCases
  });

  return {
    totalTables: requiredRlsTables.length,
    representedTables: representedTables.length,
    totalCases: rlsVerificationCases.length,
    positiveCases,
    negativeCases,
    missingTables,
    readinessStatus,
    previewVerified: false,
    caveat: rlsVerificationCaveat
  };
}

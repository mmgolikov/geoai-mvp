export type KnownLimitationStatus =
  | "unresolved"
  | "foundation_ready"
  | "configured_ready"
  | "verified_active"
  | "blocked_external_dependency";

export type KnownLimitation = {
  id: string;
  title: string;
  currentStatus: KnownLimitationStatus;
  whatExists: string;
  whatIsMissing: string;
  nextAction: string;
  caveat: string;
  relatedRoutes: string[];
  relatedDocs: string[];
};

export const knownLimitations: KnownLimitation[] = [
  {
    id: "report_packaging",
    title: "Enterprise report package generation",
    currentStatus: "foundation_ready",
    whatExists: "Report package builder, local/API fallback repository, package APIs, printable package route, JSON export and appendices for source lineage, validation governance, evidence review, Data Room and pilot workflow.",
    whatIsMissing: "Server-side PDF generation, formal e-sign/offline package assembly, enterprise document storage and certified report governance.",
    nextAction: "Use browser Print / Save as PDF for demos, then add server-side rendering and durable document storage if required by a client pilot.",
    caveat: "Report packages are decision-support deliverables, not certified valuation, legal, zoning, planning, cadastral or ownership conclusions.",
    relatedRoutes: ["/api/report-packages", "/report-packages/[id]/print", "/api/report-packages/[id]/json"],
    relatedDocs: ["/docs/ENTERPRISE_REPORT_PACK_V28.md"]
  },
  {
    id: "server_side_pdf",
    title: "Server-side PDF rendering",
    currentStatus: "unresolved",
    whatExists: "Print-friendly report and report package routes with browser Print / Save as PDF workflow.",
    whatIsMissing: "A server-side PDF renderer, hosted PDF storage, background generation workflow and enterprise distribution controls.",
    nextAction: "Add server-side PDF renderer later if required by client pilots or procurement workflows.",
    caveat: "Browser print/save as PDF remains the current PDF workflow.",
    relatedRoutes: ["/reports/[id]/print", "/report-packages/[id]/print"],
    relatedDocs: ["/docs/REPORT_EXPORT_DELIVERABLES_V09.md", "/docs/ENTERPRISE_REPORT_PACK_V28.md"]
  },
  {
    id: "durable_storage",
    title: "Durable Supabase/PostGIS persistence",
    currentStatus: "foundation_ready",
    whatExists: "Repository adapter, schema readiness checks and v2.3 migration file exist.",
    whatIsMissing: "Configured Supabase environment, applied migration and verified read/write checks.",
    nextAction: "Apply the v2.3 migration and run npm run supabase:verify:persistence from a trusted environment.",
    caveat: "Local/API fallback is not durable production storage.",
    relatedRoutes: ["/api/db/health", "/api/platform/activation-status"],
    relatedDocs: ["/docs/SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md", "/docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md"]
  },
  {
    id: "auth_enforcement",
    title: "Project access enforcement",
    currentStatus: "foundation_ready",
    whatExists: "Public demo access helper and soft project access metadata across core APIs.",
    whatIsMissing: "Configured Supabase Auth sessions, membership-backed hard enforcement and production route policy rollout.",
    nextAction: "Enable Supabase Auth, seed project memberships and switch selected APIs from soft to hard enforcement after QA.",
    caveat: "Public demo access is not production authentication.",
    relatedRoutes: ["/api/auth/session", "/api/aois", "/api/data-room", "/api/reports"],
    relatedDocs: ["/docs/AUTH_PROJECT_ACCESS_FOUNDATION_V22.md"]
  },
  {
    id: "rls_governance",
    title: "RLS governance",
    currentStatus: "foundation_ready",
    whatExists: "RLS policy draft in v2.3 migration with project membership helper functions.",
    whatIsMissing: "Live Supabase Auth membership verification, governance review and tenant-level test evidence.",
    nextAction: "Apply migration, seed memberships and test RLS with owner/admin/viewer/client roles.",
    caveat: "RLS policies require configured Supabase Auth, project memberships and deployment governance.",
    relatedRoutes: ["/api/db/health", "/api/platform/activation-status"],
    relatedDocs: ["/docs/SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md"]
  },
  {
    id: "secure_file_storage",
    title: "Secure file storage",
    currentStatus: "foundation_ready",
    whatExists: "Storage health, bucket policy draft, evidence upload/download APIs, upload intent, signed URL verification route, file metadata model and metadata-only fallback.",
    whatIsMissing: "Configured Supabase Storage buckets, applied private policies, verified signed URL binary test and hard access enforcement.",
    nextAction: "Configure Supabase Storage, apply the bucket policy draft and verify signed URL flows with project access enforcement.",
    caveat: "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
    relatedRoutes: ["/api/storage/health", "/api/storage/evidence-files", "/api/storage/evidence-files/upload-intent"],
    relatedDocs: ["/docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md", "/docs/SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md", "/docs/EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md"]
  },
  {
    id: "validation_evidence_review",
    title: "Validation evidence review workflow",
    currentStatus: "foundation_ready",
    whatExists: "Review lifecycle, transition policy, review APIs, report appendix linkage and AI guardrail integration exist.",
    whatIsMissing: "Durable reviewer identity if auth/RLS is not active, official connector automation and external reviewer workflow.",
    nextAction: "Enable authenticated reviewer roles, verify durable review history and connect approved official/customer validation sources.",
    caveat: "Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.",
    relatedRoutes: ["/api/validation", "/api/validation/evidence/[id]/reviews", "/api/ai/decision-score"],
    relatedDocs: ["/docs/EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md", "/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  },
  {
    id: "audit_trail",
    title: "Audit event trail",
    currentStatus: "foundation_ready",
    whatExists: "Non-blocking audit helper and audit calls on key project workflows.",
    whatIsMissing: "Configured database persistence, retention policy, tamper evidence and certified compliance review.",
    nextAction: "Verify audit writes after Supabase migration and define retention/governance controls.",
    caveat: "Audit events are a foundation only, not a certified audit trail.",
    relatedRoutes: ["/api/auth/session", "/api/analysis-runs", "/api/reports", "/api/data-room"],
    relatedDocs: ["/docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md"]
  },
  {
    id: "official_validation_connectors",
    title: "Official validation connectors",
    currentStatus: "foundation_ready",
    whatExists: "Validation evidence model, connector readiness matrix, project validation API and report appendix exist.",
    whatIsMissing: "Approved customer/authority access to official parcel, zoning, ownership, planning and valuation validation sources.",
    nextAction: "Use /api/validation and /api/validation/connectors to track readiness, then obtain official/client evidence before claim escalation.",
    caveat: "GeoAI outputs remain screening hypotheses; official validation required.",
    relatedRoutes: ["/api/validation", "/api/validation/connectors", "/api/data-room"],
    relatedDocs: ["/docs/data-strategy.md", "/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  },
  {
    id: "live_official_dld",
    title: "Live official DLD integration",
    currentStatus: "blocked_external_dependency",
    whatExists: "DLD / Dubai Pulse sample snapshot ingestion and source lineage.",
    whatIsMissing: "Authorized live API credentials, SLA, licensing review and official validation workflow.",
    nextAction: "Secure DLD API Gateway permission or import reviewed manual snapshots before claiming official-source validation.",
    caveat: "Current DLD context is snapshot/sample/fallback only.",
    relatedRoutes: ["/api/external-data/status", "/api/market-metrics", "/api/validation/connectors"],
    relatedDocs: ["/docs/REAL_EXTERNAL_DATA_INTEGRATION_V14.md", "/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  },
  {
    id: "live_geodubai",
    title: "Live GeoDubai / Municipality validation",
    currentStatus: "blocked_external_dependency",
    whatExists: "Planned source registry entries, connector readiness metadata and caveats.",
    whatIsMissing: "Official GeoDubai/Municipality data access, usage rights and validation workflow.",
    nextAction: "Obtain GeoDubai/Municipality access or client-provided official evidence before parcel, zoning, cadastral or planning claims.",
    caveat: "No official parcel, zoning, cadastral or planning validation is connected.",
    relatedRoutes: ["/api/external-data/sources", "/api/validation/connectors"],
    relatedDocs: ["/docs/data-strategy.md", "/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  },
  {
    id: "valuation_conclusions",
    title: "Valuation conclusions",
    currentStatus: "blocked_external_dependency",
    whatExists: "Screening-level market metrics, scenario analysis and decision memo outputs.",
    whatIsMissing: "Certified valuation inputs, appraiser workflow, transaction validation and financial model governance.",
    nextAction: "Add licensed valuation provider or client-approved comparable evidence before any valuation-grade claim.",
    caveat: "GeoAI does not produce legal, cadastral, zoning, planning or valuation conclusions.",
    relatedRoutes: ["/api/analyze", "/api/ai/decision-score"],
    relatedDocs: ["/docs/qa-checklist.md", "/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  },
  {
    id: "cadastral_zoning_ownership",
    title: "Cadastral, zoning and ownership validation",
    currentStatus: "blocked_external_dependency",
    whatExists: "Validation governance can record evidence metadata, connector status and claim posture.",
    whatIsMissing: "Official cadastral parcel, zoning/planning approval and ownership/title evidence from authorized sources.",
    nextAction: "Collect client-provided official documents or authorized authority data before escalating beyond screening.",
    caveat: "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    relatedRoutes: ["/api/validation", "/api/validation/connectors"],
    relatedDocs: ["/docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md"]
  }
];

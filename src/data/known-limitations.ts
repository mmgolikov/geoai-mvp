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
    whatExists: "Demo/public access helper and soft project access metadata across core APIs.",
    whatIsMissing: "Configured Supabase Auth sessions, membership-backed hard enforcement and production route policy rollout.",
    nextAction: "Enable Supabase Auth, seed project memberships and switch selected APIs from soft to hard enforcement after QA.",
    caveat: "Demo access is not production authentication.",
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
    whatExists: "Storage readiness endpoint and required bucket names.",
    whatIsMissing: "Supabase Storage buckets, private policies, signed upload/download flows and access verification.",
    nextAction: "Create private buckets and verify signed URL flows with project access enforcement.",
    caveat: "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.",
    relatedRoutes: ["/api/storage/health"],
    relatedDocs: ["/docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md"]
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
    currentStatus: "blocked_external_dependency",
    whatExists: "Data source registry and validation checklist model.",
    whatIsMissing: "Approved customer/authority access to official parcel, zoning, ownership and planning validation sources.",
    nextAction: "Prepare connector readiness requirements and client data-sharing checklist.",
    caveat: "GeoAI outputs remain screening hypotheses; official validation required.",
    relatedRoutes: ["/api/external-data/status", "/api/data-room"],
    relatedDocs: ["/docs/data-strategy.md"]
  },
  {
    id: "live_official_dld",
    title: "Live official DLD integration",
    currentStatus: "blocked_external_dependency",
    whatExists: "DLD / Dubai Pulse sample snapshot ingestion and source lineage.",
    whatIsMissing: "Authorized live API credentials, SLA, licensing review and official validation workflow.",
    nextAction: "Validate access route with DLD/Dubai Pulse stakeholders before claiming live integration.",
    caveat: "Current DLD context is snapshot/sample/fallback only.",
    relatedRoutes: ["/api/external-data/status", "/api/market-metrics"],
    relatedDocs: ["/docs/REAL_EXTERNAL_DATA_INTEGRATION_V14.md"]
  },
  {
    id: "live_geodubai",
    title: "Live GeoDubai / Municipality validation",
    currentStatus: "blocked_external_dependency",
    whatExists: "Planned source registry entries and caveats.",
    whatIsMissing: "Official GeoDubai/Municipality data access, usage rights and validation workflow.",
    nextAction: "Define official connector requirements and legal/data-use approvals.",
    caveat: "No official parcel, zoning, cadastral or planning validation is connected.",
    relatedRoutes: ["/api/external-data/sources"],
    relatedDocs: ["/docs/data-strategy.md"]
  },
  {
    id: "valuation_conclusions",
    title: "Valuation conclusions",
    currentStatus: "unresolved",
    whatExists: "Screening-level market metrics, scenario analysis and decision memo outputs.",
    whatIsMissing: "Certified valuation inputs, appraiser workflow, transaction validation and financial model governance.",
    nextAction: "Keep investor-demo language limited to screening and due diligence recommendations.",
    caveat: "GeoAI does not produce legal, cadastral, zoning, planning or valuation conclusions.",
    relatedRoutes: ["/api/analyze", "/api/ai/decision-score"],
    relatedDocs: ["/docs/qa-checklist.md"]
  }
];

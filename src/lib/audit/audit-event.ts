import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

export const auditEventTypeLabels = {
  auth_session_checked: "Auth session checked",
  demo_login: "Pilot login",
  project_viewed: "Project viewed",
  project_updated: "Project updated",
  aoi_created: "AOI created",
  aoi_updated: "AOI updated",
  aoi_deleted: "AOI deleted",
  analysis_run: "Analysis run",
  report_generated: "Report generated",
  data_room_asset_added: "Data room asset added",
  checklist_updated: "Checklist updated",
  pilot_input_updated: "Pilot input updated",
  pilot_deliverable_updated: "Pilot deliverable updated",
  ai_decision_score_generated: "AI decision score generated",
  validation_evidence_created: "Validation evidence created",
  validation_evidence_updated: "Validation evidence updated",
  validation_evidence_deleted: "Validation evidence deleted",
  validation_connector_reviewed: "Validation connector reviewed",
  report_validation_appendix_viewed: "Report validation appendix viewed",
  evidence_file_uploaded: "Evidence file uploaded",
  evidence_file_metadata_created: "Evidence file metadata created",
  evidence_file_download_requested: "Evidence file download requested",
  evidence_file_deleted: "Evidence file deleted",
  storage_health_checked: "Storage health checked",
  evidence_review_created: "Evidence review created",
  evidence_review_updated: "Evidence review updated",
  evidence_review_status_changed: "Evidence review status changed",
  signed_url_requested: "Signed URL requested",
  signed_url_verified: "Signed URL verified",
  upload_intent_created: "Upload intent created"
} as const;

export type AuditEventType = keyof typeof auditEventTypeLabels;

type DbWriteResponse = {
  error?: unknown;
};

export type AuditEventInput = {
  organizationId?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  actorUserId?: string | null;
  eventType: AuditEventType;
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgent?: string | null;
};

export function createAuditEventPayload(input: AuditEventInput) {
  return {
    organization_id: input.organizationId ?? null,
    project_id: input.projectId ?? null,
    project_key: input.projectKey ?? null,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    action: input.action ?? auditEventTypeLabels[input.eventType],
    metadata: input.metadata ?? {},
    ip_hash: input.ipHash ?? null,
    user_agent: input.userAgent ?? null
  };
}

export async function recordAuditEvent(input: AuditEventInput) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return {
      ok: true,
      recorded: false,
      ...repositoryModeFields("local_fallback"),
      message: "Audit event skipped in local fallback; audit must never block core workflow."
    };
  }

  try {
    const response = await client.from("audit_events").insert(createAuditEventPayload(input)) as DbWriteResponse;

    if (response.error) {
      return {
        ok: true,
        recorded: false,
        ...repositoryModeFields("local_fallback"),
        message: "Audit event write unavailable; core workflow continued."
      };
    }

    return {
      ok: true,
      recorded: true,
      ...repositoryModeFields("supabase"),
      message: "Audit event recorded."
    };
  } catch {
    return {
      ok: true,
      recorded: false,
      ...repositoryModeFields("local_fallback"),
      message: "Audit event write failed softly; core workflow continued."
    };
  }
}

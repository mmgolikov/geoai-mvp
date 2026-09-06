import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { roleAllowsAction } from "@/src/lib/access/access-decision";
import { createRequestAuthContext } from "@/src/lib/auth/request-context";
import {
  isExactProjectKey,
  type CurrentProjectAccessRow
} from "@/src/lib/auth/request-project-read-policy";
import type { GeoAIProjectRole } from "@/src/types/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const projectRoles = new Set<GeoAIProjectRole>([
  "owner",
  "admin",
  "analyst",
  "viewer",
  "client_viewer"
]);

export type PointObjectCoordinates = {
  longitude: number;
  latitude: number;
};

export type PointObjectAnalysisRunInput = {
  projectKey: string;
  selectedName: string;
  selectedType: string;
  selectedPoint: PointObjectCoordinates;
  selectedFeatureKey: string | null;
  inputContext: Record<string, unknown>;
  resultJson: Record<string, unknown>;
  sourceLineage: Record<string, unknown> | unknown[];
  analysisMode: string | null;
  customQuery: string | null;
  decisionPosture: string | null;
  confidenceLevel: string | null;
  dataConfidenceLevel: string | null;
};

export type PointObjectAccessResult =
  | {
      allowed: true;
      requestId: string;
      supabase: SupabaseClient;
      projectKey: string;
      profileId: string;
      projectId: string;
      role: GeoAIProjectRole;
    }
  | {
      allowed: false;
      status: 400 | 401 | 403 | 503;
      code:
        | "invalid_project_key"
        | "unsupported_bearer_transport"
        | "request_identity_unverified"
        | "dependency_unavailable"
        | "project_access_denied"
        | "project_access_malformed"
        | "insufficient_role";
      message: string;
    };

export type PointObjectPersistenceResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 403 | 409 | 503; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedOptionalString(value: unknown, maxLength: number): value is string | null | undefined {
  return value === null || value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function hasBoundedJsonSize(value: unknown, maxBytes: number) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}

export function parsePointObjectAnalysisRunInput(value: unknown): PointObjectAnalysisRunInput | null {
  if (!isRecord(value) || !isExactProjectKey(value.projectKey)) return null;
  if (typeof value.selectedName !== "string" || value.selectedName.length < 1 || value.selectedName.length > 500) {
    return null;
  }
  if (typeof value.selectedType !== "string" || value.selectedType.length < 1 || value.selectedType.length > 160) {
    return null;
  }
  if (!isRecord(value.selectedPoint)) return null;

  const longitude = value.selectedPoint.longitude;
  const latitude = value.selectedPoint.latitude;
  if (
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
  ) {
    return null;
  }
  const inputContext = value.inputContext ?? {};
  if (!isRecord(value.resultJson) || !isRecord(inputContext)) return null;
  const sourceLineage = value.sourceLineage ?? [];
  if (!isRecord(sourceLineage) && !Array.isArray(sourceLineage)) return null;
  if (
    !isBoundedOptionalString(value.selectedFeatureKey, 500) ||
    !isBoundedOptionalString(value.analysisMode, 80) ||
    !isBoundedOptionalString(value.customQuery, 8000) ||
    !isBoundedOptionalString(value.decisionPosture, 160) ||
    !isBoundedOptionalString(value.confidenceLevel, 80) ||
    !isBoundedOptionalString(value.dataConfidenceLevel, 80) ||
    !hasBoundedJsonSize(value.selectedPoint, 4096) ||
    !hasBoundedJsonSize(inputContext, 128 * 1024) ||
    !hasBoundedJsonSize(value.resultJson, 512 * 1024) ||
    !hasBoundedJsonSize(sourceLineage, 128 * 1024)
  ) {
    return null;
  }

  return {
    projectKey: value.projectKey,
    selectedName: value.selectedName,
    selectedType: value.selectedType,
    selectedPoint: { longitude, latitude },
    selectedFeatureKey: value.selectedFeatureKey ?? null,
    inputContext,
    resultJson: value.resultJson,
    sourceLineage,
    analysisMode: value.analysisMode ?? null,
    customQuery: value.customQuery ?? null,
    decisionPosture: value.decisionPosture ?? null,
    confidenceLevel: value.confidenceLevel ?? null,
    dataConfidenceLevel: value.dataConfidenceLevel ?? null
  };
}

function authDenial(status: string): PointObjectAccessResult {
  if (status === "unsupported_bearer_transport") {
    return {
      allowed: false,
      status: 401,
      code: "unsupported_bearer_transport",
      message: "Bearer and mixed credential transports are not supported."
    };
  }
  if (status === "dependency_unavailable" || status === "public_config_missing") {
    return {
      allowed: false,
      status: 503,
      code: "dependency_unavailable",
      message: "The caller-scoped Auth dependency is unavailable."
    };
  }
  return {
    allowed: false,
    status: status === "claims_unverified" || status === "user_unverified" ? 401 : 403,
    code: "request_identity_unverified",
    message: "A verified active Supabase Auth user and profile are required."
  };
}

export async function authorizePointObjectAnalysis(input: {
  request: Request;
  projectKey: unknown;
  action: "analysis.read" | "analysis.run";
}): Promise<PointObjectAccessResult> {
  if (!isExactProjectKey(input.projectKey)) {
    return {
      allowed: false,
      status: 400,
      code: "invalid_project_key",
      message: "An exact bounded project key is required."
    };
  }
  if (input.request.headers.has("authorization")) {
    return {
      allowed: false,
      status: 401,
      code: "unsupported_bearer_transport",
      message: "Bearer and mixed credential transports are not supported."
    };
  }

  const context = await createRequestAuthContext(input.request);
  if (!context.verified || !context.supabase || !context.user || !context.profile) {
    return authDenial(context.status);
  }

  try {
    const response = await context.supabase
      .schema("api")
      .rpc("current_project_access", { target_project_key: input.projectKey })
      .maybeSingle<CurrentProjectAccessRow>();
    if (response.error) {
      return {
        allowed: false,
        status: 503,
        code: "dependency_unavailable",
        message: "The caller-bound project access projection is unavailable."
      };
    }

    const row = response.data;
    const role = row && projectRoles.has(row.project_role as GeoAIProjectRole)
      ? row.project_role as GeoAIProjectRole
      : null;
    if (
      !row ||
      !role ||
      !uuidPattern.test(row.profile_id) ||
      !uuidPattern.test(row.project_id) ||
      !uuidPattern.test(row.organization_id) ||
      row.profile_id !== context.profile.id ||
      row.project_key !== input.projectKey ||
      !["active", "demo"].includes(row.project_status) ||
      row.project_membership_status !== "active"
    ) {
      return {
        allowed: false,
        status: 403,
        code: row ? "project_access_malformed" : "project_access_denied",
        message: "No valid caller-bound access exists for the requested project."
      };
    }
    if (!roleAllowsAction(role, input.action)) {
      return {
        allowed: false,
        status: 403,
        code: "insufficient_role",
        message: "The active project role does not allow this analysis operation."
      };
    }

    return {
      allowed: true,
      requestId: context.requestId,
      supabase: context.supabase,
      projectKey: input.projectKey,
      profileId: context.profile.id,
      projectId: row.project_id,
      role
    };
  } catch {
    return {
      allowed: false,
      status: 503,
      code: "dependency_unavailable",
      message: "The caller-bound project access projection is unavailable."
    };
  }
}

function persistenceError(error: { code?: string } | null): PointObjectPersistenceResult {
  if (error?.code === "42501") {
    return { ok: false, status: 403, message: "Analysis persistence access was denied." };
  }
  if (error?.code === "23505") {
    return { ok: false, status: 409, message: "The analysis run identifier is already owned by another run." };
  }
  return { ok: false, status: 503, message: "Analysis persistence is temporarily unavailable." };
}

export async function persistPointObjectAnalysisRun(input: {
  supabase: SupabaseClient;
  runKey: string;
  analysis: PointObjectAnalysisRunInput;
}): Promise<PointObjectPersistenceResult> {
  try {
    const response = await input.supabase.schema("api").rpc("upsert_point_object_analysis_run", {
      target_project_key: input.analysis.projectKey,
      target_run_key: input.runKey,
      target_selected_name: input.analysis.selectedName,
      target_selected_type: input.analysis.selectedType,
      target_selected_point: input.analysis.selectedPoint,
      target_selected_feature_key: input.analysis.selectedFeatureKey,
      target_input_context: input.analysis.inputContext,
      target_result_json: input.analysis.resultJson,
      target_source_lineage: input.analysis.sourceLineage,
      target_analysis_mode: input.analysis.analysisMode,
      target_custom_query: input.analysis.customQuery,
      target_decision_posture: input.analysis.decisionPosture,
      target_confidence_level: input.analysis.confidenceLevel,
      target_data_confidence_level: input.analysis.dataConfidenceLevel
    });
    if (response.error) return persistenceError(response.error);
    return { ok: true, data: response.data };
  } catch {
    return persistenceError(null);
  }
}

export async function listPointObjectAnalysisRuns(input: {
  supabase: SupabaseClient;
  projectKey: string;
  limit: number;
}): Promise<PointObjectPersistenceResult> {
  try {
    const response = await input.supabase.schema("api").rpc("list_point_object_analysis_runs", {
      target_project_key: input.projectKey,
      target_limit: input.limit
    });
    if (response.error) return persistenceError(response.error);
    return { ok: true, data: response.data ?? [] };
  } catch {
    return persistenceError(null);
  }
}

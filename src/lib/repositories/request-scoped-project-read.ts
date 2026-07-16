import "server-only";

import {
  authorizeRequestScopedProjectRead,
  type RequestProjectReadAccessResult
} from "@/src/lib/auth/request-project-read-access";
import type { RequestProjectReadScope } from "@/src/lib/auth/request-project-read-policy";

export type CurrentSourceReleaseRead = {
  releaseId: string;
  sourceId: string;
  displayName: string;
  sourceCategory: string;
  releaseVersion: string;
  schemaVersion: string;
  contentSha256: string;
  recordCount: number;
  extractedAt: string | null;
  releasedAt: string;
  effectiveStatus: string;
  caveat: string;
};

export type CurrentSourceReleaseCursor = {
  beforeReleasedAt: string;
  beforeReleaseId: string;
};

export type RequestScopedProjectReadResult<T> =
  | {
      ok: true;
      data: T;
      scope: RequestProjectReadScope;
      requestId: string;
    }
  | {
      ok: false;
      data: null;
      access: Exclude<RequestProjectReadAccessResult, { allowed: true }>;
    };

type CurrentSourceReleaseRow = {
  release_id: string;
  source_id: string;
  display_name: string;
  source_category: string;
  release_version: string;
  schema_version: string;
  content_sha256: string;
  record_count: number;
  extracted_at: string | null;
  released_at: string;
  effective_status: string;
  caveat: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha256Pattern = /^[0-9a-f]{64}$/i;

function invalidParameters(reason: string): RequestScopedProjectReadResult<never> {
  return {
    ok: false,
    data: null,
    access: {
      allowed: false,
      code: "invalid_read_parameters",
      httpStatus: 400,
      reason
    }
  };
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function mapSourceRelease(row: CurrentSourceReleaseRow): CurrentSourceReleaseRead | null {
  if (
    !uuidPattern.test(row.release_id) ||
    typeof row.source_id !== "string" || !row.source_id || row.source_id.length > 160 ||
    typeof row.display_name !== "string" || row.display_name.length > 300 ||
    typeof row.source_category !== "string" || row.source_category.length > 100 ||
    typeof row.release_version !== "string" || row.release_version.length > 160 ||
    typeof row.schema_version !== "string" || row.schema_version.length > 160 ||
    !sha256Pattern.test(row.content_sha256) ||
    !Number.isSafeInteger(row.record_count) || row.record_count < 0 ||
    (row.extracted_at !== null && !validTimestamp(row.extracted_at)) ||
    !validTimestamp(row.released_at) ||
    typeof row.effective_status !== "string" || row.effective_status.length > 80 ||
    typeof row.caveat !== "string" || row.caveat.length > 2_000
  ) {
    return null;
  }

  // Explicit mapping is also a DTO allowlist: source URI, object path, secrets,
  // unstructured summary JSON and future unreviewed columns cannot escape.
  return {
    releaseId: row.release_id,
    sourceId: row.source_id,
    displayName: row.display_name,
    sourceCategory: row.source_category,
    releaseVersion: row.release_version,
    schemaVersion: row.schema_version,
    contentSha256: row.content_sha256,
    recordCount: row.record_count,
    extractedAt: row.extracted_at,
    releasedAt: row.released_at,
    effectiveStatus: row.effective_status,
    caveat: row.caveat
  };
}

export async function readCurrentSourceReleases(input: {
  request: Request;
  projectKey: unknown;
  pageSize?: number;
  cursor?: CurrentSourceReleaseCursor | null;
}): Promise<RequestScopedProjectReadResult<readonly CurrentSourceReleaseRead[]>> {
  const pageSize = input.pageSize ?? 25;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return invalidParameters("Source release page size must be an integer from 1 to 100.");
  }
  if (
    input.cursor &&
    (!validTimestamp(input.cursor.beforeReleasedAt) || !uuidPattern.test(input.cursor.beforeReleaseId))
  ) {
    return invalidParameters("Source release cursor must contain an exact timestamp and UUID pair.");
  }

  const access = await authorizeRequestScopedProjectRead({
    request: input.request,
    projectKey: input.projectKey,
    action: "source.read"
  });
  if (!access.allowed) return { ok: false, data: null, access };

  try {
    const response = await access.supabase
      .schema("api")
      .rpc("current_source_releases", {
        target_project_key: access.scope.projectKey,
        page_size: pageSize,
        before_released_at: input.cursor?.beforeReleasedAt ?? null,
        before_release_id: input.cursor?.beforeReleaseId ?? null
      });

    if (response.error || !Array.isArray(response.data) || response.data.length > pageSize) {
      return {
        ok: false,
        data: null,
        access: {
          allowed: false,
          code: "dependency_unavailable",
          httpStatus: 503,
          reason: "The bounded source release projection is unavailable."
        }
      };
    }

    const releases: CurrentSourceReleaseRead[] = [];
    for (const candidate of response.data as CurrentSourceReleaseRow[]) {
      const release = mapSourceRelease(candidate);
      if (!release) {
        return {
          ok: false,
          data: null,
          access: {
            allowed: false,
            code: "dependency_unavailable",
            httpStatus: 503,
            reason: "The bounded source release projection returned an invalid contract."
          }
        };
      }
      releases.push(release);
    }

    return {
      ok: true,
      data: releases,
      scope: access.scope,
      requestId: access.requestId
    };
  } catch {
    return {
      ok: false,
      data: null,
      access: {
        allowed: false,
        code: "dependency_unavailable",
        httpStatus: 503,
        reason: "The bounded source release projection is unavailable."
      }
    };
  }
}

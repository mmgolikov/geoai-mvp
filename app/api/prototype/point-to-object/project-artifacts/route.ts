import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";
import {
  POINT_OBJECT_CLOUD_BODY_BYTES,
  POINT_OBJECT_CLOUD_PAGE_SIZE,
  encodePointObjectCloudCursor,
  parsePointObjectCloudCursor,
  parsePointObjectCloudPutReceipt,
  parsePointObjectCloudStoredItem,
  validatePointObjectCloudPutInput
} from "@/src/lib/prototype/point-object-cloud-contract";
import {
  authorizePointObjectCloud,
  getPointObjectCloudProjectKey,
  listPointObjectCloudArtifacts,
  putPointObjectCloudArtifact
} from "@/src/lib/prototype/point-object-cloud-repository";
import { getPointObjectPersistenceGate } from "@/src/lib/prototype/point-object-persistence-gate";

export const runtime = "nodejs";

function unavailableResponse() {
  return privateNoStoreJson(
    { ok: false, persisted: false, message: "Project artifact persistence is unavailable." },
    { status: 404 }
  );
}

async function authorize(request: Request, action: "analysis.read" | "analysis.run") {
  if (!getPointObjectPersistenceGate().enabled) return { response: unavailableResponse() } as const;
  const projectKey = getPointObjectCloudProjectKey();
  if (!projectKey) {
    return {
      response: privateNoStoreJson(
        { ok: false, persisted: false, message: "Project artifact scope is unavailable." },
        { status: 503 }
      )
    } as const;
  }
  const access = await authorizePointObjectCloud({ request, projectKey, action });
  if (!access.allowed) {
    return {
      response: privateNoStoreJson(
        { ok: false, persisted: false, code: access.code, message: access.message },
        { status: access.status }
      )
    } as const;
  }
  return { access, projectKey } as const;
}

export async function GET(request: Request) {
  const identity = await requirePilotIdentity(request);
  if (!identity.allowed) return identity.response;
  const authorization = await authorize(request, "analysis.read");
  if ("response" in authorization) return authorization.response;

  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => key !== "limit" && key !== "cursor")) {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Unsupported query parameter." }, { status: 400 });
  }
  const limitValue = url.searchParams.get("limit");
  const limit = limitValue === null ? POINT_OBJECT_CLOUD_PAGE_SIZE : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > POINT_OBJECT_CLOUD_PAGE_SIZE) {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Invalid page limit." }, { status: 400 });
  }
  const cursor = parsePointObjectCloudCursor(url.searchParams.get("cursor"));
  if (cursor === "invalid") {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Invalid page cursor." }, { status: 400 });
  }

  const result = await listPointObjectCloudArtifacts({
    supabase: authorization.access.supabase,
    projectKey: authorization.projectKey,
    limit,
    cursor
  });
  if (!result.ok) {
    return privateNoStoreJson({ ok: false, persisted: false, message: result.message }, { status: result.status });
  }
  if (!Array.isArray(result.data) || result.data.length > POINT_OBJECT_CLOUD_PAGE_SIZE) {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Stored project artifacts failed validation." }, { status: 503 });
  }
  const items = [];
  for (const value of result.data) {
    const parsed = await parsePointObjectCloudStoredItem(value);
    if (!parsed) {
      return privateNoStoreJson({ ok: false, persisted: false, message: "Stored project artifacts failed validation." }, { status: 503 });
    }
    items.push(parsed);
  }
  const last = items.at(-1);
  return privateNoStoreJson({
    ok: true,
    persisted: true,
    storageMode: "authenticated_supabase_preview",
    items: items.map((item) => ({
      cloudRevision: item.cloudRevision,
      localProject: item.localProject,
      artifact: item.artifact
    })),
    nextCursor: items.length === limit && last
      ? encodePointObjectCloudCursor({ createdAt: last.createdAt, id: last.id })
      : null
  });
}

export async function PUT(request: Request) {
  const identity = await requirePilotIdentity(request);
  if (!identity.allowed) return identity.response;
  const mutationOrigin = requirePilotMutationOrigin(request);
  if (mutationOrigin) return mutationOrigin;
  const authorization = await authorize(request, "analysis.run");
  if ("response" in authorization) return authorization.response;

  const body = await readBoundedJson(request, POINT_OBJECT_CLOUD_BODY_BYTES);
  if (!body.ok) {
    return privateNoStoreJson({ ok: false, persisted: false, message: body.message }, { status: body.status });
  }
  const value = await validatePointObjectCloudPutInput(body.value);
  if (!value) {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Invalid project artifact payload." }, { status: 400 });
  }

  const result = await putPointObjectCloudArtifact({
    supabase: authorization.access.supabase,
    projectKey: authorization.projectKey,
    value
  });
  if (!result.ok) {
    return privateNoStoreJson({ ok: false, persisted: false, message: result.message }, { status: result.status });
  }
  const receipt = parsePointObjectCloudPutReceipt(result.data);
  if (!receipt) {
    return privateNoStoreJson({ ok: false, persisted: false, message: "Project artifact receipt failed validation." }, { status: 503 });
  }
  if (receipt.status === "conflict") {
    return privateNoStoreJson({
      ok: false,
      persisted: false,
      conflict: true,
      message: "The cloud artifact changed or belongs to a different immutable result.",
      current: {
        cloudRevision: receipt.cloudRevision,
        payloadHash: receipt.clientPayloadHash,
        immutableHash: receipt.immutableHash
      }
    }, { status: 409 });
  }
  return privateNoStoreJson(
    {
      ok: true,
      persisted: true,
      storageMode: "authenticated_supabase_preview",
      outcome: receipt.status,
      cloudRevision: receipt.cloudRevision,
      payloadHash: receipt.clientPayloadHash,
      immutableHash: receipt.immutableHash
    },
    { status: receipt.status === "created" ? 201 : 200 }
  );
}

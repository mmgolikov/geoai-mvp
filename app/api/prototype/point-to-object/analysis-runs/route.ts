import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";
import {
  authorizePointObjectAnalysis,
  listPointObjectAnalysisRuns,
  parsePointObjectAnalysisRunInput,
  persistPointObjectAnalysisRun
} from "@/src/lib/prototype/point-object-analysis-runs";
import { getPointObjectPersistenceGate } from "@/src/lib/prototype/point-object-persistence-gate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!getPointObjectPersistenceGate().enabled) {
    return privateNoStoreJson(
      { ok: false, persisted: false, message: "Point-to-object persistence is unavailable." },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const projectKey = url.searchParams.get("projectKey");
  const parsedLimit = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;
  const access = await authorizePointObjectAnalysis({
    request,
    projectKey,
    action: "analysis.read"
  });
  if (!access.allowed) {
    return privateNoStoreJson(
      { ok: false, persisted: false, code: access.code, message: access.message },
      { status: access.status }
    );
  }

  const result = await listPointObjectAnalysisRuns({
    supabase: access.supabase,
    projectKey: access.projectKey,
    limit
  });
  if (!result.ok) {
    return privateNoStoreJson(
      { ok: false, persisted: false, message: result.message },
      { status: result.status }
    );
  }

  const items = Array.isArray(result.data) ? result.data : [];
  return privateNoStoreJson({
    ok: true,
    persisted: true,
    projectKey: access.projectKey,
    count: items.length,
    items
  });
}

export async function POST(request: Request) {
  if (!getPointObjectPersistenceGate().enabled) {
    return privateNoStoreJson(
      { ok: false, persisted: false, message: "Point-to-object persistence is unavailable." },
      { status: 404 }
    );
  }

  const parsed = await readBoundedJson(request, 768 * 1024);
  if (!parsed.ok) {
    return privateNoStoreJson(
      { ok: false, persisted: false, message: parsed.message },
      { status: parsed.status }
    );
  }
  const analysis = parsePointObjectAnalysisRunInput(parsed.value);
  if (!analysis) {
    return privateNoStoreJson(
      { ok: false, persisted: false, message: "Invalid point-to-object analysis payload." },
      { status: 400 }
    );
  }

  const access = await authorizePointObjectAnalysis({
    request,
    projectKey: analysis.projectKey,
    action: "analysis.run"
  });
  if (!access.allowed) {
    return privateNoStoreJson(
      { ok: false, persisted: false, code: access.code, message: access.message },
      { status: access.status }
    );
  }

  const runKey = `point-object:${crypto.randomUUID()}`;
  const result = await persistPointObjectAnalysisRun({
    supabase: access.supabase,
    runKey,
    analysis
  });
  if (!result.ok) {
    return privateNoStoreJson(
      { ok: false, persisted: false, runKey, message: result.message },
      { status: result.status }
    );
  }

  return privateNoStoreJson(
    {
      ok: true,
      persisted: true,
      runKey,
      projectKey: access.projectKey,
      data: result.data
    },
    { status: 201 }
  );
}

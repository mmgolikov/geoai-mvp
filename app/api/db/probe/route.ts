import { NextResponse } from "next/server";
import {
  geoaiSupabaseProjectRef,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isPreviewRuntime
} from "@/src/lib/supabase/config";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

type ProbeError = {
  name?: string;
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type ProbeResponse = {
  error?: ProbeError | null;
  count?: number | null;
};

type JwtPayload = {
  role?: string;
  ref?: string;
  iss?: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function describeKey(value: string | null) {
  if (!value) {
    return { present: false, type: "absent" };
  }

  if (value.startsWith("sb_publishable_")) {
    return { present: true, type: "publishable" };
  }

  if (value.startsWith("sb_secret_")) {
    return { present: true, type: "secret" };
  }

  if (!value.includes(".")) {
    return { present: true, type: "unknown_non_jwt" };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(value.split(".")[1] ?? "")) as JwtPayload;
    return {
      present: true,
      type: "legacy_jwt",
      role: payload.role ?? null,
      ref: payload.ref ?? null,
      issuer: payload.iss ?? null,
      matchesGeoAIProject: payload.ref === geoaiSupabaseProjectRef
    };
  } catch {
    return { present: true, type: "unreadable_jwt" };
  }
}

function projectRefFromUrl(value: string | null) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    return host.endsWith(".supabase.co") ? host.split(".")[0] : host;
  } catch {
    return "invalid_url";
  }
}

function safeError(error: unknown): ProbeError | null {
  if (!error || typeof error !== "object") return null;
  const item = error as Record<string, unknown>;
  return {
    name: typeof item.name === "string" ? item.name : undefined,
    message: typeof item.message === "string" ? item.message : undefined,
    code: typeof item.code === "string" ? item.code : undefined,
    details: typeof item.details === "string" ? item.details : undefined,
    hint: typeof item.hint === "string" ? item.hint : undefined
  };
}

async function probeTable(table: string) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { table, ready: false, status: "client_unavailable", count: null, error: null };
  }

  try {
    const response = await client.from(table).select("*", { count: "exact", head: true }) as ProbeResponse;
    return {
      table,
      ready: !response.error,
      status: response.error ? "blocked" : "readable",
      count: response.error ? null : response.count ?? 0,
      error: safeError(response.error)
    };
  } catch (error) {
    return {
      table,
      ready: false,
      status: "exception",
      count: null,
      error: safeError(error) ?? { message: error instanceof Error ? error.message : "Unknown probe exception" }
    };
  }
}

export async function GET() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const [healthcheck, projects, sourceRegistry] = await Promise.all([
    probeTable("geoai_healthcheck"),
    probeTable("projects"),
    probeTable("source_registry_snapshots")
  ]);

  return NextResponse.json({
    ok: true,
    previewRuntime: isPreviewRuntime(),
    expectedProjectRef: geoaiSupabaseProjectRef,
    configuredProjectRef: projectRefFromUrl(url),
    anonKey: describeKey(anonKey),
    serviceRoleKey: describeKey(serviceRoleKey),
    probes: [healthcheck, projects, sourceRegistry],
    caveat: "Probe output redacts all raw keys and only returns key type, JWT role/ref and safe PostgREST error metadata."
  });
}

import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";

const expectedDevelopmentProjectRef = "pphdqkurxneyagvnnjdt";

export type SupabaseApiHealthStatus =
  | "not_configured"
  | "target_mismatch"
  | "reachable"
  | "unreachable";

export type SupabaseApiHealth = {
  schema: "api";
  rpc: "healthcheck";
  configured: boolean;
  reachable: boolean;
  healthy: boolean;
  status: SupabaseApiHealthStatus;
};

export async function probeSupabaseApiHealth(): Promise<SupabaseApiHealth> {
  const baseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!baseUrl || !publishableKey) {
    return {
      schema: "api",
      rpc: "healthcheck",
      configured: false,
      reachable: false,
      healthy: false,
      status: "not_configured"
    };
  }

  let projectRef: string | null = null;
  try {
    const parsed = new URL(baseUrl);
    projectRef = parsed.protocol === "https:"
      ? parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] ?? null
      : null;
  } catch {
    projectRef = null;
  }
  if (projectRef !== expectedDevelopmentProjectRef) {
    return {
      schema: "api",
      rpc: "healthcheck",
      configured: true,
      reachable: false,
      healthy: false,
      status: "target_mismatch"
    };
  }

  try {
    const response = await fetch(new URL("/rest/v1/rpc/healthcheck", baseUrl), {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        Accept: "application/json",
        "Accept-Profile": "api",
        "Content-Profile": "api",
        "Content-Type": "application/json"
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) {
      return {
        schema: "api",
        rpc: "healthcheck",
        configured: true,
        reachable: false,
        healthy: false,
        status: "unreachable"
      };
    }
    const payload = await response.json() as Array<{ healthy?: unknown }> | { healthy?: unknown };
    const row = Array.isArray(payload) ? payload[0] : payload;
    const healthy = row?.healthy === true;
    return {
      schema: "api",
      rpc: "healthcheck",
      configured: true,
      reachable: true,
      healthy,
      status: "reachable"
    };
  } catch {
    return {
      schema: "api",
      rpc: "healthcheck",
      configured: true,
      reachable: false,
      healthy: false,
      status: "unreachable"
    };
  }
}

const safeHttpMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export type ApiMutationOriginInput = {
  method: string;
  pathname: string;
  requestUrl: string;
  origin: string | null;
  secFetchSite: string | null;
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
};

export type ApiMutationOriginDecision =
  | { allowed: true; reason: "not_api_mutation" | "same_origin" }
  | {
      allowed: false;
      reason:
        | "missing_origin"
        | "invalid_origin"
        | "cross_site_fetch_metadata"
        | "invalid_request_authority"
        | "origin_mismatch";
    };

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isUnsafeApiMutation(method: string, pathname: string) {
  return isApiPath(pathname) && !safeHttpMethods.has(method.trim().toUpperCase());
}

function singleHeaderValue(value: string | null) {
  if (value === null) return { ok: true as const, value: null };
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(",")) return { ok: false as const };
  return { ok: true as const, value: trimmed };
}

function normalizedProtocol(value: string): "http:" | "https:" | null {
  const protocol = value.trim().toLowerCase().replace(/:$/, "");
  if (protocol === "http") return "http:";
  if (protocol === "https") return "https:";
  return null;
}

function normalizedHost(value: string, protocol: "http:" | "https:") {
  if (!/^[\x21-\x7e]+$/.test(value) || /[\s/@\\]/.test(value)) return null;
  try {
    const parsed = new URL(`${protocol}//${value}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed.host.toLowerCase();
  } catch {
    return null;
  }
}

function normalizedOrigin(value: string) {
  if (value.trim().toLowerCase() === "null") return null;
  try {
    const parsed = new URL(value.trim());
    if (
      !normalizedProtocol(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

function expectedRequestOrigin(input: ApiMutationOriginInput) {
  let requestUrl: URL;
  try {
    requestUrl = new URL(input.requestUrl);
  } catch {
    return null;
  }

  const requestProtocol = normalizedProtocol(requestUrl.protocol);
  const requestHost = requestProtocol ? normalizedHost(requestUrl.host, requestProtocol) : null;
  if (!requestProtocol || !requestHost || requestUrl.username || requestUrl.password) return null;

  const hostHeader = singleHeaderValue(input.host);
  const forwardedHostHeader = singleHeaderValue(input.forwardedHost);
  const forwardedProtoHeader = singleHeaderValue(input.forwardedProto);
  if (!hostHeader.ok || !forwardedHostHeader.ok || !forwardedProtoHeader.ok) return null;

  const forwardedProtocol = forwardedProtoHeader.value
    ? normalizedProtocol(forwardedProtoHeader.value)
    : requestProtocol;
  const host = hostHeader.value && requestProtocol
    ? normalizedHost(hostHeader.value, requestProtocol)
    : requestHost;
  const forwardedHost = forwardedHostHeader.value && forwardedProtocol
    ? normalizedHost(forwardedHostHeader.value, forwardedProtocol)
    : host;
  if (!host || !forwardedHost || !forwardedProtocol) return null;

  // NextRequest.url, Host and Vercel's forwarded authority should describe one
  // public request. Reject contradictory authority instead of accepting any one
  // attacker-controlled fallback.
  if (host !== requestHost || forwardedHost !== host || forwardedProtocol !== requestProtocol) return null;

  return `${forwardedProtocol}//${forwardedHost}`;
}

export function evaluateApiMutationOrigin(input: ApiMutationOriginInput): ApiMutationOriginDecision {
  if (!isUnsafeApiMutation(input.method, input.pathname)) {
    return { allowed: true, reason: "not_api_mutation" };
  }

  const fetchSiteHeader = singleHeaderValue(input.secFetchSite);
  if (!fetchSiteHeader.ok) return { allowed: false, reason: "cross_site_fetch_metadata" };
  if (fetchSiteHeader.value && fetchSiteHeader.value.toLowerCase() !== "same-origin") {
    return { allowed: false, reason: "cross_site_fetch_metadata" };
  }

  const originHeader = singleHeaderValue(input.origin);
  if (!originHeader.ok) return { allowed: false, reason: "invalid_origin" };
  if (!originHeader.value) return { allowed: false, reason: "missing_origin" };
  const origin = normalizedOrigin(originHeader.value);
  if (!origin) return { allowed: false, reason: "invalid_origin" };

  const expectedOrigin = expectedRequestOrigin(input);
  if (!expectedOrigin) return { allowed: false, reason: "invalid_request_authority" };
  if (origin !== expectedOrigin) return { allowed: false, reason: "origin_mismatch" };

  return { allowed: true, reason: "same_origin" };
}

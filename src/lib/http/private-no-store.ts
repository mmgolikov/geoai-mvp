import { NextResponse } from "next/server";

export const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0";
export const PUBLIC_IMMUTABLE_SEED_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

const identityVaryHeaders = ["Authorization", "Cookie"] as const;

export function withPrivateNoStore(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  const vary = (headers.get("Vary") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const normalizedVary = new Set(vary.map((value) => value.toLowerCase()));

  for (const header of identityVaryHeaders) {
    if (!normalizedVary.has(header.toLowerCase())) {
      vary.push(header);
    }
  }

  headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL);
  headers.set("Vary", vary.join(", "));

  return { ...init, headers };
}

export function privateNoStoreJson<T>(body: T, init: ResponseInit = {}) {
  return NextResponse.json(body, withPrivateNoStore(init));
}

export function applyPrivateNoStore<T extends Response>(response: T): T {
  const headers = new Headers(withPrivateNoStore({ headers: response.headers }).headers);
  response.headers.set("Cache-Control", headers.get("Cache-Control") ?? PRIVATE_NO_STORE_CACHE_CONTROL);
  response.headers.set("Vary", headers.get("Vary") ?? identityVaryHeaders.join(", "));
  return response;
}

export function publicImmutableSeedJson<T>(body: T, init: ResponseInit = {}) {
  const headers = new Headers(withPrivateNoStore(init).headers);
  headers.set("Cache-Control", PUBLIC_IMMUTABLE_SEED_CACHE_CONTROL);
  return NextResponse.json(body, { ...init, headers });
}

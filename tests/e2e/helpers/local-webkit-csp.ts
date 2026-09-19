import type { Page } from "@playwright/test";

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function requireLoopbackTestOrigin(baseURL: string | undefined): URL {
  if (!baseURL) throw new Error("A loopback E2E baseURL is required");
  let target: URL;
  try {
    target = new URL(baseURL);
  } catch {
    throw new Error("The E2E baseURL must be an absolute loopback URL");
  }
  const bareOrigin = baseURL.match(/^https?:\/\/([^/?#]+)\/?$/);
  if (
    !bareOrigin ||
    bareOrigin[1] !== target.host ||
    !["http:", "https:"].includes(target.protocol) ||
    !LOOPBACK_HOSTNAMES.has(target.hostname) ||
    target.username !== "" ||
    target.password !== "" ||
    target.pathname !== "/" ||
    target.search !== "" ||
    target.hash !== ""
  ) {
    throw new Error("The E2E baseURL must be a bare HTTP(S) loopback origin");
  }
  return target;
}

export function isExternalHttpUrl(url: URL, baseURL: string | undefined): boolean {
  const target = requireLoopbackTestOrigin(baseURL);
  return ["http:", "https:"].includes(url.protocol) && url.origin !== target.origin;
}

export function externalHttpUrlPattern(baseURL: string | undefined): RegExp {
  const origin = requireLoopbackTestOrigin(baseURL).origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Unlike a callback predicate, this is recorded as an exact negative-origin
  // matcher instead of a client-side **/* decision. WebKit can still implement
  // routing through internal interception, so this does not claim a fully
  // browser-owned navigation path.
  return new RegExp(`^(?!${origin}(?:/|$))https?:\\/\\/`);
}

export function isConfiguredLoopbackWebSocketUrl(url: URL, baseURL: string | undefined): boolean {
  const target = requireLoopbackTestOrigin(baseURL);
  const socketProtocol = target.protocol === "https:" ? "wss:" : "ws:";
  return url.protocol === socketProtocol && url.host === target.host;
}

/**
 * Transport-only exception for WebKit against an HTTP-only loopback server.
 * WebKit upgrades loopback subresources under upgrade-insecure-requests;
 * the local dev server has no TLS listener. Preserve every other CSP directive
 * and response header. Remote/HTTPS runs exercise the original policy intact.
 * This does not alter product configuration or weaken Auth/identity checks.
 */
export async function installLocalWebKitHttpCsp(page: Page, browserName: string | undefined, baseURL: string | undefined) {
  if (browserName !== "webkit" || !baseURL) return;
  const target = requireLoopbackTestOrigin(baseURL);
  if (target.protocol !== "http:") return;

  await page.route((url) => url.origin === target.origin, async (route) => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    // Let the browser follow redirects through normal routing rather than
    // letting APIRequestContext fetch an unchecked redirect destination.
    // Avoid reusing a compressed streaming dev-server connection while WebKit
    // is replacing the login document. This is loopback transport only: forward
    // the original request/cookies and do not change routes or response content.
    const response = await route.fetch({
      maxRedirects: 0,
      headers: { ...route.request().headers(), "accept-encoding": "identity", connection: "close" }
    });
    // WebKit cannot fulfill an intercepted navigation with a redirect status.
    // Replay the real same-origin request so the browser follows the server's
    // redirect normally; never synthesize a success page at the protected URL.
    if (response.status() >= 300 && response.status() < 400) return route.continue();
    const headers = response.headers();
    const csp = headers["content-security-policy"];
    if (csp) headers["content-security-policy"] = csp.split(";")
      .filter((directive) => directive.trim().toLowerCase() !== "upgrade-insecure-requests")
      .join(";");
    await route.fulfill({ response, headers });
  });
}

/**
 * Fail-closed network boundary for local browser product fixtures. The exact
 * configured loopback origin does not match this guard; all other HTTP(S) and
 * WebSocket destinations are blocked unless a product spec has registered a
 * later, exact mock route. Register this before those fixture routes.
 */
export async function installLoopbackBrowserHarness(page: Page, browserName: string | undefined, baseURL: string | undefined) {
  requireLoopbackTestOrigin(baseURL);
  await installLocalWebKitHttpCsp(page, browserName, baseURL);
  await page.route(
    externalHttpUrlPattern(baseURL),
    (route) => route.abort("blockedbyclient")
  );
  await page.routeWebSocket(/^(?:ws|wss):\/\//, async (route) => {
    if (isConfiguredLoopbackWebSocketUrl(new URL(route.url()), baseURL)) {
      route.connectToServer();
      return;
    }
    await route.close({ code: 1008, reason: "Blocked by local E2E harness" });
  });
}

import type { Page } from "@playwright/test";

/**
 * Transport-only exception for WebKit against an HTTP-only loopback server.
 * WebKit upgrades loopback subresources under upgrade-insecure-requests;
 * the local dev server has no TLS listener. Preserve every other CSP directive
 * and response header. Remote/HTTPS runs exercise the original policy intact.
 * This does not alter product configuration or weaken Auth/identity checks.
 */
export async function installLocalWebKitHttpCsp(page: Page, browserName: string | undefined, baseURL: string | undefined) {
  if (browserName !== "webkit" || !baseURL) return;
  const target = new URL(baseURL);
  if (target.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) return;

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

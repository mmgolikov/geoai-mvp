import { expect, test } from "@playwright/test";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

// Run against a build made with NEXT_PUBLIC_AUTH_MODE=supabase_auth.
// No authenticated persona is forged: these are real anonymous HTTP/SSR checks.
test.beforeEach(async ({ page, request }, testInfo) => {
  const session = await request.get("/api/auth/session");
  expect(session.ok()).toBe(true);
  expect(await session.json()).toMatchObject({
    requestedAuthMode: "supabase_auth",
    authMode: "supabase_auth",
    isAuthenticated: false,
    isDemo: false,
    sessionStatus: "session_missing"
  });
  await installLocalWebKitHttpCsp(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  const origin = new URL(testInfo.project.use.baseURL!).origin;
  await page.route((url) => ["http:", "https:"].includes(url.protocol) && url.origin !== origin, (route) => route.abort());
});

const entries = [
  {
    name: "map Find continuation",
    entry: "/prototype/point-to-object?mode=find",
    destination: "/prototype/point-to-object?mode=find"
  },
  {
    name: "workspace allowlisted preferences",
    entry: "/workspace?segment=b2b&spatialMode=open_context_preview&unapproved=drop",
    destination: "/workspace?segment=b2b&spatialMode=open_context_preview"
  },
  {
    name: "hostile login destination",
    entry: "/login?next=https%3A%2F%2Fexample.invalid%2Fprivate",
    destination: "/workspace"
  }
] as const;

for (const width of [390, 1440]) {
  for (const entry of entries) {
    test(`S1 auth entry ${width}px: ${entry.name} without hydration errors`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      const pageErrors: string[] = [];
      const mutationRequests: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("request", (request) => {
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
        }
      });

      await page.goto(entry.entry);
      await expect(page).toHaveURL((url) => url.pathname === "/login");
      if (!entry.entry.startsWith("/login")) {
        expect(new URL(page.url()).searchParams.get("next")).toBe(entry.destination);
      }
      await expect(page.getByRole("heading", { name: "Sign in to GeoAI", exact: true })).toBeVisible();
      await expect(page.getByText(`After authorization: ${entry.destination}`, { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open demo access", exact: true })).toHaveCount(0);

      // Change local form state, without submitting, to prove hydration completed.
      await page.getByLabel(/^Email or phone/).fill("entry-fixture@example.invalid");
      await page.getByLabel(/^Password/).fill("fixture-only-no-submit");
      await expect(page.locator("form button[type=submit]")).toHaveText("Sign in");
      await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(pageErrors).toEqual([]);
      expect(mutationRequests).toEqual([]);
      // Clear fixture form values before persisting the visual artifact.
      await page.getByLabel(/^Password/).clear();
      await page.getByLabel(/^Email or phone/).clear();
      await page.screenshot({ path: testInfo.outputPath("auth-entry.png"), fullPage: true });
    });
  }
}

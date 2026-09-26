import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    name: "ordinary login opens current product",
    entry: "/login",
    destination: "/prototype/point-to-object"
  },
  {
    name: "demo entry opens current product",
    entry: "/demo",
    destination: "/prototype/point-to-object"
  },
  {
    name: "explore entry opens current product",
    entry: "/explore",
    destination: "/prototype/point-to-object"
  },
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
    destination: "/prototype/point-to-object"
  }
] as const;

for (const width of [390, 834, 1440]) {
  for (const entry of entries) {
    test(`S1 auth entry ${width}px: ${entry.name} without hydration errors`, async ({ page, browser }, testInfo) => {
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

      if (entry.name === "hostile login destination") {
        // Login visual, keyboard and Axe coverage belongs to this protected
        // persona, never to demo_public's automatic continuation.
        const email = page.getByLabel(/^Email or phone/);
        let reachedEmail = false;
        for (let tabs = 0; tabs < 40; tabs += 1) {
          await page.keyboard.press("Tab");
          reachedEmail = await email.evaluate((element) => document.activeElement === element);
          if (reachedEmail) break;
        }
        expect(reachedEmail).toBe(true);
        await page.keyboard.type("keyboard-only@example.invalid");
        await expect(email).toHaveValue("keyboard-only@example.invalid");
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(axe.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
      }

      // Change local form state, without submitting, to prove hydration completed.
      await page.getByLabel(/^Email or phone/).fill("entry-fixture@example.invalid");
      await page.getByLabel(/^Password/).fill("fixture-only-no-submit");
      await expect(page.locator("form button[type=submit]")).toHaveText("Sign in");
      const emailMethod = page.getByRole("button", { name: "Email", exact: true });
      const submit = page.locator("form button[type=submit]");
      await expect(emailMethod).toBeEnabled();
      await expect(submit).toBeEnabled();
      for (const input of [page.getByLabel(/^Email or phone/), page.getByLabel(/^Password/)]) {
        await input.focus();
        await expect(input).toHaveCSS("border-color", "rgb(8, 127, 140)");
      }
      await testInfo.attach("enabled-auth-palette", { body: JSON.stringify(await Promise.all([emailMethod, submit].map((control) => control.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, disabled: (element as HTMLButtonElement).disabled }))))), contentType: "application/json" });
      await page.screenshot({ path: testInfo.outputPath("auth-enabled.png"), fullPage: true });
      await expect(emailMethod).toHaveCSS("background-color", "rgb(8, 127, 140)");
      await expect(submit).toHaveCSS("background-color", "rgb(8, 127, 140)");

      if (entry.name === "ordinary login opens current product") {
        // The initial server-rendered form must also retain its local palette.
        // No JavaScript or submission: this cannot create an authenticated persona.
        const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, ignoreHTTPSErrors: testInfo.project.use.ignoreHTTPSErrors, javaScriptEnabled: false, viewport: { width, height: width === 390 ? 844 : 1000 } });
        try {
          const origin = new URL(testInfo.project.use.baseURL!).origin;
          await context.route((url) => ["http:", "https:"].includes(url.protocol) && url.origin !== origin, (route) => route.abort());
          const initial = await context.newPage();
          await initial.goto("/login");
          const controls = [initial.getByRole("button", { name: "Email", exact: true }), initial.locator("form button[type=submit]")];
          await testInfo.attach("initial-auth-palette", { body: JSON.stringify(await Promise.all(controls.map((control) => control.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, disabled: (element as HTMLButtonElement).disabled }))))), contentType: "application/json" });
          await initial.screenshot({ path: testInfo.outputPath("auth-initial-disabled.png"), fullPage: true });
          for (const control of controls) {
            await expect(control).toBeDisabled();
            await expect(control).toHaveCSS("background-color", "rgb(229, 250, 250)");
            await expect(control).toHaveCSS("color", "rgb(52, 64, 84)");
            await expect(control).toHaveCSS("opacity", "1");
          }
        } finally { await context.close(); }
      }
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

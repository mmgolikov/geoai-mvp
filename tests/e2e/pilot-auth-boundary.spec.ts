import { expect, test, type APIResponse } from "@playwright/test";

async function expectIdentityDenial(response: APIResponse) {
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers().vary?.toLowerCase()).toContain("cookie");
  expect(response.headers().vary?.toLowerCase()).toContain("authorization");
  expect(await response.json()).toMatchObject({
    ok: false,
    code: "authentication_required"
  });
}

test.describe("Sprint 1 permanent-user boundary", () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({
      requestedAuthMode: "supabase_auth",
      authMode: "supabase_auth",
      isAuthenticated: false,
      isDemo: false,
      sessionStatus: "session_missing"
    });
  });

  test("redirects core product pages before protected markup is rendered", async ({ request }) => {
    for (const [path, expectedNext] of [
      ["/prototype/point-to-object?mode=find", "/prototype/point-to-object?mode=find"],
      ["/prototype/point-to-object/analysis", "/prototype/point-to-object/analysis"],
      ["/workspace", "/workspace"],
      ["/projects", "/projects"],
      ["/profile", "/profile"],
      ["/admin", "/admin"]
    ] as const) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      const location = new URL(response.headers().location, "http://127.0.0.1");
      expect(location.pathname, path).toBe("/login");
      expect(location.searchParams.get("next"), path).toBe(expectedNext);
    }
  });

  test("stages an invitation publicly without granting protected access", async ({ page, context }) => {
    const invitation = "A".repeat(43);
    await page.goto(`/onboarding#invitation=${invitation}`);
    await expect(page.getByRole("heading", { name: "Join your GeoAI project" })).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === "/onboarding" && url.hash === "");
    await expect.poll(async () => {
      const cookie = (await context.cookies()).find((candidate) => candidate.name === "geoai-onboarding-invitation");
      return cookie?.value ?? null;
    }).toBe(invitation);
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login?next=/onboarding");

    const acceptance = await page.evaluate(async () => {
      const response = await fetch("/api/onboarding/invitation", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: "{}"
      });
      return { status: response.status, body: await response.json() };
    });
    expect(acceptance).toMatchObject({
      status: 401,
      body: { ok: false, status: "authentication_required" }
    });
  });

  test("denies every owned live route before body parsing, rate use or challenge issuance", async ({ request }) => {
    const postRoutes = [
      "/api/prototype/point-to-object/ai",
      "/api/prototype/point-to-object/search",
      "/api/prototype/point-to-object/suggest",
      "/api/prototype/point-to-object/find",
      "/api/prototype/point-to-object/context",
      "/api/prototype/point-to-object/area-context",
      "/api/prototype/point-to-object/create",
      "/api/prototype/point-to-object/analysis-runs"
    ];

    for (const route of postRoutes) {
      const malformed = await request.post(route, {
        headers: { "Content-Type": "application/json" },
        data: "{"
      });
      await expectIdentityDenial(malformed);

      const oversized = await request.post(route, {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ value: "x".repeat(900_000) })
      });
      await expectIdentityDenial(oversized);
    }

    const aiChallenge = await request.get("/api/prototype/point-to-object/ai");
    await expectIdentityDenial(aiChallenge);
    expect(aiChallenge.headers()["set-cookie"] ?? "").not.toContain("geoai_p2o_ai_challenge");

    const createChallenge = await request.get("/api/prototype/point-to-object/create");
    await expectIdentityDenial(createChallenge);
    expect(createChallenge.headers()["set-cookie"] ?? "").not.toContain("geoai_p2o_create_challenge");

    const listRuns = await request.get("/api/prototype/point-to-object/analysis-runs?projectKey=foreign");
    await expectIdentityDenial(listRuns);
  });

  test("rejects bearer and mixed-transport attempts at the cookie boundary", async ({ request }) => {
    const response = await request.post("/api/prototype/point-to-object/search", {
      headers: {
        Authorization: "Bearer not-a-cookie-session",
        Cookie: "sb-access-token=forged",
        "Content-Type": "application/json"
      },
      data: JSON.stringify({ marketKey: "dubai", locale: "en", query: "Marina" })
    });
    await expectIdentityDenial(response);
  });
});

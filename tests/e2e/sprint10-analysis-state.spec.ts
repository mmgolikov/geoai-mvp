import { expect, test, type Page, type Route } from "@playwright/test";
import { sprint10AnalysisResponse, sprint10PublicEvidenceReceipt, sprint10Selection } from "./helpers/sprint10-analysis-fixture";
import { POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS } from "../../src/lib/prototype/point-to-object-analysis-request-state";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test.beforeEach(async ({ page }, testInfo) => {
  await installLoopbackBrowserHarness(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
});

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function receiptAt(lookupId: string | null, locale: "en" | "ru", createdAtMs: number) {
  return { ...sprint10PublicEvidenceReceipt(lookupId, locale),
    acquiredAt: new Date(createdAtMs).toISOString(), createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + 900_000).toISOString(), cacheWindow: Math.floor(createdAtMs / 900_000) };
}

async function prepare(page: Page, initialReceiptAgeMs = 0) {
  const posts: Array<Record<string, unknown>> = [];
  const contextPosts: Array<Record<string, unknown>> = [];
  let settledPosts = 0;
  let settledChallenges = 0;
  let releasePending: (() => void) | null = null;
  let releaseChallenge: (() => void) | null = null;
  let holdNextPost = false;
  let holdNextChallenge = false;
  let nextFailure: { body: unknown; status: number } | null = null;
  let sequence = 0;
  await page.addInitScript((selection) => {
    sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selection));
  }, { ...sprint10Selection, resolvedObject: { ...sprint10Selection.resolvedObject,
    evidenceReceipt: receiptAt(sprint10Selection.object.sourceFeatureId, "en", Date.now() - initialReceiptAgeMs) } });
  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, user: null }));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/context", async route => {
    const body = route.request().postDataJSON() as { locale: "en" | "ru"; expectedSourceFeatureId: string | null };
    contextPosts.push(body);
    // Playwright advances browser Date independently of this Node process. A
    // source refresh must issue a fresh lease on the same test clock as its client.
    const now = await page.evaluate(() => Date.now());
    return json(route, { mode: "resolved", subject: { ...sprint10Selection.resolvedObject,
      evidenceReceipt: receiptAt(body.expectedSourceFeatureId, body.locale, now) } });
  });
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") {
      if (holdNextChallenge) await new Promise<void>((resolve) => { releaseChallenge = resolve; });
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      settledChallenges += 1;
      return;
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    posts.push(body);
    sequence += 1;
    try {
      if (holdNextPost) await new Promise<void>((resolve) => { releasePending = resolve; });
      if (nextFailure) {
        const failure = nextFailure;
        nextFailure = null;
        await json(route, failure.body, failure.status);
        return;
      }
      await json(route, sprint10AnalysisResponse({
        role: body.role as string,
        scenario: body.scenario as string,
        depth: body.depth as "quick" | "standard" | "deep",
        goal: body.goal as "object_profile" | "development_screening" | "redevelopment" | "due_diligence" | "custom",
        perspective: body.perspective as "developer" | "investor" | "asset_owner",
        horizon: body.horizon as "current" | "one_to_three_years" | "long_term",
        question: body.question as string | null,
        locale: body.locale as "en" | "ru"
      }, sequence, (body.evidenceReceipt as { evidencePackHash?: string } | undefined)?.evidencePackHash,
      "POINT_OBJECT_AI_PROMPT_V12_2026_09_21"));
    } finally { settledPosts += 1; }
  });
  return {
    posts,
    contextPosts,
    settledPosts: () => settledPosts,
    settledChallenges: () => settledChallenges,
    hasPendingPost: () => releasePending !== null,
    hasPendingChallenge: () => releaseChallenge !== null,
    holdNext: () => { holdNextPost = true; },
    holdChallenge: () => { holdNextChallenge = true; },
    releaseChallenge: () => { holdNextChallenge = false; releaseChallenge?.(); releaseChallenge = null; },
    release: () => { holdNextPost = false; releasePending?.(); releasePending = null; },
    failNext: (body: unknown, status: number) => { nextFailure = { body, status }; }
  };
}

test("S1 keeps draft, in-flight and completed depth honest and allows an explicit blank rerun", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  expect(api.posts).toHaveLength(1);
  expect(api.posts[0]?.depth).toBe("standard");

  await page.getByRole("button", { name: "Deep", exact: true }).click();
  const run = page.getByRole("button", { name: /Run|Refresh/ });
  await expect(run).toBeEnabled();
  api.holdNext();
  await run.click();
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-depth", "deep");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "deep");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-depth", "standard");
  await expect(page.getByRole("status").filter({ hasText: /Deep/ })).toBeVisible();
  await expect.poll(api.hasPendingPost).toBe(true);
  api.release();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "deep");
  expect(api.posts).toHaveLength(2);
  expect(api.posts[1]).toMatchObject({ depth: "deep", question: null });
});

test("S1 accepts blank, custom and preset runs and suppresses a double-submit", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");

  await page.getByRole("button", { name: "Quick", exact: true }).click();
  const run = page.getByRole("button", { name: /Run|Refresh/ });
  await run.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "quick");
  expect(api.posts).toHaveLength(2);
  expect(api.posts[1]).toMatchObject({ depth: "quick", question: null });

  const composer = page.getByRole("textbox", { name: "Run a focused analysis", exact: true });
  await composer.fill("Check access evidence");
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect(page.getByText("Bounded answer: Check access evidence", { exact: true })).toBeVisible();
  expect(api.posts[2]).toMatchObject({ goal: "custom", question: "Check access evidence" });

  await page.getByRole("button", { name: "Object profile", exact: true }).click();
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect.poll(() => api.posts.length).toBe(4);
  await expect(page.getByRole("button", { name: "Refresh analysis", exact: true })).toBeEnabled();
  expect(api.posts[3]?.goal).toBe("object_profile");
  expect(api.posts[3]?.question).toContain("Build a concise decision-oriented profile");
});

test("S1 keeps the last result on 429 and malformed error responses and allows retry", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");

  api.failNext({ mode: "unavailable", code: "AI_RATE_LIMITED", error: "Fixture rate limit", retryable: true }, 429);
  await page.getByRole("button", { name: "Deep", exact: true }).click();
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Fixture rate limit" })).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByRole("button", { name: "Run focused analysis", exact: true })).toBeEnabled();

  api.failNext({ unexpected: true }, 502);
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please try again shortly" })).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  expect(api.posts).toHaveLength(3);
});

test("S1 allows a valid Deep request to run beyond 45 seconds", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await page.clock.install();
  await page.getByRole("button", { name: "Deep", exact: true }).click();
  api.holdNext();
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "deep");
  await expect.poll(api.hasPendingPost).toBe(true);
  await page.clock.fastForward(50_000);
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "deep");
  await expect(page.getByRole("alert").filter({ hasText: "timed out" })).toHaveCount(0);
  api.release();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "deep");
});

test("S1 times out only after the route contract and supports an explicit retry", async ({ page }) => {
  // Deliberately cross the lease expiry, independently of wall-clock quarter hours.
  const api = await prepare(page, 14 * 60_000);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await page.clock.install();
  await page.getByRole("button", { name: "Deep", exact: true }).click();
  api.holdNext();
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  // Start the deadline assertion only after the deliberately delayed POST exists.
  // Advancing the clock during the challenge GET exercises a different branch.
  await expect.poll(api.hasPendingPost).toBe(true);
  expect(api.posts).toHaveLength(2);
  expect(api.contextPosts).toHaveLength(0);
  await page.clock.fastForward(POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS + 1);
  await expect(page.getByRole("alert").filter({ hasText: "timed out" })).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "none");
  api.release();
  await expect.poll(api.settledPosts).toBe(2);
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect.poll(() => api.posts.length).toBe(3);
  expect(api.contextPosts).toHaveLength(1);
  expect(api.contextPosts[0]).toMatchObject({ expectedSourceFeatureId: "way/91010", locale: "en" });
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "deep");
});

test("S1 challenge timeout never dispatches the aborted analysis and supports an explicit retry", async ({ page }) => {
  const api = await prepare(page, 14 * 60_000);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await page.clock.install();
  await page.getByRole("button", { name: "Deep", exact: true }).click();
  api.holdChallenge();
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect.poll(api.hasPendingChallenge).toBe(true);
  expect(api.posts).toHaveLength(1);
  expect(api.contextPosts).toHaveLength(0);
  await page.clock.fastForward(POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS + 1);
  await expect(page.getByRole("alert").filter({ hasText: "timed out" })).toBeVisible();
  api.releaseChallenge();
  await expect.poll(api.settledChallenges).toBe(2);
  expect(api.posts).toHaveLength(1);
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "none");
  await page.getByRole("button", { name: "Run focused analysis", exact: true }).click();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "deep");
  expect(api.posts).toHaveLength(2);
  expect(api.contextPosts).toHaveLength(1);
  expect(api.contextPosts[0]).toMatchObject({ expectedSourceFeatureId: "way/91010", locale: "en" });
});

test("S1 preserves the last result across cancel and unrelated Find context without a paid-route replay", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await page.getByRole("button", { name: "Quick", exact: true }).click();
  api.holdNext();
  await page.getByRole("button", { name: /Run|Refresh/ }).click();
  await expect.poll(api.hasPendingPost).toBe(true);
  await expect(page.getByRole("button", { name: "Cancel analysis" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  expect(api.posts).toHaveLength(2);
  api.release();
  await page.waitForTimeout(100);
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");

  await page.evaluate(() => sessionStorage.setItem("geoai:point-to-object:find:v1", JSON.stringify({
    version: 1,
    marketKey: "dubai",
    locale: "en",
    audience: "b2b",
    role: "real_estate_fund",
    scenario: "b2b_commercial_real_estate",
    group: "commercial_office",
    mappedMinimumLevels: "",
    mappedMaximumLevels: "",
    result: null,
    shortlist: [],
    comparisonOpen: false,
    analysisTargetSourceFeatureId: null,
    updatedAt: "2026-09-18T12:00:00.000Z"
  })));
  await page.reload();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "developer");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-scenario", "unspecified");
  // A Find session without an explicit matching target is not this analysis' provenance.
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-role", "developer");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-scenario", "unspecified");
  expect(api.posts).toHaveLength(2);
});

for (const width of [390, 1440]) {
  for (const locale of ["en", "ru"] as const) {
    test(`S1 analysis controls and saved result remain usable at ${width}px ${locale}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      const api = await prepare(page);
      await page.goto("/prototype/point-to-object/analysis");
      await expect(page.getByTestId("ai-success")).toBeVisible();
      await page.getByRole("button", { name: new RegExp(`^${locale}$`, "i") }).click();
      const deep = page.getByRole("button", { name: locale === "ru" ? "Глубоко" : "Deep", exact: true });
      await expect(deep).toBeVisible();
      expect(api.posts).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`analysis-overview-${width}-${locale}.png`) });
      await deep.click();
      const run = page.getByRole("button", { name: locale === "ru" ? "Запустить целевой анализ" : "Run focused analysis", exact: true });
      await expect(run).toBeEnabled();
      await run.click();
      await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "deep");
      expect(api.posts).toHaveLength(2);
      expect(api.posts[1]).toMatchObject({ depth: "deep", locale });
      const refresh = page.getByRole("button", { name: locale === "ru" ? "Обновить анализ" : "Refresh analysis", exact: true });
      await expect(refresh).toBeEnabled();
      await refresh.scrollIntoViewIfNeeded();
      const bounds = await refresh.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`analysis-controls-${width}-${locale}.png`) });
      expect(errors).toEqual([]);
    });
  }
}

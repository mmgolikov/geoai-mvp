import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync, closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync,
  realpathSync, renameSync, unlinkSync, writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";
import {
  chargeLiveSpendLedger,
  acquireLiveRunLock,
  createLiveSpendLedger,
  markLiveSpendUnknown,
  parseLiveDeploymentAuthority,
  parseLiveProviderTelemetry,
  parseLiveSpendLedger,
  rebindLiveSpendLedger,
  reserveLiveSpend,
  settleLiveSpend,
  validateHealthRelease,
  type LiveDeploymentAuthority,
  type LiveDepth,
  type LiveRoute,
  type LiveSpendLedger
} from "./helpers/sprint09-live-budget";

// Explicit opt-in only. This suite never substitutes provider responses or
// credentials. Keep the private access URL in the process environment, not traces.
test.use({ trace: "off", video: "off", screenshot: "off" });
test.describe.configure({ retries: 0, mode: "serial" });
const enabled = process.env.GEOAI_LIVE_TESTS === "paid-authorized-2usd-2026-09-12";
const flow = process.env.GEOAI_LIVE_FLOW ?? "analysis";

function isDepth(value: unknown): value is LiveDepth {
  return value === "quick" || value === "standard" || value === "deep";
}

function privateLedgerPath(): string {
  const ledgerPath = process.env.GEOAI_LIVE_LEDGER_PATH;
  const target = ledgerPath ? resolve(ledgerPath) : "";
  if (!target.includes("/artifacts/") || basename(target).length < 5) {
    throw new Error("An explicit private artifacts ledger path is required.");
  }
  const parent = dirname(target);
  if (realpathSync(parent) !== parent) throw new Error("The live ledger directory must not resolve through a symlink.");
  if (existsSync(target)) {
    const details = lstatSync(target);
    if (details.isSymbolicLink() || !details.isFile()) throw new Error("The live ledger must be a regular non-symlink file.");
    if ((details.mode & 0o077) !== 0) throw new Error("The existing live ledger must have 0600 permissions.");
  }
  return target;
}

function writeLedgerAtomic(target: string, ledger: LiveSpendLedger) {
  const parent = dirname(target);
  if (realpathSync(parent) !== parent) throw new Error("The live ledger directory changed identity.");
  if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile())) {
    throw new Error("Refusing to replace a non-regular live ledger.");
  }
  const temporary = join(parent, `.${basename(target)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  let descriptor: number | null = null;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    renameSync(temporary, target);
    chmodSync(target, 0o600);
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

function installBudget(page: Page, authority: LiveDeploymentAuthority, ledgerPath: string, verifiedHealth: unknown) {
  let ledger: LiveSpendLedger;
  if (existsSync(ledgerPath)) {
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(ledgerPath, "utf8")); }
    catch { throw new Error("The live ledger is not valid JSON; no provider request was dispatched."); }
    const existing = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    const currentAuthority = {
      deploymentHost: typeof existing.deploymentHost === "string" ? existing.deploymentHost : "",
      releaseCommit: typeof existing.releaseCommit === "string" ? existing.releaseCommit : ""
    };
    ledger = rebindLiveSpendLedger(parsed, currentAuthority, authority, verifiedHealth);
    // Persist the verified current deployment before any provider route is
    // registered. Historical receipts and their original authorities remain.
    writeLedgerAtomic(ledgerPath, ledger);
  } else {
    ledger = createLiveSpendLedger(authority);
    writeLedgerAtomic(ledgerPath, ledger);
  }
  const pending = new Map<Request, number>();
  const save = () => writeLedgerAtomic(ledgerPath, ledger);
  let blocked: string | null = null;
  const settles: Promise<void>[] = [];
  const registration = page.route(/\/api\/prototype\/point-to-object\/(ai|create)(?:\?|$)/, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const endpoint = new URL(request.url()).pathname.split("/").at(-1) as LiveRoute;
    let body: unknown;
    try { body = request.postDataJSON(); } catch { body = null; }
    const requestedDepth = typeof body === "object" && body !== null && "depth" in body
      ? (body as { depth?: unknown }).depth : null;
    if (!isDepth(requestedDepth)) {
      blocked = "Live spend gate rejected a request without a supported analysis depth.";
      return route.abort("blockedbyclient");
    }
    const reservation = reserveLiveSpend(ledger, endpoint, requestedDepth, new Date().toISOString());
    if (!reservation.ok) {
      blocked = `Live spend gate stopped the request: ${reservation.reason}`;
      return route.abort("blockedbyclient");
    }
    ledger = reservation.ledger;
    pending.set(request, reservation.receipt.id);
    save();
    await route.continue();
  });
  page.on("response", (response) => {
    const receiptId = pending.get(response.request());
    if (!receiptId) return;
    settles.push((async () => {
      try {
        const payload = await response.json();
        const receipt = ledger.receipts.find((candidate) => candidate.id === receiptId);
        const telemetry = receipt ? parseLiveProviderTelemetry(receipt.route, receipt.depth, payload) : null;
        const resultHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
        ledger = settleLiveSpend(ledger, receiptId, { status: response.status(), resultHash, telemetry });
      } catch { ledger = markLiveSpendUnknown(ledger, receiptId); }
      save();
    })());
  });
  page.on("requestfailed", (request) => {
    const receiptId = pending.get(request);
    if (receiptId) { ledger = markLiveSpendUnknown(ledger, receiptId); save(); }
  });
  return {
    ready: registration,
    count: () => ledger.receipts.length,
    async verify() {
      await Promise.all(settles);
      if (blocked) throw new Error(blocked);
      expect(chargeLiveSpendLedger(ledger)).toBeLessThanOrEqual(2);
      expect(parseLiveSpendLedger(ledger, authority)).not.toBeNull();
    },
    async finalize() {
      await Promise.all(settles);
      for (const receipt of ledger.receipts) {
        if (receipt.state === "reserved") ledger = markLiveSpendUnknown(ledger, receipt.id);
      }
      save();
    }
  };
}

async function authorizePreview(page: Page, authority: LiveDeploymentAuthority) {
  const access = process.env.GEOAI_TEST_SHARE_URL;
  if (access) {
    const parsed = new URL(access);
    if (parsed.protocol !== "https:" || !(parsed.hostname.endsWith(".vercel.app") || parsed.hostname === "vercel.com")) throw new Error("Unexpected preview authorization host.");
    try { await page.goto(access); } catch { throw new Error("Preview authorization failed; access URL intentionally omitted."); }
  }
  if (process.env.GEOAI_LIVE_INTERACTIVE_LOGIN === "user-login-in-test-browser") {
    // A human may complete an ordinary Vercel login in this headed, isolated
    // context. Never read, export or copy credentials/cookies; the context is
    // destroyed when the test ends and recording remains disabled above.
    await page.waitForURL((url) => url.protocol === "https:" && url.hostname === authority.deploymentHost, {
      timeout: 300_000, waitUntil: "domcontentloaded"
    });
  }
}

async function verifyRelease(page: Page, baseURL: string, authority: LiveDeploymentAuthority) {
  const target = new URL(baseURL);
  const response = await page.context().request.get(`${target.origin}/api/health`, { failOnStatusCode: false });
  if (!response.ok()) throw new Error(`Deployment health preflight failed with status ${response.status()}.`);
  let health: unknown;
  try { health = await response.json(); } catch { throw new Error("Deployment health did not return JSON."); }
  if (!validateHealthRelease(health, authority)) {
    throw new Error("Deployment health is not bound to the exact expected immutable host and commit.");
  }
  return health;
}

async function enter(page: Page, baseURL: string) {
  const target = new URL(baseURL);
  await page.goto(`${target.origin}/prototype/point-to-object`);
  await expect(page.getByRole("tab", { name: "Analyse", exact: true })).toBeVisible();
}

function depthReviewShape(value: unknown, expectedDepth: LiveDepth) {
  expect(value).toBeTruthy();
  expect(typeof value).toBe("object");
  const review = value as Record<string, unknown>;
  const purpose = expectedDepth === "quick" ? "identity_evidence"
    : expectedDepth === "standard" ? "decision_criteria" : "decision_challenge";
  expect(review.depth).toBe(expectedDepth);
  expect(review.basis).toBe("structured_review_of_existing_evidence");
  expect(review.purpose).toBe(purpose);
  const arrays = ["analyticChecks", "alternatives", "uncertainties", "decisionTriggers"] as const;
  for (const key of arrays) {
    expect(Array.isArray(review[key]), `${expectedDepth}.${key} must be an array`).toBe(true);
    for (const item of review[key] as unknown[]) {
      expect(item && typeof item === "object", `${expectedDepth}.${key} items must be structured`).toBe(true);
      const refs = (item as { evidenceRefs?: unknown }).evidenceRefs;
      expect(Array.isArray(refs) && refs.length > 0, `${expectedDepth}.${key} must remain evidence-bound`).toBe(true);
      for (const ref of refs as unknown[]) expect(ref).toMatch(/^EVD-[A-Z0-9-]+$/);
    }
  }
  const checks = review.analyticChecks as unknown[];
  const alternatives = review.alternatives as Array<Record<string, unknown>>;
  const uncertainties = review.uncertainties as unknown[];
  const triggers = review.decisionTriggers as unknown[];
  expect(checks.length).toBe(expectedDepth === "quick" ? 2 : expectedDepth === "standard" ? 3 : 4);
  expect(alternatives.length).toBe(expectedDepth === "quick" ? 0 : expectedDepth === "standard" ? 1 : 2);
  expect(uncertainties.length).toBe(expectedDepth === "quick" ? 1 : expectedDepth === "standard" ? 2 : 3);
  expect(triggers.length).toBe(expectedDepth === "quick" ? 1 : expectedDepth === "standard" ? 2 : 3);
  if (expectedDepth === "deep") {
    expect(new Set(alternatives.map((item) => item.title)).size).toBe(2);
    for (const item of alternatives) expect(item.evidenceClass).toBe("hypothesis");
  }
  return { checks: checks.length, alternatives: alternatives.length, uncertainties: uncertainties.length, triggers: triggers.length };
}

test("authorized live provider journey with persistent USD 2 ceiling", async ({ page, baseURL }, testInfo) => {
  test.skip(!enabled, "Paid provider tests require explicit per-run authorization and a persistent spend ledger.");
  test.setTimeout(600_000);
  if (!baseURL) throw new Error("Live deployment URL required.");
  const authority = parseLiveDeploymentAuthority(
    baseURL,
    process.env.GEOAI_EXPECTED_DEPLOYMENT_HOST,
    process.env.GEOAI_EXPECTED_COMMIT
  );
  if (!authority) throw new Error("Live tests require an exact immutable deployment host and 40-character release commit; aliases are forbidden.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await authorizePreview(page, authority);
  const verifiedHealth = await verifyRelease(page, baseURL, authority);
  const ledgerPath = privateLedgerPath();
  const runLock = acquireLiveRunLock(ledgerPath);
  let budget: ReturnType<typeof installBudget> | null = null;
  try {
    budget = installBudget(page, authority, ledgerPath, verifiedHealth);
    await budget.ready;
    await enter(page, baseURL);
    if (flow === "analysis" || flow === "analysis-single") {
      await page.getByPlaceholder("Search address or place", { exact: true }).fill("Shangri-La Dubai");
      const result = page.getByRole("listbox").getByRole("option").filter({ hasText: /Shangri/i }).first();
      await expect(result).toBeVisible({ timeout: 45_000 });
      await result.click();
      await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 60_000 });
      const question = "Describe this mapped object and nearby infrastructure. What evidence would change a redevelopment screening decision?";
      await page.locator("#point-object-question").fill(question);
      const firstResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 150_000 });
      await page.getByRole("button", { name: "Analyze", exact: true }).click();
      const response = await firstResponse;
      const initial = await response.json();
      expect(response.status()).toBe(200); expect(initial.mode).toBe("openai");
      await expect(page.getByTestId("ai-success")).toBeVisible({ timeout: 30_000 });
      expect(initial.content.depthReview.depth).toBe("standard");
      depthReviewShape(initial.content.depthReview, "standard");
      await budget.verify();
      await page.screenshot({ path: testInfo.outputPath("live-standard.png"), fullPage: true });
      if (flow === "analysis") {
        const reviews: Record<string, unknown> = { standard: initial.content.depthReview };
        for (const depth of ["quick", "deep"] as const) {
          const form = page.locator("form");
          await form.getByRole("button", { name: depth === "quick" ? "Quick" : "Deep", exact: true }).click();
          await form.locator("textarea").fill(question);
          const pending = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith("/point-to-object/ai"), { timeout: 150_000 });
          await form.getByRole("button", { name: "Run focused analysis", exact: true }).click();
          const next = await pending; const payload = await next.json();
          expect(next.status()).toBe(200); expect(payload.mode).toBe("openai");
          expect(payload.content.depthReview.depth).toBe(depth);
          depthReviewShape(payload.content.depthReview, depth);
          reviews[depth] = payload.content.depthReview;
          await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", depth);
          await budget.verify();
          await page.screenshot({ path: testInfo.outputPath(`live-${depth}.png`), fullPage: true });
        }
        expect(new Set(Object.values(reviews).map((value) => JSON.stringify(value))).size).toBe(3);
        const quickStructure = depthReviewShape(reviews.quick, "quick");
        const standardStructure = depthReviewShape(reviews.standard, "standard");
        const deepStructure = depthReviewShape(reviews.deep, "deep");
        expect(quickStructure.checks).toBeLessThan(standardStructure.checks);
        expect(standardStructure.checks).toBeLessThan(deepStructure.checks);
        expect(quickStructure.uncertainties).toBeLessThan(standardStructure.uncertainties);
        expect(standardStructure.uncertainties).toBeLessThan(deepStructure.uncertainties);
        expect(standardStructure.alternatives).toBeLessThan(deepStructure.alternatives);
        expect(standardStructure.triggers).toBeLessThan(deepStructure.triggers);
        await testInfo.attach("depth-reviews", { body: JSON.stringify(reviews, null, 2), contentType: "application/json" });
      }
      const paidBefore = budget.count();
      await page.reload();
      await expect(page.getByTestId("ai-success")).toBeVisible();
      await page.getByRole("link", { name: "Back to map", exact: true }).click();
      await expect(page.getByRole("tab", { name: "Analyse", exact: true })).toBeVisible();
      expect(budget.count()).toBe(paidBefore);
    } else if (flow === "create") {
      await page.getByRole("tab", { name: "Create", exact: true }).click();
      const aoi = { type: "Polygon", coordinates: [[[55.264,25.199],[55.267,25.199],[55.267,25.202],[55.264,25.202],[55.264,25.199]]] };
      await page.getByLabel("Upload GeoJSON", { exact: true }).setInputFiles({ name: "sprint09-live-site.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(aoi)) });
      await expect(page.getByTestId("create-generate-action")).toBeEnabled({ timeout: 45_000 });
      const pending = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/create"), { timeout: 150_000 });
      await page.getByTestId("create-generate-action").click();
      const response = await pending; const payload = await response.json();
      expect(response.status()).toBe(200); expect(payload.mode).toBe("openai_concept");
      await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
      await budget.verify();
      const count = budget.count();
      await page.getByTestId("create-open-result-dashboard").click();
      await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
      await page.getByTestId("create-dashboard-alternative-b").click();
      await page.screenshot({ path: testInfo.outputPath("live-create-b.png"), fullPage: true });
      await page.getByRole("button", { name: "Show on map", exact: true }).click();
      await page.reload();
      await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
      expect(budget.count()).toBe(count);
    } else throw new Error("Unsupported live test flow.");
    await budget.verify();
  } finally {
    try { if (budget) await budget.finalize(); }
    finally { runLock.release(); }
  }
});

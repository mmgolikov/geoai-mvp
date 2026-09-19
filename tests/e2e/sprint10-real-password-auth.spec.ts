import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

test.use({ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });

const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt";
const forbiddenProductionHosts = new Set([
  "geoai-mvp.vercel.app",
  "geoai-id0xnwco2-geoaidev.vercel.app",
  "geoai-a71p4fxnr-geoaidev.vercel.app"
]);
const localSampleKey = "geoai:point-to-object:projects:v1:harness-local-sample";
const localSampleValue = JSON.stringify({
  schemaVersion: 1,
  identityKey: "harness-local-sample",
  activeProjectId: null,
  projects: []
});

const previewUrl = process.env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL?.trim() ?? "";
const baseUrl = process.env.GEOAI_E2E_BASE_URL?.trim() ?? "";
const expectedCommitSha = process.env.GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA?.trim().toLowerCase() ?? "";
const expectedProjectRef = process.env.GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF?.trim() ?? "";
const previewBypassSecret = process.env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET ?? "";
const runApproval = process.env.GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL?.trim() ?? "";
const explicitRunApproval = process.env.GEOAI_REAL_PASSWORD_AUTH_EXPLICIT_RUN?.trim() ?? "";
const selectedScope = process.env.GEOAI_REAL_PASSWORD_AUTH_SCOPE?.trim() ?? "";
const deploymentReceiptPath = process.env.GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH?.trim() ?? "";
const runnerActive = process.env.GEOAI_REAL_PASSWORD_AUTH_RUNNER_ACTIVE === "1";

type Persona = {
  email: string;
  password: string;
  expectedUserId: string;
};

const primaryPersona: Persona = {
  email: process.env.GEOAI_REAL_PASSWORD_AUTH_PRIMARY_EMAIL?.trim().toLowerCase() ?? "",
  password: process.env.GEOAI_REAL_PASSWORD_AUTH_PRIMARY_PASSWORD ?? "",
  expectedUserId: process.env.GEOAI_REAL_PASSWORD_AUTH_PRIMARY_USER_ID?.trim() ?? ""
};

const secondaryPersona: Persona = {
  email: process.env.GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL?.trim().toLowerCase() ?? "",
  password: process.env.GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD ?? "",
  expectedUserId: process.env.GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID?.trim() ?? ""
};

const secondaryFields = Object.values(secondaryPersona);
const anySecondaryFieldConfigured = secondaryFields.some(Boolean);
const secondaryConfigured = secondaryFields.every(Boolean);

function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password && !url.port
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function validPersona(persona: Persona, lane: "primary" | "secondary") {
  const demoAddress = ["demo", "geoai.space"].join("@");
  guard(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(persona.email) && persona.email.length <= 254,
    `The injected ${lane} email is invalid.`);
  guard(persona.email !== demoAddress && persona.password !== "111111",
    `The browser-only demo identity cannot be used as the ${lane} real persona.`);
  guard(persona.password.length >= 8 && persona.password.length <= 128,
    `The injected ${lane} password does not meet the existing password-login contract.`);
  guard(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(persona.expectedUserId),
    `The injected ${lane} expected identity must be an exact UUID.`);
}

type RootDeploymentReceipt = {
  schemaVersion?: unknown;
  verifiedAt?: unknown;
  expiresAt?: unknown;
  deployment?: {
    id?: unknown;
    url?: unknown;
    state?: unknown;
    target?: unknown;
    commitSha?: unknown;
  } | null;
  protection?: {
    kind?: unknown;
    anonymousStatus?: unknown;
    locationOrigin?: unknown;
    locationPath?: unknown;
  } | null;
};

function loadAndValidateRootDeploymentReceipt(): RootDeploymentReceipt {
  guard(deploymentReceiptPath.length > 0 && isAbsolute(deploymentReceiptPath),
    "An absolute root-owned exact-deployment receipt path is required.");
  let receipt: RootDeploymentReceipt;
  try {
    receipt = JSON.parse(readFileSync(deploymentReceiptPath, "utf8")) as RootDeploymentReceipt;
  } catch {
    throw new Error("The root-owned exact-deployment receipt is missing or is not valid JSON.");
  }
  guard(receipt.schemaVersion === "geoai.sprint10.real-password-preview-receipt.v1",
    "The root-owned exact-deployment receipt schema is not accepted.");
  const verifiedAt = typeof receipt.verifiedAt === "string" ? Date.parse(receipt.verifiedAt) : Number.NaN;
  const expiresAt = typeof receipt.expiresAt === "string" ? Date.parse(receipt.expiresAt) : Number.NaN;
  const now = Date.now();
  guard(Number.isFinite(verifiedAt) && verifiedAt <= now && Number.isFinite(expiresAt) && expiresAt > now,
    "The root-owned exact-deployment receipt is not currently valid.");
  guard(typeof receipt.deployment?.id === "string" && /^dpl_[A-Za-z0-9]+$/.test(receipt.deployment.id),
    "The root-owned receipt does not contain an exact Vercel deployment ID.");
  guard(receipt.deployment?.url === previewUrl && receipt.deployment?.state === "READY" &&
    receipt.deployment?.target === "preview" && receipt.deployment?.commitSha === expectedCommitSha,
  "The root-owned receipt is not bound to this exact READY Preview URL, target and commit.");
  guard(receipt.protection?.kind === "vercel_sso" &&
    [301, 302, 303, 307, 308].includes(Number(receipt.protection?.anonymousStatus)) &&
    receipt.protection?.locationOrigin === "https://vercel.com" && receipt.protection?.locationPath === "/sso-api",
  "The root-owned receipt does not prove the expected anonymous Vercel SSO protection challenge.");
  return receipt;
}

function validateHarnessConfiguration() {
  guard(explicitRunApproval === "existing-password-only-live-acceptance",
    "The real-password harness requires the exact explicit live-run opt-in.");
  guard(runnerActive,
    "The real-password harness must be started through scripts/sprint10-real-password-auth-run.mjs.");
  guard(selectedScope === "primary" || selectedScope === "primary_and_secondary",
    "The selected persona scope must be primary or primary_and_secondary.");
  guard(previewUrl.length > 0 && baseUrl.length > 0 && expectedCommitSha.length > 0 &&
    expectedProjectRef.length > 0 && previewBypassSecret.length > 0 && runApproval.length > 0,
  "The exact target configuration is incomplete.");
  guard(Object.values(primaryPersona).every(Boolean),
    "The primary existing-password persona configuration is incomplete.");
  guard(expectedProjectRef === exactDevelopmentProjectRef,
    "The real-password harness is restricted to the exact approved development Supabase project.");
  guard(/^[0-9a-f]{40}$/.test(expectedCommitSha),
    "The expected Preview release identity must be one exact 40-character Git SHA.");

  const targetOrigin = canonicalOrigin(previewUrl);
  const configuredBaseOrigin = canonicalOrigin(baseUrl);
  guard(targetOrigin !== null && configuredBaseOrigin !== null && targetOrigin === configuredBaseOrigin,
    "GEOAI_E2E_BASE_URL and the approved Preview URL must identify the same exact origin.");
  const target = new URL(targetOrigin);
  guard(target.protocol === "https:" && target.hostname.endsWith(".vercel.app"),
    "The real-password harness is restricted to an HTTPS Vercel Preview.");
  guard(!forbiddenProductionHosts.has(target.hostname),
    "The real-password harness must never run against a known Production host.");
  guard(previewBypassSecret.trim().length >= 16,
    "A runtime-only Preview protection bypass credential is required.");
  guard(runApproval === `existing-password-only:${exactDevelopmentProjectRef}:${target.hostname}:${expectedCommitSha}`,
    "The trusted-terminal approval token is missing or is not bound to this project, Preview host and commit.");

  validPersona(primaryPersona, "primary");
  guard(!anySecondaryFieldConfigured || secondaryConfigured,
    "Secondary-persona configuration is partial; provide all three secondary values or none of them.");
  guard(selectedScope !== "primary_and_secondary" || secondaryConfigured,
    "The selected two-persona scope requires a complete secondary persona.");
  guard(selectedScope !== "primary" || !anySecondaryFieldConfigured,
    "The primary-only scope must not receive unused secondary credentials.");
  if (selectedScope === "primary_and_secondary") {
    validPersona(secondaryPersona, "secondary");
    guard(primaryPersona.email !== secondaryPersona.email && primaryPersona.expectedUserId !== secondaryPersona.expectedUserId,
      "Primary and secondary personas must be distinct existing identities.");
  }
  loadAndValidateRootDeploymentReceipt();
}

type NetworkPolicy = {
  assertClean: () => void;
};

async function installNetworkPolicy(page: Page): Promise<NetworkPolicy> {
  const targetOrigin = new URL(previewUrl).origin;
  const authOrigin = `https://${exactDevelopmentProjectRef}.supabase.co`;
  const allowedApplicationReadPaths = new Set([
    "/",
    "/api/health",
    "/api/auth/session",
    "/api/prototype/point-to-object/ai",
    "/login",
    "/profile",
    "/projects",
    "/prototype/point-to-object",
    "/brand/geoai-identity-symbol-32.svg",
    "/favicon.svg"
  ]);
  let unexpectedExternalRequests = 0;
  let disallowedApplicationMutations = 0;
  let disallowedSupabaseOperations = 0;

  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      await route.continue();
      return;
    }
    if (url.origin === targetOrigin) {
      const safeRead = ["GET", "HEAD"].includes(method) &&
        (allowedApplicationReadPaths.has(url.pathname) || url.pathname.startsWith("/_next/"));
      const exactLogout = method === "POST" && url.pathname === "/api/auth/logout" && !url.search;
      if (!safeRead && !exactLogout) {
        disallowedApplicationMutations += 1;
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue({
        headers: {
          ...request.headers(),
          "x-vercel-protection-bypass": previewBypassSecret
        }
      });
      return;
    }
    if (url.origin === authOrigin) {
      const authPreflight = method === "OPTIONS" &&
        ["/auth/v1/token", "/auth/v1/user", "/auth/v1/logout"].includes(url.pathname);
      const passwordOrRefresh = method === "POST" && url.pathname === "/auth/v1/token" &&
        ["password", "refresh_token"].includes(url.searchParams.get("grant_type") ?? "") &&
        [...url.searchParams.keys()].every((key) => key === "grant_type");
      const readUser = method === "GET" && url.pathname === "/auth/v1/user" && !url.search;
      const logout = method === "POST" && url.pathname === "/auth/v1/logout" &&
        [...url.searchParams.keys()].every((key) => key === "scope") &&
        (!url.searchParams.has("scope") || ["local", "global", "others"].includes(url.searchParams.get("scope") ?? ""));
      if (!authPreflight && !passwordOrRefresh && !readUser && !logout) {
        disallowedSupabaseOperations += 1;
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
      return;
    }
    unexpectedExternalRequests += 1;
    await route.abort("blockedbyclient");
  });

  return {
    assertClean() {
      guard(unexpectedExternalRequests === 0,
        "The auth harness attempted a request outside the exact Preview and approved Supabase Auth origins.");
      guard(disallowedApplicationMutations === 0,
        "The auth harness observed an unexpected application mutation.");
      guard(disallowedSupabaseOperations === 0,
        "The auth harness observed a Supabase request outside existing-user authentication.");
    }
  };
}

async function verifyAnonymousPreviewProtection() {
  const targetOrigin = new URL(previewUrl).origin;
  const receipt = loadAndValidateRootDeploymentReceipt();
  const response = await fetch(`${targetOrigin}/api/health`, {
    method: "GET",
    redirect: "manual",
    credentials: "omit",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  guard(response.status === receipt.protection?.anonymousStatus,
    "The anonymous Preview response no longer matches the root-owned protection receipt.");
  const rawLocation = response.headers.get("location");
  guard(typeof rawLocation === "string" && rawLocation.length > 0,
    "The anonymous Preview did not return a protection redirect target.");
  const location = new URL(rawLocation, targetOrigin);
  guard(location.origin === "https://vercel.com" && location.pathname === "/sso-api",
    "The anonymous Preview did not challenge through the exact Vercel SSO target.");
}

async function verifyExactPreview(page: Page) {
  const response = await page.goto(`${new URL(previewUrl).origin}/api/health`, { waitUntil: "domcontentloaded" });
  guard(response?.status() === 200, "The exact Preview health endpoint was not available.");
  const body = await response.json() as Record<string, unknown>;
  const deployment = typeof body.deploymentMetadata === "object" && body.deploymentMetadata !== null
    ? body.deploymentMetadata as Record<string, unknown>
    : null;
  guard(body.status === "ok" && body.productStage === "public_demo_prototype",
    "The target did not identify as the expected GeoAI public-demo prototype.");
  guard(body.environment === "vercel_preview",
    "The target is not a Vercel Preview; live authentication was refused.");
  guard(body.releaseCommit === expectedCommitSha,
    "The Preview commit does not match the explicitly approved release identity.");
  guard(deployment?.provider === "vercel" && deployment.deploymentHost === new URL(previewUrl).hostname,
    "The Preview deployment host does not match the explicitly approved URL.");
}

async function seedLocalSample(page: Page) {
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
    key: localSampleKey,
    value: localSampleValue
  });
}

async function localSampleIsUnchanged(page: Page) {
  return page.evaluate(({ key, value }) => window.localStorage.getItem(key) === value, {
    key: localSampleKey,
    value: localSampleValue
  });
}

async function removeLocalSample(page: Page) {
  await page.evaluate((key) => window.localStorage.removeItem(key), localSampleKey).catch(() => undefined);
}

async function loginWithExistingPassword(page: Page, persona: Persona) {
  await page.goto("/login?next=%2Fprofile");
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  await seedLocalSample(page);
  await page.getByLabel("Email or phone").fill(persona.email);
  await page.getByLabel("Password").fill(persona.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/profile"),
    page.getByRole("button", { name: "Sign in", exact: true }).click()
  ]);
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
}

type SessionEvidence = {
  status: number;
  noStore: boolean;
  authenticated: boolean;
  supabaseAuthenticated: boolean;
  nonDemo: boolean;
  expectedIdentity: boolean;
  verifiedProfileStatus: boolean;
};

async function readSessionEvidence(page: Page, expectedUserId: string): Promise<SessionEvidence> {
  return page.evaluate(async ({ expectedUserId: expectedId }) => {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const body = await response.json().catch(() => null) as {
      isAuthenticated?: unknown;
      supabaseAuthenticated?: unknown;
      isDemo?: unknown;
      sessionStatus?: unknown;
      user?: { id?: unknown; isDemoUser?: unknown } | null;
      supabaseUser?: { id?: unknown } | null;
    } | null;
    return {
      status: response.status,
      noStore: response.headers.get("cache-control")?.includes("no-store") === true,
      authenticated: body?.isAuthenticated === true,
      supabaseAuthenticated: body?.supabaseAuthenticated === true,
      nonDemo: body?.isDemo === false && body?.user?.isDemoUser === false,
      expectedIdentity: body?.user?.id === expectedId && body?.supabaseUser?.id === expectedId,
      verifiedProfileStatus: body?.sessionStatus === "supabase_user_with_profile"
    };
  }, { expectedUserId });
}

async function readGuardedApiEvidence(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/prototype/point-to-object/ai", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const body = await response.json().catch(() => null) as { mode?: unknown; code?: unknown } | null;
    return {
      status: response.status,
      noStore: response.headers.get("cache-control")?.includes("no-store") === true,
      mode: typeof body?.mode === "string" ? body.mode : null,
      code: typeof body?.code === "string" ? body.code : null
    };
  });
}

function assertAuthenticatedSession(evidence: SessionEvidence) {
  guard(evidence.status === 200 && evidence.noStore,
    "The SSR session endpoint did not return a private no-store response.");
  guard(evidence.authenticated && evidence.supabaseAuthenticated && evidence.nonDemo,
    "The browser session was not accepted as a permanent Supabase identity.");
  guard(evidence.expectedIdentity && evidence.verifiedProfileStatus,
    "The browser session did not match the injected expected active-profile identity.");
}

function assertAuthenticatedGuardedApi(evidence: Awaited<ReturnType<typeof readGuardedApiEvidence>>) {
  const ready = evidence.status === 200 && evidence.mode === "ready";
  const intentionallyDisabled = evidence.status === 403 && evidence.mode === "unavailable" &&
    evidence.code === "AI_RUNTIME_DISABLED";
  guard(evidence.noStore && (ready || intentionallyDisabled),
    "The direct guarded API did not accept the authenticated identity before its runtime gate.");
}

async function expectLoginRedirect(page: Page, expectedNext: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === expectedNext
  );
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
}

async function signOutAndVerify(page: Page) {
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expectLoginRedirect(page, "/profile");

  const signedOutSession = await readSessionEvidence(page, "signed-out-no-identity");
  guard(signedOutSession.status === 200 && signedOutSession.noStore &&
    !signedOutSession.authenticated && !signedOutSession.supabaseAuthenticated,
  "The browser retained an authenticated SSR session after logout.");

  const guarded = await readGuardedApiEvidence(page);
  guard(guarded.status === 401 && guarded.code === "authentication_required" && guarded.noStore,
    "The guarded API remained accessible after logout.");

  await page.goto("/profile");
  await expectLoginRedirect(page, "/profile");
}

test.describe("Sprint 10 existing-user password Auth acceptance harness", () => {
  test.skip(
    explicitRunApproval !== "existing-password-only-live-acceptance",
    "The live harness is absent from default execution and requires its exact explicit runner opt-in."
  );

  test.beforeAll(() => {
    validateHarnessConfiguration();
  });

  test("verifies exact Preview, SSR continuity, guarded API and logout without data mutations", async ({ page, context }) => {
    await context.clearCookies();
    await verifyAnonymousPreviewProtection();
    const policy = await installNetworkPolicy(page);
    try {
      await verifyExactPreview(page);
      await loginWithExistingPassword(page, primaryPersona);
      assertAuthenticatedSession(await readSessionEvidence(page, primaryPersona.expectedUserId));
      assertAuthenticatedGuardedApi(await readGuardedApiEvidence(page));
      guard(await localSampleIsUnchanged(page), "Browser-local sample bytes changed during password login.");

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
      assertAuthenticatedSession(await readSessionEvidence(page, primaryPersona.expectedUserId));
      guard(await localSampleIsUnchanged(page), "Browser-local sample bytes changed during session reload.");

      await signOutAndVerify(page);
      guard(await localSampleIsUnchanged(page), "Browser-local sample bytes changed during logout.");
      policy.assertClean();
    } finally {
      await removeLocalSample(page);
      await context.clearCookies();
      await page.close({ runBeforeUnload: false }).catch(() => undefined);
    }
  });

  if (selectedScope === "primary_and_secondary") {
    test("keeps two existing-user browser cookie sessions isolated", async ({ browser }) => {
      const contexts: BrowserContext[] = [];
      await verifyAnonymousPreviewProtection();
      try {
        const firstContext = await browser.newContext({ baseURL: previewUrl, serviceWorkers: "block" });
        const secondContext = await browser.newContext({ baseURL: previewUrl, serviceWorkers: "block" });
        contexts.push(firstContext, secondContext);
        const firstPage = await firstContext.newPage();
        const secondPage = await secondContext.newPage();
        const firstPolicy = await installNetworkPolicy(firstPage);
        const secondPolicy = await installNetworkPolicy(secondPage);

        await verifyExactPreview(firstPage);
        await loginWithExistingPassword(firstPage, primaryPersona);
        await loginWithExistingPassword(secondPage, secondaryPersona);
        assertAuthenticatedSession(await readSessionEvidence(firstPage, primaryPersona.expectedUserId));
        assertAuthenticatedSession(await readSessionEvidence(secondPage, secondaryPersona.expectedUserId));

        await signOutAndVerify(firstPage);
        assertAuthenticatedSession(await readSessionEvidence(secondPage, secondaryPersona.expectedUserId));
        guard(await localSampleIsUnchanged(firstPage) && await localSampleIsUnchanged(secondPage),
          "Browser-local sample bytes changed during the two-context isolation check.");
        firstPolicy.assertClean();
        secondPolicy.assertClean();
      } finally {
        await Promise.all(contexts.map(async (context) => {
          for (const page of context.pages()) await removeLocalSample(page);
          await context.clearCookies();
          await context.close();
        }));
      }
    });
  }
});

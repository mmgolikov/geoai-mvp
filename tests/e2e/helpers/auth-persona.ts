import { expect, type Page, type TestInfo } from "@playwright/test";

export type GeoAiE2eAuthPersona = "demo_public" | "supabase_auth";

export const sessionMissingFixture = {
  isAuthenticated: false,
  sessionStatus: "session_missing",
  user: null
} as const;

export function declaredAuthPersona(testInfo: TestInfo): GeoAiE2eAuthPersona {
  const value = (testInfo.project.metadata as { authPersona?: unknown } | undefined)?.authPersona;
  if (value === undefined) return "demo_public";
  if (value === "demo_public" || value === "supabase_auth") return value;
  throw new Error(`Unsupported E2E auth persona: ${String(value)}`);
}

export async function expectDeclaredAuthPersona(page: Page, persona: GeoAiE2eAuthPersona): Promise<void> {
  if (persona !== "demo_public") {
    throw new Error("Protected auth personas must use the server-entry denial contract, not a rendered product-page assertion.");
  }
  await expect(page.locator('[data-point-object-header] a[href="/profile"]')).toHaveAttribute("data-authenticated", "true");
}

export async function expectProtectedEntryDeniedWithoutByteMutation(
  page: Page,
  protectedPath: string,
  bytes: { local: Record<string, string>; session: Record<string, string> }
): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(protectedPath)}`);
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  await page.evaluate((seed) => {
    for (const [key, value] of Object.entries(seed.local)) localStorage.setItem(key, value);
    for (const [key, value] of Object.entries(seed.session)) sessionStorage.setItem(key, value);
  }, bytes);
  const before = await page.evaluate((seed) => ({
    local: Object.fromEntries(Object.keys(seed.local).map((key) => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(seed.session).map((key) => [key, sessionStorage.getItem(key)]))
  }), bytes);

  await page.goto(protectedPath);
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === protectedPath);
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  await expect(page.locator("[data-point-object-header]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open demo access" })).toHaveCount(0);

  const after = await page.evaluate((seed) => ({
    local: Object.fromEntries(Object.keys(seed.local).map((key) => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(seed.session).map((key) => [key, sessionStorage.getItem(key)]))
  }), bytes);
  expect(after).toEqual(before);
}

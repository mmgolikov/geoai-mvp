import { expect, type Page, type TestInfo } from "@playwright/test";

export type GeoAiE2eAuthPersona = "demo_public" | "supabase_auth";

export function declaredAuthPersona(testInfo: TestInfo): GeoAiE2eAuthPersona {
  const value = (testInfo.project.metadata as { authPersona?: unknown } | undefined)?.authPersona;
  if (value === undefined) return "demo_public";
  if (value === "demo_public" || value === "supabase_auth") return value;
  throw new Error(`Unsupported E2E auth persona: ${String(value)}`);
}

export async function expectDeclaredAuthPersona(page: Page, persona: GeoAiE2eAuthPersona): Promise<void> {
  if (persona === "demo_public") {
    await expect(page.locator('[data-point-object-header] a[href="/profile"]')).toHaveAttribute("data-authenticated", "true");
    return;
  }
  await expect(page.locator('[data-point-object-header] a[href^="/login"]')).toHaveAttribute("data-authenticated", "false");
}

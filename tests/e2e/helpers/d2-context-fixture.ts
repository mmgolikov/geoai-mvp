import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type Page, type Route } from "@playwright/test";
import type { LiveResolvedObjectContext } from "../../../components/point-to-object/live-types";
import type { PublicEvidenceReceipt } from "../../../src/lib/prototype/point-to-object-evidence-receipt";
import { nominatimLocale } from "../../../src/lib/prototype/point-to-object-markets";
import { sprint10AnalysisResponse } from "./sprint10-analysis-fixture";
import { externalHttpUrlPattern, requireLoopbackTestOrigin } from "./local-webkit-csp";

export type D2Envelope = { mode: "resolved"; schemaVersion: 2; evidenceReceipt: PublicEvidenceReceipt; subject: LiveResolvedObjectContext };
export type D2Locale = "en" | "ru";
export type D2Case = {
  locale: D2Locale; sourceLocale: string;
  key: "u1" | "u2" | "outside_u2" | "unavailable_u2"; sourceFeatureId: string; anchor: [number, number];
  label: string; expectedIndependentStatus: "available" | "unsupported_scope" | "source_unavailable";
  envelope: D2Envelope; legacyEnvelope: D2Envelope;
};
export type D2Bundle = { classification: string; baseCommit: string; locale: D2Locale; sourceLocale: string; checks: number; sourceHash: string; cases: D2Case[] };
export type D2HeldAi = { route: Route; response: unknown };
export type D2Signals = {
  contextPosts: Array<Record<string, unknown>>; aiPosts: Array<Record<string, unknown>>;
  challenges: number; external: string[]; unexpectedApis: string[]; pageErrors: string[];
  aiMode: "ok" | "error" | "hold"; pendingAi: D2HeldAi | null;
  contextMode: "ok" | "tamper_name" | "transient_404" | "source_error" | "hold";
  pendingContext: { route: Route; envelope: D2Envelope } | null;
};

/** Invoke only inside a Root-run test hook, never during test discovery.
 * Actual route projection is produced by an isolated child, without global
 * loader/fetch patches leaking into Playwright. No worker recipe or network.
 */
export function loadD2FixtureBundle(locale: D2Locale = "en", remainingMs = 30_000): D2Bundle {
  if ((locale !== "en" && locale !== "ru") || !Number.isSafeInteger(remainingMs) || remainingMs <= 0 || remainingMs > 30_000) throw new Error("Invalid bounded D2 locale/budget");
  const root = process.cwd();
  // Each call starts a separate child with cold module caches, so both locales
  // exercise missing-source-before-cache and then all four original cases.
  const raw = execFileSync(process.execPath, [path.join(root, "scripts/d2-context-http-contract-check.mjs"), "--fixtures", "--locale=" + locale], {
    cwd: root, encoding: "utf8", timeout: remainingMs, maxBuffer: 1_500_000
  });
  const bundle = JSON.parse(raw) as D2Bundle;
  if (bundle.baseCommit !== "622f48f191bb8e968d2e7efcfabdb571774ff3cb" || bundle.cases.length !== 4 ||
      bundle.classification !== "OFFLINE_SYNTHETIC_OSM_AND_AI_TRANSPORT_NOT_REAL_CASE_ACCEPTANCE") throw new Error("D2 fixture boundary mismatch");
  const sourceLocale = nominatimLocale(locale);
  if (bundle.locale !== locale || bundle.sourceLocale !== sourceLocale || bundle.cases.some(item =>
    item.locale !== locale || item.sourceLocale !== sourceLocale ||
    [item.envelope, item.legacyEnvelope].some(envelope => envelope.evidenceReceipt.sourceLocale !== sourceLocale ||
      envelope.subject.evidenceReceipt?.sourceLocale !== sourceLocale))) throw new Error("D2 actual locale-specific envelope mismatch");
  return bundle;
}

export async function installD2Transport(page: Page, baseURL: string, item: D2Case, legacy = false): Promise<D2Signals> {
  requireLoopbackTestOrigin(baseURL);
  const signals: D2Signals = { contextPosts: [], aiPosts: [], challenges: 0, external: [], unexpectedApis: [], pageErrors: [],
    aiMode: "ok", pendingAi: null, contextMode: "ok", pendingContext: null };
  const envelope = legacy ? item.legacyEnvelope : item.envelope;
  expect(envelope.evidenceReceipt.sourceLocale).toBe(nominatimLocale(item.locale));
  page.on("pageerror", error => signals.pageErrors.push(error.message));
  await page.route(externalHttpUrlPattern(baseURL), route => {
    signals.external.push(route.request().url());
    return route.abort("blockedbyclient");
  });
  // Native MapLibre remains real. Empty style is a transport fixture: no tiles,
  // invented map callbacks, React state, private storage seed or fake geometry.
  await page.route("https://tiles.openfreemap.org/styles/**", route => route.fulfill({ json: {
    version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#edf2f0" } }]
  } }));
  await page.route("**/api/**", route => {
    signals.unexpectedApis.push(new URL(route.request().url()).pathname);
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, sessionStatus: "session_missing", user: null } }));
  await page.route("**/api/prototype/point-to-object/suggest", route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body.locale).toBe(item.locale);
    expect(body.marketKey).toBe("dubai");
    return route.fulfill({ json: {
      protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1", mode: "results", provider: "Photon",
      results: [{ id: item.sourceFeatureId, label: item.label, secondaryLabel: "Synthetic OSM transport only", longitude: item.anchor[0],
        latitude: item.anchor[1], category: "building", featureType: "office", boundingBox: null }],
      source: { attribution: "© OpenStreetMap contributors", licenceId: "ODbL-1.0", licenceUrl: "https://www.openstreetmap.org/copyright",
        serviceUrl: "https://photon.komoot.io/", officialStatus: "open_context_not_official" }
    } });
  });
  await page.route("**/api/prototype/point-to-object/context", async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    signals.contextPosts.push(body);
    expect(body.locale).toBe(item.locale);
    expect(body.caseKey).toBe("dubai");
    expect(body.expectedSourceFeatureId).toBe(item.sourceFeatureId);
    expect(body.longitude).toBe(item.anchor[0]);
    expect(body.latitude).toBe(item.anchor[1]);
    if (signals.contextMode === "transient_404" || signals.contextMode === "source_error") {
      await route.fulfill({ status: signals.contextMode === "transient_404" ? 404 : 503,
        json: { mode: "unavailable", error: "D2 explicit source failure; inventory unknown", retryable: true } });
      return;
    }
    // The source fixture was projected by the actual route POST, including
    // receipt and normalizedContext. No hand-crafted browser subject.
    const result = structuredClone(envelope);
    if (signals.contextMode === "hold") { signals.pendingContext = { route, envelope: result }; return; }
    if (signals.contextMode === "tamper_name") {
      const independent = result.subject.normalizedContext?.independentContext;
      if (!independent?.places.length) throw new Error("Name-tamper requires admitted source fixture");
      independent.places[0].name = "FORGED SOURCE NAME";
    }
    await route.fulfill({ json: result, headers: { "cache-control": "private, no-store, max-age=0", vary: "Cookie" } });
  });
  await page.route("**/api/prototype/point-to-object/ai", async route => {
    if (route.request().method() === "GET") {
      signals.challenges++;
      await route.fulfill({ json: { mode: "ready", challenge: "A".repeat(43) } });
      return;
    }
    const body = route.request().postDataJSON() as Parameters<typeof sprint10AnalysisResponse>[0] & { evidenceReceipt: PublicEvidenceReceipt };
    signals.aiPosts.push(body as unknown as Record<string, unknown>);
    expect(body.locale).toBe(item.locale);
    expect(body.evidenceReceipt.sourceLocale).toBe(nominatimLocale(body.locale));
    expect(body.evidenceReceipt).toEqual(envelope.evidenceReceipt);
    expect(body.evidenceReceipt.evidencePackHash).toBe(envelope.evidenceReceipt.evidencePackHash);
    const { role, scenario, depth, goal, perspective, horizon, question, locale } = body;
    const base = sprint10AnalysisResponse({ role, scenario, depth, goal, perspective, horizon, question, locale }, signals.aiPosts.length, envelope.evidenceReceipt.evidencePackHash, "POINT_OBJECT_AI_PROMPT_V14_2026_09_26");
    // Explicit synthetic AI content is not a real answer/usefulness observation.
    const response = { ...base,
      subject: { name: envelope.subject.name, address: envelope.subject.address,
        featureClass: envelope.subject.featureClass, sourceFeatureId: envelope.subject.sourceFeatureId,
        resolutionMethod: "overpass_exact_identity", coordinateAssociation: envelope.subject.coordinateAssociation,
        sourceLabel: "© OpenStreetMap contributors", geometryType: envelope.subject.geometryType,
        resultCentroidDistanceM: envelope.subject.resultCentroidDistanceM, addressParts: envelope.subject.addressParts,
        tags: envelope.subject.tags, metrics: envelope.subject.metrics, geoContext: envelope.subject.geoContext,
        linkedEntity: envelope.subject.linkedEntity },
      content: { ...base.content, geoContext: envelope.subject.geoContext,
        decisionBrief: { ...base.content.decisionBrief, headline: "D2 offline result " + signals.aiPosts.length,
          summary: "Synthetic AI transport only; no real case usefulness acceptance." },
        initialSemanticBrief: { ...base.content.initialSemanticBrief,
          subject: { ...base.content.initialSemanticBrief.subject, statement: "Explicit synthetic OSM exact-object transport; physical identity is not accepted by this fixture." },
          context: { ...base.content.initialSemanticBrief.context, statement: "Synthetic OSM sample only; admitted Places remains a separately labelled source." } }
      }
    };
    if (signals.aiMode === "hold") { signals.pendingAi = { route, response }; return; }
    if (signals.aiMode === "error") { await route.fulfill({ status: 503, json: { mode: "unavailable", error: "D2 offline refresh failure", retryable: true } }); return; }
    await route.fulfill({ json: response });
  });
  return signals;
}

export async function chooseD2ThroughSearch(page: Page, item: D2Case, locale: "en" | "ru") {
  expect(item.locale).toBe(locale);
  const ru = locale === "ru";
  await page.goto("/prototype/point-to-object");
  const search = page.getByRole("combobox", { name: ru ? "Поиск адреса или места" : "Search address or place", exact: true });
  await expect(search).toHaveAttribute("aria-controls", "point-object-search-results");
  await search.fill("D2 synthetic");
  // Active-project native options can share this label after save/reopen.
  // Select only the public autocomplete list controlled by this combobox.
  const results = page.locator("#point-object-search-results");
  await expect(results).toHaveAttribute("role", "listbox");
  await expect(results).toBeVisible();
  const suggestion = results.getByRole("option").filter({ hasText: item.label });
  await expect(suggestion).toHaveCount(1);
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  const toggle = page.locator("#workspace-task").locator('button[aria-controls="workspace-task-content"]');
  if ((page.viewportSize()?.width ?? 1440) < 1024 && await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
  await expect(page.getByText(item.label, { exact: true }).first()).toBeVisible();
}

export async function openD2Analysis(page: Page, locale: "en" | "ru") {
  await page.getByRole("button", { name: locale === "ru" ? "Анализировать" : "Analyze", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
}

export async function openD2Projects(page: Page, locale: "en" | "ru") {
  // Use the actual header link. Its aria-label stays available on mobile
  // where the visible Projects text is hidden; no private state or URL seed.
  const link = page.getByTestId("point-object-project-control").getByRole("link", {
    name: locale === "ru" ? "Проекты" : "Projects", exact: true
  });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/projects");
  await link.click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("point-object-projects-page")).toBeVisible();
}

export async function publicD2Snapshot(page: Page): Promise<Record<string, unknown>> {
  const widget = page.getByTestId("verification-export");
  await expect(widget).toBeVisible();
  if (!await widget.evaluate(element => element.hasAttribute("open"))) await widget.locator("summary").click();
  await widget.getByTestId("verification-prepare").click();
  await expect(widget.getByTestId("verification-json")).toBeVisible();
  return JSON.parse(await widget.getByTestId("verification-json").inputValue()) as Record<string, unknown>;
}

export function expectD2TransportQuiet(signals: D2Signals) {
  expect(signals.external).toEqual([]);
  expect(signals.unexpectedApis).toEqual([]);
  expect(signals.pageErrors).toEqual([]);
}

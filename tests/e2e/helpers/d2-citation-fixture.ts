import { execFileSync } from "node:child_process";
import path from "node:path";
import type { D2Case, D2Locale } from "./d2-context-fixture";

export type D2CitationFixtureBundle = {
  protocol: "D2_ISOLATED_CITATION_FIXTURE_V1";
  classification: "MIXED_GOLDEN_SELECTED_OBJECT_ADMITTED_OVERTURE_SYNTHETIC_NEARBY_NOT_HISTORICAL_BACKFILL";
  locale: D2Locale; sourceLocale: string; networkCalls: number;
  goldenRecordedPublicResultSha256: string; scenarioCardIds: string[];
  proof: { catalogueItems: number; outsideKpiRef: string; outsideDistanceM: number;
    originalClassInSyntheticInput: string; kpiRadiusM: number; sampleSize: number;
    detailsAssociation: string; externalAiCalls: number; independentSubjectId: string;
    independentPharmacy: { id: string; name: string; evidenceRef: string } };
  item: D2Case;
};

/** Explicit runtime hook only. Import/discovery starts no child, service or API.
 * The actual pure producer/parsers and scenario helper build an isolated MIXED
 * test envelope. Old shared one-bus/sample1 fixtures remain untouched. */
export function loadD2CitationFixture(locale: D2Locale, remainingMs = 30_000): D2CitationFixtureBundle {
  if ((locale !== "en" && locale !== "ru") || !Number.isSafeInteger(remainingMs) || remainingMs < 1 || remainingMs > 30_000)
    throw new Error("Invalid isolated citation fixture scope/budget");
  const root = process.cwd();
  const raw = execFileSync(process.execPath, [path.join(root, "scripts/d2-source-citation-closure-check.mjs"),
    "--fixtures", "--locale=" + locale], { cwd: root, encoding: "utf8", timeout: remainingMs, maxBuffer: 500_000 });
  const bundle = JSON.parse(raw) as D2CitationFixtureBundle;
  if (bundle.protocol !== "D2_ISOLATED_CITATION_FIXTURE_V1" ||
      bundle.classification !== "MIXED_GOLDEN_SELECTED_OBJECT_ADMITTED_OVERTURE_SYNTHETIC_NEARBY_NOT_HISTORICAL_BACKFILL" ||
      bundle.locale !== locale || bundle.sourceLocale !== (locale === "ru" ? "ru,en" : "en") ||
      bundle.networkCalls !== 0 || bundle.proof.externalAiCalls !== 0 ||
      bundle.goldenRecordedPublicResultSha256 !== "ab2784c4f62e854dd8e3320194a80e4382fbe740bf40871803e8e4ea2073bcea" ||
      bundle.proof.catalogueItems !== 12 || bundle.proof.outsideKpiRef !== "EVD-CONTEXT-1" ||
      bundle.proof.outsideDistanceM !== 548 || bundle.proof.kpiRadiusM !== 400 ||
      bundle.proof.sampleSize !== 123 || bundle.proof.detailsAssociation !== "selected_record" ||
      bundle.proof.independentSubjectId !== bundle.item.sourceFeatureId ||
      !bundle.item.envelope.subject.normalizedContext?.independentContext?.places.some(p =>
        p.id === bundle.proof.independentPharmacy.id && p.name === bundle.proof.independentPharmacy.name &&
        p.evidenceRef === bundle.proof.independentPharmacy.evidenceRef && p.taxonomy.primary === "pharmacy") ||
      bundle.proof.originalClassInSyntheticInput !== "amenity:university" ||
      JSON.stringify(bundle.scenarioCardIds) !== JSON.stringify(["mapped-envelope", "entrances-and-servicing", "programme-service-check"]) ||
      bundle.item.locale !== locale || bundle.item.envelope.evidenceReceipt.sourceLocale !== bundle.sourceLocale)
    throw new Error("Isolated citation fixture admission/consumer proof mismatch");
  return bundle;
}

/** Establish retained role/scenario through the actual public Find action.
 * Autocomplete alone deliberately has no saved scenario. This is one bounded
 * synthetic Find response, never a private session seed or real source call. */
export async function chooseD2CitationFindTarget(page: import("@playwright/test").Page, item: D2Case, locale: D2Locale) {
  let calls = 0;
  await page.route("**/api/prototype/point-to-object/find", async route => {
    if (route.request().method() !== "POST") throw new Error("Unexpected synthetic Find method");
    const request = route.request().postDataJSON() as Record<string, unknown>;
    calls++;
    if (calls !== 1 || request.locale !== locale || request.marketKey !== "dubai" ||
        request.group !== "commercial_office" || request.mappedMinimumLevels !== null || request.mappedMaximumLevels !== null)
      throw new Error("Find transport must match the explicit ordinary UI criteria");
    const id = item.sourceFeatureId.split("/");
    const context = item.envelope.subject;
    await route.fulfill({ json: {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results", criteria: request,
      candidates: [{ sourceFeatureId: item.sourceFeatureId, sourceElementType: id[0], sourceElementId: id[1],
        label: item.label, name: item.label, longitude: item.anchor[0], latitude: item.anchor[1],
        group: "commercial_office", matchedTag: { key: "building", value: "commercial" },
        mappedBuildingLevels: 2, observedTags: { name: item.label, building: "commercial", "building:levels": "2" },
        evidenceClass: "observed_in_open_map_source", geometry: context.displayGeometry,
        geometryProvenance: context.geometryProvenance, geometryStatus: "available",
        renderHeightM: context.renderHeightM, renderMinHeightM: context.renderMinHeightM }],
      ordering: "source_identity_ascending_not_ranked",
      coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 1, upstreamElementCount: 1,
        normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80,
        capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "6".repeat(64),
        observedAt: null, acquiredAt: item.envelope.evidenceReceipt.createdAt,
        freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0",
        attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright",
        usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
        officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
      limitations: ["SYNTHETIC Find transport using retained golden object geometry; no live source acquisition."],
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    } });
  });
  const task = page.locator("#workspace-task");
  await task.getByRole("tab").nth(1).click(); // Source order: analyse/find/create.
  const drawer = page.getByTestId("find-drawer");
  await drawer.getByTestId("point-object-find-role-select").selectOption("developer");
  await drawer.getByTestId("point-object-find-scenario-select").selectOption("b2b_redevelopment_selected_aoi");
  await drawer.getByTestId("point-object-find-group-select").selectOption("commercial_office");
  const levels = drawer.locator('input[inputmode="numeric"]');
  await levels.nth(0).fill(""); await levels.nth(1).fill("");
  await drawer.getByTestId("find-search-cta").click();
  const result = drawer.getByRole("listitem").filter({ hasText: item.label });
  await result.getByRole("button", { name: locale === "ru" ? "Открыть анализ" : "Open analysis", exact: true }).click();
  return { calls: () => calls };
}

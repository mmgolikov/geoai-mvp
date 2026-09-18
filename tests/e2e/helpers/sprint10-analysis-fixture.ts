export const SPRINT10_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const sprint10Selection = {
  locationKey: "dubai",
  longitude: 55.27,
  latitude: 25.2,
  clickedAt: "2026-09-18T10:00:00.000Z",
  object: {
    name: "Sprint 10 Hotel",
    featureClass: "tourism:hotel",
    sourceFeatureId: "way/91010",
    geometry: { type: "Point", coordinates: [55.27, 25.2] },
    renderHeightM: null,
    renderMinHeightM: null
  },
  resolvedObject: {
    name: "Sprint 10 Hotel",
    address: "Sprint 10 Hotel, Dubai",
    featureClass: "tourism:hotel",
    sourceFeatureId: "way/91010",
    geometryType: "Polygon",
    coordinateAssociation: "trusted_open_map_identity",
    resultCentroidDistanceM: 0,
    addressParts: { city: "Dubai", country: "United Arab Emirates" },
    tags: { "tag.building": "hotel", "tag.building:levels": "20" },
    metrics: {
      footprintAreaSqM: 1_800,
      footprintPerimeterM: 180,
      method: "local_equirectangular_wgs84_approximation",
      geometryGeneralized: true
    },
    geoContext: {
      radiusM: 400,
      coverage: "available",
      sampleSize: 4,
      capReached: false,
      groups: [{ group: "commercial", count: 4, sharePct: 100, nearestDistanceM: 25 }],
      mappedBuildingCount: 4,
      mappedLevelsKnownCount: 2,
      medianMappedLevels: 10,
      nearestTransitM: 100,
      nearestMajorRoadM: 80,
      districtCharacter: {
        code: "commercial_business",
        confidence: "medium",
        ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
        driverGroups: ["commercial"]
      }
    },
    linkedEntity: null
  },
  viewport: { center: [55.27, 25.2], zoom: 17, pitch: 0, bearing: 0, viewMode: "2d", basemapId: "street" },
  provider: "OpenFreeMap / OpenStreetMap",
  nearbyLabels: []
} as const;

type AnalysisRequest = {
  role?: string;
  scenario?: string;
  depth: "quick" | "standard" | "deep";
  goal: "object_profile" | "development_screening" | "redevelopment" | "due_diligence" | "custom";
  perspective: "developer" | "investor" | "asset_owner";
  horizon: "current" | "one_to_three_years" | "long_term";
  question: string | null;
  locale: "en" | "ru";
};

const claim = (statement: string) => ({ statement, evidenceRefs: ["EVD-ALLOWED-FIELDS"] });

export function sprint10AnalysisResponse(request: AnalysisRequest, sequence = 1) {
  const depthCounts = request.depth === "quick"
    ? { checks: 2, alternatives: 0, uncertainties: 1, triggers: 1 }
    : request.depth === "deep"
      ? { checks: 4, alternatives: 2, uncertainties: 3, triggers: 3 }
      : { checks: 3, alternatives: 1, uncertainties: 2, triggers: 2 };
  const geoContext = sprint10Selection.resolvedObject.geoContext;
  return {
    mode: "openai",
    schemaVersion: 6,
    generatedAt: `2026-09-18T10:00:${String(sequence).padStart(2, "0")}.000Z`,
    evidencePackId: `sprint10-pack-${sequence}`,
    evidencePackHash: String(sequence).padStart(64, "a").slice(-64),
    request: { ...request, focused: Boolean(request.question) },
    content: {
      initialSemanticBrief: {
        codes: {
          subject: "named_open_map_object",
          context: "commercial_business_mapped",
          access: "mapped_transit_and_road",
          implication: "developer_development_sequence"
        },
        subject: claim("The selected open-map record is a mapped hotel."),
        context: claim("The bounded sample contains four mapped commercial features."),
        access: claim("Returned transit and road distances are straight-line screening measures."),
        implication: claim("Validate official controls before continuing."),
        confidence: "medium"
      },
      decisionBrief: {
        headline: `${request.depth} result ${sequence}`,
        disposition: "continue_screening",
        summary: "Open evidence supports a bounded screen, not an official conclusion.",
        reasons: [claim("Mapped use is available."), claim("Official controls are absent.")],
        confidence: "medium"
      },
      signals: [
        { title: "Mapped use", observation: "Hotel tag returned.", implication: "Validate permitted use.", evidenceClass: "observed", evidenceRefs: ["EVD-ALLOWED-FIELDS"], confidence: "medium" },
        { title: "Context", observation: "Four features returned.", implication: "Treat as a bounded sample.", evidenceClass: "derived", evidenceRefs: ["EVD-CONTEXT-SUMMARY"], confidence: "medium" },
        { title: "Evidence gap", observation: "Official controls are absent.", implication: "Hold official claims.", evidenceClass: "observed", evidenceRefs: ["EVD-SOURCE"], confidence: "low" }
      ],
      opportunities: [{ title: "Programme test", hypothesis: "Test a retained-use option.", rationale: "Mapped use supports screening it.", potentialValue: "Not quantified.", evidenceRefs: ["EVD-ALLOWED-FIELDS"], evidenceNeeded: ["Official controls"], confidence: "low" }],
      risks: [
        { title: "Planning gap", statement: "No official planning record is present.", decisionImpact: "Do not infer permission.", severity: "high", evidenceRefs: ["EVD-SOURCE"], confidence: "medium" },
        { title: "Market gap", statement: "No market evidence is present.", decisionImpact: "Do not infer value.", severity: "high", evidenceRefs: ["EVD-SOURCE"], confidence: "low" }
      ],
      sourceFacts: [claim("OpenStreetMap identifies a hotel object.")],
      locationContext: [{ statement: "Four mapped features were returned within 400 m.", evidenceRefs: ["EVD-CONTEXT-SUMMARY"] }],
      nextValidation: [{ title: "Validate controls", action: "Obtain the official planning record.", source: "Relevant authority", decisionImpact: "Determines the next screen.", priority: "critical", evidenceRefs: ["EVD-SOURCE"] }],
      answerToQuestion: request.question ? { statement: `Bounded answer: ${request.question}`, evidenceRefs: ["EVD-ALLOWED-FIELDS"], status: "partial", scope: "screening_implication", confidence: "low", perspective: request.perspective, horizon: request.horizon, missingEvidence: ["Official evidence"] } : null,
      geoContext,
      depthReview: {
        depth: request.depth,
        basis: "structured_review_of_existing_evidence",
        purpose: request.depth === "quick" ? "identity_evidence" : request.depth === "deep" ? "decision_challenge" : "decision_criteria",
        analyticChecks: Array.from({ length: depthCounts.checks }, (_, index) => ({ title: `Check ${index + 1}`, observation: "Bounded observation.", implication: "Validate before decision.", evidenceClass: index === 0 ? "observed" : "derived", evidenceRefs: ["EVD-ALLOWED-FIELDS"], confidence: index === 0 ? "medium" : "low" })),
        alternatives: Array.from({ length: depthCounts.alternatives }, (_, index) => ({ title: `Alternative ${index + 1}`, rationale: "Competing supported screening path.", evidenceClass: "hypothesis", evidenceRefs: ["EVD-ALLOWED-FIELDS"] })),
        uncertainties: Array.from({ length: depthCounts.uncertainties }, (_, index) => ({ title: `Uncertainty ${index + 1}`, statement: "Evidence remains incomplete.", decisionImpact: "The screen remains conditional.", evidenceRefs: ["EVD-SOURCE"] })),
        decisionTriggers: Array.from({ length: depthCounts.triggers }, (_, index) => ({ title: `Trigger ${index + 1}`, action: "Obtain additional evidence.", decisionImpact: "May change the screened path.", evidenceRefs: ["EVD-SOURCE"] }))
      },
      caveat: SPRINT10_CAVEAT
    },
    subject: {
      name: "Sprint 10 Hotel",
      address: "Sprint 10 Hotel, Dubai",
      featureClass: "tourism:hotel",
      sourceFeatureId: "way/91010",
      resolutionMethod: "nominatim_lookup",
      coordinateAssociation: "trusted_open_map_identity",
      sourceLabel: "© OpenStreetMap contributors",
      geometryType: "Polygon",
      resultCentroidDistanceM: 0,
      addressParts: { city: "Dubai", country: "United Arab Emirates" },
      tags: { "tag.building": "hotel", "tag.building:levels": "20" },
      metrics: sprint10Selection.resolvedObject.metrics,
      geoContext,
      linkedEntity: null
    },
    telemetry: {
      provider: "openai",
      schemaVersion: 6,
      model: "fixture-only",
      reasoningEffort: request.depth === "deep" ? "high" : "medium",
      depth: request.depth,
      promptVersion: "POINT_OBJECT_AI_PROMPT_V10_2026_09_18",
      requestId: `resp_sprint10_${sequence}`,
      latencyMs: 1,
      attempts: 1,
      attemptTrace: [{ attempt: 1, purpose: request.question ? "focused" : "initial", model: "fixture-only", reasoningEffort: request.depth === "deep" ? "high" : "medium", requestId: `resp_sprint10_${sequence}`, inputTokens: 1, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 1, totalTokens: 2, estimatedCostUsd: null }],
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1,
      totalTokens: 2,
      estimatedCostUsd: null,
      costRateSource: null,
      stored: false,
      toolCalls: 0
    }
  };
}

import type { AnalyzeRequest } from "@/src/types/analysis";
import type { AnalysisScenarioId } from "@/src/types/geo";

const scenarioPromptGuidance: Record<AnalysisScenarioId, string> = {
  realEstateDevelopment:
    "Focus on development potential, land-use assumptions, accessibility, surrounding infrastructure, commercial or residential potential, constraints, and due diligence steps.",
  investmentSiteSelection:
    "Focus on investment attractiveness, location quality, liquidity assumptions, surrounding demand drivers, risk-adjusted opportunity, and comparison against alternative sites.",
  constructionMonitoring:
    "Focus on construction readiness, site monitoring potential, satellite or drone monitoring workflow, progress evidence, deviation risks, and monitoring cadence.",
  infrastructureUrbanPlanning:
    "Focus on transport and utility context, public infrastructure dependency, urban integration, social and environmental constraints, and planning recommendations.",
  climateRisk:
    "Focus on heat exposure, coastal or flood assumptions, urban heat island risk, resilience requirements, insurance or financing implications, and mitigation actions.",
  customQuery:
    "Focus on the user's typed question. If the question is underspecified, provide a useful structured answer and identify the missing data needed to answer it rigorously."
};

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildAnalyzePrompt(request: AnalyzeRequest) {
  const selection = request.selectedObject
    ? {
        selectionType: "demo_object",
        name: request.selectedObject.name,
        objectType: request.selectedObject.type,
        layerName: request.selectedObject.layerName,
        geometryType: request.selectedObject.geometryType,
        coordinates: request.point,
        spatialContext: request.selectedObject.spatialContext
      }
    : {
        selectionType: "map_point",
        name: "Custom map point",
        coordinates: request.point
      };

  const dataSources = request.dataSources.map((source) => ({
    id: source.id,
    name: source.name,
    provider: source.provider,
    sourceType: source.sourceType,
    status: source.status,
    reliabilityLevel: source.reliabilityLevel,
    description: source.description,
    licenseNote: source.licenseNote.note
  }));
  const coordinateText = `${request.point.latitude.toFixed(6)}, ${request.point.longitude.toFixed(6)}`;
  const selectionName = request.selectedObject?.name ?? "custom map point";
  const unavailableSourceCount = dataSources.filter((source) => source.status !== "connected").length;
  const marketContext = request.marketContext
    ? {
        matchedArea: request.marketContext.areaName,
        emirate: request.marketContext.emirate,
        matchDistanceKm: request.marketContext.matchDistanceKm,
        confidenceLevel: request.marketContext.confidenceLevel,
        marketActivityLevel: request.marketContext.marketActivityLevel,
        transactionContext: request.marketContext.transactionContext,
        rentContext: request.marketContext.rentContext,
        developmentPipelineContext: request.marketContext.developmentPipelineContext,
        accessibilityContext: request.marketContext.accessibilityContext,
        planningContext: request.marketContext.planningContext,
        riskContext: request.marketContext.riskContext,
        marketMetrics: request.marketContext.marketMetrics,
        sourceMode: request.marketContext.sourceMode,
        dataQualityNotes: request.marketContext.dataQualityNotes,
        limitations: request.marketContext.limitations,
        sourceIds: request.marketContext.sourceIds
      }
    : null;
  const uploadedDataContext = request.uploadedDataContext
    ? {
        appliedMetrics: request.uploadedDataContext.appliedMetrics,
        availableButNotApplied: request.uploadedDataContext.availableButNotApplied,
        visibleGeojsonLayers: request.uploadedDataContext.visibleGeojsonLayers.map((dataset) => ({
          id: dataset.id,
          name: dataset.name,
          featureCount: dataset.featureCount,
          confidence: dataset.confidence,
          officialStatus: dataset.officialStatus,
          notes: dataset.notes
        })),
        limitations: "Uploaded datasets are browser-local, user-provided context and are not official until externally validated."
      }
    : null;

  return `
You are GeoAI, a spatial decision intelligence assistant for real estate, infrastructure, construction, investment, and climate-risk screening in Dubai.

Generate concise investor/client-ready narrative analysis for a dashboard. The response must feel like a client memo prepared for developers, investors, lenders, or public-sector planning users, not like a generic AI answer.

Critical rules:
- Return valid JSON only. Do not include Markdown.
- Do not invent live facts, official data, transaction evidence, parcel ownership, zoning rights, or regulatory conclusions.
- Respect source status. If a source is mock, planned, or not connected, clearly treat it as demo/planned context.
- Keep deterministic score values as context only. Do not generate new scores.
- Mention limitations when the current evidence is synthetic, planned, or not connected.
- Avoid generic phrases such as "this location has potential" unless you tie them to the scenario, coordinates, object context, scores, or evidence.
- Do not claim exact zoning, ownership, permitted density, transaction values, rents, yields, or official approvals unless the supplied evidence explicitly validates them.
- If market context is provided, use the matched Dubai area name and its qualitative/index-style signals, but clearly treat seed/demo-normalized market context as non-official.
- If enriched marketMetrics are provided, refer to them as seed_static demo-normalized indicators: activity, rental demand, liquidity, development pipeline, risk, and trend.
- If spatialContext is provided, use its feature category, geometry type, centroid, estimated area, geometry confidence, source status and limitations. Never describe seed_geojson geometries as official parcel or planning boundaries.
- If uploadedDataContext is provided, reference uploaded CSV/GeoJSON only as user-provided local context. Do not treat it as official, live, verified, or decision-grade evidence unless validation is explicitly supplied.
- Keep the content polished, specific, and suitable for a professional pilot demo.

Scenario:
${request.scenarioLabel}

Required executive summary behavior:
- Sentence 1 must mention the selected scenario "${request.scenarioLabel}", the selected item "${selectionName}", and coordinates ${coordinateText}.
- Sentence 2 must mention the matched market area when available and interpret the strongest 1-2 deterministic score or market-context signals without changing the scores.
- Sentence 3 must reference the Data Source Registry, evidence context, or seed_static data quality notes, including whether sources are synthetic, planned, official, open data, or commercial.
- Sentence 4 must state the most important limitation or due diligence gap.
- Optional sentence 5 may frame the decision implication for an investor, developer, lender, or government client.

Evidence status context:
${unavailableSourceCount} of ${dataSources.length} provided registry sources are not connected live sources in this MVP.

Scenario guidance:
${scenarioPromptGuidance[request.scenarioId]}

Custom user context:
${request.customQuery?.trim() || "No custom query provided."}

Selected location or object:
${compactJson(selection)}

Deterministic mock scores to interpret, not change:
${compactJson(request.deterministicScores)}

Evidence already attached to the dashboard:
${compactJson(request.evidence)}

Dubai market context:
${marketContext ? compactJson(marketContext) : "No market context provided."}

Uploaded local dataset context:
${uploadedDataContext ? compactJson(uploadedDataContext) : "No uploaded dataset context provided."}

Available Data Source Registry entries:
${compactJson(dataSources)}

Return JSON matching exactly this shape:
{
  "executive_summary": "3-5 concise, scenario-specific sentences that mention scenario, selection, coordinates, evidence context and limitation.",
  "key_factors": [
    {
      "title": "short title",
      "description": "one concise sentence tied to the selected scenario, location, evidence, score context, or limitation",
      "impact": "positive | neutral | negative"
    }
  ],
  "opportunities": [
    {
      "title": "short title",
      "description": "one concise investor/client-ready sentence"
    }
  ],
  "risks": [
    {
      "title": "short title",
      "description": "one concise sentence with the practical constraint or due diligence implication",
      "severity": "low | medium | high"
    }
  ],
  "recommended_actions": [
    {
      "title": "short title",
      "description": "one concise operational next step",
      "priority": "low | medium | high"
    }
  ],
  "evidence_notes": [
    {
      "sourceId": "must match one provided source id when possible",
      "note": "how this source informs or limits the analysis, including whether it is demo, planned, official, open data or commercial"
    }
  ],
  "confidence_level": "low | medium | high",
  "limitations": ["concise limitation"]
}

Use 4-6 key_factors, 3-4 opportunities, 3-4 risks, 3-5 recommended_actions, and 3-5 evidence_notes.
`.trim();
}

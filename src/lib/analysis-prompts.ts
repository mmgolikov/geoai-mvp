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
        coordinates: request.point
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

  return `
You are GeoAI, a spatial decision intelligence assistant for real estate, infrastructure, construction, investment, and climate-risk screening in Dubai.

Generate concise investor/client-ready narrative analysis for a dashboard.

Critical rules:
- Return valid JSON only. Do not include Markdown.
- Do not invent live facts, official data, transaction evidence, parcel ownership, zoning rights, or regulatory conclusions.
- Respect source status. If a source is mock, planned, or not connected, clearly treat it as demo/planned context.
- Keep deterministic score values as context only. Do not generate new scores.
- Mention limitations when the current evidence is synthetic, planned, or not connected.
- Keep the content polished, specific, and suitable for a professional pilot demo.

Scenario:
${request.scenarioLabel}

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

Available Data Source Registry entries:
${compactJson(dataSources)}

Return JSON matching exactly this shape:
{
  "executive_summary": "3-5 concise sentences.",
  "key_factors": [
    {
      "title": "short title",
      "description": "one concise sentence",
      "impact": "positive | neutral | negative"
    }
  ],
  "opportunities": [
    {
      "title": "short title",
      "description": "one concise sentence"
    }
  ],
  "risks": [
    {
      "title": "short title",
      "description": "one concise sentence",
      "severity": "low | medium | high"
    }
  ],
  "recommended_actions": [
    {
      "title": "short title",
      "description": "one concise sentence",
      "priority": "low | medium | high"
    }
  ],
  "evidence_notes": [
    {
      "sourceId": "must match one provided source id when possible",
      "note": "how this source informs or limits the analysis"
    }
  ],
  "confidence_level": "low | medium | high",
  "limitations": ["concise limitation"]
}

Use 4-6 key_factors, 3-4 opportunities, 3-4 risks, 3-5 recommended_actions, and 3-5 evidence_notes.
`.trim();
}

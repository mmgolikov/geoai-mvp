import type { AnalysisScenarioId } from "@/src/types/geo";
import type { OpenPoiCategory } from "@/src/lib/open-geodata/types";

export function classifyPoiCategory(properties: Record<string, unknown>): OpenPoiCategory {
  const raw = [
    properties.category,
    properties.amenity,
    properties.tourism,
    properties.aeroway,
    properties.public_transport,
    properties.landmark,
    properties.shop,
    properties.office,
    properties.development
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");

  if (raw.includes("airport") || raw.includes("aerodrome")) return "airport";
  if (raw.includes("metro") || raw.includes("station") || raw.includes("transport")) return "metro_mobility";
  if (raw.includes("tourism") || raw.includes("hotel") || raw.includes("landmark") || raw.includes("beach")) return "tourism";
  if (raw.includes("retail") || raw.includes("mall") || raw.includes("shop")) return "retail";
  if (raw.includes("education") || raw.includes("school") || raw.includes("university")) return "education";
  if (raw.includes("health") || raw.includes("hospital") || raw.includes("clinic")) return "healthcare";
  if (raw.includes("development") || raw.includes("growth")) return "development_anchor";
  return "business";
}

export function scenarioRelevanceForPoi(category: OpenPoiCategory): AnalysisScenarioId[] {
  if (category === "airport" || category === "metro_mobility") {
    return ["investmentSiteSelection", "realEstateDevelopment", "infrastructureUrbanPlanning"];
  }

  if (category === "development_anchor") {
    return ["investmentSiteSelection", "realEstateDevelopment", "constructionMonitoring"];
  }

  if (category === "tourism" || category === "business" || category === "retail") {
    return ["investmentSiteSelection", "realEstateDevelopment"];
  }

  return ["infrastructureUrbanPlanning", "investmentSiteSelection"];
}


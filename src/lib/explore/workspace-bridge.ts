import { getCandidateAnchor } from "@/src/lib/explore/candidates";
import type {
  ExploreCandidate,
  ExploreCoordinate,
  ExploreScenarioId,
  InteractionMode
} from "@/src/lib/explore/types";
import type {
  AnalysisScenarioId,
  DemoLayerType,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

export function closeExplorePolygon(coordinates: ExploreCoordinate[]) {
  if (coordinates.length === 0) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates;
  }

  return [...coordinates, first];
}

export function exploreScenarioToAnalysisScenario(
  scenarioId: ExploreScenarioId
): AnalysisScenarioId {
  const mapping: Record<ExploreScenarioId, AnalysisScenarioId> = {
    b2c_point_context: "customQuery",
    b2c_tourist_objects_route: "customQuery",
    b2c_residential_context: "investmentSiteSelection",
    b2c_new_residential_projects: "investmentSiteSelection",
    b2c_interest_routes: "customQuery",
    b2b_redevelopment_selected_aoi: "realEstateDevelopment",
    b2b_redevelopment_100ha: "investmentSiteSelection",
    b2b_lowrise_luxury_residential: "realEstateDevelopment",
    b2b_hotel_development: "investmentSiteSelection",
    b2b_commercial_real_estate: "investmentSiteSelection"
  };

  return mapping[scenarioId];
}

export function analysisScenarioToExploreScenario(
  scenarioId: AnalysisScenarioId
): ExploreScenarioId {
  const mapping: Record<AnalysisScenarioId, ExploreScenarioId> = {
    realEstateDevelopment: "b2b_redevelopment_selected_aoi",
    investmentSiteSelection: "b2b_redevelopment_100ha",
    constructionMonitoring: "b2b_redevelopment_selected_aoi",
    infrastructureUrbanPlanning: "b2b_redevelopment_100ha",
    climateRisk: "b2b_redevelopment_selected_aoi",
    customQuery: "b2c_point_context"
  };

  return mapping[scenarioId];
}

export function getExploreModeLabel(mode: InteractionMode) {
  return mode === "map_first" ? "Map-first" : "Criteria-first";
}

export function getExploreModeSummary(modes: InteractionMode[]) {
  return modes.length === 2 ? "Both" : getExploreModeLabel(modes[0]);
}

export function getExploreCandidateSourceLabel(sourceType: ExploreCandidate["sourceType"]) {
  const labels: Record<ExploreCandidate["sourceType"], string> = {
    sample: "Sample",
    open_context: "Open",
    user_provided: "User",
    demo_seed: "Sample/open",
    fallback: "Sample/open"
  };

  return labels[sourceType];
}

export function exploreCandidateToFeature(
  candidate: ExploreCandidate,
  selectedCandidateId: string | null
): GeoJSON.Feature {
  const properties = {
    id: candidate.id,
    exploreCandidateKind: "candidate",
    title: candidate.title,
    sourceType: candidate.sourceType,
    score: candidate.score,
    selected: candidate.id === selectedCandidateId,
    geometryKind: candidate.geometry.type,
    clickPriority: 96,
    layerOrder: 96
  };

  if (candidate.geometry.type === "point") {
    return {
      type: "Feature",
      id: candidate.id,
      properties,
      geometry: {
        type: "Point",
        coordinates: candidate.geometry.point
      }
    };
  }

  if (candidate.geometry.type === "route") {
    return {
      type: "Feature",
      id: candidate.id,
      properties,
      geometry: {
        type: "LineString",
        coordinates: candidate.geometry.coordinates
      }
    };
  }

  return {
    type: "Feature",
    id: candidate.id,
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [closeExplorePolygon(candidate.geometry.coordinates)]
    }
  };
}

export function exploreCandidatesToFeatureCollection(
  candidates: ExploreCandidate[],
  selectedCandidateId: string | null
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: candidates.map((candidate) =>
      exploreCandidateToFeature(candidate, selectedCandidateId)
    )
  };
}

export function exploreCandidateToSelectedPoint(candidate: ExploreCandidate): SelectedPoint {
  const [longitude, latitude] = getCandidateAnchor(candidate);
  return { latitude, longitude };
}

function getCandidateGeometryType(candidate: ExploreCandidate): DemoLayerType {
  if (candidate.geometry.type === "route") {
    return "line";
  }

  return candidate.geometry.type;
}

export function exploreCandidateToSelectedObject(
  candidate: ExploreCandidate
): SelectedDemoObject {
  const center = exploreCandidateToSelectedPoint(candidate);
  const feature = exploreCandidateToFeature(candidate, candidate.id);

  return {
    id: `explore-${candidate.id}`,
    name: candidate.title,
    type: candidate.candidateType.replace(/_/g, " "),
    layerId: "developmentZones",
    layerName: "GeoAI Explore candidates",
    geometryType: getCandidateGeometryType(candidate),
    center,
    analysisTarget: {
      id: candidate.id,
      type: "demo-feature",
      label: candidate.title,
      coordinates: center,
      geometry: feature.geometry,
      properties: {
        scenarioId: candidate.scenarioId,
        sourceType: candidate.sourceType,
        score: candidate.score,
        confidence: candidate.confidence,
        caveat: candidate.caveats[0]
      },
      datasetId: "geoai-explore-candidates",
      datasetName: "GeoAI Explore candidates",
      sourceMode: "demo",
      officialStatus: "official-validation-required"
    }
  };
}

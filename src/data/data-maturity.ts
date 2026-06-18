import { dataSourceRegistry, getDataSourceById } from "@/src/data/data-source-registry";
import type { DataSource, DataSourceMaturityLevel, EvidenceItem } from "@/src/types/data-source";

export type DataMaturityDefinition = {
  id: DataSourceMaturityLevel;
  label: string;
  explanation: string;
  badgeClassName: string;
  decisionConfidence: string;
};

export const dataMaturityModel: DataMaturityDefinition[] = [
  {
    id: "demo_normalized",
    label: "Demo-normalized",
    explanation: "Synthetic or seed data used to demonstrate workflow and product logic.",
    badgeClassName: "bg-[#eef2f5] text-muted",
    decisionConfidence: "Suitable for demos only; not decision-grade."
  },
  {
    id: "open_ready",
    label: "Open-ready",
    explanation: "Prepared for open datasets after terms, attribution and endpoint checks.",
    badgeClassName: "bg-[#edf4f2] text-brand",
    decisionConfidence: "Useful for context once validated against source terms."
  },
  {
    id: "official_ready",
    label: "Official-ready",
    explanation: "Designed for official validation sources such as DLD or municipal GIS.",
    badgeClassName: "bg-[#fff8db] text-[#8a6a12]",
    decisionConfidence: "Can support stronger conclusions after official access is connected."
  },
  {
    id: "licensed_commercial_ready",
    label: "Licensed/commercial-ready",
    explanation: "Prepared for licensed imagery, market or risk data under commercial terms.",
    badgeClassName: "bg-[#f2edff] text-[#5b3a9f]",
    decisionConfidence: "Potentially decision-supporting once licensing and QA are complete."
  },
  {
    id: "customer_provided",
    label: "Customer-provided",
    explanation: "Customer assets, documents, CSV, GeoJSON and portfolio files.",
    badgeClassName: "bg-[#eaf3f1] text-brand",
    decisionConfidence: "Depends on customer provenance, permissions and validation."
  },
  {
    id: "pilot_validated",
    label: "Pilot-validated",
    explanation: "Validated in a controlled pilot workflow with known source coverage.",
    badgeClassName: "bg-[#eaf3f1] text-brand",
    decisionConfidence: "Appropriate for pilot decisions within agreed limits."
  },
  {
    id: "production_grade",
    label: "Production-grade",
    explanation: "Governed, audited, connected and QA-tested data pipeline.",
    badgeClassName: "bg-[#eaf3f1] text-brand",
    decisionConfidence: "Decision-grade only after production controls are in place."
  }
];

export type SourceReadinessRow = {
  sourceId: string;
  source: string;
  category: string;
  currentStatus: string;
  usedNow: string;
  pilotRelevance: string;
  validationRole: string;
};

export const sourceReadinessMatrix: SourceReadinessRow[] = [
  {
    sourceId: "synthetic-demo-layers",
    source: "Synthetic Demo Layers",
    category: "Demo",
    currentStatus: "Active in prototype",
    usedNow: "Yes",
    pilotRelevance: "Demonstrates workflow",
    validationRole: "Not decision-grade"
  },
  {
    sourceId: "demo-market-context-seed",
    source: "Demo Market Context / seed_static",
    category: "Demo market context",
    currentStatus: "Active in prototype",
    usedNow: "Yes",
    pilotRelevance: "Area-matching workflow",
    validationRole: "Validate with official/commercial sources"
  },
  {
    sourceId: "dubai-land-department-real-estate",
    source: "DLD Real Estate Data",
    category: "Official",
    currentStatus: "Official-ready / planned",
    usedNow: "No",
    pilotRelevance: "Transactions, rents, comps",
    validationRole: "Requires access and usage review"
  },
  {
    sourceId: "dubai-pulse-dld-apis",
    source: "Dubai Pulse / Data Dubai",
    category: "Official/open data",
    currentStatus: "Planned",
    usedNow: "No",
    pilotRelevance: "Historical and public datasets",
    validationRole: "Endpoint and dataset validation required"
  },
  {
    sourceId: "dubai-municipality-gis-planning",
    source: "Dubai Municipality / GeoDubai",
    category: "Official GIS",
    currentStatus: "Requires access",
    usedNow: "No",
    pilotRelevance: "Planning, zoning, GIS validation",
    validationRole: "Official access path required"
  },
  {
    sourceId: "osm-geofabrik",
    source: "OSM / Geofabrik",
    category: "Open geospatial",
    currentStatus: "Open-ready / planned",
    usedNow: "No",
    pilotRelevance: "Roads, POI, accessibility",
    validationRole: "Attribution and ODbL compliance required"
  },
  {
    sourceId: "customer-uploaded-documents",
    source: "Customer data",
    category: "Customer",
    currentStatus: "Future / pilot",
    usedNow: "No",
    pilotRelevance: "Portfolio/assets/documents",
    validationRole: "Client upload and access control required"
  }
];

export function getDataMaturityDefinition(level: DataSourceMaturityLevel = "demo_normalized") {
  return dataMaturityModel.find((item) => item.id === level) ?? dataMaturityModel[0];
}

export function getSourceMaturity(source: DataSource | null): DataSourceMaturityLevel {
  if (!source) return "demo_normalized";
  if (source.maturityLevel) return source.maturityLevel;
  if (source.sourceType === "official") return "official_ready";
  if (source.sourceType === "commercial") return "licensed_commercial_ready";
  if (source.sourceType === "customer") return "customer_provided";
  if (source.sourceType === "open_data" || source.sourceType === "open_geospatial") return "open_ready";
  return "demo_normalized";
}

export function deriveDataConfidenceLevel(evidence: EvidenceItem[]) {
  const sources = evidence.map((item) => getDataSourceById(item.sourceId)).filter(Boolean) as DataSource[];
  const usedDemo = sources.some((source) => source.usedInCurrentPrototype || source.status === "mock");
  const hasOfficialPath = dataSourceRegistry.some((source) => source.plannedForPilot && source.sourceType === "official");
  const hasDecisionGrade = sources.some((source) => source.decisionGrade);

  if (hasDecisionGrade) {
    return "Production-grade";
  }

  if (usedDemo && hasOfficialPath) {
    return "Demo with official validation path";
  }

  if (sources.some((source) => source.integrationStatus === "official_ready")) {
    return "Partial validation";
  }

  return "Demo only";
}

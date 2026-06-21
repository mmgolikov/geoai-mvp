import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { externalDataSources } from "@/src/lib/external-data/source-registry";

export type ExternalDataManifestSource = {
  id: string;
  status: string;
  lastUpdated?: string | null;
  availableFiles?: string[];
  rowCount?: number;
  featureCount?: number;
  usedInAnalysis?: boolean;
  disclaimer?: string;
};

export type ExternalDataManifest = {
  generatedAt: string | null;
  version: string;
  summary: string;
  sources: ExternalDataManifestSource[];
};

const manifestPath = join(process.cwd(), "data/external/normalized/external_data_manifest.json");

function defaultManifest(): ExternalDataManifest {
  return {
    generatedAt: null,
    version: "0.7",
    summary: "External data manifest is not available yet. GeoAI is using demo/sample fallback context.",
    sources: externalDataSources.map((source) => ({
      id: source.id,
      status: source.status,
      lastUpdated: source.lastUpdated ?? null,
      availableFiles: [],
      usedInAnalysis: Boolean(source.usedInAnalysis),
      disclaimer: source.disclaimer
    }))
  };
}

export function readExternalDataManifest(): ExternalDataManifest {
  if (!existsSync(manifestPath)) {
    return defaultManifest();
  }

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<ExternalDataManifest>;

    return {
      ...defaultManifest(),
      ...parsed,
      sources: Array.isArray(parsed.sources) ? parsed.sources : defaultManifest().sources
    };
  } catch {
    return defaultManifest();
  }
}

export function normalizedExternalFileExists(relativePath: string) {
  return existsSync(join(process.cwd(), relativePath));
}

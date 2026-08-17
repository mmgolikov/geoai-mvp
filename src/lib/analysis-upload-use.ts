import type { ExpressAnalysis } from "@/src/types/geo";
import type { UploadedDataset } from "@/src/types/uploaded-data";

function evidenceReferencesDataset(analysis: ExpressAnalysis, datasetId: string) {
  return analysis.evidence.some((item) =>
    item.sourceId === `uploaded-local:${datasetId}` ||
    item.id === `uploaded-${datasetId}` ||
    item.id.startsWith(`uploaded-${datasetId}-`)
  );
}

export function collectAnalysisUsedUploadedDatasetIds(analysis: ExpressAnalysis) {
  const usedDatasetIds = new Set<string>();
  const context = analysis.uploadedDataContext;
  if (!context) return usedDatasetIds;

  for (const match of context.appliedMetrics) usedDatasetIds.add(match.datasetId);
  for (const dataset of context.visibleGeojsonLayers) usedDatasetIds.add(dataset.id);

  for (const target of [analysis.analysisTarget, analysis.selectedObject?.analysisTarget]) {
    if (target?.sourceMode === "user-uploaded" && target.datasetId) {
      usedDatasetIds.add(target.datasetId);
    }
  }

  for (const dataset of context.uploadedDatasets) {
    if (evidenceReferencesDataset(analysis, dataset.id)) usedDatasetIds.add(dataset.id);
  }

  return usedDatasetIds;
}

export function selectAnalysisUsedUploadedDatasets(analysis: ExpressAnalysis): UploadedDataset[] {
  const context = analysis.uploadedDataContext;
  const projectKey = analysis.project?.projectKey;
  if (!context || !projectKey) return [];

  const usedDatasetIds = collectAnalysisUsedUploadedDatasetIds(analysis);
  return context.uploadedDatasets.filter((dataset) =>
    dataset.projectKey === projectKey && usedDatasetIds.has(dataset.id)
  );
}

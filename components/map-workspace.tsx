"use client";

import { MapWorkspaceClient } from "@/components/map-workspace-client";
import type { SelectedDemoObject, SelectedPoint, UserDrawnAoi } from "@/src/types/geo";
import type { UploadedDataset } from "@/src/types/uploaded-data";

type MapWorkspaceProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  selectedAoi?: UserDrawnAoi | null;
  onPointSelect: (point: SelectedPoint) => void;
  onObjectSelect?: (object: SelectedDemoObject) => void;
  onAoiSelect?: (aoi: UserDrawnAoi) => void;
  onAoiDelete?: () => void;
  className?: string;
  showEmptyOverlay?: boolean;
  showLayerControls?: boolean;
  uploadedDatasets?: UploadedDataset[];
  projectId?: string;
};

export function MapWorkspace(props: MapWorkspaceProps) {
  return <MapWorkspaceClient {...props} />;
}

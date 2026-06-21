"use client";

import { MapWorkspaceClient } from "@/components/map-workspace-client";
import type { SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { UploadedDataset } from "@/src/types/uploaded-data";

type MapWorkspaceProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  onPointSelect: (point: SelectedPoint) => void;
  onObjectSelect?: (object: SelectedDemoObject) => void;
  className?: string;
  showEmptyOverlay?: boolean;
  showLayerControls?: boolean;
  uploadedDatasets?: UploadedDataset[];
};

export function MapWorkspace(props: MapWorkspaceProps) {
  return <MapWorkspaceClient {...props} />;
}

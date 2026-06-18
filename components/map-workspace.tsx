"use client";

import dynamic from "next/dynamic";
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

const MapWorkspaceClient = dynamic(
  () => import("@/components/map-workspace-client").then((module) => module.MapWorkspaceClient),
  {
    ssr: false,
    loading: () => (
      <section className="relative h-full min-h-[360px] overflow-hidden bg-[#dfe8ec]" />
    )
  }
);

export function MapWorkspace(props: MapWorkspaceProps) {
  return <MapWorkspaceClient {...props} />;
}

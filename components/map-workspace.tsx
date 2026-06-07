"use client";

import dynamic from "next/dynamic";
import type { SelectedPoint } from "@/src/types/geo";

type MapWorkspaceProps = {
  selectedPoint: SelectedPoint | null;
  onPointSelect: (point: SelectedPoint) => void;
  className?: string;
  showEmptyOverlay?: boolean;
};

const MapWorkspaceClient = dynamic(
  () => import("@/components/map-workspace-client").then((module) => module.MapWorkspaceClient),
  {
    ssr: false,
    loading: () => (
      <section className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#dfe8ec]" />
    )
  }
);

export function MapWorkspace(props: MapWorkspaceProps) {
  return <MapWorkspaceClient {...props} />;
}

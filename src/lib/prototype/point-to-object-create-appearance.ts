import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { CONCEPT_TEMPLATE_IDS, type ConceptTemplateId } from "./point-to-object-create";

// One accent; programme differences use neutral finishes and surface rhythm.
const FINISHES: Record<ConceptTemplateId, { wall: string; inset: string; stride: number; band: number }> = {
  residential_mixed_use: { wall: "#e0dfd8", inset: "#8b9694", stride: 8, band: 8 },
  commercial_hub: { wall: "#ccd3d5", inset: "#76848a", stride: 4, band: 16 },
  civic_green: { wall: "#e4e1d8", inset: "#a0a29d", stride: 16, band: 8 },
  residential_quarter: { wall: "#e6e2d9", inset: "#9e9d96", stride: 8, band: 16 },
  hospitality_recreation: { wall: "#d9d1c3", inset: "#91887b", stride: 16, band: 16 }
};
export const conceptMaterialColor: ExpressionSpecification = ["match", ["get", "templateId"],
  CONCEPT_TEMPLATE_IDS[0], FINISHES[CONCEPT_TEMPLATE_IDS[0]].wall,
  ...CONCEPT_TEMPLATE_IDS.slice(1).flatMap(id => [id, FINISHES[id].wall]), "#dce1df"];
export function conceptWallColor(id: ConceptTemplateId): string { return FINISHES[id].wall; }
export const conceptSurfacePattern: ExpressionSpecification = ["concat", "geoai-concept-finish-", ["get", "templateId"], "-", ["get", "variantId"]];

function rgb(hex: string): number[] { return [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16)); }
export function conceptSurfaceImage(id: ConceptTemplateId, variant: "A" | "B") {
  const profile = FINISHES[id], size = 32;
  const wall = rgb(profile.wall), inset = rgb(profile.inset);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const column = (x + (variant === "B" ? profile.stride / 2 : 0)) % profile.stride;
    const row = y % profile.band;
    const shade = column >= 1 && column <= profile.stride - 2 && row >= 2 && row <= profile.band - 3 ? inset : wall;
    const offset = (y * size + x) * 4;
    data.set([...shade, 255], offset);
  }
  return { width: size, height: size, data };
}
export function installConceptSurfaceImages(map: MapLibreMap): void {
  for (const id of CONCEPT_TEMPLATE_IDS) for (const variant of ["A", "B"] as const) {
    const name = `geoai-concept-finish-${id}-${variant}`;
    if (!map.hasImage(name)) map.addImage(name, conceptSurfaceImage(id, variant), { pixelRatio: 2 });
  }
}

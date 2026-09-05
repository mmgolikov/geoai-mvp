import type { ConceptTemplateId, RedevelopmentProgramInput } from "./point-to-object-create";

export type PointObjectCreateEditorControls = Pick<RedevelopmentProgramInput,
  "blockCount" | "levelsMin" | "levelsMax" | "targetSiteCoveragePct" | "openSpacePct" | "setbackM">;
export type PointObjectCreateEditorControlKey = keyof PointObjectCreateEditorControls;

export type PointObjectCreateEditorSnapshot = {
  version: 1;
  scopeKey: string;
  templateId: ConceptTemplateId;
  controls: PointObjectCreateEditorControls;
  lockedControlKeys: PointObjectCreateEditorControlKey[];
  customPrompt: string;
  committedDraftKey: string | null;
};

const CONTROL_KEYS: PointObjectCreateEditorControlKey[] = [
  "blockCount",
  "levelsMin",
  "levelsMax",
  "targetSiteCoveragePct",
  "openSpacePct",
  "setbackM"
];

export function createPointObjectCreateEditorScopeKey(input: {
  aoiId: string;
  marketKey: string;
  locale: "en" | "ru";
  depth: "quick" | "standard" | "deep";
}): string {
  return JSON.stringify(input);
}

export function createPointObjectCreateDraftKey(input: {
  scopeKey: string;
  templateId: ConceptTemplateId;
  customPrompt: string;
  controls: PointObjectCreateEditorControls;
  lockedControlKeys: Iterable<PointObjectCreateEditorControlKey>;
}): string {
  return JSON.stringify({
    scopeKey: input.scopeKey,
    templateId: input.templateId,
    customPrompt: input.customPrompt.trim() || null,
    controls: input.controls,
    lockedControlKeys: [...input.lockedControlKeys].sort()
  });
}

function validControls(value: unknown): value is PointObjectCreateEditorControls {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const controls = value as Partial<PointObjectCreateEditorControls>;
  return Object.keys(value).every((key) => CONTROL_KEYS.includes(key as PointObjectCreateEditorControlKey)) &&
    Number.isInteger(controls.blockCount) && Number(controls.blockCount) >= 1 && Number(controls.blockCount) <= 12 &&
    Number.isInteger(controls.levelsMin) && Number(controls.levelsMin) >= 1 && Number(controls.levelsMin) <= 80 &&
    Number.isInteger(controls.levelsMax) && Number(controls.levelsMax) >= Number(controls.levelsMin) && Number(controls.levelsMax) <= 80 &&
    typeof controls.targetSiteCoveragePct === "number" && controls.targetSiteCoveragePct >= 8 && controls.targetSiteCoveragePct <= 60 &&
    typeof controls.openSpacePct === "number" && controls.openSpacePct >= 15 && controls.openSpacePct <= 75 &&
    controls.targetSiteCoveragePct + controls.openSpacePct <= 100 &&
    typeof controls.setbackM === "number" && controls.setbackM >= 2 && controls.setbackM <= 30;
}

export function restorePointObjectCreateEditorSnapshot(
  value: unknown,
  expectedScopeKey: string
): PointObjectCreateEditorSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Partial<PointObjectCreateEditorSnapshot>;
  if (snapshot.version !== 1 || snapshot.scopeKey !== expectedScopeKey ||
      (snapshot.templateId !== "residential_mixed_use" && snapshot.templateId !== "commercial_hub" && snapshot.templateId !== "civic_green") ||
      !validControls(snapshot.controls) || typeof snapshot.customPrompt !== "string" || snapshot.customPrompt.length > 600 ||
      (snapshot.committedDraftKey !== null && typeof snapshot.committedDraftKey !== "string") ||
      (typeof snapshot.committedDraftKey === "string" && snapshot.committedDraftKey.length > 2_000) ||
      !Array.isArray(snapshot.lockedControlKeys) ||
      snapshot.lockedControlKeys.some((key) => !CONTROL_KEYS.includes(key)) ||
      new Set(snapshot.lockedControlKeys).size !== snapshot.lockedControlKeys.length) return null;
  return {
    version: 1,
    scopeKey: snapshot.scopeKey,
    templateId: snapshot.templateId,
    controls: { ...snapshot.controls },
    lockedControlKeys: [...snapshot.lockedControlKeys],
    customPrompt: snapshot.customPrompt,
    committedDraftKey: snapshot.committedDraftKey
  };
}

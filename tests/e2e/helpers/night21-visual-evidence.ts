import { createHash } from "node:crypto";
import { closeSync, constants, fchmodSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { Page } from "@playwright/test";

export const VISUAL_EVIDENCE_OPT_IN = "write-public-map-png-evidence-v1";
export const VISUAL_EVIDENCE_MAX_IMAGES = 6;
export const VISUAL_EVIDENCE_MAX_PNG_BYTES = 5 * 1024 * 1024;
const scopes = new Set(["journey", "dubai-find", "singapore-find", "dubai-find-analysis", "dubai-find-construction",
  "dubai-create", "singapore-create", "quality20-find", "quality20-create",
  ...["rm", "ch", "cg"].flatMap(code => [`dubai-create-${code}-rectangle`, `dubai-create-${code}-concave`])]);
export const VISUAL_EVIDENCE_VIEWS = ["find-comparison-map", "create-a-map-3d", "create-b-map-3d", "create-b-map-2d"] as const;
export type VisualEvidenceView = typeof VISUAL_EVIDENCE_VIEWS[number];

function privateDirectory(value: unknown, empty = false): string {
  if (typeof value !== "string" || !isAbsolute(value) || resolve(value) !== value) throw new Error("Visual evidence requires one exact absolute directory.");
  const info = lstatSync(value);
  if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(value) !== value || (info.mode & 0o777) !== 0o700 ||
      (empty && readdirSync(value).length !== 0)) throw new Error("Visual evidence requires an existing empty private0700 real directory.");
  return value;
}

export function validateVisualEvidenceEnvironment(source: Record<string, string | undefined>, scope: string | undefined) {
  const optIn = source.GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE;
  const directory = source.GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR;
  if (optIn === undefined && directory === undefined) return {};
  if (optIn !== VISUAL_EVIDENCE_OPT_IN || !scope || !scopes.has(scope)) throw new Error("Visual evidence requires its exact public-map opt-in and Find/Create scope.");
  return { GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: optIn, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: privateDirectory(directory, true) };
}

export function publicMapPngMetadata(png: Buffer) {
  if (!Buffer.isBuffer(png) || png.length < 45 || png.length > VISUAL_EVIDENCE_MAX_PNG_BYTES ||
      !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.readUInt32BE(8) !== 13 || png.toString("ascii", 12, 16) !== "IHDR" ||
      png.toString("ascii", png.length - 8, png.length - 4) !== "IEND") throw new Error("Visual evidence is not one bounded PNG.");
  const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 16_777_216) throw new Error("Visual evidence PNG dimensions are outside bounds.");
  return { width, height, bytes: png.length, sha256: createHash("sha256").update(png).digest("hex") };
}

function writeExclusive(directory: string, filename: string, bytes: Buffer) {
  privateDirectory(directory);
  const path = join(directory, filename);
  const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try { fchmodSync(fd, 0o600); writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || (info.mode & 0o777) !== 0o600 || realpathSync(path) !== path ||
      !readFileSync(path).equals(bytes)) throw new Error("Visual evidence did not round-trip as one private regular file.");
  const parent = openSync(directory, constants.O_RDONLY);
  try { fsyncSync(parent); } finally { closeSync(parent); }
}

/** Buffer writer is separate so offline tests need no browser or source calls. */
export function createVisualEvidenceWriter(directory: string, commit: string, scope: string) {
  privateDirectory(directory, true);
  if (!/^[a-f0-9]{40}$/.test(commit) || !scopes.has(scope)) throw new Error("Visual evidence commit/scope is not accepted.");
  const images: Array<{ view: VisualEvidenceView; file: string; width: number; height: number; bytes: number; sha256: string }> = [];
  let finalized = false;
  return {
    has: (view: VisualEvidenceView) => images.some(item => item.view === view),
    record(view: VisualEvidenceView, png: Buffer) {
      if (finalized || !VISUAL_EVIDENCE_VIEWS.includes(view) || images.some(item => item.view === view) || images.length >= VISUAL_EVIDENCE_MAX_IMAGES) {
        throw new Error("Visual evidence view is duplicated, disallowed, finalized or exceeds the image cap.");
      }
      if (scope !== "journey" && !(view.startsWith("find-") ? scope.includes("find") : scope.includes("create"))) {
        throw new Error("Visual evidence view does not belong to the selected scope.");
      }
      const metadata = publicMapPngMetadata(png);
      const file = `${view}.png`;
      writeExclusive(directory, file, png);
      images.push({ view, file, ...metadata });
    },
    finalize(outcome: "passed" | "failed" | "inconclusive") {
      if (finalized || !["passed", "failed", "inconclusive"].includes(outcome)) throw new Error("Visual evidence cannot finalize twice or with an unknown outcome.");
      if (outcome === "passed" && images.length === 0) throw new Error("A passing visual-evidence run must retain at least one asserted view.");
      const index = { schemaVersion: "geoai.public-map-visual-evidence.v1", commit, scope, outcome,
        capture: "real_browser_map_canvas_after_assertions", authOrProfileCaptured: false, images };
      writeExclusive(directory, "index.json", Buffer.from(`${JSON.stringify(index, null, 2)}\n`));
      finalized = true;
      return index;
    }
  };
}

export async function capturePublicMapView(page: Page, writer: ReturnType<typeof createVisualEvidenceWriter> | null,
  view: VisualEvidenceView) {
  if (!writer || writer.has(view)) return;
  if (new URL(page.url()).pathname !== "/prototype/point-to-object") throw new Error("Visual evidence cannot capture an auth/profile/other page.");
  const container = view === "find-comparison-map" ? page.getByTestId("find-full-comparison-dashboard").getByTestId("live-map-canvas")
    : page.getByTestId("create-result-preview-3d");
  if (view.startsWith("create-")) {
    const expectedVariant = view === "create-a-map-3d" ? "A" : "B";
    if (await container.getAttribute("data-preview-variant") !== expectedVariant ||
        await container.getAttribute("data-preview-scene") !== "map" ||
        await container.getAttribute("data-preview-status") !== "ready" ||
        await container.getAttribute("data-preview-camera-pitch") !== (view.endsWith("3d") ? "50" : "0")) {
      throw new Error("Visual evidence view does not match the actual ready variant/scene/dimension.");
    }
  }
  const canvas = container.locator("canvas.maplibregl-canvas");
  if (await canvas.count() !== 1) throw new Error("Visual evidence requires one exact map canvas.");
  await canvas.scrollIntoViewIfNeeded();
  const size = await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Visual evidence target is not a canvas.");
    const box = element.getBoundingClientRect();
    if (box.width <= 100 || box.height <= 100) throw new Error("Visual evidence map is not usefully visible.");
    const overlaps = (node: Element) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 &&
      r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top; };
    const privateNodes = document.querySelectorAll('header, nav, [data-testid*="profile"], input[type="email"], input[type="password"]');
    if ([...privateNodes].some(overlaps)) throw new Error("Visual evidence map overlaps header/profile/auth content.");
    for (const input of document.querySelectorAll("input,textarea")) {
      if (overlaps(input) && /@|Bearer\s|\bsk-|\bsb_secret_|\beyJ/.test((input as HTMLInputElement).value)) throw new Error("Visual evidence overlaps private-shaped input text.");
    }
    return { width: box.width, height: box.height };
  });
  const png = await canvas.screenshot({ type: "png", scale: "css" });
  const dimensions = publicMapPngMetadata(png);
  if (Math.abs(dimensions.width - size.width) > 1 || Math.abs(dimensions.height - size.height) > 1) throw new Error("Visual evidence screenshot dimensions differ from the asserted canvas.");
  writer.record(view, png);
}

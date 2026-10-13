import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sha256 } from "../point-to-object/hash";
import { buildIndependentContext, independentCaseBinding, OVERTURE_SNAPSHOT_HASH } from "./point-to-object-independent-context";

let admitted: unknown;

/** Fixed admitted bytes only. No wildcard, remote fetch, env, provider secrets
 * or whole-UAE coverage. The static path is intended for Next output-file
 * tracing; Control must verify packaged bytes and the exact hosted API. */
export function readIndependentPointObjectContext(subjectId: string, anchor: [number, number], polygon?: [number, number][][]) {
  if (!independentCaseBinding(subjectId, anchor, polygon)) return buildIndependentContext(null, subjectId, anchor, new Date().toISOString(), polygon);
  try {
    if (!admitted) {
      const bytes = readFileSync(path.join(process.cwd(), "src/data/prototype/d2-overture-places.json"), "utf8");
      if (sha256(bytes) !== OVERTURE_SNAPSHOT_HASH) throw new Error("Admitted snapshot integrity mismatch");
      admitted = JSON.parse(bytes) as unknown;
    }
    return buildIndependentContext(admitted, subjectId, anchor, new Date().toISOString(), polygon);
  } catch {
    // Fail closed without leaking filenames, raw records or exception details.
    return buildIndependentContext(null, subjectId, anchor, new Date().toISOString(), polygon);
  }
}

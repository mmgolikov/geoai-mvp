import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildU4IndependentContext, u4DomainMatches, U4_SOURCE_HASH, type U4ContextInput } from "./point-to-object-u4-independent-context";

let verified: unknown;
/** One literal traceable file; no network/env, raw60, previous265 or fallback. */
export function readU4IndependentContext(input: U4ContextInput) {
  if (!u4DomainMatches(input)) return buildU4IndependentContext(null, input, new Date().toISOString());
  try {
    if (verified === undefined) {
      const bytes = readFileSync(path.join(process.cwd(), "src/data/prototype/d2-overture-u4-places.json"));
      if (bytes.byteLength !== 30_418 || createHash("sha256").update(bytes).digest("hex") !== U4_SOURCE_HASH) throw new Error("U4 admission mismatch");
      verified = JSON.parse(bytes.toString("utf8"));
    }
    return buildU4IndependentContext(verified, input, new Date().toISOString());
  } catch {
    return buildU4IndependentContext(null, input, new Date().toISOString());
  }
}

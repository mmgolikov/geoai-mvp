import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// UI brand controls only. Basemap layers, neutral materials and amber/red
// semantic alerts are not recast as brand colours.
const retired = /#(?:176548|087f70|175c45|345c54|173b35|536963|62716d|edf7f3|e6f5f1|eefaf8|eaf5f1|f0f8f6|d9efeb|48a99a|76bfc1)\b/i;
const directory = "components/point-to-object";
const files = readdirSync(directory).filter(file => /\.(tsx|css)$/.test(file));
for (const file of files) assert.doesNotMatch(readFileSync(join(directory, file), "utf8"), retired, file);
const channels = hex => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = hex => channels(hex).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
for (const surface of ["#ffffff", "#f4fbfb"]) assert.ok(contrast("#087f8c", surface) >= 4.5, `Small accent text on ${surface}`);
assert.ok(contrast("#344054", "#e5fafa") >= 4.5, "Soft selected controls use neutral text for contrast");
assert.ok(contrast("#ffffff", "#087f8c") >= 4.5, "Primary action label");
const map = readFileSync(join(directory, "live-object-map.tsx"), "utf8");
assert.match(map, /classList\.toggle\("ring-2", active \|\| shortlisted\)/);
assert.match(map, /classList\.add\(active \? "bg-\[#087f8c\]"/);
assert.match(readFileSync(join(directory, "climate-context.module.css"), "utf8"), /\.controls button \{ min-height: 44px;/);
console.log(`PASS: ${files.length} point-product UI files exclude retired brand shades; three-colour text contrast, marker selection cue, and touch target checks. Visual browser acceptance remains separate.`);

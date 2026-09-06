import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../components/landing/geoai-landing-page.tsx", import.meta.url), "utf8");
const content = await readFile(new URL("../components/landing/content.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../components/landing/landing.module.css", import.meta.url), "utf8");
const productPreview = await readFile(new URL("../public/landing/geoai-map-workspace-preview.png", import.meta.url));
const productPreviewRu = await readFile(new URL("../public/landing/geoai-map-workspace-preview-ru.png", import.meta.url));

test("root page uses the bounded Cycle-05 landing component", () => {
  assert.match(page, /GeoAILandingPage/);
  assert.doesNotMatch(page, /HeroCockpit|landing-geoai-cockpit/);
});

test("landing exposes bilingual product and decision copy", () => {
  assert.match(content, /Turn a location into a decision path/);
  assert.match(content, /Превратите локацию в понятный путь к решению/);
  assert.match(content, /Analyse/);
  assert.match(content, /Анализ/);
  assert.match(component, /setLocale\(language\)/);
});

test("all landing entry links resolve to existing product routes", () => {
  assert.match(component, /const mapHref = "\/prototype\/point-to-object"/);
  assert.match(content, /href: "\/projects\?view=spatial"/);
  assert.match(component, /const projectsHref = "\/projects\?view=spatial"/);
  assert.match(component, /href="\/profile"/);
  assert.doesNotMatch(component, /href=["']#["']/);
  assert.doesNotMatch(content, /request-access|pricing|contact/i);
});

test("data and project boundaries remain explicit", () => {
  assert.match(content, /Cloud collaboration is not active/);
  assert.match(content, /Облачная совместная работа не активна/);
  assert.match(content, /Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion\./);
  assert.doesNotMatch(content, /pilot ready|production ready|commercially validated|official integration|guaranteed/i);
});

test("responsive and accessibility contracts are present", () => {
  assert.match(styles, /@media \(max-width: 1180px\)/);
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.brand, \.footerBrand \{[\s\S]*?min-height: 44px/);
  assert.match(styles, /\.localeSwitch button \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /aria-selected/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /ArrowLeft/);
});

test("hero uses the captured current product preview", () => {
  assert.match(component, /geoai-map-workspace-preview\.png/);
  assert.match(component, /geoai-map-workspace-preview-ru\.png/);
  assert.equal(productPreview.byteLength > 100_000, true);
  assert.equal(createHash("sha256").update(productPreview).digest("hex"), "9b608a26b12ac973ed4c788cb1e8e373942bc11f5538045cf7ccb79bd838092f");
  assert.equal(createHash("sha256").update(productPreviewRu).digest("hex"), "a3c739f67cfab2106c024c85bd2d1fc8980b6be7ce6f1786f7b46ab18e7d461a");
});

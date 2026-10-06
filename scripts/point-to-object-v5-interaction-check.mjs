import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const client = read("components/point-to-object/prototype-client-v5.tsx");
const analysis = read("components/point-to-object/analysis-client.tsx");
const create = read("components/point-to-object/create-panel.tsx");
const map = read("components/point-to-object/live-object-map.tsx");
const contextRoute = read("app/api/prototype/point-to-object/context/route.ts");
const aiRoute = read("app/api/prototype/point-to-object/ai/route.ts");
const evidence = read("src/lib/prototype/point-to-object-live-evidence.ts");
const session = read("src/lib/prototype/point-to-object-find-session.ts");
const capabilities = read("src/lib/prototype/point-to-object-find-capabilities.ts");
const i18n = read("src/lib/prototype/point-to-object-i18n.ts");
const header = read("components/point-to-object/prototype-header.tsx");
const mobileCss = read("components/point-to-object/mobile-workspace.module.css");
const replacement = read("src/lib/prototype/point-to-object-map-replacement.ts");

let rejectedMutationChecks = 0;
function assertRejectedMutation(source, target, replacementText, check, expectedFailure) {
  assert.equal(source.split(target).length - 1, 1,
    `Negative mutation target must exist exactly once: ${target}`);
  const mutated = source.replace(target, replacementText);
  assert.notEqual(mutated, source, "Negative mutations must change the consumer source");
  assert.throws(() => check(mutated), expectedFailure);
  rejectedMutationChecks += 1;
}

let submissionFixtureChecks = 0;
const rejectedSubmissionMutations = [];
function nodesMatching(root, predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}
function oneNode(root, predicate, message) {
  const matches = nodesMatching(root, predicate);
  assert.equal(matches.length, 1, message);
  return matches[0];
}
function assertSubmissionBinding(source, operation, countFixtures = false) {
  const ast = ts.createSourceFile(`${operation}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, `${operation}: consumer must parse`);
  const functionNamed = name => oneNode(ast,
    node => ts.isFunctionDeclaration(node) && node.name?.text === name, `${operation}: unique ${name}`);
  const builderName = operation === "find" ? "buildFindIntent" : "buildSubmissionIntent";
  const builder = functionNamed(builderName);
  const handler = functionNamed(operation === "find" ? "findInView" : "generate");
  assert.ok(builder.body && handler.body, `${operation}: addressable builder and handler`);
  assert.equal(builder.body.statements.length, 1, `${operation}: builder remains a pure return`);
  const returned = builder.body.statements[0];
  assert.ok(ts.isReturnStatement(returned) && returned.expression && ts.isObjectLiteralExpression(returned.expression),
    `${operation}: pure intent object`);
  assert.deepEqual(builder.parameters.map(parameter => parameter.name.getText(ast)), operation === "find" ? ["bounds"] : [],
    `${operation}: builder input contract`);
  const executable = ts.transpileModule(builder.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  function evaluateBuilder(state, bounds) {
    // Execute only the extracted pure builder, never the component/handler.
    const build = new Function(...Object.keys(state), `${executable}\nreturn ${builderName};`)(...Object.values(state));
    return operation === "find" ? build(bounds) : build();
  }
  const bounds = [55.28, 25.21, 55.29, 25.22];
  if (operation === "find") {
    for (const [market, language, group, minimum, maximum, expectedMinimum, expectedMaximum] of [
      ["dubai", "en", "residential", " 3 ", "12", 3, 12],
      ["abu_dhabi", "ru", "buildings", "", "  ", null, null],
      ["dubai", "ru", "residential", "1", "", 1, null],
      ["abu_dhabi", "en", "buildings", "", "4", null, 4]
    ]) {
      const state = { locationKey: market, locale: language, findGroup: group,
        findMinimumLevels: minimum, findMaximumLevels: maximum };
      assert.deepEqual(evaluateBuilder(state, bounds), { marketKey: market, locale: language, bounds, group,
        mappedMinimumLevels: expectedMinimum, mappedMaximumLevels: expectedMaximum, limit: 12 },
      "find: exact market/locale/bounds/group/level filters and bounded limit");
      if (countFixtures) submissionFixtureChecks += 1;
    }
    assert.match(handler.getText(ast), /const requestIntent = \{ audience: findAudience, role: findRole, scenario: findScenario \}/,
      "find: captured profile role and scenario remain separate from mapped filters");
    assert.match(handler.getText(ast), /sourceResponseFinished = true;\s*if \(!pointObjectSourceResponseIsCurrent\(requestId, findRequestIdRef\.current, controller\.signal\)\) return;[\s\S]*captureResponse\(payload\);[\s\S]*setFindResult\(payload\);[\s\S]*setFindResultIntent\(requestIntent\)/,
      "find: reject late responses before capture or result commit");
  } else {
    for (const [marketKey, locale, depth, templateId, customPrompt, fixed] of [
      ["dubai", "en", "standard", "residential_mixed_use", "", []],
      ["abu_dhabi", "ru", "deep", "residential_mixed_use", "  Synthetic alternative  ", ["blockCount", "levelsMax"]],
      ["dubai", "ru", "quick", "residential_mixed_use", "   ", ["levelsMin", "levelsMax", "setbackM"]]
    ]) {
      const controls = { massingStyle: "courtyard", blockCount: fixed.length + 2, levelsMin: 3,
        levelsMax: 8, targetSiteCoveragePct: 28, openSpacePct: 35, setbackM: 8 };
      const aoi = { coordinates: [[[55.28, 25.21], [55.29, 25.21], [55.29, 25.22], [55.28, 25.21]]] };
      const state = { marketKey, locale, depth, templateId, customPrompt, controls, lockedControlKeys: new Set(fixed), aoi };
      assert.deepEqual(evaluateBuilder(state), { marketKey, locale, depth, templateId,
        customPrompt: customPrompt.trim() || null, controls, lockedControlKeys: fixed, aoiCoordinates: aoi.coordinates },
      "create: exact controls/locks/AOI and decision inputs");
      if (countFixtures) submissionFixtureChecks += 1;
    }
  }
  const declaration = name => oneNode(handler.body,
    node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name,
    `${operation}: unique bound ${name}`);
  const intent = declaration("submittedIntent");
  assert.ok(intent.initializer && ts.isCallExpression(intent.initializer), `${operation}: builder call`);
  assert.equal(intent.initializer.expression.getText(ast), builderName, `${operation}: real builder`);
  assert.deepEqual(intent.initializer.arguments.map(argument => argument.getText(ast)), operation === "find" ? ["requestBounds"] : [],
    `${operation}: exact builder inputs`);
  assert.ok(ts.isVariableDeclarationList(intent.parent) && (intent.parent.flags & ts.NodeFlags.Const),
    `${operation}: immutable intent binding`);
  const capture = declaration("captureResponse");
  assert.ok(capture.initializer && ts.isCallExpression(capture.initializer), `${operation}: capture call`);
  assert.equal(capture.initializer.expression.getText(ast), "verification.begin", `${operation}: real capture`);
  assert.deepEqual(capture.initializer.arguments.map(argument => argument.getText(ast)),
    [JSON.stringify(operation), "submittedIntent", operation === "find" ? "{}" : "verificationSource"],
    `${operation}: capture uses exact submitted intent and source`);
  const response = declaration("response");
  assert.ok(response.initializer && ts.isAwaitExpression(response.initializer) && ts.isCallExpression(response.initializer.expression),
    `${operation}: awaited POST`);
  const fetch = response.initializer.expression;
  assert.equal(fetch.expression.getText(ast), "fetch", `${operation}: real POST call`);
  assert.equal(fetch.arguments.length, 2, `${operation}: POST argument contract`);
  assert.equal(fetch.arguments[0].getText(ast), JSON.stringify(`/api/prototype/point-to-object/${operation}`), `${operation}: exact endpoint`);
  const options = fetch.arguments[1];
  assert.ok(ts.isObjectLiteralExpression(options), `${operation}: explicit POST options`);
  assert.deepEqual(options.properties.map(property => property.name?.getText(ast)), ["method", "headers", "signal", "body"],
    `${operation}: no hidden POST option spread or override`);
  const [method, headers, signal, body] = options.properties;
  for (const property of options.properties) assert.ok(ts.isPropertyAssignment(property), `${operation}: explicit option assignment`);
  assert.equal(method.initializer.getText(ast), '"POST"', `${operation}: POST method`);
  assert.match(headers.initializer.getText(ast), /^\{\s*"Content-Type": "application\/json"\s*\}$/, `${operation}: JSON content type`);
  assert.equal(signal.initializer.getText(ast), "controller.signal", `${operation}: abort signal retained`);
  assert.ok(ts.isCallExpression(body.initializer), `${operation}: serialized body`);
  assert.equal(body.initializer.expression.getText(ast), "JSON.stringify", `${operation}: JSON serialization`);
  assert.equal(body.initializer.arguments.length, 1, `${operation}: one unmodified payload`);
  const payload = body.initializer.arguments[0];
  let bodyIntent;
  if (operation === "find") {
    assert.ok(ts.isIdentifier(payload) && payload.text === "submittedIntent", "find: same captured POST intent without overrides");
    bodyIntent = payload;
    const requestBounds = declaration("requestBounds");
    assert.equal(requestBounds.initializer?.getText(ast), "findExplicitSearchBounds ?? visibleBounds", "find: explicit bounds or visible fallback");
    for (const explicit of [bounds, null]) {
      const visible = [55.3, 25.3, 55.31, 25.31];
      const selected = new Function("findExplicitSearchBounds", "visibleBounds", `return ${requestBounds.initializer.getText(ast)};`)(explicit, visible);
      assert.deepEqual(selected, explicit ?? visible, "find: exact bounds selection");
      if (countFixtures) submissionFixtureChecks += 1;
    }
  } else {
    assert.ok(ts.isObjectLiteralExpression(payload), "create: explicit shared intent plus challenge");
    assert.equal(payload.properties.length, 2, "create: challenge is the only addition; no controls/locks/AOI override");
    const [spread, challenge] = payload.properties;
    assert.ok(ts.isSpreadAssignment(spread) && ts.isIdentifier(spread.expression) && spread.expression.text === "submittedIntent",
      "create: same captured POST intent");
    assert.ok(ts.isPropertyAssignment(challenge), "create: explicit challenge assignment");
    assert.equal(challenge.name.getText(ast), "challenge", "create: only challenge may be added");
    assert.equal(challenge.initializer.getText(ast), "challengePayload.challenge", "create: actual server challenge");
    bodyIntent = spread.expression;
  }
  assert.ok(intent.pos < capture.pos && capture.pos < response.pos, `${operation}: builder then capture then POST`);
  const references = nodesMatching(handler.body, node => ts.isIdentifier(node) && node.text === "submittedIntent");
  const allowedReferences = [intent.name, capture.initializer.arguments[1], bodyIntent];
  // Compare identities, not cyclic compiler trees; negative diagnostics stay bounded.
  assert.equal(references.length, allowedReferences.length, `${operation}: no intermediate intent mutation or shadowing`);
  assert.ok(references.every((reference, index) => reference === allowedReferences[index]),
    `${operation}: exact bound intent references`);
}
function rejectSubmissionMutation(source, operation, label, target, replacementText) {
  assert.equal(source.split(target).length - 1, 1, `${operation}/${label}: mutation target exists exactly once`);
  const mutated = source.replace(target, replacementText);
  assert.notEqual(mutated, source, `${operation}/${label}: mutation changes actual consumer source`);
  assert.throws(() => assertSubmissionBinding(mutated, operation), error => error?.code === "ERR_ASSERTION",
    `${operation}/${label}: changed submission semantics must fail closed`);
  rejectedSubmissionMutations.push(`${operation}/${label}`);
}

assert.match(client, /expectedSourceFeatureId: exactOsmFeatureId\(selection\.object\.sourceFeatureId\)/);
assert.match(client, /const expectedSourceFeatureId = exactOsmFeatureId\(candidate\.sourceFeatureId\)/);
assert.match(client, /expectedSourceFeatureId,/);
assert.match(map, /if \(navigationTarget\.expectedSourceFeatureId\) \{/);
assert.match(map, /sourceFeatureId: navigationTarget\.expectedSourceFeatureId/);
assert.match(contextRoute, /osmFeatureId: parsed\.value\.expectedSourceFeatureId \?\? null/);
assert.match(aiRoute, /const receipt = parsePublicEvidenceReceipt\(body\.evidenceReceipt\)/);
assert.match(aiRoute, /reusePublicEvidenceLease\(\{[\s\S]*osmFeatureId: receipt\.lookupSourceFeatureId/,
  "AI must reuse the exact source lookup bound to the public evidence receipt");
assert.match(aiRoute, /body\.expectedSourceFeatureId && body\.expectedSourceFeatureId !== evidencePack\.selectedObject\.sourceFeatureId/,
  "AI must reject a changed selected object even when a cached lease exists");
assert.doesNotMatch(aiRoute, /buildLivePointObjectEvidencePack\(/,
  "AI must not reacquire live evidence after the user accepted a context receipt");
assert.match(evidence, /new URL\("lookup", endpoint\)/);
assert.match(evidence, /The expected OpenStreetMap object could not be resolved exactly/);
assert.match(evidence, /"trusted_open_map_identity"/);

assert.match(map, /widthM > 750 \|\| heightM > 750 \|\| widthM \* heightM > 250_000/);
assert.match(map, /NON_OBJECT_POLYGON_SOURCE_LAYERS\.has\(sourceLayer\)/);
assert.match(map, /sourceLayer === "landuse"[\s\S]*SELECTABLE_LANDUSE_CLASSES\.has\(featureClassName\)/);
assert.match(map, /\(bounds\[2\] - bounds\[0\]\) \/ viewportWidth >= 0\.8/);
assert.match(map, /interactionModeRef\.current !== "analyse"/);

assert.match(session, /geoai:point-to-object:find:v1/);
assert.match(session, /sourceResponseHash/);
assert.match(session, /candidateIds\.size !== candidates\.length \|\| shortlistIds\.size !== shortlist\.length/, "Find restore must reject duplicate result or shortlist identities");
assert.match(session, /!candidate \|\| canonicalJson\(candidate\) !== canonicalJson\(item\)/, "Find restore must require each shortlist item to equal its immutable result candidate");
assert.match(client, /readPointObjectFindSession\(\)/);
assert.match(client, /writePointObjectFindSession\(\{/);
assert.doesNotMatch(client, /if \(restoredFind\.locale ===/, "Session restore must retain the last successful Find result across a locale change and expose it as stale until refreshed");
assert.doesNotMatch(client, /sourceResponseHash\.slice|data-testid="find-result-lineage"/, "Find must keep source evidence in state instead of routine UI");
assert.match(client, /findResult\.criteria\.bounds/);
assert.match(session, /analysisTargetSourceFeatureId/);
assert.match(session, /pointObjectFindSessionForProfileAudience/);
assert.match(session, /mappedMaximumLevels/);
assert.match(analysis, /pointObjectAnalysisTargetMatches\(selectedSourceFeatureId, findSession\.analysisTargetSourceFeatureId\)/,
  "Find-to-analysis provenance must require the exact validated source identity helper.");
assert.match(analysis, /settingsForFindIntent\(findSession\.role, findSession\.scenario\)/);

const findDrawerStart = client.indexOf('data-testid="find-drawer"');
const findDrawerEnd = client.indexOf('<div hidden={mode !== "create"}', findDrawerStart);
assert.ok(findDrawerStart >= 0 && findDrawerEnd > findDrawerStart, "Find drawer source must be addressable for deterministic UI checks");
const findDrawer = client.slice(findDrawerStart, findDrawerEnd);
assert.doesNotMatch(header, /showDataSources|source-offer|header\.dataSources/, "Prototype headers must not expose the removed Data sources action");
assert.doesNotMatch(client, /Data & methodology|find-data-methodology|find-methodology-panel|POINT_OBJECT_FIND_CAVEAT/, "Prototype drawers must not restore the removed methodology control");
assert.match(client, /getExecutableFindScenarios/);
assert.match(client, /pointObjectFindCapability\(scenario\.id\)\.status !== "unsupported"/, "Find choices must omit non-executable scenarios");
assert.match(i18n, /"find\.title": "Find places"/);
assert.match(client, /Buildings and construction sites/);
assert.match(client, /Residential buildings/);
assert.doesNotMatch(client, /t\("find\.body"\)/, "Find must not render a permanent introductory disclaimer");
assert.match(findDrawer, /data-testid="find-context-controls"/);
assert.doesNotMatch(findDrawer, /find-audience-|changeFindAudience|\["b2b", "b2c"\]/, "Profile must be the only editable audience source for Find");
assert.match(findDrawer, /"Scenario"/);
assert.match(findDrawer, /"Search settings"/);
assert.match(findDrawer, /"Object type"/);
assert.match(findDrawer, /"Levels from"/);
assert.match(findDrawer, /"Levels to"/);
assert.match(client, /function acceptedMappedLevelsInput\(value: string\): string \| null/);
assert.match(client, /\/\^\\d\{1,3\}\$\//, "Level input must accept only complete positive integer text and must not reinterpret decimals");
assert.match(findDrawer, /acceptedMappedLevelsInput\(event\.target\.value\)/);
assert.doesNotMatch(findDrawer, /replace\([^\n]*\\D[^\n]*\)/, "Find level inputs must reject invalid text instead of stripping characters into a different number");
assert.doesNotMatch(findDrawer, /More criteria|Дополнительные критерии|aria-expanded=\{findContextOpen\}/, "Role, scenario and wired settings must be visible without a disclosure");
assert.doesNotMatch(findDrawer, /findCapability\.limitation\[locale\]<\/p>/, "Find capability text must not render as a permanent inline disclaimer");
assert.doesNotMatch(findDrawer, /Factual OpenStreetMap attribute comparison|Фактическое сопоставление атрибутов|mapped signal|сигнал на карте|signal":/, "Find cards must use readable object labels without technical comparison narration");
assert.equal((findDrawer.match(/overflow-y-auto/g) ?? []).length, 1, "Find drawer must have exactly one scroll region");
assert.match(findDrawer, /data-testid="find-scroll-region"/);
assert.match(findDrawer, /data-testid="find-sticky-footer"/);
assert.match(findDrawer, /sticky bottom-0/, "Find footer must remain drawer-local and pinned at every breakpoint");
assert.match(findDrawer, /data-testid="find-search-cta"/);
assert.match(findDrawer, /data-testid="find-comparison-toolbar"/);
assert.match(findDrawer, /data-testid="find-comparison-grid"/);
assert.match(findDrawer, /grid-flow-col auto-cols-\[minmax\(188px,1fr\)\]/, "Comparison candidates must remain side by side in the compact drawer");
const findPrimaryLabelStart = client.indexOf("const findPrimaryLabel =");
const findPrimaryActionStart = client.indexOf("function runFindPrimaryAction()", findPrimaryLabelStart);
const findPrimaryActionEnd = client.indexOf("\n  return (", findPrimaryActionStart);
assert.ok(findPrimaryLabelStart >= 0 && findPrimaryActionStart > findPrimaryLabelStart && findPrimaryActionEnd > findPrimaryActionStart,
  "Find primary footer state and action must be addressable");
const findPrimaryLabel = client.slice(findPrimaryLabelStart, findPrimaryActionStart);
const findPrimaryAction = client.slice(findPrimaryActionStart, findPrimaryActionEnd);
assert.match(findPrimaryLabel, /findShortlist\.length >= 2[\s\S]*"Compare selected"/,
  "Two unchanged selected candidates must expose Compare selected in the shared footer");
assert.match(findPrimaryAction, /findShortlist\.length < 2[\s\S]*setFindComparison\(true\)/,
  "Compare selected must open the compact comparison without rerunning Find");
assert.match(findDrawer, /"Back to results"/);
assert.match(findDrawer, /"Clear"/);
assert.match(findDrawer, /"Remove from comparison"/);
assert.match(findDrawer, /"Not mapped"/);
assert.match(findDrawer, /disabled=\{findResultIsStale\}/, "Every stale candidate action, including cross-market results, must be natively disabled");
assert.match(client, /projectId: saved\.project\.projectId/, "A saved Find binding must retain its initiating project identity");
assert.match(client, /currentStore\?\.activeProjectId !== binding\.projectId/, "A Find view must not attach to a project after the user selected another active project");
assert.match(findPrimaryLabel, /findResultIsStale[\s\S]*"Update search"/,
  "Stale criteria must expose Update search in the shared footer");
assert.match(client, /findResult\.criteria\.bounds/);
assert.match(client, /findResultIntentKey !== findIntentKey/);
assert.match(client, /const findResultMarketMismatch = findResult !== null && findResult\.criteria\.marketKey !== locationKey/);
assert.match(client, /if \(findResultMarketMismatch\) return;/, "Cross-market stale candidates must fail closed before navigation or context resolution");
assert.match(client, /const persistedIntent = findResult && findResultIntent/);
assert.match(client, /const restoredIntentWasNormalized = restoredRole !== restoredFind\.role \|\|[\s\S]*restoredScenario !== restoredFind\.scenario \|\| restoredGroup !== restoredFind\.group/);
assert.match(client, /setFindResult\(restoredIntentWasNormalized \? null : restoredFind\.result\)/, "A normalized restored intent must not relabel prior results");
assert.match(client, /setFindShortlist\(restoredIntentWasNormalized \? \[\] : restoredFind\.shortlist\)/);
const findInViewStart = client.indexOf("async function findInView()");
const findInViewEnd = client.indexOf("async function hydrateFindFootprint", findInViewStart);
assert.ok(findInViewStart >= 0 && findInViewEnd > findInViewStart, "Find request handler must be addressable");
const findInView = client.slice(findInViewStart, findInViewEnd);
assert.match(findInView, /const requestIntent = \{ audience: findAudience, role: findRole, scenario: findScenario \}/);
assert.match(findInView, /sourceResponseFinished = true;\s*if \(!pointObjectSourceResponseIsCurrent\(requestId, findRequestIdRef\.current, controller\.signal\)\) return;[\s\S]*setFindResult\(payload\);[\s\S]*setFindResultIntent\(requestIntent\)/,
  "A late Find response must be rejected before it can inherit a newer profile audience");
const profileAudienceMarker = client.indexOf('const profileAudience = user?.profile.defaultAudience ?? "b2b";');
const profileAudienceEffectStart = client.lastIndexOf("useEffect(() => {", profileAudienceMarker);
const profileAudienceEffectEnd = client.indexOf("}, [isSessionResolved, sessionReady, user]);", profileAudienceMarker);
assert.ok(profileAudienceMarker >= 0 && profileAudienceEffectStart >= 0 && profileAudienceEffectEnd > profileAudienceMarker,
  "Profile audience reconciliation effect must be addressable");
const profileAudienceEffect = client.slice(profileAudienceEffectStart, profileAudienceEffectEnd);
assert.match(profileAudienceEffect, /findRequestIdRef\.current \+= 1;[\s\S]*findRequestRef\.current\?\.abort\(\);[\s\S]*setFindResult\(null\);[\s\S]*setFindShortlist\(\[\]\)/,
  "An incompatible profile audience must invalidate pending and persisted Find outcomes");
assert.match(client, /marketKey: findResult\?\.criteria\.marketKey \?\? locationKey/);
assert.match(client, /result: findResult,/);
assert.match(client, /shortlist: findResult \? findShortlist : \[\]/);
assert.match(client, /analysisTargetSourceFeatureId: findResult \? findAnalysisTargetSourceFeatureId : null/);
assert.doesNotMatch(client, /findResultIsStale \? null : findResult/, "UI staleness must never delete saved result lineage");
const markStaleStart = client.indexOf("function markFindOutcomeStale()");
const markStaleEnd = client.indexOf("function changeFindRole", markStaleStart);
const markStale = client.slice(markStaleStart, markStaleEnd);
assert.doesNotMatch(markStale, /setFindShortlist|setFindComparisonOpen|setFindAnalysisTargetSourceFeatureId/, "Marking stale must preserve analysis continuity");
const localeEffectStart = client.indexOf('if (!sessionReady || previousLocaleRef.current === locale) return;');
const localeEffectEnd = client.indexOf('}, [locale, mode, sessionReady]);', localeEffectStart);
const localeEffect = client.slice(localeEffectStart, localeEffectEnd);
assert.ok(localeEffectStart >= 0 && localeEffectEnd > localeEffectStart, "Locale transition effect must be addressable");
assert.doesNotMatch(localeEffect, /setFindResult\(null\)|setFindResultIntent\(null\)|setFindShortlist\(\[\]\)|setFindComparisonOpen\(false\)|setFindAnalysisTargetSourceFeatureId\(null\)/, "Locale changes must mark existing Find output stale without deleting its lineage or continuation state");
const marketChangeStart = client.indexOf("function changeMarket(");
const marketChangeEnd = client.indexOf("function markFindOutcomeStale", marketChangeStart);
const marketChange = client.slice(marketChangeStart, marketChangeEnd);
assert.ok(marketChangeStart >= 0 && marketChangeEnd > marketChangeStart, "Market transition handler must be addressable");
assert.doesNotMatch(marketChange, /setFindResult\(null\)|setFindResultIntent\(null\)|setFindShortlist\(\[\]\)|setFindComparisonOpen\(false\)|setFindAnalysisTargetSourceFeatureId\(null\)/, "Market changes must mark existing Find output stale without deleting its lineage or continuation state");
assert.match(marketChange, /findRequestRef\.current\?\.abort\(\)/, "Market changes must cancel an in-flight Find request before preserving the prior result as stale");
assert.match(findDrawer, /min-h-11 w-full rounded-xl bg-\[#087f8c\]/, "Find CTA must retain a 44px target");
assert.match(client, /const requestBounds = findExplicitSearchBounds \?\? visibleBounds/,
  "Find must use the explicitly committed map area or the current visible fallback");
// The verification-export refactor captures the real builder output. Check its
// fields and consumer binding, not the retired inline object spelling.
assertSubmissionBinding(client, "find", true);
for (const [label, target, replacementText] of [
  ["wrong-market", "return { marketKey: locationKey, locale, bounds, group: findGroup,", 'return { marketKey: "fixed-market", locale, bounds, group: findGroup,'],
  ["missing-locale", "return { marketKey: locationKey, locale, bounds, group: findGroup,", "return { marketKey: locationKey, bounds, group: findGroup,"],
  ["missing-bounds", "return { marketKey: locationKey, locale, bounds, group: findGroup,", "return { marketKey: locationKey, locale, group: findGroup,"],
  ["missing-group", "return { marketKey: locationKey, locale, bounds, group: findGroup,", "return { marketKey: locationKey, locale, bounds,"],
  ["missing-minimum", "mappedMinimumLevels: findMinimumLevels.trim() ? Number(findMinimumLevels) : null,", ""],
  ["missing-maximum", "mappedMaximumLevels: findMaximumLevels.trim() ? Number(findMaximumLevels) : null, limit: 12", "limit: 12"],
  ["unbounded-limit", "mappedMaximumLevels: findMaximumLevels.trim() ? Number(findMaximumLevels) : null, limit: 12", "mappedMaximumLevels: findMaximumLevels.trim() ? Number(findMaximumLevels) : null, limit: 99"],
  ["wrong-builder-bounds", "buildFindIntent(requestBounds)", "buildFindIntent(visibleBounds)"],
  ["wrong-export-intent", 'verification.begin("find", submittedIntent, {})', 'verification.begin("find", requestIntent, {})'],
  ["wrong-post-intent", "body: JSON.stringify(submittedIntent)", "body: JSON.stringify(requestIntent)"],
  ["hidden-filter-override", "body: JSON.stringify(submittedIntent)", 'body: JSON.stringify({ ...submittedIntent, group: "buildings" })'],
  ["intent-mutated-after-capture", 'const captureResponse = verification.begin("find", submittedIntent, {});', 'const captureResponse = verification.begin("find", submittedIntent, {}); submittedIntent.limit = 99;'],
  ["missing-role", "const requestIntent = { audience: findAudience, role: findRole, scenario: findScenario };", "const requestIntent = { audience: findAudience, scenario: findScenario };"],
  ["late-response-bypass", "sourceResponseFinished = true;\n      if (!pointObjectSourceResponseIsCurrent(requestId, findRequestIdRef.current, controller.signal)) return;", "sourceResponseFinished = true;"]
]) rejectSubmissionMutation(client, "find", label, target, replacementText);
assert.match(capabilities, /b2b_lowrise_luxury_residential:[\s\S]*mappedLevelsPreset: \{ minimum: null, maximum: 4 \}/, "The low-rise scenario must set a real maximum-level preset");
assert.match(client, /const \[sheet, setSheet\] = useState<"peek" \| "half" \| "full">\("peek"\)/, "Task sheet state must remain independent of product mode");
assert.match(client, /data-sheet=\{effectiveSheet\} data-testid="mobile-workspace-shell"/);
assert.match(mobileCss, /\.workspace \{ height: var\(--workspace-height, 100dvh\); \}/, "Workspace must own a bounded dynamic viewport");
assert.match(mobileCss, /\.map \{ height: 100%; min-height: 0; \}/, "Map must retain full height behind the independent task sheet");
assert.match(mobileCss, /\.sheet \{ position: absolute;[^}]*height: var\(--sheet-height\)/, "Mobile task sheet must overlay, not shrink, the mounted map");
assert.match(mobileCss, /@media \(min-width: 1024px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\) 430px/, "Desktop must retain the 430px drawer at the accepted breakpoint");
assert.match(mobileCss, /@media \(max-height: 599px\) and \(max-width: 1023px\)[\s\S]*\.halfControl \{ display: none; \}/, "Short mobile landscape must omit the half-sheet control");
assert.match(client, /const effectiveSheet = mobile && viewportHeight < 600 && sheet === "half" \? "full" : sheet/);
assert.match(client, /aria-controls="workspace-task-content" aria-expanded=\{sheet !== "peek"\}/, "Map/task navigation must expose its controlled region and expanded state");
assert.match(client, /inert=\{mobile && effectiveSheet === "full"\}/, "Covered map controls must not remain keyboard interactive");
assert.match(mobileCss, /\.content \{[^}]*min-height: 0;[^}]*flex: 1;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain/, "Task content must be flex-bounded and contain its scrolling");
assert.match(client, /id="workspace-task-content" className=\{mobileStyles\.content\}/);
assert.match(client, /role="tab"[\s\S]*min-h-11/, "Mode tabs must retain 44px targets");
assert.match(mobileCss, /\.drawer \{ padding: 24px 24px 16px; \}/, "Desktop drawer must retain its 16px lower inset");
assert.match(client, /data-testid="analyse-composer"/);
assert.match(client, /h-\[120px\][\s\S]*lg:h-\[132px\][\s\S]*lg:min-h-\[120px\][\s\S]*lg:max-h-\[200px\]/, "Analyse composer must retain a useful bounded writing area");
const selectionCardStart = client.indexOf('data-testid="selection-card"');
const selectionCardEnd = client.indexOf('data-testid="analyse-composer"', selectionCardStart);
const selectionCard = client.slice(selectionCardStart, selectionCardEnd);
assert.doesNotMatch(selectionCard, /sourceFeatureId|field\.osmObject|field\.relation|relationLabel/, "Selection summary must not expose raw object or relation identifiers");
assert.doesNotMatch(client, /t\("question\.optional"\)/, "Prototype controls must not render Optional badges");
assert.match(client, /event\.metaKey \|\| event\.ctrlKey/);
const decisionCardsLifecycleKey = 'key={`${analysis.evidencePackId}:${analysis.generatedAt}`}';
assert.equal(analysis.split(decisionCardsLifecycleKey).length - 1, 1,
  "The server-evidence identity may appear exactly once as the PointObjectDecisionCards lifecycle key");
assert.match(analysis, /<PointObjectDecisionCards key=\{`\$\{analysis\.evidencePackId\}:\$\{analysis\.generatedAt\}`\}/,
  "The allowed evidence identity use must remain the non-rendered React lifecycle key");
const analysisWithoutDecisionCardsLifecycleKey = analysis.replace(decisionCardsLifecycleKey, "");
assert.doesNotMatch(analysisWithoutDecisionCardsLifecycleKey, /analysis\.telemetry\.model|analysis\.telemetry\.attemptTrace|analysis\.evidencePackId/, "Analysis evidence disclosure must not expose implementation telemetry");
assert.doesNotMatch(analysis, /analysis\.evidenceMethod|analysis\.methodBoundary|analysis\.methodText/, "Analysis must not restore the removed generic methodology disclosure");
assert.match(analysis, /data-testid="analysis-caveat">\{content\.caveat\}/, "Decision output must retain one exact response-bound caveat");
assert.match(map, /data-testid="map-dimension-control"/);
assert.match(map, /handledCreateAoiFitRequestRef\.current === createAoiFitRequest\.requestId/);
assert.match(map, /map\.fitBounds\(createAoiFitRequest\.bounds/);
assert.match(map, /bearing: map\.getBearing\(\),[\s\S]*pitch: map\.getPitch\(\)/, "Uploaded AOI fit must preserve the user's orientation and 2D\/3D posture");
assert.match(client, /closeCreateArea\(vertices, true\)/, "Only uploaded AOIs should request automatic fitting");
assert.match(map, /min-h-11 rounded-lg px-3 text-xs font-bold uppercase/, "2D and 3D controls must retain 44px targets");
assert.match(map, /data-map-bottom-controls/);
assert.match(mobileCss, /\.map \[data-map-bottom-controls\] \{ bottom: 12px; \}/, "Desktop map controls must retain their anchored lower edge");
assert.match(mobileCss, /\.controls button \{ min-height: 44px;/, "Mobile task controls must retain 44px targets");

assert.doesNotMatch(client, /setCreateAreaCleared\(\(value\) => !value\);\s*setGeneratedConcept\(null\)/);
assert.match(client, /const \[createReplacementRevision, setCreateReplacementRevision\] = useState\(0\)/);
assert.match(client, /createReplacementMapProps = \{\s*createReplacementRevision,/);
assert.match(client, /overlayBottomInset: mobile \? sheet === "half"/, "Map replacement must retain the sheet-aware camera inset");
assert.match(client, /data-testid="create-map-presentation-toggle"/);
assert.match(client, /function toggleCreateMapPresentation\(\)[\s\S]*if \(createAreaCleared\) \{[\s\S]*setCreateAreaCleared\(false\)/,
  "A requested replacement, including partial coverage, must retain an explicit restore action");
function assertDurableConceptVisibility(source) {
  assert.match(source, /const NATIVE_VOLUME_MIN_ZOOM = 14;/,
    "Native extrusion presentation must retain its distinct z14 boundary");
  assert.match(source, /const lowZoom = map\.getZoom\(\) < NATIVE_VOLUME_MIN_ZOOM;/,
    "Low zoom must cover the flat-native transition until native extrusions start");
  assert.match(source, /if \(map\.getZoom\(\) < pointObjectReplacementMinimumReliableZoom\) \{\s*restoreBuildingFilters\(map\);\s*replacementStatus = "zoom-required";/,
    "Native replacement must retain its separate reliable-zoom restoration guard");
  assert.match(source, /function reviewVisibleCreateConcept\(map: MapLibreMap, massing: ConceptMassingResult\): CreateMapConflictReview \{\s*return reviewPointObjectCreateMapConflict\(map,\s*buildingLayerIds\(map\)\.filter\(id => map\.getLayoutProperty\(id, "visibility"\) !== "none"\),\s*massing\.featureCollection\.features\);\s*\}/,
    "Detailed review must bind visible native layers to reject native collisions");
  assert.match(source, /const review = massing && aoi && suppressExistingBuildings \? lowZoom\s*\? reviewPointObjectCreateMapConflict\(map, \[\], massing\.featureCollection\.features\)\s*:\s*reviewVisibleCreateConcept\(map, massing\) : null;\s*const canShowConcept = review\?\.status === "clear";/,
    "Detailed zoom must still reject native collisions, independent of temporary source loading");
  assert.match(source, /setPointObjectLayerVisibilityIfChanged\(map, CREATE_AOI_MASK_LAYER_ID,\s*canShowConcept && lowZoom \? "visible" : "none"\);/,
    "The low-zoom concept must cover generalized native footprints with its site mask");
}
assert.match(replacement, /export const pointObjectReplacementMinimumReliableZoom = 13 as const;/,
  "Native replacement reliability must remain z13, distinct from native extrusion presentation at z14");
assertDurableConceptVisibility(map);
assertRejectedMutation(map, 'const canShowConcept = review?.status === "clear";',
  "const canShowConcept = true;", assertDurableConceptVisibility, /native collisions/);
assertRejectedMutation(map, ": reviewVisibleCreateConcept(map, massing) : null;",
  ": reviewPointObjectCreateMapConflict(map, [], massing.featureCollection.features) : null;",
  assertDurableConceptVisibility, /native collisions/);
assertRejectedMutation(map, 'buildingLayerIds(map).filter(id => map.getLayoutProperty(id, "visibility") !== "none")',
  "[]", assertDurableConceptVisibility, /native collisions/);
assertRejectedMutation(map, "? reviewPointObjectCreateMapConflict(map, [], massing.featureCollection.features)",
  '? { status: "clear" }', assertDurableConceptVisibility, /native collisions/);
assertRejectedMutation(map, 'canShowConcept && lowZoom ? "visible" : "none"',
  '"none"', assertDurableConceptVisibility, /site mask/);
assert.match(client, /"Show generated concept"/);
assert.match(client, /"Hide existing buildings"/);
assert.match(client, /setCreateReplacementRevision\(\(revision\) => revision \+ 1\)/);
assert.match(client, /data-testid="create-delete-area"/);
assert.match(client, /t\("create\.deleteArea"\)/);
assert.match(i18n, /"create\.deleteArea": "Delete area"/);
assert.match(i18n, /"create\.deleteArea": "Удалить зону"/);
assert.match(client, /response\.status === 429/);
assert.match(client, /sourceRetryAfterSeconds\(response\.headers\.get\("retry-after"\)\)/, "Source recovery must preserve the provider Retry-After contract via the shared parser");
assert.match(client, /areaContextRetryAfterSeconds > 0/);
const pendingInvalidationStart = create.indexOf("function invalidatePendingRequest()");
const pendingInvalidationEnd = create.indexOf("function selectTemplate", pendingInvalidationStart);
const pendingInvalidation = create.slice(pendingInvalidationStart, pendingInvalidationEnd);
assert.ok(pendingInvalidationStart >= 0 && pendingInvalidationEnd > pendingInvalidationStart, "Create pending-request invalidation must be addressable");
assert.match(pendingInvalidation, /requestIdRef\.current \+= 1;[\s\S]*requestRef\.current\?\.abort\(\);/);
assert.doesNotMatch(pendingInvalidation, /onReset\(\)/, "Draft edits must preserve the last committed result");
assert.match(create, /function selectTemplate[\s\S]*invalidatePendingRequest\(\);[\s\S]*setTemplateId/);
assert.match(create, /function updateControl[\s\S]*invalidatePendingRequest\(\);[\s\S]*setControls/);
assert.match(create, /lockedControlKeys: \[\.\.\.lockedControlKeys\]/, "Create must send the explicit fixed controls to the engine lock contract");
assertSubmissionBinding(create, "create", true);
for (const [label, target, replacementText] of [
  ["missing-controls", "controls, lockedControlKeys: [...lockedControlKeys], aoiCoordinates: aoi.coordinates", "lockedControlKeys: [...lockedControlKeys], aoiCoordinates: aoi.coordinates"],
  ["dropped-locks", "controls, lockedControlKeys: [...lockedControlKeys], aoiCoordinates: aoi.coordinates", "controls, lockedControlKeys: [], aoiCoordinates: aoi.coordinates"],
  ["missing-aoi", "controls, lockedControlKeys: [...lockedControlKeys], aoiCoordinates: aoi.coordinates", "controls, lockedControlKeys: [...lockedControlKeys]"],
  ["wrong-aoi", "controls, lockedControlKeys: [...lockedControlKeys], aoiCoordinates: aoi.coordinates", "controls, lockedControlKeys: [...lockedControlKeys], aoiCoordinates: []"],
  ["untrimmed-prompt", "return { marketKey, locale, depth, templateId, customPrompt: customPrompt.trim() || null,", "return { marketKey, locale, depth, templateId, customPrompt,"],
  ["missing-depth", "return { marketKey, locale, depth, templateId, customPrompt: customPrompt.trim() || null,", "return { marketKey, locale, templateId, customPrompt: customPrompt.trim() || null,"],
  ["wrong-export-intent", 'verification.begin("create", submittedIntent, verificationSource)', 'verification.begin("create", controls, verificationSource)'],
  ["wrong-export-source", 'verification.begin("create", submittedIntent, verificationSource)', 'verification.begin("create", submittedIntent, {})'],
  ["wrong-post-intent", "...submittedIntent,", "...controls,"],
  ["hidden-lock-override", "...submittedIntent,", "...submittedIntent, lockedControlKeys: [],"],
  ["hidden-aoi-override", "...submittedIntent,", "...submittedIntent, aoiCoordinates: [],"],
  ["wrong-challenge", "challenge: challengePayload.challenge", 'challenge: "synthetic-bypass"'],
  ["intent-mutated-after-capture", 'const captureResponse = verification.begin("create", submittedIntent, verificationSource);', 'const captureResponse = verification.begin("create", submittedIntent, verificationSource); submittedIntent.controls = {};']
]) rejectSubmissionMutation(create, "create", label, target, replacementText);
function assertCreateControlIntent(source) {
  const templateStart = source.indexOf("function selectTemplate(");
  const manualStart = source.indexOf("function updateControl<", templateStart);
  const autoStart = source.indexOf("function useAutoControls()", manualStart);
  const resetStart = source.indexOf("function resetEditedControls()", autoStart);
  const generateStart = source.indexOf("async function generate()", resetStart);
  assert.ok(templateStart >= 0 && manualStart > templateStart && autoStart > manualStart &&
    resetStart > autoStart && generateStart > resetStart, "Create control handlers must be addressable");
  for (const handler of [source.slice(templateStart, manualStart), source.slice(resetStart, generateStart)]) {
    assert.match(handler, /invalidatePendingRequest\(\);[\s\S]*setControls\(controlsFrom\(conceptSiteDefaults\(/,
      "Template/reset must cancel pending work and use geometric defaults");
    assert.match(handler, /explicitControlsRef\.current = false;[\s\S]*setLockedControlKeys\(new Set\(\)\)/,
      "Template/reset defaults must be Auto until the user explicitly edits them");
    assert.doesNotMatch(handler, /onReset\(|onGenerated\(|fetch\(/,
      "Template/reset draft changes must preserve the committed result without generation");
  }
  const manual = source.slice(manualStart, autoStart);
  assert.match(manual, /explicitControlsRef\.current = true;/);
  assert.match(manual, /setLockedControlKeys\(\(current\) => \{\s*const updated = new Set\(current\);\s*updated\.add\(key\);[\s\S]*if \(correctedPair\) \{\s*updated\.add\("levelsMin"\);\s*updated\.add\("levelsMax"\);\s*\}[\s\S]*return updated;/,
    "Manual edits must retain existing locks and fix the edited key plus any corrected level pair");
  assert.doesNotMatch(manual, /setLockedControlKeys\(new Set\(\)\)/,
    "Manual edits must not silently clear explicit locks");
  assert.match(source, /const \[lockedControlKeys, setLockedControlKeys\] = useState<Set<ControlKey>>\(\(\) => new Set\(restoredEditor\?\.lockedControlKeys \?\? \[\]\)\);/,
    "Initial restore must preserve saved explicit locks; only a fresh draft defaults to Auto");
  assert.match(source, /setLockedControlKeys\(new Set\(nextRestored\?\.lockedControlKeys \?\? \[\]\)\);/,
    "Scope restore must preserve saved explicit locks; only a fresh draft defaults to Auto");
}
assertCreateControlIntent(create);
assertRejectedMutation(create, "updated.add(key);", "", assertCreateControlIntent, /Manual edits/);
assertRejectedMutation(create, "new Set(restoredEditor?.lockedControlKeys ?? [])", "new Set([])",
  assertCreateControlIntent, /Initial restore/);
assertRejectedMutation(create, "setLockedControlKeys(new Set(nextRestored?.lockedControlKeys ?? []));",
  "setLockedControlKeys(new Set());", assertCreateControlIntent, /Scope restore/);
assert.ok(create.includes('data-testid={`create-alternative-${alternative.id.toLowerCase()}`}'), "Create must expose stable A/B option controls");
assert.match(client, /conceptMassing=\{mode === "create" \? activeConceptMassing : null\}/, "The map must render the active returned concept alternative");
assert.match(create, /id="point-object-create-prompt"[\s\S]*onChange=\{\(event\) => \{[\s\S]*invalidatePendingRequest\(\);[\s\S]*setCustomPrompt/);
function assertCreateGenerationAdmission(source) {
  assert.match(source, /const preflightBlocked = Boolean\(parameterError\) \|\| !preflightCurrent \|\| \["checking", "failed", "suggestion"\]\.includes\(preflightCurrent\.kind\);/,
    "Create must block parameter errors and require the current ready or not-applicable preflight");
  assert.match(source, /const legacyResultNeedsExplicitEdit = Boolean\(generated && committedDraftKey === null && !legacyDraftEdited\);/,
    "Legacy results without original draft inputs require an explicit edit before generation");
  assert.match(source, /async function generate\(\)[\s\S]*if \(loading \|\| generatedFromCurrentDraft \|\| legacyResultNeedsExplicitEdit \|\| preflightBlocked\) return;/,
    "The generation handler must retain loading, unchanged-draft, legacy-edit and preflight no-op guards");
  assert.match(source, /disabled=\{loading \|\| generatedFromCurrentDraft \|\| legacyResultNeedsExplicitEdit \|\| preflightBlocked\}/,
    "The Generate control must expose the same loading, unchanged-draft, legacy-edit and preflight blockers natively");
}
assertCreateGenerationAdmission(create);
assertRejectedMutation(create, "Boolean(parameterError) || ", "", assertCreateGenerationAdmission, /parameter errors/);
assertRejectedMutation(create, "if (loading || generatedFromCurrentDraft || legacyResultNeedsExplicitEdit || preflightBlocked) return;",
  "if (loading || generatedFromCurrentDraft || preflightBlocked) return;",
  assertCreateGenerationAdmission, /generation handler/);
assertRejectedMutation(create, "disabled={loading || generatedFromCurrentDraft || legacyResultNeedsExplicitEdit || preflightBlocked}",
  "disabled={loading || generatedFromCurrentDraft || preflightBlocked}",
  assertCreateGenerationAdmission, /Generate control/);
assert.match(create, /generatedLocale === locale/);
assert.match(create, /create-result-language-stale/);
assert.match(create, /upToDate: "Already generated"/);
assert.match(create, /regenerate: "Update concept"/);
assert.doesNotMatch(create, /Concept ready|Concept massing is a screening visualization/, "Create must not repeat generic success or disclaimer narration");
assert.match(create, /data-testid="generated-concept-summary"/);
assert.doesNotMatch(client, /Uses returned feature centres inside the AOI|Учитываются центры объектов, попавшие внутрь зоны|t\("create\.mask"\)/, "Create must not render persistent source-method or success narration");

for (const scenario of [
  "b2c_point_context", "b2c_tourist_objects_route", "b2c_residential_context",
  "b2c_new_residential_projects", "b2c_interest_routes", "b2b_redevelopment_selected_aoi",
  "b2b_redevelopment_100ha", "b2b_lowrise_luxury_residential", "b2b_hotel_development",
  "b2b_commercial_real_estate"
]) assert.match(capabilities, new RegExp(`${scenario}: \\{`));

for (const key of ["map.instructions.analyse", "map.instructions.find", "map.instructions.create"]) {
  assert.equal(i18n.split(`"${key}"`).length, 3, `${key} must exist once per locale`);
}
assert.match(map, /interactionMode === "find"/);
assert.match(header, /sm:hidden[^>]*" aria-hidden="true">←/);
assert.match(header, /hidden sm:inline/);

assert.equal(rejectedMutationChecks, 11, "All original map/control/admission bypass mutations must remain active");
console.log(`point-to-object V5 interaction contract checks passed (${submissionFixtureChecks} submission fixtures; ${rejectedSubmissionMutations.length} semantic submission mutations; ${rejectedMutationChecks} original rejected bypass mutations)`);
console.log(JSON.stringify({ submissionFixtures: submissionFixtureChecks, rejectedSubmissionMutations, originalRejectedBypassMutations: rejectedMutationChecks }));

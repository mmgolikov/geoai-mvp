import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE_URL = process.env.GEOAI_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "responsive-qa");
const CHROME_PORT = Number(process.env.GEOAI_CHROME_PORT ?? 9222);
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const VIEWPORTS = [
  { id: "390x844", width: 390, height: 844, mobile: true },
  { id: "430x932", width: 430, height: 932, mobile: true },
  { id: "768x1024", width: 768, height: 1024, mobile: true },
  { id: "1366x768", width: 1366, height: 768, mobile: false },
  { id: "1440x900", width: 1440, height: 900, mobile: false }
];

const findings = [];
const cases = [];

function addFinding(severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Chrome executable was not found. Checked: ${candidates.join(", ")}`);
}

class CdpSession {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.backlog = new Map();
    this.exceptions = [];
    this.logs = [];
  }

  async open() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result ?? {});
        return;
      }
      if (!message.method) return;
      if (message.method === "Runtime.exceptionThrown") this.exceptions.push(message.params);
      if (message.method === "Log.entryAdded") this.logs.push(message.params);
      const waiters = this.waiters.get(message.method);
      if (waiters?.length) {
        const waiter = waiters.shift();
        clearTimeout(waiter.timer);
        waiter.resolve(message.params);
      } else {
        const queued = this.backlog.get(message.method) ?? [];
        queued.push(message.params);
        this.backlog.set(message.method, queued);
      }
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out opening Chrome DevTools WebSocket.")), 10000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", (event) => {
        clearTimeout(timer);
        reject(new Error(`Chrome DevTools WebSocket error: ${event.message ?? "unknown"}`));
      }, { once: true });
    });
  }

  send(method, params = {}, timeoutMs = 25000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs = 25000) {
    const queued = this.backlog.get(method);
    if (queued?.length) return Promise.resolve(queued.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} event timed out after ${timeoutMs} ms.`)), timeoutMs);
      const waiters = this.waiters.get(method) ?? [];
      waiters.push({ resolve, reject, timer });
      this.waiters.set(method, waiters);
    });
  }

  close() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.close();
  }
}

async function waitForChrome(processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`Chrome exited with code ${processHandle.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

async function createPage(viewport) {
  const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Log.enable");
  await session.send("Network.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    positionX: 0,
    positionY: 0,
    dontSetVisibleSize: false
  });
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });
  return { target, session };
}

async function closePage(target, session) {
  session.close();
  try {
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${target.id}`);
  } catch {
    // Non-blocking target cleanup.
  }
}

async function evaluate(session, expression) {
  const response = await session.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? "Runtime evaluation failed.");
  return response.result?.value;
}

async function navigate(session, route, resetStorage = false) {
  const url = `${BASE_URL}${route}`;
  const firstLoad = session.waitForEvent("Page.loadEventFired", 30000).catch(() => null);
  await session.send("Page.navigate", { url }, 30000);
  await firstLoad;
  await waitForStableDocument(session);

  if (resetStorage) {
    await evaluate(session, `(() => { localStorage.clear(); sessionStorage.clear(); return true; })()`);
    const reload = session.waitForEvent("Page.loadEventFired", 30000).catch(() => null);
    await session.send("Page.reload", { ignoreCache: true }, 30000);
    await reload;
    await waitForStableDocument(session);
  }
}

async function waitForStableDocument(session) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const state = await evaluate(session, `(() => ({
      ready: document.readyState,
      textLength: document.body?.innerText?.length ?? 0,
      buttons: document.querySelectorAll("button").length,
      nextData: Boolean(document.querySelector("script[src*='_next']"))
    }))()`);
    if ((state.ready === "complete" || state.ready === "interactive") && state.textLength > 100 && state.nextData) break;
    await sleep(200);
  }
  await sleep(3500);
}

async function waitForCondition(session, expression, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(session, expression)) return true;
    await sleep(200);
  }
  return false;
}

async function clickText(session, text, mode = "exact") {
  return evaluate(session, `(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    };
    const text = ${JSON.stringify(text)};
    const mode = ${JSON.stringify(mode)};
    const candidates = [...document.querySelectorAll("button,a,summary")].filter(visible);
    const element = candidates.find((el) => {
      const value = el.textContent.replace(/\\s+/g, " ").trim();
      return mode === "includes" ? value.includes(text) : value === text;
    });
    if (!element) return { clicked: false, candidates: candidates.map((el) => el.textContent.replace(/\\s+/g, " ").trim()).filter(Boolean) };
    element.click();
    return { clicked: true, label: element.textContent.replace(/\\s+/g, " ").trim() };
  })()`);
}

async function capture(session, filename, fullPage = false) {
  let params = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
  if (fullPage) {
    const metrics = await session.send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize ?? metrics.contentSize;
    params = {
      ...params,
      clip: {
        x: 0,
        y: 0,
        width: Math.max(1, Math.ceil(size.width)),
        height: Math.max(1, Math.min(12000, Math.ceil(size.height))),
        scale: 1
      }
    };
  }
  const screenshot = await session.send("Page.captureScreenshot", params, 30000);
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(screenshot.data, "base64"));
}

const commonExpression = `(() => {
  const root = document.documentElement;
  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    scrollHeight: root.scrollHeight,
    horizontalOverflow: root.scrollWidth > root.clientWidth + 1
  };
})()`;

const landingExpression = `(() => {
  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  };
  const hero = document.querySelector("main section");
  const actions = [...(hero?.querySelectorAll("a,button") ?? [])].filter(visible).map((el) => el.textContent.replace(/\\s+/g, " ").trim()).filter(Boolean);
  const headings = [...document.querySelectorAll("h1")].filter(visible).map((el) => el.textContent.replace(/\\s+/g, " ").trim());
  const visibleText = [...document.querySelectorAll("p,div,span")].filter(visible).map((el) => el.innerText?.replace(/\\s+/g, " ").trim() ?? "");
  return {
    actions,
    headings,
    visibleCaveat: visibleText.some((value) => value.includes("Screening hypothesis") && value.includes("official validation required"))
  };
})()`;

const workspaceExpression = `(() => {
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, inViewport: r.bottom > 0 && r.top < innerHeight, fullyInViewport: r.top >= 0 && r.bottom <= innerHeight };
  };
  const byText = (selector, text, mode = "exact") => [...document.querySelectorAll(selector)].find((el) => {
    if (!visible(el)) return false;
    const value = el.textContent.replace(/\\s+/g, " ").trim();
    return mode === "includes" ? value.includes(text) : value === text;
  });
  const scenarioSetup = byText("summary", "Scenario setup", "includes");
  const candidateSearch = byText("p,span,h2,h3", "Candidate Search");
  const customQueryLabel = byText("label", "Custom Query");
  const textarea = document.querySelector("#custom-query");
  const allButtons = [...document.querySelectorAll("button")].filter(visible).map((el) => ({ label: el.textContent.replace(/\\s+/g, " ").trim(), rect: rect(el), disabled: el.disabled }));
  const primaryPattern = /^(Run Express Analysis|Find .+ zones|Search candidates|Update search|Export Report|Export Comparison)$/i;
  const primaryActions = allButtons.filter((item) => primaryPattern.test(item.label) && item.rect.inViewport);
  const openMap = allButtons.find((item) => item.label === "Open map") ?? null;
  const scenarioSelect = [...document.querySelectorAll("label")].find((label) => label.textContent.trim().startsWith("Scenario"))?.querySelector("select");
  const visibleText = [...document.querySelectorAll("p,span,summary")].filter((el) => visible(el) && rect(el).inViewport).map((el) => el.innerText?.replace(/\\s+/g, " ").trim() ?? "");
  return {
    scenarioSetup: rect(scenarioSetup),
    candidateSearch: rect(candidateSearch),
    customQueryLabel: rect(customQueryLabel),
    customQueryTextarea: rect(textarea),
    primaryActions,
    allButtons,
    compactCaveatVisible: visibleText.some((value) => value.includes("Screening hypothesis") || value.includes("official validation required")),
    validationSummaryVisible: visibleText.some((value) => value === "Validation caveat" || value === "VALIDATION CAVEAT"),
    detailsPresent: allButtons.some((item) => item.label === "Details"),
    openMap,
    scenarioValues: scenarioSelect ? [...scenarioSelect.options].map((option) => option.value) : []
  };
})()`;

const mapPickerExpression = `(() => {
  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  };
  const items = [...document.querySelectorAll("button,a")].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    return { label: el.textContent.replace(/\\s+/g, " ").trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right, fullyInViewport: r.top >= 0 && r.bottom <= innerHeight, disabled: el.disabled ?? false };
  });
  const best = (label) => items.filter((item) => item.label === label).sort((a, b) => Number(b.fullyInViewport) - Number(a.fullyInViewport) || b.top - a.top)[0] ?? null;
  return { back: best("Back to workflow"), run: best("Run Express Analysis"), headerVisible: document.body.innerText.includes("MAP SELECTION") };
})()`;

const projectExpression = `(() => {
  const bodyText = document.body?.innerText ?? "";
  const advanced = [...document.querySelectorAll("details")].find((el) => el.textContent.includes("Advanced project diagnostics"));
  return {
    title: [...document.querySelectorAll("h1")].some((el) => el.textContent.trim() === "Project Hub"),
    selector: Boolean(document.querySelector("#project-dashboard-selector")),
    dataReadiness: bodyText.includes("Data Readiness / Source Lineage"),
    advancedOpen: advanced?.open ?? null,
    contradictoryLabels: ["Sample pilot", "Public sample access is disabled", "Pilot access"].filter((text) => bodyText.includes(text))
  };
})()`;

const reportExpression = `(() => {
  const bodyText = document.body?.innerText ?? "";
  const cards = [...document.querySelectorAll(".geoai-print-card")];
  const value = (label) => {
    const card = cards.find((el) => el.querySelector("span")?.textContent.trim() === label);
    return card?.querySelector("strong")?.textContent.trim() ?? null;
  };
  const caveat = ${JSON.stringify(CAVEAT)};
  return {
    selectedTarget: value("Selected target"),
    scenario: value("Scenario"),
    scenarioEqualsTarget: Boolean(value("Scenario") && value("Scenario") === value("Selected target")),
    schematicMapLabel: bodyText.includes("Schematic map context"),
    demoScoreLabel: bodyText.includes("Demo deterministic score") || bodyText.includes("Model-assisted screening score"),
    caveatOccurrences: bodyText.split(caveat).length - 1,
    backControl: bodyText.includes("Back"),
    printControl: bodyText.includes("Print / Save as PDF")
  };
})()`;

async function auditLanding(viewport) {
  const { target, session } = await createPage(viewport);
  try {
    await navigate(session, "/", true);
    const common = await evaluate(session, commonExpression);
    const details = await evaluate(session, landingExpression);
    await capture(session, `${viewport.id}-landing-viewport.png`);
    await capture(session, `${viewport.id}-landing-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `LANDING_OVERFLOW_${viewport.id}`, "Landing has horizontal overflow.", common);
    if (!details.headings.length) addFinding("P0", `LANDING_H1_${viewport.id}`, "Landing has no visible H1.", details);
    if (details.actions.length < 2) addFinding("P1", `LANDING_ACTIONS_${viewport.id}`, "Landing hero exposes fewer than two visible actions.", details);
    if (!details.visibleCaveat) addFinding("P0", `LANDING_CAVEAT_${viewport.id}`, "Landing has no visible screening caveat.", details);
    if (session.exceptions.length) addFinding("P1", `LANDING_RUNTIME_${viewport.id}`, "Landing produced runtime exceptions.", { count: session.exceptions.length });
    cases.push({ id: `E-LANDING-${viewport.id}`, viewport: viewport.id, route: "/", common, details, screenshots: [`${viewport.id}-landing-viewport.png`, `${viewport.id}-landing-full.png`] });
  } finally {
    await closePage(target, session);
  }
}

async function auditWorkspace(viewport) {
  const { target, session } = await createPage(viewport);
  try {
    await navigate(session, "/workspace", true);
    await waitForCondition(session, `Boolean(document.querySelector("#custom-query"))`);
    await sleep(1200);
    const common = await evaluate(session, commonExpression);
    const initial = await evaluate(session, workspaceExpression);
    await capture(session, `${viewport.id}-workspace-initial.png`);

    if (common.horizontalOverflow) addFinding("P0", `WORKSPACE_OVERFLOW_${viewport.id}`, "Workspace has horizontal overflow.", common);
    if (initial.detailsPresent) addFinding("P0", `WORKSPACE_DETAILS_${viewport.id}`, "Project Details control is present.", initial);
    if (!initial.scenarioSetup || !initial.candidateSearch || !initial.customQueryLabel || !initial.customQueryTextarea) {
      addFinding("P0", `WORKSPACE_REQUIRED_${viewport.id}`, "Required Workspace setup controls are missing.", initial);
    } else if (!(initial.scenarioSetup.top < initial.candidateSearch.top && initial.candidateSearch.top < initial.customQueryLabel.top)) {
      addFinding("P0", `WORKSPACE_ORDER_${viewport.id}`, "Workspace controls are not ordered Scenario setup → Candidate Search → Custom Query.", initial);
    }
    if (!initial.primaryActions.length) addFinding("P0", `WORKSPACE_PRIMARY_${viewport.id}`, "No scenario-appropriate primary action is visible in the viewport.", initial);
    if (viewport.mobile && !initial.customQueryTextarea?.fullyInViewport) addFinding("P1", `WORKSPACE_QUERY_FOLD_${viewport.id}`, "Custom Query textarea is not fully visible in the initial viewport.", initial.customQueryTextarea);
    if (initial.primaryActions.length > 1) addFinding("P1", `WORKSPACE_DUPLICATE_PRIMARY_${viewport.id}`, "More than one primary action is visible in the viewport.", initial.primaryActions);
    if (!initial.compactCaveatVisible) addFinding("P1", `WORKSPACE_CAVEAT_${viewport.id}`, "The compact screening caveat text is not visibly rendered in the initial viewport.", { validationSummaryVisible: initial.validationSummaryVisible });
    if (viewport.width === 1366 && initial.openMap?.rect?.inViewport) addFinding("P1", "WORKSPACE_OPEN_MAP_1366", "Open map is visible at the required 1366px desktop viewport.", initial.openMap);
    if (viewport.mobile && !initial.openMap?.rect?.inViewport) addFinding("P0", `WORKSPACE_OPEN_MAP_${viewport.id}`, "Open map action is missing on the narrow viewport.", initial.openMap);

    const b2cClick = await clickText(session, "B2C");
    await sleep(1300);
    const b2c = await evaluate(session, workspaceExpression);
    await capture(session, `${viewport.id}-workspace-b2c.png`);
    if (!b2cClick.clicked || !b2c.scenarioValues.length || b2c.scenarioValues.some((value) => value.startsWith("b2b_"))) {
      addFinding("P0", `WORKSPACE_B2C_${viewport.id}`, "B2C mode is missing or leaks B2B scenarios.", { b2cClick, b2c });
    }

    await clickText(session, "B2B");
    await sleep(800);
    const criteriaClick = await clickText(session, "Criteria-first");
    await sleep(1200);
    const criteria = await evaluate(session, workspaceExpression);
    await capture(session, `${viewport.id}-workspace-criteria.png`);
    if (!criteriaClick.clicked || !criteria.candidateSearch) addFinding("P0", `WORKSPACE_CRITERIA_${viewport.id}`, "Criteria-first state did not expose Candidate Search.", { criteriaClick, criteria });

    let mapPicker = null;
    if (viewport.mobile) {
      await clickText(session, "Map-first");
      await sleep(800);
      const openMapClick = await clickText(session, "Open map");
      await sleep(1200);
      mapPicker = await evaluate(session, mapPickerExpression);
      await capture(session, `${viewport.id}-workspace-map-picker.png`);
      if (!openMapClick.clicked || !mapPicker.headerVisible || !mapPicker.back || !mapPicker.run) {
        addFinding("P0", `WORKSPACE_MAP_PICKER_${viewport.id}`, "Full-screen map picker or required controls are missing.", { openMapClick, mapPicker });
      } else if (!mapPicker.back.fullyInViewport || !mapPicker.run.fullyInViewport) {
        addFinding("P0", `WORKSPACE_MAP_PICKER_VIEWPORT_${viewport.id}`, "Map-picker controls are outside the viewport.", mapPicker);
      }
      await clickText(session, "Back to workflow");
      await sleep(400);
    }

    if (session.exceptions.length) addFinding("P1", `WORKSPACE_RUNTIME_${viewport.id}`, "Workspace produced runtime exceptions.", { count: session.exceptions.length });
    cases.push({
      id: `E-WORKSPACE-${viewport.id}`,
      viewport: viewport.id,
      route: "/workspace",
      common,
      initial,
      b2c,
      criteria,
      mapPicker,
      screenshots: [
        `${viewport.id}-workspace-initial.png`,
        `${viewport.id}-workspace-b2c.png`,
        `${viewport.id}-workspace-criteria.png`,
        ...(viewport.mobile ? [`${viewport.id}-workspace-map-picker.png`] : [])
      ]
    });
  } finally {
    await closePage(target, session);
  }
}

async function auditProjects(viewport) {
  const { target, session } = await createPage(viewport);
  try {
    await navigate(session, "/projects", true);
    const common = await evaluate(session, commonExpression);
    const collapsed = await evaluate(session, projectExpression);
    await capture(session, `${viewport.id}-projects-viewport.png`);
    await capture(session, `${viewport.id}-projects-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `PROJECTS_OVERFLOW_${viewport.id}`, "Project Hub has horizontal overflow.", common);
    if (!collapsed.title || !collapsed.selector || !collapsed.dataReadiness) addFinding("P0", `PROJECTS_REQUIRED_${viewport.id}`, "Project Hub is missing required controls or Data Readiness.", collapsed);
    if (collapsed.advancedOpen === true) addFinding("P1", `PROJECTS_ADVANCED_${viewport.id}`, "Advanced diagnostics are open by default.", collapsed);

    const advancedClick = await clickText(session, "Advanced project diagnostics", "includes");
    await sleep(1200);
    const expanded = await evaluate(session, projectExpression);
    await capture(session, `${viewport.id}-projects-advanced.png`);
    if (advancedClick.clicked && expanded.contradictoryLabels.length) addFinding("P1", `PROJECTS_STATUS_${viewport.id}`, "Project Hub exposes contradictory demo/pilot/access labels in advanced diagnostics.", expanded);
    if (session.exceptions.length) addFinding("P1", `PROJECTS_RUNTIME_${viewport.id}`, "Project Hub produced runtime exceptions.", { count: session.exceptions.length });
    cases.push({ id: `E-PROJECTS-${viewport.id}`, viewport: viewport.id, route: "/projects", common, collapsed, expanded, screenshots: [`${viewport.id}-projects-viewport.png`, `${viewport.id}-projects-full.png`, `${viewport.id}-projects-advanced.png`] });
  } finally {
    await closePage(target, session);
  }
}

async function auditReport(viewport, reportId, suffix) {
  const { target, session } = await createPage(viewport);
  try {
    const route = `/reports/${reportId}/print`;
    await navigate(session, route, true);
    const common = await evaluate(session, commonExpression);
    const details = await evaluate(session, reportExpression);
    await capture(session, `${viewport.id}-report-${suffix}-viewport.png`);
    await capture(session, `${viewport.id}-report-${suffix}-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `REPORT_OVERFLOW_${suffix}_${viewport.id}`, "Printable report has horizontal overflow.", common);
    if (!details.backControl || !details.printControl) addFinding("P0", `REPORT_CONTROLS_${suffix}_${viewport.id}`, "Printable report is missing Back or Print control.", details);
    if (suffix === "analysis" && details.scenarioEqualsTarget) addFinding("P1", `REPORT_SCENARIO_${viewport.id}`, "Analysis report Scenario repeats Selected target.", details);
    if (!details.schematicMapLabel) addFinding("P1", `REPORT_MAP_LABEL_${suffix}_${viewport.id}`, "Static report map is not labelled Schematic map context.", details);
    if (!details.demoScoreLabel) addFinding("P1", `REPORT_SCORE_LABEL_${suffix}_${viewport.id}`, "Report scores are not explicitly labelled as demo/model-assisted screening scores.", details);
    if (details.caveatOccurrences > 3) addFinding("P2", `REPORT_CAVEAT_DUPLICATION_${suffix}_${viewport.id}`, "The full mandatory caveat is repeated excessively.", details);
    if (session.exceptions.length) addFinding("P1", `REPORT_RUNTIME_${suffix}_${viewport.id}`, "Printable report produced runtime exceptions.", { count: session.exceptions.length });
    cases.push({ id: `E-REPORT-${suffix}-${viewport.id}`, viewport: viewport.id, route, common, details, screenshots: [`${viewport.id}-report-${suffix}-viewport.png`, `${viewport.id}-report-${suffix}-full.png`] });
  } finally {
    await closePage(target, session);
  }
}

function writeSummary(chromeExecutable) {
  const counts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
    return acc;
  }, {});
  const result = {
    ok: (counts.P0 ?? 0) === 0,
    method: "chrome_cdp_hydration_stable_v2",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    chromeExecutable,
    viewports: VIEWPORTS,
    counts: { P0: counts.P0 ?? 0, P1: counts.P1 ?? 0, P2: counts.P2 ?? 0 },
    cases,
    findings,
    caveat: CAVEAT
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "responsive-qa-summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  const lines = [
    "# GeoAI Responsive Visual QA Result",
    "",
    `- Method: ${result.method}`,
    `- Generated: ${result.generatedAt}`,
    `- Base URL: ${BASE_URL}`,
    `- Result: ${result.ok ? "PASS WITH RECORDED ISSUES" : "FAIL"}`,
    `- P0: ${result.counts.P0}`,
    `- P1: ${result.counts.P1}`,
    `- P2: ${result.counts.P2}`,
    "",
    "## Findings",
    ""
  ];
  if (!findings.length) lines.push("No findings.");
  else for (const finding of findings) lines.push(`- **${finding.severity} ${finding.code}** — ${finding.message}`);
  lines.push("", "## Caveat", "", CAVEAT, "");
  fs.writeFileSync(path.join(OUTPUT_DIR, "responsive-qa-summary.md"), lines.join("\n"));
  return result;
}

async function stopChrome(processHandle, profileDir) {
  processHandle.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => processHandle.once("exit", resolve)),
    sleep(4000)
  ]);
  try {
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  } catch (error) {
    console.warn(`Non-blocking Chrome profile cleanup warning: ${error.message}`);
  }
}

async function main() {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const chromeExecutable = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "geoai-responsive-chrome-v2-"));
  const logFd = fs.openSync(path.join(OUTPUT_DIR, "chrome.log"), "w");
  const processHandle = spawn(chromeExecutable, [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ], { stdio: ["ignore", logFd, logFd] });

  try {
    await waitForChrome(processHandle);
    for (const viewport of VIEWPORTS) {
      await auditLanding(viewport);
      await auditWorkspace(viewport);
      await auditProjects(viewport);
      if (viewport.id === "768x1024" || viewport.id === "1440x900") {
        await auditReport(viewport, "seeded-analysis-dubai-marina-report", "analysis");
      }
      if (viewport.id === "1440x900") {
        await auditReport(viewport, "seeded-comparison-dubai-shortlist-report", "comparison");
      }
    }
  } finally {
    await stopChrome(processHandle, profileDir);
    fs.closeSync(logFd);
  }

  const result = writeSummary(chromeExecutable);
  console.log(JSON.stringify({ ok: result.ok, method: result.method, counts: result.counts, cases: result.cases.length, output: path.relative(process.cwd(), OUTPUT_DIR) }, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "responsive-qa-fatal.txt"), `${error.stack ?? error.message}\n`);
  console.error(error);
  process.exit(1);
});

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
    this.eventBacklog = new Map();
    this.consoleEvents = [];
    this.exceptionEvents = [];
    this.logEvents = [];
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
      if (message.method === "Runtime.consoleAPICalled") this.consoleEvents.push(message.params);
      if (message.method === "Runtime.exceptionThrown") this.exceptionEvents.push(message.params);
      if (message.method === "Log.entryAdded") this.logEvents.push(message.params);
      const methodWaiters = this.waiters.get(message.method);
      if (methodWaiters?.length) {
        const waiter = methodWaiters.shift();
        clearTimeout(waiter.timer);
        waiter.resolve(message.params);
      } else {
        const backlog = this.eventBacklog.get(message.method) ?? [];
        backlog.push(message.params);
        this.eventBacklog.set(message.method, backlog);
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

  send(method, params = {}, timeoutMs = 20000) {
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

  waitForEvent(method, timeoutMs = 20000) {
    const backlog = this.eventBacklog.get(method);
    if (backlog?.length) return Promise.resolve(backlog.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const methodWaiters = this.waiters.get(method) ?? [];
        this.waiters.set(method, methodWaiters.filter((item) => item.resolve !== resolve));
        reject(new Error(`${method} event timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
      const methodWaiters = this.waiters.get(method) ?? [];
      methodWaiters.push({ resolve, reject, timer });
      this.waiters.set(method, methodWaiters);
    });
  }

  close() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.close();
  }
}

async function waitForChrome(chromeProcess) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (chromeProcess.exitCode !== null) throw new Error(`Chrome exited with code ${chromeProcess.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

async function createPage(viewport) {
  const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT"
  });
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
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: viewport.mobile,
    maxTouchPoints: viewport.mobile ? 5 : 1
  });
  return { target, session };
}

async function closePage(target, session) {
  session.close();
  try {
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${target.id}`);
  } catch {
    // Target cleanup must not hide QA evidence.
  }
}

async function evaluate(session, expression) {
  const response = await session.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? "Runtime evaluation failed.");
  }
  return response.result?.value;
}

async function navigate(session, url) {
  const load = session.waitForEvent("Page.loadEventFired", 30000).catch(() => null);
  await session.send("Page.navigate", { url }, 30000);
  await load;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await evaluate(session, "document.readyState");
    if (ready === "complete" || ready === "interactive") break;
    await sleep(250);
  }
  await sleep(1400);
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

const commonMetricsExpression = `(() => {
  const root = document.documentElement;
  return {
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    scrollHeight: root.scrollHeight,
    horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
    bodyText: document.body?.innerText?.slice(0, 30000) ?? ""
  };
})()`;

const landingAuditExpression = `(() => {
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const hero = document.querySelector("main section");
  const ctas = [...(hero?.querySelectorAll("a,button") ?? [])]
    .filter(visible)
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  const headings = [...document.querySelectorAll("h1")].filter(visible).map((el) => el.textContent.trim());
  const visibleCaveat = [...document.querySelectorAll("p,div,span")]
    .filter(visible)
    .some((el) => el.textContent.includes("Screening hypothesis") && el.textContent.includes("official validation required"));
  return { ctas, headings, visibleCaveat };
})()`;

const workspaceAuditExpression = `(() => {
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
    const value = el.textContent.trim();
    return mode === "includes" ? value.includes(text) : value === text;
  });
  const selectByLabel = (text) => [...document.querySelectorAll("label")].find((label) => label.textContent.trim().startsWith(text))?.querySelector("select");
  const scenarioSetup = byText("summary", "Scenario setup", "includes");
  const candidateSearch = byText("p,span,h2,h3", "Candidate Search");
  const customQueryLabel = byText("label", "Custom Query");
  const textarea = document.querySelector("#custom-query");
  const primary = [...document.querySelectorAll("button")].filter((el) => visible(el) && el.textContent.trim() === "Run Express Analysis");
  const visibleCaveats = [...document.querySelectorAll("p,div,span")]
    .filter(visible)
    .filter((el) => el.textContent.includes("Screening hypothesis") && el.textContent.includes("official validation required"));
  const detailsControl = [...document.querySelectorAll("aside button,aside a")].find((el) => visible(el) && el.textContent.trim() === "Details");
  const openMap = byText("button", "Open map");
  const scenarioSelect = selectByLabel("Scenario");
  const roleSelect = selectByLabel("Role");
  return {
    scenarioSetup: rect(scenarioSetup),
    candidateSearch: rect(candidateSearch),
    customQueryLabel: rect(customQueryLabel),
    customQueryTextarea: rect(textarea),
    primaryButtons: primary.map(rect),
    primaryVisibleInViewport: primary.some((el) => rect(el)?.fullyInViewport),
    visibleCaveatCount: visibleCaveats.length,
    detailsPresent: Boolean(detailsControl),
    openMap: rect(openMap),
    scenarioValues: scenarioSelect ? [...scenarioSelect.options].map((option) => option.value) : [],
    roleValues: roleSelect ? [...roleSelect.options].map((option) => option.value) : []
  };
})()`;

const projectAuditExpression = `(() => {
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const bodyText = document.body?.innerText ?? "";
  const advanced = [...document.querySelectorAll("details")].find((el) => el.textContent.includes("Advanced project diagnostics"));
  return {
    projectHubTitle: [...document.querySelectorAll("h1")].some((el) => visible(el) && el.textContent.trim() === "Project Hub"),
    projectSelector: Boolean(document.querySelector("#project-dashboard-selector")),
    dataReadiness: bodyText.includes("Data Readiness / Source Lineage"),
    advancedOpen: advanced?.open ?? null,
    contradictoryLabels: ["Sample pilot", "Public sample access is disabled", "Pilot access"].filter((text) => bodyText.includes(text))
  };
})()`;

const reportAuditExpression = `(() => {
  const bodyText = document.body?.innerText ?? "";
  const cards = [...document.querySelectorAll(".geoai-print-card")];
  const cardValue = (label) => {
    const card = cards.find((el) => el.querySelector("span")?.textContent.trim() === label);
    return card?.querySelector("strong")?.textContent.trim() ?? null;
  };
  const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
  return {
    selectedTarget: cardValue("Selected target"),
    scenario: cardValue("Scenario"),
    scenarioEqualsTarget: cardValue("Scenario") && cardValue("Scenario") === cardValue("Selected target"),
    schematicMapLabel: bodyText.includes("Schematic map context"),
    demoScoreLabel: bodyText.includes("Demo deterministic score") || bodyText.includes("Model-assisted screening score"),
    caveatOccurrences: bodyText.split(caveat).length - 1,
    backControl: bodyText.includes("Back"),
    printControl: bodyText.includes("Print / Save as PDF")
  };
})()`;

async function clickText(session, text) {
  return evaluate(session, `(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const element = [...document.querySelectorAll("button,a,summary")].find((el) => visible(el) && el.textContent.trim() === ${JSON.stringify(text)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
}

async function auditLanding(viewport) {
  const { target, session } = await createPage(viewport);
  try {
    await navigate(session, `${BASE_URL}/`);
    const common = await evaluate(session, commonMetricsExpression);
    const landing = await evaluate(session, landingAuditExpression);
    await capture(session, `${viewport.id}-landing-viewport.png`);
    await capture(session, `${viewport.id}-landing-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `LANDING_OVERFLOW_${viewport.id}`, "Landing has horizontal overflow.", common);
    if (!landing.headings.length) addFinding("P0", `LANDING_H1_${viewport.id}`, "Landing has no visible H1.", landing);
    if (landing.ctas.length < 2) addFinding("P1", `LANDING_CTA_${viewport.id}`, "Landing hero exposes fewer than two visible actions.", landing);
    if (!landing.visibleCaveat) addFinding("P0", `LANDING_CAVEAT_${viewport.id}`, "Landing has no visible screening caveat.", landing);
    if (session.exceptionEvents.length) addFinding("P1", `LANDING_RUNTIME_${viewport.id}`, "Landing produced runtime exceptions.", { count: session.exceptionEvents.length });
    cases.push({ id: `E-LANDING-${viewport.id}`, route: "/", viewport: viewport.id, common, details: landing, screenshots: [`${viewport.id}-landing-viewport.png`, `${viewport.id}-landing-full.png`] });
  } finally {
    await closePage(target, session);
  }
}

async function auditWorkspace(viewport) {
  const { target, session } = await createPage(viewport);
  try {
    await navigate(session, `${BASE_URL}/workspace`);
    const common = await evaluate(session, commonMetricsExpression);
    let workspace = await evaluate(session, workspaceAuditExpression);
    await capture(session, `${viewport.id}-workspace-initial.png`);

    if (common.horizontalOverflow) addFinding("P0", `WORKSPACE_OVERFLOW_${viewport.id}`, "Workspace has horizontal overflow.", common);
    if (workspace.detailsPresent) addFinding("P0", `WORKSPACE_DETAILS_${viewport.id}`, "Project Details control is present.", workspace);
    if (!workspace.scenarioSetup || !workspace.candidateSearch || !workspace.customQueryLabel || !workspace.customQueryTextarea) {
      addFinding("P0", `WORKSPACE_REQUIRED_CONTROLS_${viewport.id}`, "One or more required setup controls are missing.", workspace);
    } else if (!(workspace.scenarioSetup.top < workspace.candidateSearch.top && workspace.candidateSearch.top < workspace.customQueryLabel.top)) {
      addFinding("P0", `WORKSPACE_ORDER_${viewport.id}`, "Workspace setup controls are not in the required order.", workspace);
    }
    if (!workspace.primaryVisibleInViewport) addFinding("P0", `WORKSPACE_PRIMARY_${viewport.id}`, "No Run Express Analysis action is visible in the viewport.", workspace);
    if (viewport.mobile && !workspace.customQueryTextarea?.fullyInViewport) addFinding("P1", `WORKSPACE_QUERY_FOLD_${viewport.id}`, "Custom Query textarea is not fully visible in the initial viewport.", workspace.customQueryTextarea);
    if (workspace.primaryButtons.length > 1) addFinding("P1", `WORKSPACE_DUPLICATE_PRIMARY_${viewport.id}`, "More than one visible Run Express Analysis action exists.", { buttons: workspace.primaryButtons });
    if (workspace.visibleCaveatCount === 0) addFinding("P1", `WORKSPACE_CAVEAT_${viewport.id}`, "No compact screening caveat is visibly rendered in the initial state.", workspace);
    if (viewport.width === 1366 && workspace.openMap) addFinding("P1", "WORKSPACE_OPEN_MAP_1366", "Open map is visible at the required 1366px desktop viewport.", workspace.openMap);
    if (viewport.mobile && !workspace.openMap) addFinding("P0", `WORKSPACE_OPEN_MAP_${viewport.id}`, "Open map action is missing on a narrow viewport.", workspace);

    const b2cClicked = await clickText(session, "B2C");
    await sleep(450);
    const b2cState = await evaluate(session, workspaceAuditExpression);
    await capture(session, `${viewport.id}-workspace-b2c.png`);
    if (!b2cClicked || !b2cState.scenarioValues.length || b2cState.scenarioValues.some((value) => value.startsWith("b2b_"))) {
      addFinding("P0", `WORKSPACE_B2C_LEAK_${viewport.id}`, "B2C state is missing or exposes B2B scenarios.", b2cState);
    }
    await clickText(session, "B2B");
    await sleep(350);

    const criteriaClicked = await clickText(session, "Criteria-first");
    await sleep(450);
    const criteriaText = await evaluate(session, "document.body?.innerText ?? ''");
    await capture(session, `${viewport.id}-workspace-criteria.png`);
    if (!criteriaClicked || !criteriaText.includes("Candidate Search")) {
      addFinding("P0", `WORKSPACE_CRITERIA_${viewport.id}`, "Criteria-first state did not expose Candidate Search.", { criteriaClicked });
    }
    await clickText(session, "Map-first");
    await sleep(300);

    let mapPicker = null;
    if (viewport.mobile) {
      const mapClicked = await clickText(session, "Open map");
      await sleep(700);
      mapPicker = await evaluate(session, `(() => {
        const visible = (el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const data = {};
        for (const text of ["Back to workflow", "Run Express Analysis"]) {
          const el = [...document.querySelectorAll("button,a")].find((node) => visible(node) && node.textContent.trim() === text);
          const r = el?.getBoundingClientRect();
          data[text] = r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, fullyInViewport: r.top >= 0 && r.bottom <= innerHeight } : null;
        }
        return data;
      })()`);
      await capture(session, `${viewport.id}-workspace-map-picker.png`);
      if (!mapClicked || !mapPicker["Back to workflow"] || !mapPicker["Run Express Analysis"]) {
        addFinding("P0", `WORKSPACE_MAP_PICKER_${viewport.id}`, "Full-screen map picker controls are missing.", { mapClicked, mapPicker });
      } else if (!mapPicker["Back to workflow"].fullyInViewport || !mapPicker["Run Express Analysis"].fullyInViewport) {
        addFinding("P0", `WORKSPACE_MAP_PICKER_VIEWPORT_${viewport.id}`, "Map picker controls are outside the viewport.", mapPicker);
      }
      await clickText(session, "Back to workflow");
      await sleep(250);
    }

    workspace = await evaluate(session, workspaceAuditExpression);
    if (session.exceptionEvents.length) addFinding("P1", `WORKSPACE_RUNTIME_${viewport.id}`, "Workspace produced runtime exceptions.", { count: session.exceptionEvents.length });
    cases.push({
      id: `E-WORKSPACE-${viewport.id}`,
      route: "/workspace",
      viewport: viewport.id,
      common,
      details: workspace,
      b2cState,
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
    await navigate(session, `${BASE_URL}/projects`);
    const common = await evaluate(session, commonMetricsExpression);
    const project = await evaluate(session, projectAuditExpression);
    await capture(session, `${viewport.id}-projects-viewport.png`);
    await capture(session, `${viewport.id}-projects-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `PROJECTS_OVERFLOW_${viewport.id}`, "Project Hub has horizontal overflow.", common);
    if (!project.projectHubTitle || !project.projectSelector || !project.dataReadiness) addFinding("P0", `PROJECTS_REQUIRED_${viewport.id}`, "Project Hub is missing required top-level controls or Data Readiness.", project);
    if (project.advancedOpen === true) addFinding("P1", `PROJECTS_DIAGNOSTICS_${viewport.id}`, "Advanced diagnostics are open by default.", project);
    if (project.contradictoryLabels.length) addFinding("P1", `PROJECTS_STATUS_${viewport.id}`, "Project Hub contains readiness/access labels that conflict with canonical runtime state.", project);
    if (session.exceptionEvents.length) addFinding("P1", `PROJECTS_RUNTIME_${viewport.id}`, "Project Hub produced runtime exceptions.", { count: session.exceptionEvents.length });
    cases.push({ id: `E-PROJECTS-${viewport.id}`, route: "/projects", viewport: viewport.id, common, details: project, screenshots: [`${viewport.id}-projects-viewport.png`, `${viewport.id}-projects-full.png`] });
  } finally {
    await closePage(target, session);
  }
}

async function auditReport(viewport, id, suffix) {
  const { target, session } = await createPage(viewport);
  try {
    const route = `/reports/${id}/print`;
    await navigate(session, `${BASE_URL}${route}`);
    const common = await evaluate(session, commonMetricsExpression);
    const report = await evaluate(session, reportAuditExpression);
    await capture(session, `${viewport.id}-report-${suffix}-viewport.png`);
    await capture(session, `${viewport.id}-report-${suffix}-full.png`, true);
    if (common.horizontalOverflow) addFinding("P0", `REPORT_OVERFLOW_${suffix}_${viewport.id}`, "Printable report has horizontal overflow.", common);
    if (!report.backControl || !report.printControl) addFinding("P0", `REPORT_CONTROLS_${suffix}_${viewport.id}`, "Printable route is missing Back or Print control.", report);
    if (suffix === "analysis" && report.scenarioEqualsTarget) addFinding("P1", `REPORT_SCENARIO_${viewport.id}`, "Analysis report Scenario repeats Selected target.", report);
    if (!report.schematicMapLabel) addFinding("P1", `REPORT_MAP_LABEL_${suffix}_${viewport.id}`, "Static report map is not labelled Schematic map context.", report);
    if (!report.demoScoreLabel) addFinding("P1", `REPORT_SCORE_LABEL_${suffix}_${viewport.id}`, "Report scores are not explicitly labelled as demo/model-assisted screening scores.", report);
    if (report.caveatOccurrences > 3) addFinding("P2", `REPORT_CAVEAT_DUPLICATION_${suffix}_${viewport.id}`, "The full mandatory caveat is repeated excessively.", report);
    if (session.exceptionEvents.length) addFinding("P1", `REPORT_RUNTIME_${suffix}_${viewport.id}`, "Printable report produced runtime exceptions.", { count: session.exceptionEvents.length });
    cases.push({ id: `E-REPORT-${suffix}-${viewport.id}`, route, viewport: viewport.id, common, details: report, screenshots: [`${viewport.id}-report-${suffix}-viewport.png`, `${viewport.id}-report-${suffix}-full.png`] });
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

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const chromeExecutable = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "geoai-responsive-chrome-"));
  const chromeLog = path.join(OUTPUT_DIR, "chrome.log");
  const logFd = fs.openSync(chromeLog, "w");
  const chromeProcess = spawn(chromeExecutable, [
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
    await waitForChrome(chromeProcess);
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
    chromeProcess.kill("SIGTERM");
    fs.closeSync(logFd);
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const result = writeSummary(chromeExecutable);
  console.log(JSON.stringify({ ok: result.ok, counts: result.counts, cases: result.cases.length, output: path.relative(process.cwd(), OUTPUT_DIR) }, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "responsive-qa-fatal.txt"), `${error.stack ?? error.message}\n`);
  console.error(error);
  process.exit(1);
});

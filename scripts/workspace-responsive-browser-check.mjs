import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE_URL = process.env.GEOAI_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const CHROME_PORT = Number(process.env.GEOAI_CHROME_PORT ?? 9231);
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "workspace-responsive-fix");

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error(`Chrome executable not found: ${candidates.join(", ")}`);
  return executable;
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async open() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
      if (message.id) {
        const item = this.pending.get(message.id);
        if (!item) return;
        this.pending.delete(message.id);
        clearTimeout(item.timer);
        if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
        else item.resolve(message.result ?? {});
        return;
      }
      if (!message.method) return;
      const waiters = this.events.get(message.method) ?? [];
      if (waiters.length) {
        const waiter = waiters.shift();
        clearTimeout(waiter.timer);
        waiter.resolve(message.params);
        this.events.set(message.method, waiters);
      }
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Chrome WebSocket open timeout")), 10000);
      this.socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("Chrome WebSocket error"));
      }, { once: true });
    });
  }

  send(method, params = {}, timeoutMs = 20000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timeout`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  wait(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} event timeout`)), timeoutMs);
      const waiters = this.events.get(method) ?? [];
      waiters.push({ resolve, reject, timer });
      this.events.set(method, waiters);
    });
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close();
  }
}

async function waitForChrome(processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`Chrome exited with ${processHandle.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready");
}

async function createPage(width, height, mobile) {
  const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?about%3Ablank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target: ${response.status}`);
  const target = await response.json();
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  return { target, cdp };
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? "Evaluation failed");
  return response.result?.value;
}

async function navigate(cdp, route) {
  const loaded = cdp.wait("Page.loadEventFired").catch(() => null);
  await cdp.send("Page.navigate", { url: `${BASE_URL}${route}` }, 30000);
  await loaded;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await evaluate(cdp, `(() => ({
      state: document.readyState,
      hasQuery: Boolean(document.querySelector("#custom-query")),
      text: document.body?.innerText?.includes("Custom Query")
    }))()`);
    if ((ready.state === "complete" || ready.state === "interactive") && ready.hasQuery && ready.text) break;
    await sleep(250);
  }
  await sleep(1800);
}

async function capture(cdp, filename) {
  const image = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(image.data, "base64"));
}

const metricsExpression = `(() => {
  const visible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
  };
  const intersects = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const textarea = document.querySelector("#custom-query");
  const footer = document.querySelector("aside > section.sticky.bottom-0");
  const compare = footer ? [...footer.querySelectorAll("button")].find((button) => button.textContent.trim() === "Add to compare") : null;
  const openMapButtons = [...document.querySelectorAll("button")].filter((button) => button.textContent.trim() === "Open map" && visible(button));
  const textareaRect = rect(textarea);
  const footerRect = rect(footer);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    textareaVisible: visible(textarea),
    textareaRect,
    footerRect,
    textareaFooterOverlap: intersects(textareaRect, footerRect),
    compareVisible: visible(compare),
    compareDisabled: Boolean(compare?.disabled),
    openMapVisibleCount: openMapButtons.length
  };
})()`;

async function auditViewport(viewport) {
  const { target, cdp } = await createPage(viewport.width, viewport.height, viewport.mobile);
  try {
    await navigate(cdp, "/workspace");
    const metrics = await evaluate(cdp, metricsExpression);
    await capture(cdp, `${viewport.id}-workspace.png`);
    return { viewport: viewport.id, ...metrics };
  } finally {
    cdp.close();
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${target.id}`).catch(() => null);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "geoai-workspace-responsive-"));
  const chromeLog = path.join(OUTPUT_DIR, "chrome.log");
  const logFd = fs.openSync(chromeLog, "w");
  const chrome = spawn(findChrome(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: ["ignore", logFd, logFd] });

  let results;
  try {
    await waitForChrome(chrome);
    results = [];
    for (const viewport of [
      { id: "390x844", width: 390, height: 844, mobile: true },
      { id: "430x932", width: 430, height: 932, mobile: true },
      { id: "768x1024", width: 768, height: 1024, mobile: true },
      { id: "1366x768", width: 1366, height: 768, mobile: false },
      { id: "1440x900", width: 1440, height: 900, mobile: false }
    ]) {
      results.push(await auditViewport(viewport));
    }
  } finally {
    chrome.kill("SIGTERM");
    await new Promise((resolve) => {
      if (chrome.exitCode !== null) return resolve();
      chrome.once("exit", resolve);
      setTimeout(resolve, 3000);
    });
    fs.closeSync(logFd);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
        break;
      } catch {
        await sleep(250);
      }
    }
  }

  const failures = [];
  const byId = Object.fromEntries(results.map((item) => [item.viewport, item]));
  for (const item of results) {
    if (item.horizontalOverflow) failures.push(`${item.viewport}: horizontal overflow`);
    if (!item.textareaVisible) failures.push(`${item.viewport}: Custom Query textarea missing`);
  }
  for (const id of ["390x844", "430x932"]) {
    if (byId[id].textareaFooterOverlap) failures.push(`${id}: sticky footer overlaps Custom Query textarea`);
    if (byId[id].compareDisabled && byId[id].compareVisible) failures.push(`${id}: unavailable Add to compare remains visible`);
  }
  if (byId["768x1024"].openMapVisibleCount < 1) failures.push("768x1024: Open map should remain visible");
  for (const id of ["1366x768", "1440x900"]) {
    if (byId[id].openMapVisibleCount !== 0) failures.push(`${id}: Open map should be hidden in split layout`);
  }

  const output = {
    ok: failures.length === 0,
    method: "focused_headless_cdp_workspace_responsive_check",
    baseUrl: BASE_URL,
    results,
    failures,
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "result.json"), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "fatal.txt"), `${error.stack ?? error.message}\n`);
  console.error(error);
  process.exit(1);
});

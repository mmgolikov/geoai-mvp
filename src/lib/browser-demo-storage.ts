export const browserDemoStorageNamespace = "geoai-public-demo-v2";

const legacyBrowserDemoStorageKeys = [
  "geoai-active-project-key-v1",
  "geoai-active-project-segment-v1",
  "geoai-analysis-history-v1",
  "geoai-aoi-library-v1",
  "geoai-browser-project-artifacts-v1",
  "geoai-local-projects-v1",
  "geoai-open-analysis-request-v1",
  "geoai-uploaded-datasets-v1"
] as const;

const legacyBrowserDemoStoragePrefixes = ["geoai-print-report:"] as const;

export function isBrowserDemoStorageEnabled() {
  const requestedMode = process.env.NEXT_PUBLIC_AUTH_MODE?.trim();
  return !requestedMode || requestedMode === "demo_public";
}

export function browserDemoStorageKey(name: string) {
  return `${browserDemoStorageNamespace}:${name}`;
}

export function clearBrowserDemoStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(
          key?.startsWith(`${browserDemoStorageNamespace}:`) ||
          legacyBrowserDemoStoragePrefixes.some((prefix) => key?.startsWith(prefix))
        ));
      for (const key of [...keys, ...legacyBrowserDemoStorageKeys]) storage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. The Auth
    // runtime already fails closed and never reads this demo namespace.
  }
}

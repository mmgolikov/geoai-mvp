export const browserDemoStorageNamespace = "geoai-public-demo-v2";
export const mockDemoBrowserSessionKey = "geoai-mock-demo-session-v1";

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

const pointObjectTransientSessionKeys = [
  "geoai:point-to-object:selection:v3",
  "geoai:point-to-object:question:v2",
  "geoai:point-to-object:analysis-draft:v1",
  "geoai:point-to-object:analysis:v8",
  "geoai:point-to-object:analysis:v7",
  "geoai:point-to-object:find:v1",
  "geoai:point-to-object:project-restore:v1",
  "geoai:point-to-object:project-overview:v1",
  "geoai:point-to-object:analysis-restore:v1"
] as const;

export function isBrowserDemoStorageEnabled() {
  const requestedMode = process.env.NEXT_PUBLIC_AUTH_MODE?.trim();
  if (!requestedMode || requestedMode === "demo_public") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(mockDemoBrowserSessionKey) === "active";
  } catch {
    return false;
  }
}

export function browserDemoStorageKey(name: string) {
  return `${browserDemoStorageNamespace}:${name}`;
}

export function clearBrowserDemoStorage(options: { reason?: "startup" } = {}) {
  if (typeof window === "undefined") return;
  try {
    const identityKey = "geoai:point-to-object:browser-identity:v1";
    const previousIdentity = window.localStorage.getItem(identityKey);
    const previousMockSession = window.localStorage.getItem(mockDemoBrowserSessionKey);
    let hadDemoData = false;
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(
          key?.startsWith(`${browserDemoStorageNamespace}:`) ||
          legacyBrowserDemoStoragePrefixes.some((prefix) => key?.startsWith(prefix))
        ));
      for (const key of [...keys, ...legacyBrowserDemoStorageKeys]) {
        if (storage.getItem(key) !== null) hadDemoData = true;
        storage.removeItem(key);
      }
    }
    // Startup removes demo namespaces, not an anonymous screening session.
    // Keep a valid account marker until resolved-identity reconciliation can
    // compare it; erasing it first would hide an account switch from that guard.
    const validAccountIdentity = previousIdentity !== null && /^user:[A-Za-z0-9_-]{1,128}$/.test(previousIdentity);
    const anonymousWithoutDemoOwnership = previousIdentity === null && previousMockSession === null && !hadDemoData;
    const preserveForReconciliation = options.reason === "startup" && previousMockSession === null &&
      (validAccountIdentity || anonymousWithoutDemoOwnership);
    if (!preserveForReconciliation) {
      for (const key of pointObjectTransientSessionKeys) window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(identityKey);
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. The Auth
    // runtime already fails closed and never reads this demo namespace.
  }
}

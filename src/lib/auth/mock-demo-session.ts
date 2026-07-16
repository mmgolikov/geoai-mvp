import { mockDemoBrowserSessionKey } from "@/src/lib/browser-demo-storage";

export const mockDemoEmail = "demo@geoai.space";
export const mockDemoPassword = "111111";

export function matchesMockDemoCredentials(email: string, password: string) {
  return email.trim().toLowerCase() === mockDemoEmail && password === mockDemoPassword;
}

export function isMockDemoSessionActive() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(mockDemoBrowserSessionKey) === "active";
  } catch {
    return false;
  }
}

export function activateMockDemoSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(mockDemoBrowserSessionKey, "active");
  } catch {
    // The demo can still be used for the current in-memory session when
    // browser storage is unavailable.
  }
}

export function clearMockDemoSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(mockDemoBrowserSessionKey);
  } catch {
    // A storage-restricted browser will lose the in-memory session on reload.
  }
}

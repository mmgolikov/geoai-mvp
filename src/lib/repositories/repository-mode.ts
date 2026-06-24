export type RepositoryMode =
  | "supabase"
  | "local_fallback"
  | "browser_local"
  | "demo_seed"
  | "disabled";

const localFallbackCaveat = "Local/API fallback is not durable production storage.";
const browserLocalCaveat = "Browser-local storage is for demo continuity only.";
const demoSeedCaveat = "Demo seed records are sample context and require validation.";

export function repositoryModeToLabel(mode: RepositoryMode): string {
  switch (mode) {
    case "supabase":
      return "Supabase/PostGIS";
    case "local_fallback":
      return "Local/API fallback";
    case "browser_local":
      return "Browser-local demo";
    case "demo_seed":
      return "Demo seed";
    case "disabled":
      return "Not configured";
  }
}

export function repositoryModeToCaveat(mode: RepositoryMode): string {
  switch (mode) {
    case "supabase":
      return "Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.";
    case "local_fallback":
      return localFallbackCaveat;
    case "browser_local":
      return browserLocalCaveat;
    case "demo_seed":
      return demoSeedCaveat;
    case "disabled":
      return "Repository mode is not configured.";
  }
}

export function normalizeRepositoryMode(input: unknown): RepositoryMode {
  if (typeof input !== "string") return "disabled";

  const normalized = input.trim().toLowerCase().replace(/-/g, "_");

  switch (normalized) {
    case "supabase":
    case "db":
      return "supabase";
    case "local_fallback":
    case "local_only":
      return "local_fallback";
    case "browser_local":
    case "browser_only":
      return "browser_local";
    case "demo_seed":
    case "local_demo":
    case "seed":
    case "demo":
      return "demo_seed";
    default:
      return "disabled";
  }
}

export function isDurableRepositoryMode(mode: RepositoryMode): boolean {
  return mode === "supabase";
}

export function isDemoRepositoryMode(mode: RepositoryMode): boolean {
  return mode === "local_fallback" || mode === "browser_local" || mode === "demo_seed";
}

export function repositoryModeFields(mode: RepositoryMode): { mode: RepositoryMode; storageCaveat: string } {
  return {
    mode,
    storageCaveat: repositoryModeToCaveat(mode)
  };
}

export const localFallbackStorageCaveat = localFallbackCaveat;

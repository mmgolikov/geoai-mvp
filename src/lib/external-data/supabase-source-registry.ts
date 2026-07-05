export async function getSourceRegistryReadiness() {
  return {
    mode: "local_fallback",
    source: "placeholder",
    sourceRegistryCount: 0,
    externalSnapshotCount: 0,
    sources: [],
    manifest: { generatedAt: null, version: "1.7", summary: "Pending implementation", sources: [] },
    readiness: [],
    blockers: [],
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    generatedAt: new Date().toISOString()
  };
}

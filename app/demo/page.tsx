import Link from "next/link";
import { TopNavigation } from "@/components/top-navigation";
import { demoNarratives } from "@/src/data/demo-narratives";
import { getClientPilotPackageById } from "@/src/data/pilot-packages";

function buildWorkspaceHref(narrativeId: string, projectKey: string) {
  return `/workspace?demoNarrativeId=${encodeURIComponent(narrativeId)}&projectId=${encodeURIComponent(projectKey)}`;
}

export default function DemoNarrativePage() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-ink">
      <TopNavigation />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Guided investor demo</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">
              GeoAI Investor Demo Narrative
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted">
              Data-ready spatial decision intelligence for Dubai real estate and asset decisions.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Use these guided stories to present GeoAI as a decision workflow: buyer question, selected site, evidence status, memo output and pilot bridge. Current outputs remain demo/screening context and require official validation.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {demoNarratives.map((narrative) => {
            const pilotPackage = getClientPilotPackageById(narrative.id);

            return (
              <article key={narrative.id} className="flex h-full min-h-[430px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{narrative.buyerType}</p>
                    <h2 className="mt-2 text-xl font-semibold leading-7 text-ink">{narrative.title}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                    {pilotPackage?.duration ?? "pilot"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 text-sm leading-6">
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Decision question</p>
                    <p className="mt-1 text-ink">{narrative.decisionQuestion}</p>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Demo promise</p>
                    <p className="mt-1 text-muted">{narrative.demoPromise}</p>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Management output</p>
                    <p className="mt-1 text-muted">{narrative.managementOutput.slice(0, 3).join(" / ")}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2 pt-5">
                  <Link
                    href={buildWorkspaceHref(narrative.id, narrative.projectKey)}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
                  >
                    Start demo
                  </Link>
                  <Link
                    href={`/projects?projectKey=${encodeURIComponent(narrative.projectKey)}`}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
                  >
                    Open project dashboard
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">How to present this demo</p>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-muted">
              <li><span className="font-semibold text-ink">1.</span> Start with the buyer decision question, not the map.</li>
              <li><span className="font-semibold text-ink">2.</span> Select the prepared site or asset and point out source confidence.</li>
              <li><span className="font-semibold text-ink">3.</span> Run Express Analysis and explain the memo as a screening hypothesis.</li>
              <li><span className="font-semibold text-ink">4.</span> Compare alternatives to show prioritization and trade-offs.</li>
              <li><span className="font-semibold text-ink">5.</span> Close with the pilot package and validation requirements.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Current data state</p>
            <div className="mt-4 grid gap-3 text-sm leading-6">
              {[
                ["DLD / Dubai Pulse", "snapshot available / 5 sample market-area records"],
                ["OSM / Geofabrik", "open snapshot available / sample baseline features"],
                ["Open-Meteo", "screening-level climate API context with fallback"],
                ["GeoDubai / Municipality", "planned validation path only"],
                ["Copernicus / Sentinel", "planned metadata path only"]
              ].map(([label, status]) => (
                <div key={label} className="flex items-start justify-between gap-4 rounded-md bg-surface p-3">
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="max-w-[260px] text-right text-muted">{status}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Required caveat: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

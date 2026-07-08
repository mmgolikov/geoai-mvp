import Link from "next/link";
import { LandingHeroMap } from "@/components/landing-hero-map";
import { TopNavigation } from "@/components/top-navigation";
import { LandingFeatureCard, StatusChip, ValidationCaveat } from "@/components/ui-v22-primitives";

const productStrip = [
  ["Select target", "Choose a map target, AOI or criteria."],
  ["Choose scenario", "Pick the screening question and role context."],
  ["Compare candidates", "Rank searched zones and trade-offs."],
  ["Open dashboard", "Review KPIs, risks and next actions."],
  ["Export report", "Package the current result for review."]
];

const decisionLayers = [
  ["Market", "Demand, liquidity and pipeline proxy context."],
  ["Access", "Road, corridor, catchment and infrastructure signals."],
  ["Planning", "Land-use and feasibility checks to validate."],
  ["Risk", "Climate, delivery and evidence-maturity constraints."]
];

const outputCards = [
  ["Ranked shortlist", "Compare screened candidate zones without making official suitability claims."],
  ["Decision dashboard", "Review score, posture, drivers, risks and next action in one workspace."],
  ["Source basis", "Keep evidence, source readiness and validation gaps adjacent to outputs."],
  ["Report package", "Export decision-support memos with caveats and source lineage."]
];

function ProductVisual() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-white/95 shadow-soft backdrop-blur">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,93,140,0.10)_1px,transparent_1px),linear-gradient(rgba(35,93,140,0.10)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute left-[9%] top-[15%] h-[54%] w-[68%] rotate-[-4deg] rounded-[40%] border border-signal-blue/55 bg-signal-blue/10" />
      <div className="absolute right-[14%] top-[18%] h-16 w-16 rounded-full border-[10px] border-white bg-brand shadow-soft">
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-validation-gold" />
      </div>
      <div className="absolute bottom-[20%] left-[12%] rounded-md border border-line bg-white/95 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AOI selected</p>
        <p className="mt-1 text-sm font-semibold text-ink">Business Bay waterfront</p>
        <p className="mt-2 max-w-[220px] text-xs leading-5 text-muted">Public/open context; official validation required.</p>
      </div>
      <div className="absolute right-[8%] top-[38%] w-[270px] rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Suitability</p>
            <p className="mt-2 text-4xl font-semibold text-brand">78</p>
          </div>
          <StatusChip tone="validation">Conditional</StatusChip>
        </div>
        <div className="mt-4 grid gap-2">
          {[
            ["Access", "High"],
            ["Market signal", "Medium"],
            ["Validation gap", "Open"]
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md bg-surface px-3 py-2 text-xs">
              <span className="truncate text-muted">{label}</span>
              <span className="font-semibold text-ink">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-[8%] right-[8%] w-[320px] rounded-md border border-validation-gold/40 bg-validation-soft px-4 py-3 text-xs leading-5 text-[#6F5817]">
        Evidence/source-backed validation block. Screening hypothesis; official validation required.
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <TopNavigation />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0">
          <LandingHeroMap />
        </div>
        <div className="absolute inset-0 bg-white/82" />

        <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">
              Spatial decision intelligence
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
              GeoAI spatial decision intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
              Scenario-first map intelligence for real estate, development, infrastructure and asset screening.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Select a site or define criteria, compare candidate zones, run AI-assisted screening and generate decision-support reports.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-hover"
              >
                Open workspace
              </Link>
              <Link
                href="/projects"
                className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-white/95 px-6 text-sm font-semibold text-ink transition hover:border-brand"
              >
                View projects
              </Link>
            </div>
            <div className="mt-4 max-w-2xl">
              <ValidationCaveat compact>
                Screening hypothesis; official validation required.
              </ValidationCaveat>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <StatusChip tone="blue">Map-first</StatusChip>
              <span>to dashboard</span>
              <span>to report</span>
            </div>
          </div>

          <ProductVisual />
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
          {productStrip.map(([title, text], index) => (
            <LandingFeatureCard key={title} index={index} title={title} text={text} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Decision intelligence</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">From spatial context to a ranked recommendation.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              GeoAI combines map selection, scenario criteria and screening evidence into compact dashboards that show what looks attractive, what needs validation and which next action should happen first.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {decisionLayers.map(([title, text]) => (
              <article key={title} className="rounded-md border border-line bg-surface p-4">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-[0.7fr_1.3fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Outputs</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Built for screening decisions.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {outputCards.map(([title, text]) => (
                <article key={title} className="rounded-md border border-line bg-surface p-4">
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

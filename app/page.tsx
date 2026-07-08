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

const workflowCards = [
  ["Map-first site analysis", "Select a point, object or AOI and run scenario screening with visible source context."],
  ["Criteria-first candidate search", "Set filters, find candidate zones and compare the ranked shortlist."],
  ["BI decision dashboard", "Review KPIs, score bars, matrices, validation gaps and next actions."]
];

const decisionLayers = [
  ["Market", "Demand, liquidity and pipeline proxy context."],
  ["Access", "Road, corridor, catchment and infrastructure signals."],
  ["Planning", "Land-use and feasibility checks to validate."],
  ["Risk", "Climate, delivery and evidence-maturity constraints."]
];

const scenarioExamples = [
  "Redevelopment potential",
  "Hotel development zones",
  "Commercial real estate zones",
  "Residential context",
  "Tourist routes",
  "Portfolio comparison"
];

const outputCards = [
  "Ranked shortlist",
  "Decision dashboard",
  "Validation gaps",
  "Next actions",
  "Report package"
];

function ProductVisual() {
  return (
    <div className="flex rounded-lg border border-line bg-white/95 p-5 shadow-soft backdrop-blur sm:p-6 lg:min-h-[430px] lg:flex-col">
      <div className="grid gap-4 sm:grid-cols-[1.12fr_0.88fr] sm:items-stretch">
        <div className="relative min-h-[220px] overflow-hidden rounded-md bg-map-blue-gray lg:min-h-[260px]">
          <div className="absolute inset-0 bg-[linear-gradient(8deg,transparent_0,transparent_17px,rgba(35,93,140,0.17)_18px,transparent_19px)] bg-[size:100%_32px]" />
          <div className="absolute left-[13%] top-[18%] h-[62%] w-[72%] rotate-[8deg] rounded-[42%] border border-white/70 bg-white/20" />
          <div className="absolute left-1/2 top-1/2 flex h-16 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-cobalt-signal bg-cobalt-signal/10 shadow-sm">
            <span className="h-4 w-4 rounded-full bg-cobalt-signal" />
          </div>
          <div className="absolute left-4 top-4">
            <StatusChip tone="blue">Map context</StatusChip>
          </div>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-signal">
            Screening dashboard
          </p>
          <p className="mt-3 text-base font-semibold text-ink">Waterfront site</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-semibold leading-none text-cobalt-signal">78</span>
            <span className="text-xs font-semibold text-muted">Medium confidence</span>
          </div>
          <div className="mt-5 grid gap-2">
            {[
              ["Access", "78%", "bg-cobalt-signal"],
              ["Market", "66%", "bg-cobalt-signal"],
              ["Validation", "42%", "bg-validation-gold"]
            ].map(([label, width, color]) => (
              <div key={label} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3">
                <span className="truncate text-[10px] font-semibold text-muted">{label}</span>
                <span className="h-2 overflow-hidden rounded-full border border-line bg-white">
                  <span className={`block h-full rounded-full ${color}`} style={{ width }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-md border border-validation-gold/70 bg-validation-soft px-4 py-3 text-xs font-semibold leading-5 text-validation-text">
        Source-backed screening hypothesis · official validation required
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

        <div className="relative mx-auto grid max-w-7xl gap-7 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:px-0 lg:py-14">
          <div className="rounded-lg border border-line bg-white/96 p-6 shadow-sm backdrop-blur sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt-signal">
              Spatial decision intelligence
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.03] text-ink md:text-5xl lg:text-[54px]">
              GeoAI spatial decision intelligence
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted md:text-lg">
              Scenario-first map intelligence for real estate, development, infrastructure and asset screening.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Select a site or define criteria, compare candidate zones, run AI-assisted screening and generate decision-support reports.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
              <ValidationCaveat compact />
            </div>
          </div>

          <ProductVisual />
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-0">
          {productStrip.map(([title, text], index) => (
            <LandingFeatureCard key={title} index={index} title={title} text={text} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-0">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cobalt-signal">Decision intelligence</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink">From spatial context to a ranked recommendation.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                GeoAI combines map selection, scenario criteria and screening evidence into compact dashboards that show what looks attractive, what needs validation and which next action should happen first.
              </p>
              <article className="mt-8 rounded-md border border-line bg-white p-4">
                <h3 className="text-sm font-semibold text-ink">Evidence coverage</h3>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    ["DLD", "bg-validation-gold"],
                    ["OSM", "bg-cobalt-signal"],
                    ["Overture", "bg-cobalt-signal"],
                    ["Climate", "bg-cobalt-signal"]
                  ].map(([label, color]) => (
                    <div key={label}>
                      <p className="truncate text-[10px] font-semibold text-muted">{label}</p>
                      <span className={`mt-2 block h-2 rounded-full ${color}`} />
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {decisionLayers.map(([title, text]) => (
                <article key={title} className="rounded-md border border-line bg-white p-4">
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
              <article className="rounded-md border border-line bg-white p-4">
                <h3 className="text-sm font-semibold text-ink">Map-first to dashboard to report</h3>
                <div className="mt-5 flex items-center gap-6">
                  <span className="h-4 w-4 rounded-full bg-cobalt-signal" />
                  <span className="h-4 w-4 rounded-full bg-cobalt-signal" />
                  <span className="h-4 w-4 rounded-full bg-validation-gold" />
                </div>
              </article>
            </div>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {workflowCards.map(([title, text]) => (
              <article key={title} className="min-h-[126px] rounded-md border border-line bg-white p-4">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:px-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cobalt-signal">Scenarios</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Built around spatial screening decisions.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scenarioExamples.map((item) => (
              <div key={item} className="rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-6 lg:px-0">
          <div className="grid gap-5 md:grid-cols-[0.65fr_1.35fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cobalt-signal">Outputs</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Built for screening decisions.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {outputCards.map((title) => (
                <article key={title} className="rounded-md border border-line bg-white px-4 py-3">
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { AccessStatusBadge } from "@/components/auth/access-status-badge";
import { LandingHeroMap } from "@/components/landing-hero-map";

const productStrip = [
  ["Select target or criteria", "Choose a map target, AOI or search criteria."],
  ["Choose scenario", "Pick the screening question and role context."],
  ["Compare candidates", "Rank searched zones and trade-offs."],
  ["Open dashboard", "Review KPIs, risks and next actions."],
  ["Export report", "Package the current result for review."]
];

const workflow = [
  ["Map-first site analysis", "Select a point, object or AOI and run scenario screening."],
  ["Criteria-first candidate search", "Set filters, find candidate zones and compare the shortlist."],
  ["BI decision dashboard", "Use KPIs, score bars, matrices and validation gaps to decide the next step."]
];

const decisionLayers = [
  ["Market", "Demand, liquidity and pipeline proxy context."],
  ["Access", "Road, corridor, catchment and infrastructure signals."],
  ["Planning", "Land-use and feasibility checks to validate."],
  ["Risk", "Climate, delivery and evidence-maturity constraints."]
];

const outputs = [
  "Ranked shortlist",
  "Decision dashboard",
  "Validation gaps",
  "Next actions",
  "Report package"
];

const scenarioExamples = [
  "Redevelopment potential",
  "Hotel development zones",
  "Commercial real estate zones",
  "Residential context",
  "Tourist routes",
  "Portfolio comparison"
];

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            G
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-5 text-ink">GeoAI</div>
            <div className="truncate text-xs font-medium text-muted">Spatial decision intelligence</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              href="/login?next=/workspace&intent=demo"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#113f50]"
            >
              View demo
            </Link>
            <Link
              href="/login?next=/workspace&intent=request"
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand"
            >
              Leave a request
            </Link>
          </nav>
          <AccessStatusBadge />
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <LandingHeader />

      <section className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-white">
        <div className="absolute inset-0">
          <LandingHeroMap />
        </div>
        <div className="absolute inset-0 bg-white/78" />

        <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col justify-center px-5 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Spatial decision intelligence
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
              GeoAI spatial decision intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
              Scenario-first map intelligence for real estate, development, infrastructure and asset screening.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Select a site or define criteria, compare candidate zones, run AI-assisted screening and generate decision-ready reports.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?next=/workspace&intent=demo"
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]"
              >
                View demo
              </Link>
              <Link
                href="/login?next=/workspace&intent=request"
                className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-white/92 px-6 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Leave a request
              </Link>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {productStrip.map(([title, text]) => (
              <div key={title} className="min-h-[88px] rounded-md border border-line bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold leading-5 text-ink">{title}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Decision intelligence</p>
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

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {workflow.map(([title, text]) => (
            <article key={title} className="rounded-md border border-line bg-white p-4">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-[0.7fr_1.3fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Scenarios</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Built around spatial screening decisions.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scenarioExamples.map((item) => (
                <div key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Outputs</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Built for screening decisions.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {outputs.map((item) => (
                <div key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

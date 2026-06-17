import Link from "next/link";
import { LandingHeroMap } from "@/components/landing-hero-map";

const painCards = [
  {
    title: "Off-plan pipeline risk",
    text: "Screen supply pressure, delivery assumptions and corridor maturity before a site becomes an expensive conviction."
  },
  {
    title: "Crowded locations",
    text: "Compare whether a location is genuinely differentiated or simply exposed to the same demand narrative as nearby assets."
  },
  {
    title: "Market comps validation",
    text: "Separate useful market context from unvalidated claims, then route the gaps to official or licensed evidence."
  },
  {
    title: "Planning and climate constraints",
    text: "Bring infrastructure, access, planning, heat and coastal sensitivity into the first investment discussion."
  }
];

const workflow = [
  "Select point / plot / polygon / portfolio",
  "Enrich with market, spatial, planning and risk context",
  "Run scenario-specific AI analysis",
  "Export decision memo with evidence and next actions"
];

const useCases = [
  {
    title: "Investment Site Selection",
    buyer: "Funds, family offices, banks",
    decision: "Which location deserves underwriting time?",
    output: "Ranked site memo with score, risk posture and evidence gaps",
    featured: true
  },
  {
    title: "Real Estate Development Intelligence",
    buyer: "Developers and land teams",
    decision: "What can this site become, and what must be validated?",
    output: "Development potential, constraints and due diligence checklist",
    featured: true
  },
  {
    title: "Asset / Portfolio Intelligence",
    buyer: "Owners and asset managers",
    decision: "Which assets need repositioning, monitoring or disposal review?",
    output: "Portfolio-level spatial context and action priorities",
    featured: false
  },
  {
    title: "Construction & Risk Monitoring",
    buyer: "Lenders, developers, project controls",
    decision: "Is progress, exposure or deviation risk changing?",
    output: "Monitoring brief with evidence, cadence and escalation triggers",
    featured: false
  }
];

const evidenceSources = [
  "Demo-normalized spatial layers",
  "DLD, Dubai Pulse, Dubai Municipality / GeoDubai, Dubai 2040",
  "OpenStreetMap, Sentinel and Landsat context later",
  "Customer CSV, GeoJSON and documents later",
  "Commercial data and VHR imagery later"
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </p>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ded7c9] bg-[#fbfaf7]/92 backdrop-blur">
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
        <nav className="hidden items-center gap-5 lg:flex">
          {["Product", "Use cases", "Workflow", "Data", "Demo"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-sm font-semibold text-muted transition hover:text-ink">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="#sample-output"
            className="hidden h-10 items-center justify-center rounded-md border border-[#ded7c9] bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand sm:inline-flex"
          >
            View sample memo
          </a>
          <Link
            href="/workspace"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]"
          >
            Open workspace
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="relative rounded-xl border border-[#ded7c9] bg-white p-3 shadow-soft">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_340px]">
        <div className="overflow-hidden rounded-lg border border-line bg-[#e6e8df]">
          <div className="flex items-center justify-between border-b border-white/80 bg-white/82 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Workspace / Map context</p>
              <h2 className="mt-1 text-base font-semibold text-ink">Dubai investment screen</h2>
            </div>
            <span className="rounded-full bg-[#edf4f2] px-3 py-1 text-xs font-semibold text-brand">Live-style demo</span>
          </div>
          <div className="h-[430px]">
            <LandingHeroMap />
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Decision memo</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Proceed with conditions</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Decision posture", "Proceed to due diligence"],
              ["Suitability score", "82/100"],
              ["Key risk", "Pipeline pressure"],
              ["Data confidence", "demo-normalized / official-ready"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-[#d6c391] bg-[#fff9e8] px-4 py-3 text-sm leading-6 text-[#6f5817]">
            Advance only after official land-use, transaction and infrastructure validation.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-ink">
      <LandingHeader />

      <section id="product" className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <SectionLabel>Dubai real estate intelligence</SectionLabel>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] text-ink md:text-7xl">
            AI spatial intelligence for Dubai real estate decisions
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Screen sites, compare development potential, validate market context and generate investment-ready memos from spatial data.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            GeoAI turns a point, plot, polygon, asset or portfolio into a structured decision: proceed, compare, validate, monitor or reject.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/workspace" className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]">
              Open demo workspace
            </Link>
            <a href="#workflow" className="inline-flex h-12 items-center justify-center rounded-md border border-[#ded7c9] bg-white px-6 text-sm font-semibold text-ink transition hover:border-brand">
              See how it works
            </a>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section className="border-y border-[#ded7c9] bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <SectionLabel>Market pain</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
            Dubai is active. The hard part is choosing correctly.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {painCards.map((card) => (
              <article key={card.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-ink">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <SectionLabel>Product thesis</SectionLabel>
        <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">From spatial object to management decision</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {workflow.map((step, index) => (
            <article key={step} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#edf4f2] text-sm font-semibold text-brand">{index + 1}</span>
              <p className="mt-5 text-base font-semibold leading-6 text-ink">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="use-cases" className="bg-[#f3efe6]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <SectionLabel>Use cases</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Built for investment, development and asset decisions</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {useCases.map((item) => (
              <article key={item.title} className={`rounded-lg border p-5 shadow-sm ${item.featured ? "border-brand bg-white" : "border-line bg-white/82"}`}>
                <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-muted">Buyer / user</dt>
                    <dd className="mt-1 text-ink">{item.buyer}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted">Key decision</dt>
                    <dd className="mt-1 text-ink">{item.decision}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted">Output</dt>
                    <dd className="mt-1 text-ink">{item.output}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sample-output" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <SectionLabel>Sample output</SectionLabel>
        <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">What GeoAI should answer</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Decision posture</p>
            <h3 className="mt-2 text-3xl font-semibold text-ink">Proceed to due diligence</h3>
            <div className="mt-6 rounded-md bg-[#edf4f2] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Site suitability score</p>
              <p className="mt-2 text-5xl font-semibold text-brand">82</p>
              <p className="mt-1 text-sm text-muted">Risk-adjusted demo score out of 100</p>
            </div>
            <p className="mt-5 text-base leading-7 text-muted">
              Risk-adjusted recommendation: strong location signal, but official planning, supply pipeline and transaction evidence must be validated before investment committee approval.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Key value drivers", "Access, waterfront positioning, liquidity assumptions and premium demand context."],
              ["Critical constraints", "Pipeline pressure, service-cost sensitivity and need for official land-use confirmation."],
              ["Data gaps", "Validated DLD transactions, planning controls, ownership, permitted density and current comps."],
              ["Due diligence checklist", "Compare alternatives, request land-use evidence, validate transport access and prepare investment memo."]
            ].map(([title, text]) => (
              <article key={title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
            <article className="rounded-lg border border-line bg-white p-5 shadow-sm md:col-span-2">
              <h3 className="text-base font-semibold text-ink">Evidence cards</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {["Demo spatial layer", "Market context adapter", "Planned official validation"].map((item) => (
                  <div key={item} className="rounded-md bg-surface px-4 py-3 text-sm font-semibold text-muted">{item}</div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="data" className="border-y border-[#ded7c9] bg-white/72">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <SectionLabel>Trust and data strategy</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Built for evidence-backed spatial decisions</h2>
            <p className="mt-5 text-base leading-7 text-muted">
              The current public prototype uses demo-normalized data to demonstrate workflow. Production and pilot deployments are designed to connect official, open, commercial and customer data sources.
            </p>
          </div>
          <div className="grid gap-3">
            {evidenceSources.map((source) => (
              <div key={source} className="rounded-lg border border-line bg-white px-5 py-4 text-sm font-semibold text-ink shadow-sm">
                {source}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-line bg-white p-6 shadow-soft md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel>Demo and pilot path</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Built as a prototype. Structured for pilots.</h2>
              <Link href="/workspace" className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]">
                Open workspace
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Current", "Interactive workspace, demo layers, AI analysis, comparison and report preview."],
                ["Next", "Real data adapters, PostGIS spatial database, saved analysis, client reports and portfolio mode."],
                ["Pilot-ready direction", "2-4 pilots with developers, funds, banks, family offices or government-linked entities."]
              ].map(([title, text]) => (
                <article key={title} className="rounded-lg border border-line bg-surface p-5">
                  <h3 className="text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ded7c9] bg-[#f3efe6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:px-6 lg:px-8">
          <p className="font-semibold text-ink">GeoAI</p>
          <p>AI spatial decision intelligence. Dubai / Abu Dhabi first. Singapore / international expansion later.</p>
        </div>
      </footer>
    </main>
  );
}

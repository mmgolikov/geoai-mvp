import Link from "next/link";
import { SourceReadinessMatrix } from "@/components/data-readiness";
import { LandingHeroMap } from "@/components/landing-hero-map";

const clientSegments = [
  {
    title: "Developers & master developers",
    pain: "Early site screening is slow, fragmented and too dependent on disconnected files.",
    use: "Compare plots, access, surroundings, constraints, pipeline signals and uploaded datasets.",
    output: "Prioritized shortlist, validation checklist and development memo."
  },
  {
    title: "Real estate funds & family offices",
    pain: "Too many locations enter underwriting before basic spatial and market risks are clear.",
    use: "Rank sites and assets by suitability, evidence confidence and risk-adjusted opportunity.",
    output: "Investment committee memo with gaps, risks and next actions."
  },
  {
    title: "Banks & lenders",
    pain: "Credit review needs clearer site context, delivery risk and evidence trails.",
    use: "Screen collateral, development progress, access assumptions and constraint exposure.",
    output: "Lender-ready review package and due diligence checklist."
  },
  {
    title: "Insurers & risk teams",
    pain: "Climate, heat, coastal and asset exposure signals are hard to connect to decisions.",
    use: "Overlay risk context with selected assets, uploaded portfolios and monitoring workflows.",
    output: "Risk posture summary with mitigation and validation requirements."
  },
  {
    title: "Government, free zones & authorities",
    pain: "Land, object and corridor monitoring needs faster spatial triage and reporting.",
    use: "Track sites, compare zones, review infrastructure dependencies and identify anomalies.",
    output: "Spatial intelligence brief for planning, prioritization and follow-up."
  }
];

const useCases = [
  {
    title: "Site selection & land screening",
    select: "Point, polygon, plot shortlist or uploaded GeoJSON.",
    analyze: "Access, surroundings, market context, spatial evidence and constraints.",
    output: "Ranked shortlist with validation gaps and recommended next step."
  },
  {
    title: "Development potential assessment",
    select: "Land parcel candidate, AOI or master-plan zone.",
    analyze: "Development maturity, infrastructure readiness and commercial or residential fit.",
    output: "Potential score, risk posture and due diligence memo."
  },
  {
    title: "Construction monitoring",
    select: "Project site, construction point or uploaded pipeline dataset.",
    analyze: "Monitoring cadence, progress evidence needs and deviation risk.",
    output: "Monitoring brief for lenders, developers or project controls."
  },
  {
    title: "Asset portfolio intelligence",
    select: "Multiple assets, operating sites or customer upload.",
    analyze: "Location quality, risk exposure, market signals and comparative strength.",
    output: "Portfolio prioritization and action plan."
  },
  {
    title: "Climate, coastal & heat screening",
    select: "Site, corridor, asset cluster or comparison set.",
    analyze: "Heat, coastal sensitivity, resilience needs and insurance implications.",
    output: "Risk memo with mitigation and validation actions."
  },
  {
    title: "Government land & object monitoring",
    select: "District, free-zone asset, corridor or public-infrastructure object.",
    analyze: "Urban integration, accessibility, dependencies and spatial change indicators.",
    output: "Planning brief with evidence, constraints and follow-up workflow."
  }
];

const workflow = [
  {
    step: "01",
    title: "Select site, polygon, asset or portfolio",
    text: "Start from a map click, demo object, uploaded GeoJSON, CSV metrics or a comparison set."
  },
  {
    step: "02",
    title: "Combine spatial, market and uploaded data",
    text: "Use demo layers, open geospatial baseline, sample metrics and user-provided files with clear source labels."
  },
  {
    step: "03",
    title: "Generate AI scoring and decision memo",
    text: "Interpret deterministic scores, evidence confidence, risks, opportunities and next actions."
  },
  {
    step: "04",
    title: "Compare, export and validate",
    text: "Compare alternatives, export a memo and route gaps to official or customer validation."
  }
];

const dataCards = [
  {
    title: "Demo-normalized spatial layers",
    text: "Development zones, premium areas, infrastructure nodes, risk signals and construction targets for product demonstration."
  },
  {
    title: "Open geospatial baseline",
    text: "Local OSM-style roads, POI anchors and landuse context. Not live official GIS."
  },
  {
    title: "Uploaded CSV / GeoJSON",
    text: "Browser-local user-provided datasets that can enrich analysis while remaining validation-required."
  },
  {
    title: "Sample/offline market metrics",
    text: "DLD / Dubai Pulse-style imported samples for workflow testing, not live official feeds."
  },
  {
    title: "Planned official validation",
    text: "Future adapters for permitted DLD, Dubai Pulse, Municipality / GeoDubai, imagery and customer systems."
  },
  {
    title: "Evidence-first output",
    text: "Reports show source status, limitations and the validation path before operational decisions."
  }
];

const outcomes = [
  "Faster early-stage site screening",
  "Fewer weak locations entering due diligence",
  "Clearer investment committee memos",
  "Better portfolio prioritization",
  "Improved construction and progress evidence",
  "Stronger risk and constraint transparency"
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </p>
  );
}

function LandingHeader() {
  const navItems = [
    ["Clients", "#clients"],
    ["Use cases", "#use-cases"],
    ["Workflow", "#workflow"],
    ["Data", "#data"],
    ["Demo", "#demo"]
  ];

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
          {navItems.map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-semibold text-muted transition hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="hidden h-10 items-center justify-center rounded-md border border-[#ded7c9] bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand sm:inline-flex"
          >
            Projects
          </Link>
          <Link
            href="/workspace"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]"
          >
            Open demo
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroVisual() {
  const metrics = [
    ["Market context", "Dubai Marina", "seed sample"],
    ["Spatial evidence", "Polygon selected", "demo layer"],
    ["Risk & constraints", "Validation gap", "official check"],
    ["Data confidence", "Demo + upload", "not official"]
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#ded7c9] bg-white p-3 shadow-soft">
      <div className="grid min-h-[560px] overflow-hidden rounded-lg border border-line bg-[#f7f8f6] grid-rows-[58px_minmax(0,1fr)_112px]">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white">
              G
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">GeoAI workspace</p>
              <h2 className="truncate text-sm font-semibold text-ink">Dubai site screening</h2>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {["Demo prototype", "Layers active", "AI-ready"].map((item) => (
              <span key={item} className="rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_292px]">
          <div className="relative min-h-0 overflow-hidden rounded-lg border border-line bg-white">
            <LandingHeroMap />
            <div className="pointer-events-none absolute left-4 top-4 max-w-[230px] rounded-md border border-white/80 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">Selected site</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">Dubai Marina screening area</p>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              {["Market context", "Spatial layers", "Risk signals"].map((item) => (
                <span key={item} className="rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-muted shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-3 overflow-hidden rounded-lg border border-line bg-white p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Decision summary</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">Proceed with conditions</h2>
            </div>
            <div className="rounded-md bg-[#edf4f2] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">Suitability score</p>
                  <p className="mt-1 text-4xl font-semibold leading-none text-brand">82</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-muted">/100</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">Strong demo signal, pending official source validation.</p>
            </div>
            <div className="grid min-h-0 gap-2">
              {[
                ["Key risk", "Official validation required"],
                ["Next step", "Prepare due diligence package"],
                ["Evidence", "Demo + uploaded/sample data"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-line bg-surface px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-line bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Decision output</p>
              <p className="mt-1 text-sm font-semibold text-ink">Investment memo + validation checklist</p>
            </div>
          </aside>
        </div>

        <div className="grid gap-2 border-t border-line bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, note]) => (
            <div key={label} className="min-w-0 rounded-md bg-surface px-3 py-2">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientCard({ segment }: { segment: (typeof clientSegments)[number] }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-ink">{segment.title}</h3>
      <dl className="mt-5 grid gap-3 text-sm leading-6">
        <div>
          <dt className="font-semibold text-muted">Pain</dt>
          <dd className="mt-1 text-ink">{segment.pain}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">GeoAI use</dt>
          <dd className="mt-1 text-ink">{segment.use}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Output</dt>
          <dd className="mt-1 text-ink">{segment.output}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-ink">
      <LandingHeader />

      <section id="product" className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-14">
        <div className="flex flex-col justify-center">
          <SectionLabel>Dubai real estate intelligence</SectionLabel>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
            AI spatial intelligence for real estate, development and asset decisions
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            GeoAI turns sites, polygons, assets and portfolios into structured decision memos: where to build, where to invest, what to validate, what risks matter and what to do next.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Built for developers, funds, banks and public-sector teams that need faster site screening, market context, spatial evidence and due diligence workflows.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/workspace" className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]">
              Open demo workspace
            </Link>
            <a href="#use-cases" className="inline-flex h-12 items-center justify-center rounded-md border border-[#ded7c9] bg-white px-6 text-sm font-semibold text-ink transition hover:border-brand">
              Explore use cases
            </a>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section id="clients" className="border-y border-[#ded7c9] bg-white/72">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <SectionLabel>Who it is for</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
            Spatial intelligence for teams that make land, asset and infrastructure decisions
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {clientSegments.map((segment) => (
              <ClientCard key={segment.title} segment={segment} />
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <SectionLabel>Use cases</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
          Select an object. Understand the decision. Export the memo.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map((item) => (
            <article key={item.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <dl className="mt-5 grid gap-3 text-sm leading-6">
                <div>
                  <dt className="font-semibold text-muted">User selects</dt>
                  <dd className="mt-1 text-ink">{item.select}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">GeoAI analyzes</dt>
                  <dd className="mt-1 text-ink">{item.analyze}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Decision output</dt>
                  <dd className="mt-1 text-ink">{item.output}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-[#f3efe6]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
            From map selection to evidence-backed decision memo
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((item) => (
              <article key={item.step} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#edf4f2] text-sm font-semibold text-brand">
                  {item.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold leading-6 text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="data" className="border-y border-[#ded7c9] bg-white/72">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
          <div>
            <SectionLabel>Data and evidence</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">
              Credible demos today. Clear validation path for pilots.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted">
              The current public prototype uses demo-normalized spatial layers, open geospatial samples, uploaded CSV/GeoJSON and sample/offline metrics. It does not claim live official DLD, Dubai Pulse or GeoDubai connections.
            </p>
            <p className="mt-4 text-base leading-7 text-muted">
              Before decisions, official parcel, planning, transaction, ownership, risk and regulatory sources must be validated. GeoAI makes those gaps visible inside the memo.
            </p>
          </div>
          <div className="grid gap-4">
            <SourceReadinessMatrix limit={6} />
            <div className="grid gap-3 md:grid-cols-2">
              {dataCards.map((card) => (
                <article key={card.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-ink">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <SectionLabel>Business outcomes</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
          Built to make early decisions faster and more defensible
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outcomes.map((outcome) => (
            <div key={outcome} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <p className="text-base font-semibold text-ink">{outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-line bg-white p-6 shadow-soft md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel>Demo workspace</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">
                See how GeoAI screens a Dubai site
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                Use the demo workspace or discuss a pilot with uploaded client data. Current outputs are prototype demonstrations and require official validation before decisions.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/workspace" className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]">
                  Open demo workspace
                </Link>
                <Link href="/projects" className="inline-flex h-12 items-center justify-center rounded-md border border-[#ded7c9] bg-surface px-6 text-sm font-semibold text-ink transition hover:border-brand">
                  View project dashboard
                </Link>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Current demo", "Mapbox workspace, uploads, layers, analysis, comparison and report preview."],
                ["Client pilot path", "Bring validated customer data, official source access and governance requirements."],
                ["Decision output", "Site memo, validation checklist, comparison dashboard and export-ready narrative."]
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
          <p>AI spatial decision intelligence for Dubai and UAE real estate, development, infrastructure and asset workflows.</p>
        </div>
      </footer>
    </main>
  );
}

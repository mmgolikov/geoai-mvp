import Link from "next/link";
import { LandingHeroMap } from "@/components/landing-hero-map";

const clientSegments = [
  {
    marker: "DV",
    title: "Developers & master developers",
    pain: "Slow early-stage site screening",
    chips: ["Plot comparison", "Access", "Constraints", "Market signals"],
    output: "Shortlist + validation memo"
  },
  {
    marker: "FO",
    title: "Funds & family offices",
    pain: "Too many weak locations enter underwriting",
    chips: ["Site ranking", "Liquidity", "Demand drivers", "Risk posture"],
    output: "IC memo + evidence gaps"
  },
  {
    marker: "BK",
    title: "Banks & lenders",
    pain: "Credit review lacks spatial evidence",
    chips: ["Collateral", "Progress", "Access", "Exposure"],
    output: "Lender review package"
  },
  {
    marker: "RS",
    title: "Insurers & risk teams",
    pain: "Risk signals are hard to connect to assets",
    chips: ["Heat", "Coastal", "Portfolio", "Mitigation"],
    output: "Risk memo + actions"
  },
  {
    marker: "GV",
    title: "Government & urban authorities",
    pain: "Land and object monitoring is fragmented",
    chips: ["Districts", "Free zones", "Corridors", "Objects"],
    output: "Planning intelligence brief"
  }
];

const useCases = [
  {
    marker: "SS",
    title: "Site selection & land screening",
    input: "Point / polygon",
    signals: ["Market", "Access", "Constraints"],
    output: "Ranked shortlist"
  },
  {
    marker: "DP",
    title: "Development potential assessment",
    input: "Plot / AOI",
    signals: ["Infrastructure", "Maturity", "Fit"],
    output: "Potential memo"
  },
  {
    marker: "CM",
    title: "Construction monitoring",
    input: "Project site",
    signals: ["Progress", "Cadence", "Deviation"],
    output: "Monitoring report"
  },
  {
    marker: "AI",
    title: "Asset portfolio intelligence",
    input: "Portfolio",
    signals: ["Location", "Risk", "Comparables"],
    output: "Action priority"
  },
  {
    marker: "CR",
    title: "Climate / coastal / heat screening",
    input: "Site / corridor",
    signals: ["Heat", "Coastal", "Resilience"],
    output: "Risk checklist"
  },
  {
    marker: "GM",
    title: "Government land & object monitoring",
    input: "District / object",
    signals: ["Integration", "Dependencies", "Change"],
    output: "Planning brief"
  }
];

const workflow = [
  {
    step: "01",
    marker: "SEL",
    title: "Select",
    text: "Site, polygon, asset or portfolio."
  },
  {
    step: "02",
    marker: "DAT",
    title: "Combine",
    text: "Spatial, market and uploaded data."
  },
  {
    step: "03",
    marker: "AI",
    title: "Generate",
    text: "AI score and decision memo."
  },
  {
    step: "04",
    marker: "VAL",
    title: "Validate",
    text: "Compare, export and verify sources."
  }
];

const sourceLanes = [
  {
    title: "Demo / open baseline",
    status: "Demo",
    items: ["Demo-normalized layers", "OSM-style baseline", "Sample/offline metrics"],
    note: "Shows the workflow today"
  },
  {
    title: "Uploaded client data",
    status: "Uploaded",
    items: ["CSV site metrics", "GeoJSON sites/assets", "Portfolio datasets"],
    note: "User-provided, local-first context"
  },
  {
    title: "Official validation path",
    status: "Planned validation",
    items: ["DLD / Dubai Pulse", "Dubai Municipality / GeoDubai", "Customer-approved sources"],
    note: "Required before operational decisions"
  }
];

const outcomes = [
  ["FAST", "Faster site screening", "Move from map object to decision memo faster."],
  ["DD", "Fewer weak sites", "Filter poor-fit locations before deep due diligence."],
  ["IC", "Clearer IC memos", "Turn spatial context into a structured committee narrative."],
  ["PORT", "Portfolio priority", "Rank assets by location, risk and validation needs."],
  ["EVD", "Stronger evidence trail", "Show source status, gaps and next validation steps."],
  ["RISK", "Earlier risk detection", "Surface heat, coastal, access and constraint signals early."]
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </p>
  );
}

function Marker({ children, size = "md" }: { children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md bg-[#edf4f2] font-semibold text-brand ${sizeClass}`}>
      {children}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
      {children}
    </span>
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
    ["Spatial evidence", "Polygon", "selected"],
    ["Risk & constraints", "Validation", "required"],
    ["Data confidence", "Demo + upload", "not official"]
  ];

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#ded7c9] bg-white p-2.5 shadow-soft">
      <div className="grid aspect-[16/9] min-h-[330px] max-h-[440px] overflow-hidden rounded-lg border border-line bg-[#f7f8f6] grid-rows-[46px_minmax(0,1fr)_72px]">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line bg-white px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-[11px] font-semibold text-white">
              G
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">GeoAI workspace</p>
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

        <div className="grid min-h-0 gap-2.5 p-2.5 lg:grid-cols-[minmax(0,1.58fr)_minmax(240px,0.9fr)]">
          <div className="relative min-h-0 overflow-hidden rounded-lg border border-line bg-white">
            <LandingHeroMap />
            <div className="pointer-events-none absolute left-3 top-3 max-w-[230px] rounded-md border border-white/80 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">Selected site</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">Dubai Marina screening area</p>
            </div>
            <div className="pointer-events-none absolute left-[38%] top-[35%] h-20 w-32 rotate-[-9deg] rounded-[42%] border-2 border-brand/80 bg-brand/10 shadow-sm" />
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
              {["Market context", "Spatial layers", "Risk signals"].map((item) => (
                <span key={item} className="rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-semibold text-muted shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2 overflow-hidden rounded-lg border border-line bg-white p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Decision summary</p>
                <h2 className="mt-1 truncate text-base font-semibold text-ink">Proceed with conditions</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#edf4f2] px-2 py-1 text-[10px] font-semibold text-brand">memo</span>
            </div>
            <div className="grid grid-cols-[0.74fr_1fr] gap-2">
              <div className="rounded-md bg-[#edf4f2] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand">Score</p>
                <p className="mt-1 text-3xl font-semibold leading-none text-brand">82</p>
                <p className="mt-1 text-[11px] text-muted">/100 suitability</p>
              </div>
              <div className="grid gap-2">
                {[
                  ["Key risk", "Validation required"],
                  ["Next action", "Due diligence pack"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-line bg-surface px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid min-h-0 content-start gap-2">
              {[
                ["Output", "Investment memo + validation checklist"],
                ["Evidence", "Demo + uploaded/sample data"],
                ["Confidence", "Not live official"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-line bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="grid gap-2 border-t border-line bg-white p-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, note]) => (
            <div key={label} className="min-w-0 rounded-md bg-surface px-3 py-2">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
              <p className="truncate text-[11px] text-muted">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientCard({ segment }: { segment: (typeof clientSegments)[number] }) {
  return (
    <article className="flex h-full min-h-[250px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
      <Marker size="lg">{segment.marker}</Marker>
      <h3 className="mt-5 text-lg font-semibold leading-6 text-ink">{segment.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{segment.pain}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {segment.chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <div className="rounded-md bg-surface px-3 py-2 text-sm font-semibold text-ink">{segment.output}</div>
      </div>
    </article>
  );
}

function UseCaseCard({ item }: { item: (typeof useCases)[number] }) {
  return (
    <article className="flex h-full min-h-[250px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Marker>{item.marker}</Marker>
        <h3 className="text-lg font-semibold leading-6 text-ink">{item.title}</h3>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="rounded-md bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Input</p>
          <p className="mt-1 text-sm font-semibold text-ink">{item.input}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {item.signals.map((signal) => (
            <Chip key={signal}>{signal}</Chip>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-5">
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
          Output: {item.output}
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-ink">
      <LandingHeader />

      <section id="product" className="mx-auto grid max-w-7xl items-start gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-10">
        <div className="max-w-xl self-start pt-1">
          <SectionLabel>Dubai real estate intelligence</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] text-ink md:text-5xl">
            AI spatial intelligence for land, development and investment decisions
          </h1>
          <p className="mt-5 text-base leading-7 text-muted md:text-lg">
            GeoAI turns sites, polygons, assets and portfolios into decision-ready memos: where to build, where to invest, what to validate and what to do next.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            Built for developers, funds, banks and public-sector teams that need faster screening, clearer evidence and better due diligence workflows.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Sites", "Polygons", "Assets", "Portfolios"].map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/workspace" className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]">
              Open demo workspace
            </Link>
            <a href="#use-cases" className="inline-flex h-11 items-center justify-center rounded-md border border-[#ded7c9] bg-white px-5 text-sm font-semibold text-ink transition hover:border-brand">
              Explore use cases
            </a>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section id="clients" className="border-y border-[#ded7c9] bg-white/72">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionLabel>Who it is for</SectionLabel>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink">
                Decision workflows for land, assets and infrastructure
              </h2>
            </div>
            <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-muted shadow-sm">
              Pain to workflow to memo
            </div>
          </div>
          <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-5">
            {clientSegments.map((segment) => (
              <ClientCard key={segment.title} segment={segment} />
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <SectionLabel>Use cases</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink">
          Input to analysis to output, in one workspace
        </h2>
        <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map((item) => (
            <UseCaseCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-[#f3efe6]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink">
            From map selection to evidence-backed decision memo
          </h2>
          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            {workflow.map((item, index) => (
              <article key={item.step} className="relative flex h-full min-h-[210px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
                {index < workflow.length - 1 ? (
                  <div className="absolute -right-3 top-1/2 z-10 hidden h-px w-6 bg-brand/35 xl:block" />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <Marker>{item.marker}</Marker>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.step}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="data" className="border-y border-[#ded7c9] bg-white/72">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <SectionLabel>Data and evidence</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink">
                Source lineage is part of the product
              </h2>
              <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-ink">Current demo status</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Current demo uses sample/offline and uploaded local data. Live official integrations are not connected in this demo; official validation is required before decisions.
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {sourceLanes.map((lane) => (
                <article key={lane.title} className="flex h-full min-h-[310px] flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-6 text-ink">{lane.title}</h3>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {lane.status}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {lane.items.map((item) => (
                      <div key={item} className="rounded-md bg-surface px-3 py-2 text-sm font-semibold text-ink">
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="mt-auto pt-5 text-sm leading-6 text-muted">{lane.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <SectionLabel>Business outcomes</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink">
          Earlier clarity before expensive due diligence
        </h2>
        <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outcomes.map(([marker, title, text]) => (
            <article key={title} className="flex h-full min-h-[160px] gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
              <Marker>{marker}</Marker>
              <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-line bg-white p-6 shadow-soft md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
            <div>
              <SectionLabel>Demo workspace</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink">
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
            <div className="grid items-stretch gap-4 md:grid-cols-3">
              {[
                ["Current demo", "Workspace, uploads, layers, analysis, comparison and report preview."],
                ["Client pilot path", "Validated customer data, source access and governance requirements."],
                ["Decision output", "Site memo, validation checklist and comparison dashboard."]
              ].map(([title, text]) => (
                <article key={title} className="flex h-full flex-col rounded-lg border border-line bg-surface p-5">
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

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
  ["Ranked shortlist", "Compare screened candidate zones without making official suitability claims."],
  ["Decision dashboard", "Review score, posture, drivers, risks and next action in one workspace."],
  ["Validation gaps", "Show which assumptions need official or client-approved validation."],
  ["Next actions", "Turn screening results into a clear follow-up checklist."],
  ["Source lineage", "Keep source readiness and evidence maturity adjacent to outputs."],
  ["Report package", "Export decision-support memos with caveats and source lineage."]
];

const sourceLineageItems = [
  ["Source registry", "DLD/Dubai Pulse snapshots, OSM/Overture, climate and satellite metadata stay labeled by readiness."],
  ["Evidence maturity", "Sample/open context is separated from official or client validation requirements."],
  ["Data readiness", "Project Hub exposes source lineage through /projects#data-readiness and the preview wrapper route."]
];

function ProductVisual() {
  return (
    <div className="relative min-h-[460px] overflow-hidden rounded-lg border border-line bg-white/95 shadow-soft backdrop-blur">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,93,140,0.10)_1px,transparent_1px),linear-gradient(rgba(35,93,140,0.10)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute left-[9%] top-[15%] h-[54%] w-[68%] rotate-[-4deg] rounded-[40%] border border-signal-blue/55 bg-signal-blue/10" />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <StatusChip tone="blue">Map context</StatusChip>
        <StatusChip tone="validation">Source lineage</StatusChip>
      </div>
      <div className="absolute right-[14%] top-[18%] h-16 w-16 rounded-full border-[10px] border-white bg-brand shadow-soft">
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-validation-gold" />
      </div>
      <div className="absolute bottom-[28%] left-4 max-w-[250px] rounded-md border border-line bg-white/95 p-4 shadow-soft sm:left-[10%]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AOI selected</p>
        <p className="mt-1 text-sm font-semibold text-ink">Business Bay waterfront</p>
        <p className="mt-2 max-w-[220px] text-xs leading-5 text-muted">Public/open context; official validation required.</p>
      </div>
      <div className="absolute right-4 top-[35%] w-[min(270px,calc(100%-2rem))] rounded-lg border border-line bg-white p-4 shadow-soft sm:right-[8%]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Demo screening index</p>
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
      <div className="absolute bottom-4 right-4 w-[min(320px,calc(100%-2rem))] rounded-md border border-validation-gold/40 bg-validation-soft px-4 py-3 text-xs leading-5 text-validation-text sm:right-[8%]">
        <p className="font-semibold text-validation-strong">Decision posture</p>
        <p className="mt-1">Sample/open evidence context - official validation required.</p>
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
              <ValidationCaveat compact />
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
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Workflow</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Map-first, criteria-first, then dashboard.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Keep the first preview focused on the core production narrative: select, search, compare, review and package the result.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {workflowCards.map(([title, text], index) => (
              <article key={title} className="min-h-[156px] rounded-md border border-line bg-surface p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ice text-xs font-black text-spatial-blue">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
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

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Scenarios</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Built around spatial screening decisions.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scenarioExamples.map((item) => (
              <div key={item} className="rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spatial-blue">Source basis</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Data readiness stays next to the decision.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              The preview keeps source readiness visible without implying official validation.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/projects#data-readiness"
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                View source lineage
              </Link>
              <Link
                href="/data-readiness"
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
              >
                Open data readiness
              </Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {sourceLineageItems.map(([title, text]) => (
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="border-t border-line bg-brand text-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Demo workspace</p>
            <h2 className="mt-3 text-2xl font-semibold">Open the workspace and run the preview flow.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78">
              Use the map-first or criteria-first workspace to test the current investor/client demo flow, then review the resulting dashboard, source basis and report package.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Link
              href="/workspace"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-brand transition hover:bg-ice"
            >
              Open workspace
            </Link>
            <Link
              href="/projects#data-readiness"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Review source lineage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

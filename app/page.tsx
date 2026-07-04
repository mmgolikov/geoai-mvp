import Link from "next/link";
import { LandingHeroMap } from "@/components/landing-hero-map";

const productStrip = [
  "Site screening",
  "Development potential",
  "Candidate search",
  "Comparison",
  "Report package"
];

const workflow = [
  ["Select", "Choose a point, object, AOI or candidate."],
  ["Analyze", "Run scenario-first spatial screening."],
  ["Compare", "Shortlist alternatives with clear trade-offs."],
  ["Package", "Export the current result for review."]
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
        <nav className="hidden items-center gap-2 sm:flex">
          <Link href="/workspace" className="rounded-md bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:text-brand">
            Workspace
          </Link>
          <Link href="/projects" className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink">
            Projects
          </Link>
        </nav>
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
              Pilot workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
              GeoAI spatial decision intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
              Scenario-first map intelligence for real estate, development, infrastructure and asset screening.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]"
              >
                Open workspace
              </Link>
              <Link
                href="/projects"
                className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-white/92 px-6 text-sm font-semibold text-ink transition hover:border-brand"
              >
                View projects
              </Link>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {productStrip.map((item) => (
              <div key={item} className="min-h-[72px] rounded-md border border-line bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold leading-5 text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {workflow.map(([title, text]) => (
            <article key={title} className="rounded-md border border-line bg-white p-4">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

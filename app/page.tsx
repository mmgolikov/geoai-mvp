import Link from "next/link";
import { TopNavigation } from "@/components/top-navigation";

const pillars = [
  "Map-first spatial workspace",
  "Decision cards for land, assets and AOIs",
  "Mock data now, real integrations later"
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <TopNavigation />
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            UAE real estate and development intelligence
          </p>
          <h1 className="text-5xl font-semibold leading-[1.02] text-ink md:text-7xl">
            GeoAI
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            A premium workspace for turning spatial assets, map context and AI
            analysis into clear investment, development and risk decisions.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-[#113f50]"
            >
              Open workspace
            </Link>
            <a
              href="/api/health"
              className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-white px-6 text-sm font-semibold text-ink transition hover:border-brand"
            >
              Check API
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Workspace preview
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  Map + analysis shell
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                Milestone 1
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="rounded-md border border-line bg-white px-4 py-3 text-sm font-medium text-ink"
                >
                  {pillar}
                </div>
              ))}
            </div>
            <div className="mt-5 h-64 overflow-hidden rounded-md border border-line bg-[#e8eef1]">
              <div className="h-full bg-[linear-gradient(90deg,rgba(23,79,99,0.10)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.10)_1px,transparent_1px)] bg-[size:36px_36px]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

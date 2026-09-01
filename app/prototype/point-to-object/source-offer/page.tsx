import Link from "next/link";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";

export default function PointToObjectSourceOfferPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-[24px] border border-line bg-white p-6 shadow-soft sm:p-10">
        <header className="flex items-center gap-3 border-b border-line pb-6">
          <IdentitySymbol />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">GeoAI Candidate</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em]">POINT_TO_OBJECT_001 data notice</h1>
          </div>
        </header>
        <div className="mt-7 space-y-5 text-sm leading-7 text-muted">
          <p>The frozen case packs contain a source-isolated database derived from OpenStreetMap data.</p>
          <p>
            © OpenStreetMap contributors. OpenStreetMap data is available under the Open Data Commons Open Database License 1.0 (ODbL):{" "}
            <a className="font-semibold text-brand underline underline-offset-4" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">copyright and licence</a>.
          </p>
          <p>The exact queries, acquired-byte hashes, privacy-minimized source snapshots, minimization receipts, normalized derived database, index and build tooling are distributed together in the Candidate repository. The unminimized acquired response bytes are intentionally not retained because arbitrary contact, media and editor fields are outside this evidence contract.</p>
          <p>The retained OSM-derived database is offered under ODbL 1.0. Application code outside the data directory keeps its repository licence; no relicensing of OSM data is asserted.</p>
          <p>These features are open community context, not official parcels, cadastral records, zoning, ownership, planning approvals or valuations. A missing record is not proof of real-world absence.</p>
        </div>
        <aside className="mt-8 rounded-2xl border border-[#f2d18d] bg-[#fff9ed] p-4 text-sm font-semibold leading-6 text-[#7a4d00]">
          Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
        </aside>
        <Link href="/prototype/point-to-object" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white">
          Return to prototype
        </Link>
      </article>
    </main>
  );
}

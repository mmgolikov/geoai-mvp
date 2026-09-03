import Link from "next/link";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";

export default function PointToObjectSourceOfferPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 text-ink sm:px-8">
      <article className="mx-auto max-w-3xl rounded-[24px] border border-line bg-white p-6 shadow-soft sm:p-10">
        <header className="flex items-center gap-3 border-b border-line pb-6">
          <IdentitySymbol />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">GeoAI data sources</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em]">Open map data notice</h1>
          </div>
        </header>
        <div className="mt-7 space-y-5 text-sm leading-7 text-muted">
          <p>The interactive map uses OpenFreeMap vector tiles derived from OpenStreetMap data. After a direct map click, a bounded server lookup uses Nominatim to resolve the available object name, address, classification and safe mapped attributes.</p>
          <p>
            © OpenStreetMap contributors. OpenStreetMap data is available under the Open Data Commons Open Database License 1.0 (ODbL):{" "}
            <a className="font-semibold text-brand underline underline-offset-4" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">copyright and licence</a>.
          </p>
          <p>Only allowlisted object, classification and address fields are shown. OpenAI receives a smaller server-built projection; raw provider responses, arbitrary contact fields, contributor metadata, display addresses and full object geometry are not sent to the model.</p>
          <p>These features are open community context, not official parcels, cadastral records, zoning, ownership, planning approvals or valuations. A missing record is not proof of real-world absence.</p>
        </div>
        <aside className="mt-8 rounded-2xl border border-[#f2d18d] bg-[#fff9ed] p-4 text-sm font-semibold leading-6 text-[#7a4d00]">
          Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
        </aside>
        <Link href="/prototype/point-to-object" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white">
          Return to map
        </Link>
      </article>
    </main>
  );
}

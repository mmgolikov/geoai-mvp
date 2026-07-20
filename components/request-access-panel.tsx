"use client";

import Link from "next/link";
import { useState } from "react";

type RequestDetails = {
  organization: string;
  workEmail: string;
  useCase: string;
  geography: string;
  note: string;
};

const emptyDetails: RequestDetails = {
  organization: "",
  workEmail: "",
  useCase: "",
  geography: "",
  note: ""
};

function buildRequestBrief(details: RequestDetails) {
  const lines = [
    "GeoAI public request brief",
    "",
    `Organization: ${details.organization.trim()}`,
    `Work email: ${details.workEmail.trim()}`,
    `Use case / decision to support: ${details.useCase.trim()}`,
    `Geography / AOI description: ${details.geography.trim()}`
  ];

  if (details.note.trim()) lines.push(`Optional note: ${details.note.trim()}`);
  lines.push(
    "",
    "Data handling status: No information has been sent. Share this brief only through an approved contact channel."
  );
  return lines.join("\n");
}

export function RequestAccessPanel() {
  const [details, setDetails] = useState<RequestDetails>(emptyDetails);
  const [brief, setBrief] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  function updateDetail(field: keyof RequestDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setBrief(null);
    setCopyStatus(null);
  }

  function prepareBrief(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBrief(buildRequestBrief(details));
    setCopyStatus(null);
  }

  async function copyBrief() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief);
      setCopyStatus("Request brief copied. No information has been sent.");
    } catch {
      setCopyStatus("Copy is unavailable. Select the brief text and copy it manually.");
    }
  }

  return (
    <section className="bg-gradient-to-br from-white via-[#fbfdff] to-[#edf6ff] px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[calc(100vh-64px)] lg:py-12">
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <aside className="rounded-[28px] border border-line bg-[#f0f7ff] p-6 sm:p-8 lg:sticky lg:top-24 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">GeoAI public request</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[46px] sm:leading-[50px]">
            Prepare a bounded request brief.
          </h1>
          <p className="mt-6 text-base leading-7 text-muted">
            Describe one organization, one decision and one geography. GeoAI will format the details locally so you can share them through an approved contact channel.
          </p>

          <div className="mt-7 border-t border-line pt-6">
            <h2 className="text-sm font-semibold text-ink">Public form boundary</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              No approved request backend or public contact destination is connected yet. This page does not transmit or store the information you enter.
            </p>
          </div>

          <p className="mt-6 border-l-4 border-risk bg-[#fff2de] px-4 py-3 text-sm font-medium leading-6 text-risk">
            Do not include confidential, regulated, sensitive or client-protected information.
          </p>
          <p className="mt-6 text-xs leading-5 text-muted">
            Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
          </p>
        </aside>

        <div className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Prepare request brief</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink">Decision context</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Required details stay only in this page's React memory. Submitting this form generates text; it does not send a request.
          </p>

          <form className="mt-7 grid gap-5" onSubmit={prepareBrief}>
            <label className="grid gap-2" htmlFor="request-organization">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Organization</span>
              <input
                id="request-organization"
                name="organization"
                required
                autoComplete="organization"
                maxLength={120}
                value={details.organization}
                onChange={(event) => updateDetail("organization", event.target.value)}
                className="min-h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <label className="grid gap-2" htmlFor="request-email">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Work email</span>
              <input
                id="request-email"
                name="workEmail"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={details.workEmail}
                onChange={(event) => updateDetail("workEmail", event.target.value)}
                className="min-h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <label className="grid gap-2" htmlFor="request-use-case">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Use case / decision to support</span>
              <textarea
                id="request-use-case"
                name="useCase"
                required
                rows={4}
                maxLength={800}
                value={details.useCase}
                onChange={(event) => updateDetail("useCase", event.target.value)}
                className="min-h-28 resize-y rounded-[10px] border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <label className="grid gap-2" htmlFor="request-geography">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Geography / AOI description</span>
              <textarea
                id="request-geography"
                name="geography"
                required
                rows={3}
                maxLength={600}
                value={details.geography}
                onChange={(event) => updateDetail("geography", event.target.value)}
                className="min-h-24 resize-y rounded-[10px] border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <label className="grid gap-2" htmlFor="request-note">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Optional note</span>
              <textarea
                id="request-note"
                name="note"
                rows={3}
                maxLength={600}
                value={details.note}
                onChange={(event) => updateDetail("note", event.target.value)}
                className="min-h-24 resize-y rounded-[10px] border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 text-sm font-semibold text-white transition hover:bg-[#0854dd] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Prepare request brief
            </button>
          </form>

          {brief ? (
            <section className="mt-8 border-t border-line pt-7" aria-labelledby="request-brief-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Prepared locally</p>
              <h2 id="request-brief-heading" className="mt-2 text-2xl font-semibold text-ink">Request brief</h2>
              <p className="mt-3 rounded-[12px] border border-accent/30 bg-[#e8fafa] px-4 py-3 text-sm font-semibold leading-6 text-ink" role="status">
                No information has been sent. Copy this brief and share it through an approved contact channel.
              </p>
              <textarea
                aria-label="Generated request brief"
                readOnly
                value={brief}
                rows={11}
                className="mt-5 min-h-64 w-full resize-y rounded-[10px] border border-line bg-surface px-4 py-3 font-mono text-xs leading-6 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={copyBrief}
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0854dd] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Copy request brief
                </button>
                <Link
                  href="/login?next=/workspace&intent=demo"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-brand bg-white px-5 text-sm font-semibold text-brand transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Open demo instead
                </Link>
              </div>
              {copyStatus ? <p className="mt-3 text-sm text-muted" aria-live="polite">{copyStatus}</p> : null}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

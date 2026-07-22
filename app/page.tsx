import Link from "next/link";
import { AccessStatusBadge } from "@/components/auth/access-status-badge";
import { LandingHeroMap } from "@/components/landing-hero-map";

const decisionStages = [
  ["01", "Ask", "Define the place, area or criteria behind the decision."],
  ["02", "Screen", "Use relevant access, market, climate and constraint signals."],
  ["03", "Explain", "Show the ranking, drivers, risks, confidence and evidence gaps."],
  ["04", "Act", "Move a shortlist or result into a controlled validation step."],
  ["05", "Result", "Carry the decision context into a dashboard and report package."]
] as const;

const sourceFamilies = [
  ["Satellite and earth observation", "Copernicus and open imagery context", "Sample/open"],
  ["Market and place context", "Public snapshots and client-provided inputs", "Validate"],
  ["Mobility and accessibility", "OpenStreetMap and network-derived signals", "Open context"],
  ["Project evidence", "User-provided files and validation records", "Controlled"]
] as const;

const b2bRoles = ["Developer", "Asset manager", "Planner", "Risk analyst"];
const b2cRoles = ["Homebuyer", "Investor", "Business owner", "Resident"];

const faqs = [
  [
    "What decisions can GeoAI support?",
    "Site strategy, place comparison, risk screening, infrastructure and other questions where location, evidence and trade-offs matter."
  ],
  [
    "What evidence can GeoAI use?",
    "GeoAI can combine sample/open context, public snapshots and user-provided project evidence. Every source still needs rights, lineage and fitness-for-use review."
  ],
  [
    "Can I use my own data?",
    "Yes, after the protected project and file-custody path is enabled for the relevant environment. Do not submit confidential data through the public demo."
  ],
  [
    "How are approval requirements handled?",
    "GeoAI keeps screening, expert review, client validation and official authority decisions separate, with the outstanding validation step visible in the result."
  ],
  [
    "What is included in a pilot?",
    "A bounded use case, target geography, evidence plan, decision dashboard, validation route and a documented acceptance package."
  ]
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${compact ? "h-9 w-9" : "h-10 w-10"}`} aria-hidden="true">
      <span className="absolute inset-[7px] rounded-full bg-accent" />
      <span className="absolute left-0 top-[5px] h-[30px] w-[14px] rounded-l-full border-[3px] border-r-0 border-brand" />
      <span className="absolute right-0 top-[5px] h-[30px] w-[14px] rounded-r-full border-[3px] border-l-0 border-brand" />
    </span>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-0">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4">
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-xl font-bold leading-6 tracking-[-0.02em] text-ink">GeoAI</span>
            <span className="block truncate text-[11px] font-medium text-muted">Spatial decision intelligence</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Commercial navigation">
          {[
            ["Product", "#product"],
            ["Use cases", "#use-cases"],
            ["Evidence", "#evidence"],
            ["Security", "#security"],
            ["FAQ", "#faq"]
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-semibold text-ink transition hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/request-access"
            className="hidden h-12 items-center justify-center rounded-control border border-brand bg-white px-5 text-sm font-semibold text-brand transition hover:bg-surface md:inline-flex"
          >
            Prepare request brief
          </Link>
          <Link
            href="/login?next=/workspace&intent=demo"
            className="hidden h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0854dd] sm:inline-flex"
          >
            View demo
          </Link>
          <AccessStatusBadge />
        </div>
      </div>
    </header>
  );
}

function BenefitIcon({ tone, children }: { tone: "blue" | "teal" | "orange"; children: React.ReactNode }) {
  const toneClass = tone === "blue"
    ? "bg-[#e8f2ff] text-brand"
    : tone === "teal"
      ? "bg-[#e5fafa] text-accent"
      : "bg-[#fff2de] text-risk";
  return <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${toneClass}`}>{children}</span>;
}

function MapCandidate({ number, className }: { number: string; className: string }) {
  return (
    <span className={`absolute z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-xs font-bold text-white shadow-lg ${className}`}>
      {number}
    </span>
  );
}

function SiteCard({ kicker, title, note, className, selected = false }: { kicker: string; title: string; note: string; className: string; selected?: boolean }) {
  return (
    <div className={`absolute z-20 min-w-[128px] rounded-[10px] border bg-white/95 px-2.5 py-2 shadow-[0_5px_12px_rgba(5,31,71,0.16)] backdrop-blur ${selected ? "border-accent" : "border-brand/55"} ${className}`}>
      <p className={`text-[8px] font-bold uppercase tracking-[0.05em] ${selected ? "text-accent" : "text-brand"}`}>{kicker}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[8px] text-muted">{note}</p>
    </div>
  );
}

function HeroCockpit() {
  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-white p-3 shadow-panel sm:p-4">
      <div className="grid min-h-[560px] gap-3 lg:grid-cols-[minmax(0,1fr)_202px]">
        <div className="relative min-h-[430px] overflow-hidden rounded-[18px] border border-line bg-[#dceaf2] lg:min-h-0">
          <LandingHeroMap />
          <div className="absolute inset-x-4 top-4 z-20 flex h-12 items-center gap-2 rounded-[12px] border border-line bg-white/95 px-3 shadow-sm backdrop-blur">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
            <span className="min-w-0 flex-1 text-[9px] font-semibold leading-3 text-ink sm:text-[10px]">
              Screen redevelopment candidates using access, market, climate and environmental signals
            </span>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-brand text-lg font-semibold text-white">→</span>
          </div>

          <div className="absolute left-3 top-[90px] z-20 grid gap-1 rounded-[11px] border border-line bg-white/95 p-1 shadow-sm">
            {["＋", "−", "⌖", "◇", "≡"].map((item, index) => (
              <span key={item} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${index === 2 ? "bg-[#e8f2ff] text-brand" : "text-muted"}`}>{item}</span>
            ))}
          </div>

          <MapCandidate number="1" className="left-[18%] top-[18%] bg-accent" />
          <MapCandidate number="2" className="right-[19%] top-[38%]" />
          <MapCandidate number="3" className="bottom-[22%] left-[37%]" />
          <SiteCard selected kicker="Vacant site 01" title="Business Bay North" note="78 · Best overall fit" className="left-[10%] top-[28%]" />
          <SiteCard kicker="Vacant site 02" title="Canal District" note="71 · Strong access" className="right-[3%] top-[51%]" />
          <SiteCard kicker="Vacant site 03" title="Downtown Edge" note="66 · Lower exposure" className="bottom-[10%] right-[4%] hidden sm:block" />

          <div className="absolute bottom-3 left-3 z-20 w-[210px] rounded-[11px] border border-line bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[8px] font-bold uppercase text-muted">Composite suitability</p>
            <p className="mt-1 text-xs font-semibold text-ink">Selected candidate · 78</p>
            <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-[#d1e8f5] via-accent to-brand" />
          </div>
          <p className="absolute bottom-3 right-3 z-20 max-w-[190px] text-right text-[8px] leading-3 text-white/90">
            Visual marketing overlay; not an official parcel or cadastral boundary.
          </p>
        </div>

        <aside className="flex min-h-[430px] flex-col rounded-[18px] border border-line bg-white p-3 shadow-sm lg:min-h-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-brand">Workspace command</p>
          <div className="mt-2 inline-flex h-6 items-center gap-2 rounded-lg bg-[#e5fafa] px-2 text-[8px] font-bold uppercase text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Workspace ready
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-6 text-ink">Candidate screening</h2>
          <p className="mt-1 text-[10px] text-muted">Business Bay redevelopment</p>

          <div className="mt-3 grid grid-cols-2 rounded-[9px] bg-[#ebf5fc] p-[3px] text-center text-[9px] font-bold">
            <span className="rounded-[7px] bg-brand py-2 text-white">B2B</span>
            <span className="py-2 text-muted">B2C</span>
          </div>

          <div className="mt-2 rounded-[9px] border border-line bg-surface px-2.5 py-2">
            <p className="text-[8px] font-bold uppercase text-muted">Role</p>
            <p className="mt-0.5 text-[9px] font-medium text-ink">Development director</p>
          </div>
          {[
            ["Project", "Business Bay redevelopment"],
            ["Scenario", "Site strategy · redevelopment"],
            ["Evidence", "Connected project evidence"]
          ].map(([label, value]) => (
            <div key={label} className="mt-2 rounded-[10px] border border-line bg-surface px-2.5 py-2">
              <p className="text-[8px] font-bold uppercase text-muted">{label}</p>
              <p className={`mt-0.5 text-[9px] ${label === "Evidence" ? "text-accent" : "text-ink"}`}>{value}</p>
            </div>
          ))}

          <div className="mt-2 rounded-[10px] border border-accent/45 bg-[#e5fafa] px-2.5 py-2">
            <p className="text-[8px] font-bold uppercase text-accent">Selected candidate 01</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-3xl font-semibold text-brand">78</span>
              <span>
                <strong className="block text-[9px] uppercase text-ink">Conditional</strong>
                <span className="block text-[8px] text-muted">composite suitability</span>
              </span>
            </div>
            <p className="mt-1 text-[8px] text-muted">Strong access and market fit.</p>
          </div>

          <div className="mt-auto inline-flex min-h-6 items-center gap-2 rounded-lg bg-[#ebf5ff] px-2 text-[8px] font-bold text-[#2e619e]">
            <span className="h-1.5 w-1.5 rounded-full bg-risk" /> Approval requirements tracked
          </div>
        </aside>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-white via-[#fbfdff] to-[#edf6ff]">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[480px_minmax(0,1fr)] lg:items-center lg:px-0 lg:py-14">
        <div className="flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-brand">Spatial decision intelligence</p>
          <h1 className="mt-5 text-[42px] font-bold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[52px] sm:leading-[1]">
            Ask the map.<br />Move with evidence.
          </h1>
          <p className="mt-6 max-w-[450px] text-base leading-7 text-muted sm:text-[17px]">
            Screen places, compare options, and understand what supports the result — across access, market, climate, land-use and environmental signals.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/login?next=/workspace&intent=demo" className="inline-flex h-[52px] items-center justify-center rounded-control bg-brand px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0854dd]">
              View demo
            </Link>
            <Link href="/request-access" className="inline-flex h-[52px] items-center justify-center rounded-control border border-brand bg-white px-6 text-sm font-semibold text-brand transition hover:bg-surface">
              Prepare request brief
            </Link>
          </div>
          <div className="mt-7 grid gap-2">
            <p className="flex items-center gap-2.5 text-[13px] font-medium text-ink"><BenefitIcon tone="blue">⌖</BenefitIcon>Screen locations against relevant signals</p>
            <p className="flex items-center gap-2.5 text-[13px] font-medium text-ink"><BenefitIcon tone="teal">≡</BenefitIcon>Explain the ranking, drivers and gaps</p>
            <p className="flex items-center gap-2.5 text-[13px] font-medium text-ink"><BenefitIcon tone="orange">▣</BenefitIcon>Move to a controlled validation next step</p>
          </div>
          <p className="mt-6 text-xs font-medium leading-5 text-muted">Enterprise spatial intelligence · Evidence-aware decision support</p>
        </div>
        <HeroCockpit />
      </div>
    </section>
  );
}

function TrustRail() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-[1320px] divide-y divide-line px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-0">
        {[
          ["✓", "Evidence attached", "Sources, dates, coverage and lineage remain inspectable."],
          ["◎", "Assumptions visible", "Confidence, gaps and validation requirements stay in view."],
          ["→", "Controlled next step", "The result points to review, validation or approval — not a hidden conclusion."]
        ].map(([icon, title, copy]) => (
          <article key={title} className="flex min-h-28 items-center gap-4 px-4 py-6 first:pl-0 last:pr-0 md:px-8">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-lg font-bold text-brand">{icon}</span>
            <p className="text-sm leading-6 text-muted"><strong className="block text-ink">{title}</strong>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionFlow() {
  return (
    <section id="product" className="scroll-mt-24 bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0">
        <div className="grid gap-4 lg:grid-cols-[1fr_510px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">One controlled decision flow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">From spatial question to evidence-aware next action.</h2>
          </div>
          <p className="text-sm leading-7 text-muted">GeoAI keeps the question, relevant signals, explanation, validation boundary and output in one reviewable chain.</p>
        </div>
        <div className="mt-9 grid gap-3 md:grid-cols-5">
          {decisionStages.map(([number, title, copy], index) => (
            <article key={title} className={`relative min-h-[260px] overflow-hidden rounded-[20px] border p-5 ${index === 4 ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
              <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${index === 4 ? "bg-white text-brand" : "bg-[#e8f2ff] text-brand"}`}>{number}</span>
              <p className={`mt-5 text-xs font-bold uppercase tracking-[0.12em] ${index === 4 ? "text-white/80" : "text-brand"}`}>{title}</p>
              <h3 className="mt-5 text-xl font-semibold leading-7">{index === 0 ? "Define the decision" : index === 1 ? "Use relevant signals" : index === 2 ? "Make the reasoning visible" : index === 3 ? "Carry context forward" : "Decision-support outcome"}</h3>
              <p className={`mt-3 text-sm leading-6 ${index === 4 ? "text-white/80" : "text-muted"}`}>{copy}</p>
              {index === 2 ? <p className="absolute inset-x-5 bottom-5 rounded-xl bg-[#fff2de] px-3 py-2 text-xs font-semibold text-risk">Validation gap · official confirmation required</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductProof() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Product proof</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">See the decision, not just the data.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">A complete decision view showing the posture, evidence drivers, risks and the next recommended action.</p>
        <div className="mt-8 overflow-hidden rounded-panel border border-line bg-white shadow-soft">
          <div className="flex flex-col gap-2 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <strong className="text-sm uppercase tracking-[0.06em] text-ink">Business Bay redevelopment · Dubai</strong>
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">Project evidence · source lineage attached</span>
          </div>
          <div className="grid lg:grid-cols-[330px_520px_minmax(0,1fr)]">
            <article className="border-b border-line p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs font-bold uppercase text-muted">Decision posture</p>
              <h3 className="mt-4 text-2xl font-semibold text-ink">Conditional screening</h3>
              <div className="mt-5 flex items-end gap-4"><span className="font-mono text-6xl font-semibold text-brand">78</span><span className="pb-2 text-xs font-bold uppercase text-muted">Medium confidence</span></div>
              <p className="mt-4 text-sm text-ink">Proceed after official project validation.</p>
              <div className="mt-6 h-2 rounded-full bg-[#e8f2ff]"><div className="h-2 w-[78%] rounded-full bg-brand" /></div>
              <p className="mt-6 rounded-xl bg-[#fff2de] px-4 py-3 text-xs font-semibold leading-5 text-risk">Validation gap · 3 open<br /><span className="font-normal">Official confirmation required.</span></p>
            </article>
            <article className="border-b border-line p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs font-bold uppercase text-muted">What shaped the result</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Top drivers</h3>
                  {["Transit & access", "Market demand", "Mixed-use surroundings"].map((item, index) => <div key={item} className="mt-4"><div className="text-xs font-medium text-ink">{item}</div><div className="mt-2 h-1.5 rounded-full bg-[#e8f2ff]"><div className="h-full rounded-full bg-accent" style={{ width: `${88 - index * 13}%` }} /></div></div>)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Top risks</h3>
                  {["Flood exposure", "Climate & coastal exposure", "Environmental constraints"].map((item, index) => <div key={item} className="mt-4"><div className="text-xs font-medium text-ink">{item}</div><div className="mt-2 h-1.5 rounded-full bg-[#fff2de]"><div className="h-full rounded-full bg-risk" style={{ width: `${82 - index * 15}%` }} /></div></div>)}
                </div>
              </div>
              <p className="mt-6 text-xs leading-5 text-muted">Signals are normalized for comparison. Source lineage and caveats remain attached.</p>
            </article>
            <article className="p-6">
              <p className="text-xs font-bold uppercase text-muted">Recommended next action</p>
              <div className="mt-5 flex gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-xl text-white">→</span><h3 className="text-2xl font-semibold leading-8 text-ink">Move to validation with context attached.</h3></div>
              <p className="mt-4 text-sm leading-6 text-muted">Request an official/client validation pack before moving to investment, planning or underwriting.</p>
              <div className="mt-6 rounded-2xl bg-surface p-4 text-xs leading-6 text-ink"><strong>Why this next</strong><br />Access signal: High · Market signal: Medium<br />Validation gap: Open</div>
              <Link href="/login?next=/workspace&intent=demo" className="mt-6 inline-flex h-10 items-center justify-center rounded-control border border-brand px-4 text-sm font-semibold text-brand">Review source lineage</Link>
            </article>
          </div>
          <p className="border-t border-line px-6 py-4 text-xs font-semibold text-muted">Outputs · Candidate shortlist → Comparison → Decision dashboard → Source lineage → Report</p>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-24 bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Use cases</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">One platform, role-specific decision paths.</h2>
        <p className="mt-3 text-sm leading-7 text-muted">Start with the audience and decision — not with a catalogue of layers.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            ["B2B · Organizations", "Development and asset decisions", b2bRoles, ["Portfolio", "Signals", "Ranked sites", "Decision pack"]],
            ["B2C · Individuals", "Place decisions around personal priorities", b2cRoles, ["Place", "Priorities", "Comparison", "Next step"]]
          ].map(([kicker, title, roles, flow], audienceIndex) => (
            <article key={String(kicker)} className="rounded-panel border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="grid gap-4 sm:grid-cols-[1fr_250px] sm:items-start"><div><p className={`text-xs font-bold uppercase ${audienceIndex === 0 ? "text-brand" : "text-personal"}`}>{String(kicker)}</p><h3 className="mt-2 text-2xl font-semibold text-ink">{String(title)}</h3></div><p className="text-sm leading-6 text-muted">Compare relevant signals and retain the evidence and validation boundary behind the result.</p></div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{(roles as readonly string[]).map((role) => <span key={role} className="inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink">{role}</span>)}</div>
              <div className="mt-5 grid gap-2 rounded-2xl bg-surface p-4 sm:grid-cols-4">{(flow as readonly string[]).map((step, index) => <div key={step} className="relative rounded-xl bg-white p-3 text-xs font-semibold text-ink"><span className={`mb-2 block text-[10px] ${audienceIndex === 0 ? "text-brand" : "text-personal"}`}>0{index + 1}</span>{step}</div>)}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EvidenceSection() {
  return (
    <section id="evidence" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Evidence and source lineage</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Know what supports the result — and what still needs validation.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">GeoAI links source, method, analytical role, coverage and caveats instead of presenting an unsupported score.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
          <article className="rounded-panel border border-line bg-surface p-5"><h3 className="text-lg font-semibold text-ink">Source families</h3><div className="mt-4 grid gap-3">{sourceFamilies.map(([name, examples, state]) => <div key={name} className="rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-3"><strong className="text-xs text-ink">{name}</strong><span className="rounded-full bg-[#e5fafa] px-2 py-1 text-[9px] font-bold uppercase text-accent">{state}</span></div><p className="mt-1 text-[11px] leading-5 text-muted">{examples}</p></div>)}</div></article>
          <article className="rounded-panel border border-line bg-surface p-5"><h3 className="text-lg font-semibold text-ink">Evidence graph</h3><p className="mt-2 text-xs leading-5 text-muted">Normalize · link · explain</p><div className="mt-5 grid grid-cols-3 gap-2">{["Imagery", "Market", "Access"].map((item) => <span key={item} className="rounded-xl bg-white p-3 text-center text-[10px] font-semibold text-ink">{item}</span>)}</div><div className="mx-auto h-8 w-px bg-line" /><div className="rounded-2xl bg-brand p-5 text-center text-white"><strong className="block">GeoAI evidence graph</strong><span className="mt-1 block text-xs text-white/75">Question, source, method and result</span></div><div className="mx-auto h-8 w-px bg-line" /><div className="grid grid-cols-3 gap-2">{["Drivers", "Gaps", "Report"].map((item) => <span key={item} className="rounded-xl bg-white p-3 text-center text-[10px] font-semibold text-ink">{item}</span>)}</div></article>
          <article className="rounded-panel border border-line bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold text-ink">Result manifest</h3><p className="mt-2 text-xs leading-5 text-muted">A compact record of evidence readiness and analytical use.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Coverage", "Target and time window"], ["Freshness", "Date and update state"], ["Role", "How it shaped the result"]].map(([label, copy]) => <div key={label} className="rounded-xl bg-surface p-3"><strong className="text-xs text-brand">{label}</strong><p className="mt-2 text-[11px] leading-5 text-muted">{copy}</p></div>)}</div><div className="mt-5 overflow-hidden rounded-2xl border border-line"><div className="grid grid-cols-3 bg-surface px-3 py-2 text-[9px] font-bold uppercase text-muted"><span>Source</span><span>Method</span><span>Result</span></div>{[["Open mobility", "Network proxy", "Access driver"], ["Public market", "Snapshot context", "Demand signal"], ["User evidence", "Controlled review", "Validation record"]].map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-line px-3 py-3 text-[10px] text-ink">{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}</div><p className="mt-5 rounded-xl bg-[#fff2de] p-3 text-xs leading-5 text-risk">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p></article>
        </div>
      </div>
    </section>
  );
}

function WhyGeoAI() {
  return (
    <section className="bg-surface py-16 sm:py-20"><div className="mx-auto grid max-w-[1320px] gap-10 px-5 sm:px-8 lg:grid-cols-[440px_1fr] lg:px-0"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Why GeoAI</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Built for decisions that need an audit trail.</h2><p className="mt-5 text-sm leading-7 text-muted">GeoAI connects the question, evidence, method, result and next action — so the work can be reviewed, compared and carried forward.</p><Link href="/login?next=/workspace&intent=demo" className="mt-7 inline-flex h-11 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white">Open workspace</Link></div><div className="grid gap-4 md:grid-cols-3">{[["01", "Evidence stays inspectable.", "Sources, dates, coverage and lineage remain attached.", "Source lineage"], ["02", "Methods stay explainable.", "Drivers, risks, confidence and validation gaps stay visible.", "Decision dashboard"], ["03", "Work moves forward.", "Shortlists, comparisons, reports and validation packs carry context onward.", "Action-ready package"]].map(([number, title, copy, output]) => <article key={number} className="rounded-panel border border-line bg-white p-5"><span className="text-xs font-bold text-brand">{number}</span><h3 className="mt-5 text-xl font-semibold leading-7 text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{copy}</p><p className="mt-8 text-[10px] font-bold uppercase text-accent">Output · {output}</p></article>)}</div></div></section>
  );
}

function OperatingBoundary() {
  return (
    <section id="security" className="scroll-mt-24 bg-white py-16 sm:py-20"><div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Accountable handoff</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">The platform supports the decision. It does not replace accountable review.</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-muted">Screening, expert review and authority/owner decisions remain separate stages with explicit responsibility.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{[["01", "Platform", "Screens and explains", "GeoAI responsibility", "blue"], ["02", "Expert review", "Tests assumptions and gaps", "Expert/client responsibility", "teal"], ["03", "Authority / owner", "Validates and decides", "Authority/owner responsibility", "orange"]].map(([number, stage, title, owner, tone]) => <article key={stage} className="rounded-panel border border-line bg-surface p-5"><div className="flex items-center gap-3"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${tone === "blue" ? "bg-[#e8f2ff] text-brand" : tone === "teal" ? "bg-[#e5fafa] text-accent" : "bg-[#fff2de] text-risk"}`}>{number}</span><p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{stage}</p></div><h3 className="mt-6 text-xl font-semibold text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">Evidence, decisions and outstanding requirements remain attached through the handoff.</p><p className="mt-8 rounded-full bg-white px-3 py-2 text-center text-[10px] font-bold uppercase text-ink">{owner}</p></article>)}</div></div></section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-surface py-16 sm:py-20"><div className="mx-auto grid max-w-[1320px] gap-10 px-5 sm:px-8 lg:grid-cols-[380px_1fr] lg:px-0"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">FAQ</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Questions before you start.</h2><p className="mt-5 text-sm leading-7 text-muted">Start with your decision, geography and evidence requirements.</p><div className="mt-7 rounded-2xl border border-line bg-white p-4 text-xs leading-6 text-muted"><strong className="block text-ink">Start checklist</strong>Decision to support · Geography/AOI · Evidence available · Validation authority</div></div><div className="overflow-hidden rounded-panel border border-line bg-white">{faqs.map(([question, answer], index) => <details key={question} open={index === 0} className="group border-b border-line last:border-b-0"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 text-sm font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"><span>{question}</span><span className="text-xl text-brand group-open:rotate-45">＋</span></summary><p className="px-5 pb-5 text-sm leading-7 text-muted">{answer}</p></details>)}</div></div></section>
  );
}

function Conversion() {
  return (
    <section className="overflow-hidden bg-brand py-16 text-white sm:py-20"><div className="mx-auto grid max-w-[1320px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_620px] lg:px-0"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">Start a pilot</p><h2 className="mt-3 max-w-lg text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Bring one decision and one place.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/75">Prepare the workflow, evidence boundary, data requirements and approval path for an approved contact channel.</p><ul className="mt-6 grid gap-2 text-sm text-white/90"><li>• Use-case framing and target area</li><li>• Evidence plan and known gaps</li><li>• Decision dashboard</li><li>• Recommended approval route</li></ul></div><div className="rounded-panel bg-white p-6 text-ink shadow-panel sm:p-8"><p className="text-xs font-bold uppercase text-brand">Prepare a pilot request</p><h3 className="mt-3 text-2xl font-semibold">Start with a bounded request brief.</h3><p className="mt-3 text-sm leading-6 text-muted">Format your organization, decision type and geography locally. No request backend is connected, so the page sends nothing. Do not include confidential, regulated, sensitive or client-protected information.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Organization", "Work email", "Use case / decision", "Geography / AOI"].map((item) => <div key={item} className="rounded-xl border border-line bg-surface px-4 py-3"><span className="text-[10px] font-bold uppercase text-muted">{item}</span><p className="mt-1 text-sm text-ink">Formatted locally</p></div>)}</div><Link href="/request-access" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white">Prepare request brief</Link></div></div></section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink py-12 text-white"><div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-0"><div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]"><div><BrandMark /><p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Spatial decision intelligence<br />From spatial questions to evidence-aware next actions.</p></div>{[["Product", ["Workspace", "Projects", "Reports"]], ["Use cases", ["Site strategy", "Risk review", "Infrastructure", "Public sector"]], ["Evidence", ["Source lineage", "Data status", "Validation boundary"]], ["Company", ["About", "Contact", "Privacy"]]].map(([title, items]) => <div key={String(title)}><h3 className="text-xs font-bold uppercase text-white/50">{String(title)}</h3><div className="mt-4 grid gap-3 text-sm text-white/75">{(items as string[]).map((item) => <span key={item}>{item}</span>)}</div></div>)}</div><div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 GeoAI. All rights reserved.</p><p>Terms · Privacy · Accessibility · Evidence-aware decision support</p></div></div></footer>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white text-ink">
      <LandingHeader />
      <HeroSection />
      <TrustRail />
      <DecisionFlow />
      <ProductProof />
      <UseCases />
      <EvidenceSection />
      <WhyGeoAI />
      <OperatingBoundary />
      <FAQ />
      <Conversion />
      <Footer />
    </main>
  );
}

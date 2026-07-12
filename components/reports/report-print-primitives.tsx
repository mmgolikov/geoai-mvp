import type { SourceLineageSnapshot } from "@/src/lib/project-workspace-types";

export function PrintPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`geoai-print-page ${className}`}>{children}</section>;
}

export function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="geoai-print-section avoid-break" data-report-section={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrintCard({ label, value, note, field }: { label: string; value: React.ReactNode; note?: React.ReactNode; field?: string }) {
  return (
    <div className="geoai-print-card avoid-break" data-report-field={field}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

export function PrintList({
  items = [],
  ordered = false
}: {
  items: string[];
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className="geoai-print-list">
      {items.map((item, index) => (
        <li key={`${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 52)}`}>{item}</li>
      ))}
    </Tag>
  );
}

export function SourceLineagePrintSection({ lineage }: { lineage: SourceLineageSnapshot }) {
  const externalSources = Array.isArray(lineage?.externalSources) ? lineage.externalSources : [];
  const uploadedSources = Array.isArray(lineage?.uploadedSources) ? lineage.uploadedSources : [];
  const demoSources = Array.isArray(lineage?.demoSources) ? lineage.demoSources : [];
  const plannedValidationSources = Array.isArray(lineage?.plannedValidationSources) ? lineage.plannedValidationSources : [];
  const disclaimers = Array.isArray(lineage?.disclaimers) ? lineage.disclaimers : [];
  const groups = [
    {
      title: "External data used",
      items: externalSources.map((source) => ({
        name: source.name,
        meta: [source.status, source.dataMode, source.confidence].filter(Boolean).join(" / "),
        note: [
          source.validationStatus ? `Source quality: ${source.validationStatus.replace(/-/g, " ")}.` : null,
          source.nextValidationStep ? `Next validation: ${source.nextValidationStep}` : null,
          source.disclaimer
        ].filter(Boolean).join(" ")
      }))
    },
    {
      title: "Uploaded / client data",
      items: uploadedSources.map((source) => ({
        name: source.name,
        meta: source.type,
        note: source.note
      }))
    },
    {
      title: "Sample/open fallback",
      items: demoSources.map((source) => ({
        name: source.name,
        meta: "sample/open",
        note: source.note
      }))
    },
    {
      title: "Planned validation sources",
      items: plannedValidationSources.map((source) => ({
        name: source.name,
        meta: [source.status ?? "planned validation", source.dataMode, source.confidence].filter(Boolean).join(" / "),
        note: [
          source.validationStatus ? `Source quality: ${source.validationStatus.replace(/-/g, " ")}.` : null,
          source.nextValidationStep ? `Next validation: ${source.nextValidationStep}` : null,
          source.disclaimer
        ].filter(Boolean).join(" ")
      }))
    }
  ];

  return (
    <PrintSection title="Data Used / Source Lineage">
      <div className="geoai-print-source-grid">
        {groups.map((group) => (
          <div key={group.title} className="geoai-print-source-group avoid-break">
            <h3>{group.title}</h3>
            {group.items.length > 0 ? (
              group.items.slice(0, 6).map((item, index) => (
                <div key={`${group.title}-${index}-${item.name}`} className="geoai-print-source-card">
                  <strong>{item.name}</strong>
                  <span>{item.meta}</span>
                  <p>{item.note}</p>
                </div>
              ))
            ) : (
              <p className="geoai-print-muted">No source in this group was used in the saved report payload.</p>
            )}
          </div>
        ))}
      </div>
      <div className="geoai-print-disclaimer">
        {disclaimers.map((item, index) => (
          <p key={`lineage-disclaimer-${index}`}>{item}</p>
        ))}
      </div>
    </PrintSection>
  );
}

export function ReportHeader({
  title,
  subtitle,
  badge
}: {
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <header className="geoai-print-header avoid-break">
      <div>
        <p className="geoai-print-brand">GeoAI</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span>{badge}</span>
    </header>
  );
}

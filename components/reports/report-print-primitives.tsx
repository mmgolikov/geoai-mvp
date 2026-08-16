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
      <span>{label}: </span>
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
  const sourceName = (name: string) => {
    if (/^dld[-_].*transaction/i.test(name)) return "Illustrative local transactions context";
    if (/^(?:osm|geofabrik)[-_].*(?:road|access)/i.test(name)) return "Illustrative local roads and access context";
    return /(?:synthetic|demo|mock|fixture)/i.test(name)
      ? "Illustrative local screening context"
      : name;
  };
  const sourceStatus = (status?: string) => {
    if (!status) return null;
    const normalized = status.toLowerCase().replace(/_/g, "-");
    if (["sample-fallback", "local-fallback"].includes(normalized)) return "local snapshot";
    if (["mock", "mock-fallback", "demo", "demo-seed"].includes(normalized)) return "illustrative local";
    return status.replace(/_/g, " ");
  };
  const validationStatus = (status?: string) => {
    if (!status) return null;
    return status === "sample-only" ? "illustrative snapshot" : status.replace(/-/g, " ");
  };
  const groups = [
    {
      title: "External data used",
      items: externalSources.map((source) => ({
        name: sourceName(source.name),
        meta: [sourceStatus(source.status), source.dataMode?.replace(/_/g, " "), sourceStatus(source.confidence)].filter(Boolean).join(" / "),
        note: [
          validationStatus(source.validationStatus) ? `Source quality: ${validationStatus(source.validationStatus)}.` : null,
          source.nextValidationStep ? `Next validation: ${source.nextValidationStep}` : null,
          source.disclaimer
        ].filter(Boolean).join(" ")
      }))
    },
    {
      title: "Uploaded / client data",
      items: uploadedSources.map((source) => ({
        name: sourceName(source.name),
        meta: source.type,
        note: source.note
      }))
    },
    {
      title: "Illustrative local/public-open context",
      items: demoSources.map((source) => ({
        name: sourceName(source.name),
        meta: "illustrative screening",
        note: source.note
      }))
    },
    {
      title: "Planned validation sources",
      items: plannedValidationSources.map((source) => ({
        name: sourceName(source.name),
        meta: [sourceStatus(source.status) ?? "planned validation", source.dataMode?.replace(/_/g, " "), sourceStatus(source.confidence)].filter(Boolean).join(" / "),
        note: [
          validationStatus(source.validationStatus) ? `Source quality: ${validationStatus(source.validationStatus)}.` : null,
          source.nextValidationStep ? `Next validation: ${source.nextValidationStep}` : null,
          source.disclaimer
        ].filter(Boolean).join(" ")
      }))
    }
  ];

  return (
    <section className="geoai-print-section" data-report-section="Data Used / Source Lineage">
      <h2>Data Used / Source Lineage</h2>
      <div className="geoai-print-source-grid">
        {groups.map((group) => (
          <div key={group.title} className="geoai-print-source-group avoid-break">
            <h3>{group.title}</h3>
            {group.items.length > 0 ? (
              group.items.slice(0, 4).map((item, index) => (
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
    </section>
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

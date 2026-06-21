export function SafeCard({
  children,
  className = "",
  padded = true
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </section>
  );
}

export function EqualHeightGrid({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid min-w-0 items-stretch gap-4 ${className}`}>
      {children}
    </div>
  );
}

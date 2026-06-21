type SafeTextMode = "truncate" | "clamp" | "wrap";

export function SafeText({
  children,
  as: Tag = "p",
  mode = "wrap",
  lines = 2,
  className = ""
}: {
  children: React.ReactNode;
  as?: "p" | "span" | "div" | "h2" | "h3";
  mode?: SafeTextMode;
  lines?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const modeClass = mode === "truncate"
    ? "truncate"
    : mode === "clamp"
      ? lines === 1
        ? "line-clamp-1"
        : lines === 3
          ? "line-clamp-3"
          : lines === 4
            ? "line-clamp-4"
            : "line-clamp-2"
      : "break-words";

  return (
    <Tag className={`min-w-0 leading-snug ${modeClass} ${className}`}>
      {children}
    </Tag>
  );
}

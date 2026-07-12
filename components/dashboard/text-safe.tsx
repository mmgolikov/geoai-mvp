import type { ReactNode } from "react";

type TextSafeValueProps = {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "dt" | "dd";
  children: ReactNode;
  className?: string;
  title?: string;
  wrap?: "anywhere" | "normal";
  "data-dashboard-value"?: string;
  "data-dashboard-item-detail"?: boolean;
};

export function TextSafeValue({
  as: Component = "p",
  children,
  className = "",
  title,
  wrap = "anywhere",
  "data-dashboard-value": dashboardValue,
  "data-dashboard-item-detail": dashboardItemDetail
}: TextSafeValueProps) {
  const wrapClass = wrap === "normal"
    ? "min-w-0 whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal]"
    : "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]";

  return (
    <Component
      title={title}
      className={`${wrapClass} ${className}`}
      data-dashboard-value={dashboardValue}
      data-dashboard-item-detail={dashboardItemDetail || undefined}
    >
      {children}
    </Component>
  );
}

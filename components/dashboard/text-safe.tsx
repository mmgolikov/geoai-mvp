import type { ReactNode } from "react";

type TextSafeValueProps = {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "dt" | "dd";
  children: ReactNode;
  className?: string;
  title?: string;
  wrap?: "anywhere" | "normal";
};

export function TextSafeValue({
  as: Component = "p",
  children,
  className = "",
  title,
  wrap = "anywhere"
}: TextSafeValueProps) {
  const wrapClass = wrap === "normal"
    ? "min-w-0 whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal]"
    : "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]";

  return (
    <Component
      title={title}
      className={`${wrapClass} ${className}`}
    >
      {children}
    </Component>
  );
}

import type { ReactNode } from "react";

type TextSafeValueProps = {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "dt" | "dd";
  children: ReactNode;
  className?: string;
  title?: string;
};

export function TextSafeValue({
  as: Component = "p",
  children,
  className = "",
  title
}: TextSafeValueProps) {
  return (
    <Component
      title={title}
      className={`min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] ${className}`}
    >
      {children}
    </Component>
  );
}

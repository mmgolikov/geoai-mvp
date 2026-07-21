import type { ButtonHTMLAttributes } from "react";

export type ProductButtonVariant = "primary" | "secondary" | "quiet";
export type ProductButtonSize = "desktop" | "touch";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
  size?: ProductButtonSize;
  variant?: ProductButtonVariant;
};

const variantClasses: Record<ProductButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90 disabled:bg-muted/20 disabled:text-muted",
  secondary: "border border-brand bg-white text-brand hover:bg-surface disabled:border-line disabled:text-muted",
  quiet: "bg-transparent text-brand hover:bg-surface disabled:text-muted"
};

export function Button({
  children,
  className = "",
  disabled = false,
  isLoading = false,
  loadingLabel = "Loading",
  size = "desktop",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const height = size === "touch" ? "min-h-11" : "min-h-10";

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      data-figma-node="202:68"
      className={`geoai-v32 inline-flex min-w-[140px] items-center justify-center gap-2 rounded-action px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed ${height} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
      ) : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}

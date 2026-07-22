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
  primary: "bg-[var(--geoai-button-primary)] text-white hover:bg-[var(--geoai-button-primary-hover)] disabled:bg-[var(--geoai-component-disabled-bg)] disabled:text-[var(--geoai-component-disabled-text)]",
  secondary: "border border-[var(--geoai-component-focus)] bg-white text-[var(--geoai-component-focus)] hover:bg-[var(--geoai-chip-spatial-bg)] disabled:border-[var(--geoai-chip-neutral-border)] disabled:bg-white disabled:text-[var(--geoai-component-disabled-text)]",
  quiet: "bg-transparent text-[var(--geoai-component-focus)] hover:bg-[var(--geoai-button-quiet-hover)] disabled:text-[var(--geoai-component-disabled-text)]"
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
  const height = size === "touch" ? "h-11" : "h-10";

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      data-figma-node="202:68"
      className={`geoai-v32 inline-flex w-[140px] min-w-[140px] items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--geoai-component-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${height} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <span data-loading-indicator aria-hidden="true" className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
      ) : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}

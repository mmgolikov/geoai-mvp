"use client";

export type SegmentSwitchOption<T extends string> = {
  label: string;
  value: T;
};

export type SegmentSwitchProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly [SegmentSwitchOption<T>, SegmentSwitchOption<T>];
  size?: "desktop" | "touch";
  value: T;
};

export function SegmentSwitch<T extends string>({
  ariaLabel,
  className = "",
  disabled = false,
  onChange,
  options,
  size = "desktop",
  value
}: SegmentSwitchProps<T>) {
  return (
    <div
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      role="group"
      data-figma-node="204:73"
      className={`geoai-v32 grid w-full max-w-[320px] grid-cols-2 gap-1 rounded-action border border-line bg-surface p-1 ${size === "touch" ? "min-h-[52px]" : "min-h-11"} ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`min-w-0 rounded-control px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:text-muted ${
              isActive && !disabled ? "bg-accent text-white" : "text-muted hover:bg-white"
            }`}
          >
            <span className="block [overflow-wrap:anywhere]">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

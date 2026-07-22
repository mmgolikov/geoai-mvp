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
      className={`geoai-v32 grid max-w-full grid-cols-2 gap-1 rounded-[14px] border border-[#dde3ea] bg-[#eef2f6] p-1 ${size === "touch" ? "h-[52px] w-[320px]" : "h-11 w-[300px]"} ${className}`}
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
            className={`min-w-0 whitespace-nowrap rounded-[10px] px-3 text-[12px] font-semibold leading-4 !tracking-[0.2px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769e0] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:text-[#667587] ${
              isActive
                ? disabled
                  ? "bg-[#dde3ea] text-[#667587]"
                  : "bg-[#087f8c] text-white"
                : "text-[var(--geoai-component-inactive-text)] hover:bg-white disabled:text-[var(--geoai-component-disabled-text)] disabled:hover:bg-transparent"
            }`}
          >
            <span className="block whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

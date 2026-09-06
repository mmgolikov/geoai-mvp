"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

type ReliableSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export const ReliableSelect = forwardRef<HTMLSelectElement, ReliableSelectProps>(
  function ReliableSelect({ children, className = "", wrapperClassName = "", ...props }, ref) {
    return (
      <span className={`relative block min-w-0 ${wrapperClassName}`}>
        <select ref={ref} {...props} className={`w-full appearance-none pr-11 ${className}`}>
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 grid w-11 place-items-center text-[#667085]"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    );
  }
);

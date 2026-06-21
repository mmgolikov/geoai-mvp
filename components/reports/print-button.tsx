"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
      onClick={() => window.print()}
    >
      Print / Save PDF
    </button>
  );
}

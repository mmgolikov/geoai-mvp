import type { ReactNode, SVGProps } from "react";

export type PointObjectIconName =
  | "compare"
  | "culture"
  | "daily-needs"
  | "expand"
  | "health"
  | "map"
  | "parks"
  | "school"
  | "split"
  | "tourism"
  | "transport";

const paths: Record<PointObjectIconName, ReactNode> = {
  compare: <><path d="M8 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /><path d="M16 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M12 3v18M8.5 9.5 6 12l2.5 2.5M15.5 9.5 18 12l-2.5 2.5" /></>,
  culture: <><path d="m3 9 9-5 9 5" /><path d="M5 10h14M6 18h12M4 21h16M7 10v8m5-8v8m5-8v8" /></>,
  "daily-needs": <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
  expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><path d="m3 8 6-6m12 6-6-6M3 16l6 6m12-6-6 6" /></>,
  health: <><path d="M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z" /><path d="M9 13h6m-3-3v6" /></>,
  map: <><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2V6Z" /><path d="M8 4v14m8-12v14" /></>,
  parks: <><path d="M12 3 7 10h3l-4 6h5v5h2v-5h5l-4-6h3l-5-7Z" /></>,
  school: <><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 13v4c3 2 7 2 10 0v-4M21 10v6" /></>,
  split: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 12h18" /></>,
  tourism: <><path d="M4 20h16M6 20V9l6-5 6 5v11" /><path d="M9 20v-5h6v5M9 10h.01M15 10h.01" /></>,
  transport: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M8 7h8M7 13h10M8 19v2m8-2v2" /><circle cx="8.5" cy="15.5" r=".5" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r=".5" fill="currentColor" stroke="none" /></>
};

export function PointObjectIcon({ name, ...props }: { name: PointObjectIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

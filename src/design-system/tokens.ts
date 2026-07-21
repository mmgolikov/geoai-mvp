export const productSystemV32Tokens = {
  version: "Product System v3.2",
  figmaFileKey: "TAzDqOvRCw1mQGMU3Y4S9H",
  color: {
    ink: "#06122e",
    muted: "#4d6694",
    line: "#ccdef5",
    surface: "#f4f9ff",
    brand: "#064fcf",
    accent: "#06717a",
    personal: "#5b48d8",
    risk: "#a63f00"
  },
  dimension: {
    header: "64px",
    desktopControlMinimum: "40px",
    primaryTouchTarget: "44px"
  },
  radius: {
    control: "12px",
    action: "14px",
    card: "16px",
    panel: "24px"
  },
  typography: {
    product: "var(--font-geist), Geist, Arial, sans-serif"
  }
} as const;

export type ProductSystemV32Tokens = typeof productSystemV32Tokens;
export type ProductSystemColor = keyof ProductSystemV32Tokens["color"];

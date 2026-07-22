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

export const productSystemV32ComponentTokens = {
  version: "Product System v3.2 component compatibility",
  button: {
    figmaNode: "202:68",
    color: {
      primaryDefault: "#087f8c",
      primaryHover: "#006c78",
      focusAndSecondary: "#1769e0",
      disabledBackground: "#eef2f6",
      disabledText: "#667587",
      quietHover: "#e8f7fa",
      secondaryBackground: "#ffffff"
    },
    geometry: {
      desktopHeight: "40px",
      touchHeight: "44px",
      width: "140px",
      minimumWidth: "140px",
      radius: "14px",
      loadingIndicator: "14px"
    }
  },
  statusChip: {
    figmaNode: "203:24",
    color: {
      neutral: { background: "#eef2f6", border: "#dde3ea", text: "#667587" },
      spatial: { background: "#eaf2ff", border: "#bfd3f4", text: "#1769e0" },
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#a85d00" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "24px", defaultHeight: "28px" }
  },
  segmentSwitch: {
    figmaNode: "204:73",
    color: {
      containerBackground: "#eef2f6",
      containerBorder: "#dde3ea",
      activeOption: "#087f8c",
      focusBoundary: "#1769e0",
      inactiveAndDisabledText: "#667587",
      disabledSelectedFill: "#dde3ea"
    },
    geometry: {
      optionRadius: "10px",
      outerRadius: "14px",
      desktopWidth: "300px",
      desktopHeight: "44px",
      touchWidth: "320px",
      touchHeight: "52px"
    }
  },
  validationCaveat: {
    figmaNode: "205:41",
    color: {
      validation: { background: "#fff5e0", border: "#e8c77b", text: "#7a4600" },
      critical: { background: "#fff0f0", border: "#dfa69a", text: "#9f3412" }
    },
    geometry: { compactHeight: "44px", fullMinimumHeight: "88px", radius: "14px" },
    label: { validation: "VALIDATION REQUIRED", critical: "BLOCKING ISSUE" }
  },
  authenticatedProfileBadge: {
    figmaNode: "219:425",
    color: {
      background: "#e8f3f2",
      borderAndInitials: "#064fcf",
      focusBoundary: "#1769e0"
    },
    geometry: { width: "40px", height: "40px" },
    persistentOuterHalo: false,
    authenticatedIndicator: true
  }
} as const;

export type ProductSystemV32Tokens = typeof productSystemV32Tokens;
export type ProductSystemColor = keyof ProductSystemV32Tokens["color"];
export type ProductSystemV32ComponentTokens = typeof productSystemV32ComponentTokens;

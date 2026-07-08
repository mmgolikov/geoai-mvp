import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        night: "#0B1220",
        muted: "#5f6b7a",
        soft: "#98A2B3",
        line: "#dde3ea",
        surface: "#f6f8fb",
        brand: "#183B5B",
        "brand-hover": "#102F49",
        "spatial-blue": "#235D8C",
        "signal-blue": "#2F6DB5",
        "cobalt-signal": "#405CFF",
        ice: "#E6F1F7",
        "ice-soft": "#F1F6FA",
        "map-blue-gray": "#DFE8EC",
        "validation-gold": "#C5A76A",
        "validation-soft": "#FFF9E8",
        "critical-red": "#9F3412",
        "critical-soft": "#FFF4ED",
        accent: "#c5a76a"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 51, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

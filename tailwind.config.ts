import type { Config } from "tailwindcss";
import { productSystemV32Tokens } from "./src/design-system/tokens";

const v32 = productSystemV32Tokens;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ...v32.color,
        navy: v32.color.ink
      },
      fontFamily: {
        product: ["var(--font-geist)", "Geist", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(11, 23, 51, 0.10)",
        panel: "0 16px 40px rgba(11, 23, 51, 0.16)"
      },
      borderRadius: {
        control: v32.radius.control,
        action: v32.radius.action,
        card: v32.radius.card,
        panel: v32.radius.panel
      },
      height: {
        "product-header": v32.dimension.header
      },
      minHeight: {
        "action": v32.dimension.desktopControlMinimum,
        "touch": v32.dimension.primaryTouchTarget
      }
    }
  },
  plugins: []
};

export default config;

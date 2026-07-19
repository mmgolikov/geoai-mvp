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
        ink: "#06122e",
        muted: "#4d6694",
        line: "#ccdef5",
        surface: "#f4f9ff",
        brand: "#064fcf",
        accent: "#06717a",
        personal: "#5b48d8",
        risk: "#a63f00",
        navy: "#06122e"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(11, 23, 51, 0.10)",
        panel: "0 16px 40px rgba(11, 23, 51, 0.16)"
      },
      borderRadius: {
        control: "12px",
        panel: "24px"
      }
    }
  },
  plugins: []
};

export default config;

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
        muted: "#5f6b7a",
        line: "#dde3ea",
        surface: "#f6f8fb",
        brand: "#174f63",
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

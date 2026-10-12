import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e6ecf5",
        bg: {
          DEFAULT: "#0a0e1a",
          deep: "#060912",
        },
        panel: "rgba(255,255,255,0.03)",
        line: "rgba(255,255,255,0.08)",
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#9d83ff",
        },
        ok: "#10b981",
        watch: "#f59e0b",
        bad: "#f43f5e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      animation: {
        scan: "scan 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

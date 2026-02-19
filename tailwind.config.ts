import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#f8fafc",
          elevated: "#f1f5f9",
          card: "#ffffff",
          border: "#e2e8f0",
        },
        accent: {
          DEFAULT: "#b8860b",
          hover: "#c9a227",
          muted: "rgba(184, 134, 11, 0.12)",
        },
        muted: "#64748b",
        primary: "#0f172a",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 12px 28px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;

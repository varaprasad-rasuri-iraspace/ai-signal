import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#00ff88",
          glow: "#00ff8855",
        },
        secondary: {
          DEFAULT: "#00ccff",
          glow: "#00ccff55",
        },
        accent: {
          DEFAULT: "#ff00ff",
          glow: "#ff00ff55",
        },
        card: {
          DEFAULT: "rgba(10, 10, 20, 0.8)",
          border: "rgba(0, 255, 136, 0.2)",
        },
        radar: {
          pulse: "rgba(0, 255, 136, 0.1)",
          ring: "rgba(0, 255, 136, 0.3)",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "glow": {
          "0%": { boxShadow: "0 0 5px rgba(0, 255, 136, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.4)" },
        },
        "fadeIn": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slideUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 136, 0.05) 1px, transparent 1px)",
        "radar-gradient": "radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
    },
  },
  plugins: [],
};
export default config;

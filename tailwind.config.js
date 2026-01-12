/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-0": "#120024",
        "bg-1": "#1A0033",
        "bg-2": "#24004A",
        "pl-purple": "#38003C",
        "accent-mint": "#00FF87",
        "highlight-pink": "#FF005A",
        "status-hot": "#FF005A",
        "status-rising": "#00FF87",
        "status-cooling": "#A082FF",
        "status-unstable": "#FFD75A",
        text: {
          strong: "#FFFFFF",
          DEFAULT: "rgba(255,255,255,0.86)",
          muted: "rgba(255,255,255,0.62)",
          faint: "rgba(255,255,255,0.46)",
        },
        border: {
          subtle: "rgba(255,255,255,0.08)",
          "card-inner": "rgba(255,255,255,0.06)",
        },
        divider: "rgba(255,255,255,0.10)",
        skeleton: {
          bg: "rgba(255,255,255,0.06)",
          highlight: "rgba(255,255,255,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        h1: ["32px", { lineHeight: "1.12", fontWeight: "800" }],
        h2: ["24px", { lineHeight: "1.18", fontWeight: "800" }],
        h3: ["18px", { lineHeight: "1.22", fontWeight: "700" }],
        body: ["14px", { lineHeight: "1.55", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "1.35", fontWeight: "500" }],
      },
      borderRadius: {
        card: "16px",
        chip: "999px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.35)",
        hover: "0 14px 38px rgba(0,0,0,0.45)",
        "glow-mint": "0 0 0 1px rgba(0,255,135,0.22)",
      },
      maxWidth: {
        content: "1120px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

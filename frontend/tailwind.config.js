/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        codrai: {
          ink: "#050505",
          panel: "#140B1F",
          line: "rgba(168,85,247,0.22)",
          cyan: "#A855F7",
          mint: "#74f7c5",
          gold: "#f4c96b",
        },
      },
      boxShadow: {
        glow: "0 24px 90px rgba(168, 85, 247, 0.22)",
      },
    },
  },
  plugins: [],
};

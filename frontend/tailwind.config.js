/** @type {import('tailwindcss').Config} */
// Ozel palet: sicak grafit notrler + sage/teal vurgu.
// Tailwind'in varsayilan slate/cyan/fuchsia... olceklerini ezerek tum bilesenlere tek noktadan uygulanir.
const graphite = {
  50: "#f7f6f3", 100: "#efede8", 200: "#e1ded6", 300: "#c9c5ba", 400: "#9d998d",
  500: "#77746a", 600: "#5a574f", 700: "#403e38", 800: "#2b2a26", 900: "#1f1e1b", 950: "#151412",
};
const teal = {
  50: "#eef8f6", 100: "#d6efea", 200: "#b0e0d8", 300: "#8fd0c5", 400: "#5fb8aa",
  500: "#3a9d8f", 600: "#2d8074", 700: "#25665d", 800: "#1f4f49", 900: "#1a3d39", 950: "#112826",
};
const clay = {
  50: "#fbf3ef", 100: "#f5e0d7", 200: "#ebc3b2", 300: "#dea28a", 400: "#d18568",
  500: "#c2674f", 600: "#a65240", 700: "#864234", 800: "#6b362d", 900: "#4d2822", 950: "#2c1713",
};
const dusk = {
  50: "#f1f3f9", 100: "#e0e5f2", 200: "#c4cde6", 300: "#a1afd4", 400: "#8091c2",
  500: "#6376b0", 600: "#4f6094", 700: "#3f4d78", 800: "#333e60", 900: "#283049", 950: "#181c2b",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: graphite,
        cyan: teal,
        sky: teal,
        teal,
        fuchsia: clay,
        pink: clay,
        rose: { ...clay, 300: "#e8a399", 400: "#d9776a", 500: "#c9564a" },
        indigo: dusk,
        violet: dusk,
        blue: dusk,
      },
    },
  },
  plugins: [],
};

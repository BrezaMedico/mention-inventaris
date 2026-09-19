import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mention: {
          black: "#0A0A0A",
          dark: "#141414",
          surface: "#1E1E1E",
          border: "#2E2E2E",
          yellow: "#FACC15",
          yellowDark: "#EAB308",
          yellowLight: "#FEF08A",
        },
      },
    },
  },
  plugins: [],
};
export default config;

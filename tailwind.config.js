/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // tailwind.config.js
theme: {
  extend: {
    colors: { primary: "#059669", accent: "#D97706" },
    fontFamily: { sans: ["Inter", "sans-serif"] },
  }
}
,
  plugins: [],
}

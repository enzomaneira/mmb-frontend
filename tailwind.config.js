/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#F8B4D9",
          "pink-dark": "#E879A9",
          "pink-deep": "#D9468F",
          yellow: "#FFE066",
          "yellow-dark": "#F5C518",
          cream: "#FFF8F0",
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(217, 70, 143, 0.12)",
      },
    },
  },
  plugins: [],
};

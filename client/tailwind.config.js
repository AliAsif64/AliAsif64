/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe8ff",
          200: "#b8d0ff",
          300: "#8ab0ff",
          400: "#5a8bff",
          500: "#3466f6",
          600: "#254dd6",
          700: "#1d3cad",
          800: "#1c3489",
          900: "#1b2f6d",
        },
      },
    },
  },
  plugins: [],
};

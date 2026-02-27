/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0feff',
          100: '#dbfaff',
          200: '#bdf5ff',
          300: '#8eedff',
          400: '#58e0ff',
          500: '#0dffff', // Base color
          600: '#00d1e6',
          700: '#00a6bb',
          800: '#008496',
          900: '#066d7d',
          950: '#004754',
        },
      },
    },
  },
  plugins: [],
};

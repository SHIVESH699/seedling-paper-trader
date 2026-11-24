/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#00B386',
          dark: '#009670',
          soft: '#EBF9F5',
        },
        loss: {
          DEFAULT: '#EB5B3C',
          soft: '#FDF1EE',
        },
      },
    },
  },
  plugins: [],
};

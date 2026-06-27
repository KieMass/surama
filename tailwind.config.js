/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff1f2',
          100: '#ffe0e1',
          200: '#ffcdd0',
          300: '#ff9ea3',
          400: '#ff7a7e',
          500: '#ff5a5f',
          600: '#ff5a5f',
          700: '#e8464b',
          800: '#c93338',
          900: '#a82025',
        },
      },
    },
  },
  plugins: [],
}

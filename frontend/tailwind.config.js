/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        status: {
          green: {
            bg: '#ecfdf5',
            border: '#a7f3d0',
            text: '#047857',
            darkBg: '#064e3b',
            darkText: '#6ee7b7'
          },
          amber: {
            bg: '#fffbeb',
            border: '#fde68a',
            text: '#b45309',
            darkBg: '#78350f',
            darkText: '#fcd34d'
          },
          red: {
            bg: '#fef2f2',
            border: '#fecaca',
            text: '#b91c1c',
            darkBg: '#7f1d1d',
            darkText: '#fca5a5'
          },
          gray: {
            bg: '#f3f4f6',
            border: '#e5e7eb',
            text: '#4b5563',
            darkBg: '#374151',
            darkText: '#d1d5db'
          }
        }
      }
    },
  },
  plugins: [],
}

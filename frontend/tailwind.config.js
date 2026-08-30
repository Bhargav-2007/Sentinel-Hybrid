/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#060913',
          card: '#090e1a',
          surface: '#0d1527',
          border: '#1e293b',
          cyan: '#00E5FF',
          emerald: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Rajdhani', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

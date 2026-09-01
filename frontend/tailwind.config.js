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
          950: '#030712',
          900: '#070f1e',
          850: '#0a172e',
          800: '#0e2040',
          700: '#16315c',
          600: '#1f457f',
          500: '#2b5ea8',
        },
        cyber: {
          cyan: '#00f0ff',
          blue: '#0088ff',
          emerald: '#00ff99',
          amber: '#ffb700',
          crimson: '#ff0055',
          purple: '#9d00ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Share Tech Mono', 'monospace'],
        display: ['Rajdhani', 'Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',
        'glow-crimson': '0 0 15px rgba(255, 0, 85, 0.45)',
        'glow-emerald': '0 0 15px rgba(0, 255, 153, 0.35)',
        'glow-amber': '0 0 15px rgba(255, 183, 0, 0.35)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'spin 4s linear infinite',
      }
    },
  },
  plugins: [],
}

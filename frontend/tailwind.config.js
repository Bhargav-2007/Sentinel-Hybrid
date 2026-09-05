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
        // GitHub Primer Dark Design System Tokens
        github: {
          canvas: '#0d1117',        // Canvas default background
          subtle: '#161b22',        // Secondary card / sidebar background
          inset: '#010409',         // Topbar / deep inset background
          overlay: '#1f242c',       // Popovers / dropdowns
          border: '#30363d',        // Default GitHub border
          borderMuted: '#21262d',   // Secondary divider border
          fg: '#f0f6fc',            // Primary text
          fgMuted: '#8b949e',       // Secondary / muted text
          fgSubtle: '#6e7681',      // Tertiary text
          blue: '#58a6ff',          // Link / Accent blue
          blueEmphasis: '#1f6feb',  // Selected blue
          green: '#3fb950',         // Success text / green
          greenEmphasis: '#238636', // GitHub Primary Button Green
          greenHover: '#2ea043',    // Button hover green
          red: '#f85149',           // Danger text / red
          redEmphasis: '#da3633',   // Danger button red
          amber: '#d29922',         // Warning text
          amberEmphasis: '#9e6a03', // Attention badge
          purple: '#a371f7',        // Merged / completed purple
          purpleEmphasis: '#8957e5',
          activeOrange: '#fd8c73',   // GitHub active tab orange marker
        },
        sentinel: {
          950: '#0d1117', // GitHub dark canvas
          900: '#161b22', // GitHub subtle
          850: '#161b22', // Card surface
          800: '#21262d', // Elevated panel
          700: '#30363d', // GitHub border
          600: '#484f58', // Secondary border
          500: '#8b949e', // Muted text
          400: '#c9d1d9', // Standard text
        },
        police: {
          navy: '#161b22',
          dark: '#0d1117',
          surface: '#161b22',
          card: '#161b22',
          border: '#30363d',
          blue: '#1f6feb',     // GitHub Blue Emphasis
          blueHover: '#388bfd',
          blueLight: '#58a6ff',
          gold: '#d29922',     // GitHub Amber
          goldLight: '#e3b341',
          emerald: '#238636',  // GitHub Green
          emeraldLight: '#3fb950',
          amber: '#d29922',
          amberLight: '#e3b341',
          red: '#da3633',      // GitHub Red
          redLight: '#f85149',
        },
        // Backward-compatible mappings
        cyber: {
          cyan: '#58a6ff',
          blue: '#1f6feb',
          emerald: '#3fb950',
          amber: '#d29922',
          crimson: '#f85149',
          purple: '#a371f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Roboto Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
        'glow-cyan': '0 0 10px rgba(56, 189, 248, 0.25)',
        'glow-crimson': '0 0 10px rgba(220, 38, 38, 0.35)',
        'glow-emerald': '0 0 10px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 10px rgba(245, 158, 11, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

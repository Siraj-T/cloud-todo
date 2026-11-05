/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f3ecdf', // Main light canvas (warm tactile paper)
          2: '#fbf6ec',       // Elevated surface / card background
          3: '#ede3d2',       // Neutral subtle divider paper tone
          soft: '#d8ccb8',    // Muted paper tone
        },
        ink: {
          DEFAULT: '#241c15', // Deep roasted espresso charcoal / primary dark bg & text
          2: '#3a2e23',       // Secondary dark ink / hover state
          3: '#1b1510',       // Deepest darkroom background
          soft: '#544636',    // Body copy & muted descriptions
        },
        sepia: {
          DEFAULT: '#7a6248', // Timeless sepia (dates, subtitles, eyebrow tags)
          soft: '#b4a184',    // Soft sepia (borders, metadata, secondary icons)
        },
        ember: {
          DEFAULT: '#c4703a', // Primary vibrant CTA & warm highlight (burnt terracotta)
          deep: '#a2542a',    // Dark terracotta / hover
        },
        gold: {
          DEFAULT: '#b8863b', // Antique gold (high priority, owner badges)
          soft: '#d4a859',
        },
        sage: {
          DEFAULT: '#3e5b52', // Optical diode status / checkmarks (heritage sage)
          soft: '#5a8275',
        },
        line: {
          DEFAULT: 'rgba(36, 28, 21, 0.12)',      // Subtle hairline on light paper
          ink: 'rgba(243, 236, 223, 0.12)',       // Subtle hairline on dark ink
        },
        // Semantic Radix bindings
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'dropzone': '0 30px 70px -30px rgba(36, 28, 21, 0.35)',
        'ember-glow': '0 10px 24px -8px rgba(196, 112, 58, 0.45)',
        'ember-glow-lg': '0 14px 30px -10px rgba(196, 112, 58, 0.6)',
        'card': '0 1px 3px rgba(36, 28, 21, 0.06), 0 1px 2px rgba(36, 28, 21, 0.04)',
        'card-elevated': '0 20px 40px -15px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'wiggle-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'diode-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 2px color-mix(in srgb, #3e5b52 25%, transparent), 0 0 6px 1px color-mix(in srgb, #3e5b52 50%, transparent)',
          },
          '50%': {
            boxShadow: '0 0 0 4px color-mix(in srgb, #3e5b52 35%, transparent), 0 0 10px 2px color-mix(in srgb, #3e5b52 80%, transparent)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        'wiggle-x': 'wiggle-x 1.6s ease-in-out infinite',
        'diode-pulse': 'diode-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};

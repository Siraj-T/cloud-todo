/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './*.html',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f3ecdf', // Main light background (warm aged paper)
          2: '#fbf6ec',       // Elevated surface / card background
          3: '#ede3d2',       // Neutral deep paper tone
          soft: '#d8ccb8',    // Muted paper
        },
        ink: {
          DEFAULT: '#241c15', // Deep roasted charcoal / primary dark bg & text
          2: '#3a2e23',       // Secondary dark / hover state
          soft: '#544636',    // Body copy & subtext
        },
        sepia: {
          DEFAULT: '#7a6248', // Nostalgic brown accent
          soft: '#b4a184',    // Dashed borders & secondary tags
        },
        ember: {
          DEFAULT: '#c4703a', // Primary vibrant CTA & highlight
          deep: '#a2542a',    // Dark terracotta / hover
        },
        gold: '#b8863b',      // Antique 5-star rating gold
        sage: '#3e5b52',      // Optical diode status / checkmarks
        line: {
          DEFAULT: 'rgba(36, 28, 21, 0.14)',      // Border on light paper
          ink: 'rgba(243, 236, 223, 0.16)',        // Border on dark ink
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif'],
        ui: ['"Public Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'dropzone': '0 30px 70px -30px rgba(36, 28, 21, 0.35)',
        'ember-glow': '0 12px 28px -10px rgba(196, 112, 58, 0.6)',
        'ember-glow-lg': '0 14px 30px -10px rgba(196, 112, 58, 0.6)',
        'card': '0 24px 48px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05), inset 0 1px rgba(255, 255, 255, 0.4)',
        'card-elevated': '0 30px 60px -25px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        sweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(240%)' },
        },
        'wiggle-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        'diode-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 3px color-mix(in srgb, #3e5b52 20%, transparent), 0 0 6px 1px color-mix(in srgb, #3e5b52 55%, transparent)',
          },
          '50%': {
            boxShadow: '0 0 0 4px color-mix(in srgb, #3e5b52 28%, transparent), 0 0 12px 3px color-mix(in srgb, #3e5b52 82%, transparent)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fillbar: {
          '0%': { width: '8%' },
          '100%': { width: '82%' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        'breathe-fast': 'breathe 3.5s ease-in-out infinite',
        sweep: 'sweep 2.6s ease-in-out infinite',
        'wiggle-x': 'wiggle-x 1.6s ease-in-out infinite',
        'diode-pulse': 'diode-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        fillbar: 'fillbar 60s ease-out forwards',
      },
    },
  },
  plugins: [],
};


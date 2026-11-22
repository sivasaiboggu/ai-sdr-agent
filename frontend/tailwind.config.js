import type { Config } from 'tailwindcss'

/**
 * Design tokens — one system, used by every page.
 *
 * Colours are OKLCH (see frontend/src/lib/tokens.json for the full
 * token file, hex fallbacks and the WCAG contrast table). The values
 * below are the exact OKLCH equivalents of the hex ramp this dashboard
 * shipped with since round 9 — same colours, a perceptual colour
 * space, so future tints can be derived by changing lightness only.
 * One accent (indigo), one warm-neutral canvas (zinc), semantic hues
 * reserved for status meaning only. Accent stays under 10% of any
 * screen: it marks the current pipeline step, the primary action and
 * the focus ring, and nothing else.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'oklch(0.962 0.018 272.31 / <alpha-value>)',
          100: 'oklch(0.930 0.033 272.79 / <alpha-value>)',
          200: 'oklch(0.870 0.062 274.04 / <alpha-value>)',
          300: 'oklch(0.785 0.104 274.71 / <alpha-value>)',
          400: 'oklch(0.680 0.158 276.93 / <alpha-value>)',
          500: 'oklch(0.585 0.204 277.12 / <alpha-value>)',
          600: 'oklch(0.511 0.230 276.97 / <alpha-value>)',
          700: 'oklch(0.457 0.215 277.02 / <alpha-value>)',
          800: 'oklch(0.398 0.177 277.37 / <alpha-value>)',
          900: 'oklch(0.359 0.135 278.70 / <alpha-value>)',
        },
        // One accent per meaning, used everywhere a status is shown.
        // Success / info / warning / danger never borrow each other's hue.
        // These are fills and dots (non-text); badge text uses the
        // darker built-in 700 shades, which pass AA on their 50 tints
        // (see tokens.json contrast table).
        success: { 500: 'oklch(0.696 0.149 162.48 / <alpha-value>)', 600: 'oklch(0.596 0.127 163.23 / <alpha-value>)' },
        info: { 500: 'oklch(0.685 0.148 237.32 / <alpha-value>)', 600: 'oklch(0.588 0.139 241.97 / <alpha-value>)' },
        warning: { 500: 'oklch(0.769 0.165 70.08 / <alpha-value>)', 600: 'oklch(0.666 0.157 58.32 / <alpha-value>)' },
        danger: { 500: 'oklch(0.645 0.215 16.44 / <alpha-value>)', 600: 'oklch(0.586 0.222 17.58 / <alpha-value>)' },
      },
      boxShadow: {
        // Layered, low-opacity shadows: depth without the heavy "card" look.
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)',
        soft: '0 2px 6px -2px rgba(16,24,40,.05), 0 8px 20px -8px rgba(16,24,40,.08)',
        pop: '0 12px 32px -8px rgba(16,24,40,.18)',
      },
      // No entrance keyframes: motion is only for state changes
      // (spinners, the streaming caret, press scale). The shimmer /
      // fade-up / scale-in definitions lived here unused after round 9
      // removed staggered entrances — dead animation is still slop.
    },
  },
  plugins: [],
} satisfies Config

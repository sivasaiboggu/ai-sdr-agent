const colorNames = [
  'canvas', 'paper', 'inset', 'ink', 'muted', 'rule', 'edge',
  'inverse', 'inverse-paper', 'accent', 'accent-on-rail', 'accent-hover', 'on-accent',
  'success', 'warning', 'danger', 'info',
]

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((name) => [name, `var(--${name})`])),
      fontFamily: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
      fontSize: { display: 'var(--type-display)' },
      transitionDuration: { press: 'var(--motion-press)', reveal: 'var(--motion-reveal)' },
      spacing: Object.fromEntries([1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => [step, `var(--space-${step})`])),
      borderRadius: { control: 'var(--radius-control)', overlay: 'var(--radius-overlay)' },
      boxShadow: {
        control: 'var(--shadow-1)', menu: 'var(--shadow-2)', overlay: 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
}

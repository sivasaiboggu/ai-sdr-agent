import type { Config } from 'tailwindcss'

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
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81',
        },
        // One accent per meaning, used everywhere a status is shown.
        // Success / info / warning / danger never borrow each other's hue.
        success: { 500: '#10b981', 600: '#059669' },
        info: { 500: '#0ea5e9', 600: '#0284c7' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 500: '#f43f5e', 600: '#e11d48' },
      },
      boxShadow: {
        // Layered, low-opacity shadows: depth without the heavy "card" look.
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)',
        soft: '0 2px 6px -2px rgba(16,24,40,.05), 0 8px 20px -8px rgba(16,24,40,.08)',
        lift: '0 2px 6px -2px rgba(16,24,40,.08), 0 12px 28px -10px rgba(16,24,40,.18)',
        pop: '0 12px 32px -8px rgba(16,24,40,.18)',
        glow: '0 0 0 1px rgba(79,70,229,.18), 0 10px 28px -8px rgba(79,70,229,.45)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'fade-up': 'fade-up .4s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .18s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config

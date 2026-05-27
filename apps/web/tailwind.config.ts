import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        script: ['var(--font-caveat)', 'Caveat', 'cursive'],
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'stagger-item': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ring-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0px rgba(47, 128, 237, 0.3)' },
          '50%': { boxShadow: '0 0 0 6px rgba(47, 128, 237, 0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'stagger-item': 'stagger-item 0.25s ease-out both',
        'check-pop': 'check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ring-pulse': 'ring-pulse 0.5s ease-out',
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#b8cffd',
          300: '#8eb0ff',
          400: '#5f89ff',
          500: '#2f6bff',
          600: '#2f6bff',
          700: '#2459d6',
          800: '#1d49b3',
        },
        teal: {
          50: '#e9fbf8',
          100: '#d3f6f1',
          500: '#28c7b7',
          600: '#0f8d80',
        },
        navy: {
          50: 'rgb(var(--navy-50) / <alpha-value>)',
          100: 'rgb(var(--navy-100) / <alpha-value>)',
          200: 'rgb(var(--navy-200) / <alpha-value>)',
          300: 'rgb(var(--navy-300) / <alpha-value>)',
          400: 'rgb(var(--navy-400) / <alpha-value>)',
          500: 'rgb(var(--navy-500) / <alpha-value>)',
          600: 'rgb(var(--navy-600) / <alpha-value>)',
          700: 'rgb(var(--navy-700) / <alpha-value>)',
          800: 'rgb(var(--navy-800) / <alpha-value>)',
          900: 'rgb(var(--navy-900) / <alpha-value>)',
          950: 'rgb(var(--navy-950) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          window: 'rgb(var(--surface-window) / <alpha-value>)',
          sidebar: 'rgb(var(--surface-sidebar) / <alpha-value>)',
          panel: 'rgb(var(--surface-panel) / <alpha-value>)',
          soft: 'rgb(var(--surface-soft) / <alpha-value>)',
          selected: 'rgb(var(--surface-selected) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          subtle: 'rgb(var(--surface-subtle) / <alpha-value>)',
          inverse: 'rgb(var(--surface-inverse) / <alpha-value>)',
        },
        ui: {
          border: {
            DEFAULT: 'rgb(var(--ui-border) / <alpha-value>)',
            panel: 'rgb(var(--ui-border-panel) / <alpha-value>)',
            soft: 'rgb(var(--ui-border-soft) / <alpha-value>)',
            selected: 'rgb(var(--ui-border-selected) / <alpha-value>)',
            strong: 'rgb(var(--ui-border-strong) / <alpha-value>)',
          }
        },
        violet: {
          400: '#B59BFF',
          500: '#7B5BFF',
          600: '#5A37D9',
        },
        cyan: {
          500: '#1AAED7',
        },
        pink: {
          400: '#FFB1D5',
          500: '#FF6FAE',
          600: '#C0297A',
        },
        danger: '#f04438',
        warning: '#f5a524',
      },
      boxShadow: {
        'cool-sm': '0 1px 2px rgba(15,35,66,.06), 0 1px 1px rgba(15,35,66,.04)',
        'cool-md': '0 6px 16px rgba(15,35,66,.08), 0 2px 4px rgba(15,35,66,.04)',
        'cool-lg': '0 18px 40px rgba(15,35,66,.14), 0 4px 10px rgba(15,35,66,.06)',
      },
    },
  },
  plugins: [typography],
}

export default config

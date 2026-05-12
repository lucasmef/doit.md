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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
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
          50: '#ecf0f5',
          100: '#d9e1ea',
          200: '#b6c2d2',
          300: '#7b89a4',
          500: '#46587a',
          700: '#1f3559',
          900: '#0f2342',
        },
        surface: {
          DEFAULT: '#f8fafc',
          window: '#f8fafc',
          sidebar: '#ffffff',
          panel: '#ffffff',
          soft: '#ecf0f5',
          selected: 'rgba(47, 107, 255, 0.10)',
          muted: '#ecf0f5',
          subtle: '#d9e1ea',
          inverse: '#0f2342',
        },
        ui: {
          border: {
            DEFAULT: '#d9e1ea',
            panel: '#d9e1ea',
            soft: '#ecf0f5',
            selected: '#b8cffd',
            strong: '#b6c2d2',
          }
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

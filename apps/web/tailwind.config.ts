import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2f80ed',
          700: '#1d4ed8',
        },
        surface: {
          DEFAULT: '#f5f3ef',
          window: '#fcfbf9',
          sidebar: '#f0ece6',
          panel: '#ffffff',
          soft: '#f8f5f1',
          selected: '#eaf2fb',
          muted: '#f8fafc',
          subtle: '#f1f5f9',
        },
        ui: {
          border: {
            DEFAULT: '#ddd7cf',
            panel: '#e7e1d8',
            soft: '#ebe4da',
            selected: '#d7e6f8',
          }
        }
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config

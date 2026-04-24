import type { Config } from 'tailwindcss'

export default {
  content: [
    './docs/**/*.{md,vue,ts}',
    './docs/.vitepress/theme/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00b8b8',
          50: '#e6fffe',
          400: '#00b8b8',
          500: '#00a3a3',
          600: '#008080',
        },
        accent: {
          yellow: '#f5c518',
          orange: '#ff7333',
          red: '#ff5000',
          navy: '#0a0a2e',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', '-apple-system', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'dot-pattern': 'radial-gradient(circle, rgba(0,184,184,0.12) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-12': '12px 12px',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config

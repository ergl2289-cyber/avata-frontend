import type { Config } from 'tailwindcss'

/**
 * Avata design tokens — single dark monochrome theme (per reference).
 * No accent colors except the active "like" (red heart). All interactive
 * accents are white / light-gray on dark surfaces.
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F0F', // page background
        surface: '#1C1C1E', // cards, inputs, sheet
        'surface-2': '#2C2C2E', // raised: search bar, pressed states
        border: '#2A2A2A',
        text: {
          DEFAULT: '#FFFFFF', // primary
          muted: '#8E8E93', // secondary (city, captions)
          faint: '#5E5E63', // tertiary / disabled
        },
        like: '#FF3B30', // active heart only
      },
      borderRadius: {
        card: '14px',
        sheet: '20px',
        pill: '9999px',
      },
      transitionDuration: {
        fast: '200ms',
        base: '250ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        'out-ios': 'cubic-bezier(0.16, 1, 0.3, 1)', // smooth Apple-like ease-out
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config

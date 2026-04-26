import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0d12',
        ink: '#f5f3ee',
        mute: '#8c8794',
        accent: '#c9b6ff',
        card: '#1a1822',
        border: '#322e3b',
        success: '#9bd99b',
        danger: '#e89696',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', '"Times New Roman"', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.025em',
        wide2: '0.2em',
      },
      maxWidth: {
        app: '28rem',
      },
      animation: {
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

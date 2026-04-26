import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system'],
      },
    },
  },
  plugins: [],
} satisfies Config;

export const colors = {
  brand: {
    voice: '#7F77DD',
    words: '#1D9E75',
    match: '#D85A30',
  },
  light: {
    bg: '#FAFAFA',
    fg: '#111111',
    muted: '#6B6B6B',
    border: '#ECECEC',
    card: '#FFFFFF',
  },
  dark: {
    bg: '#0D0D0D',
    fg: '#F5F5F5',
    muted: '#9A9A9A',
    border: '#262626',
    card: '#161616',
  },
  semantic: {
    success: '#0F6E56',
    warning: '#854F0B',
    danger: '#A32D2D',
    info: '#185FA5',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    serif: 'ui-serif, Georgia, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  size: {
    xs: 12,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
  weight: {
    regular: '400',
    medium: '500',
  },
  lineHeight: {
    tight: 1.2,
    base: 1.5,
    loose: 1.7,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  pill: 9999,
} as const;

/**
 * Single source of truth for colors, spacing and type scale. Screens and
 * components should import from here rather than hardcoding hex values, so
 * a future rebrand or dark-mode pass touches one file.
 */

export const colors = {
  background: '#fbf8f2',
  surface: '#ffffff',
  border: '#e6e2da',
  text: '#202124',
  textMuted: '#5f6368',
  textFaint: '#80868b',

  primary: '#1a73e8',
  primarySoft: 'rgba(26,115,232,0.08)',

  success: '#188038',
  successBg: '#e6f4ea',
  successBorder: '#ceead6',
  successText: '#0d652d',

  warning: '#f29900',
  warningBg: '#fef7e0',
  warningBorder: '#feefc3',
  warningText: '#7c4d00',

  stale: '#9aa0a6',
  placeholderImage: '#e2d9c6',

  overlayDark: 'rgba(32,33,36,0.9)',
  black: '#000000',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
  mono: { fontFamily: 'monospace' },
};

export const layout = {
  screenTopPadding: 54,
};

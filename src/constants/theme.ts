/**
 * Single source of truth for colors, spacing and type scale. Screens and
 * components should import from here rather than hardcoding hex values, so
 * a future rebrand or dark-mode pass touches one file.
 */
import { Platform, ViewStyle } from 'react-native';

export const colors = {
  background: '#f4f5fa',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  border: '#e7e9f2',
  borderStrong: '#d7dbea',
  text: '#0d0f1a',
  textMuted: '#5c6079',
  textFaint: '#8b8fa6',

  /** Deep hero surface — the dark base premium apps use behind gradients. */
  ink: '#0b0e1c',
  inkRaised: '#141830',

  primary: '#1c4ff0',
  primaryDeep: '#0a2ba8',
  primaryBright: '#4f7bff',
  primarySoft: 'rgba(28,79,240,0.08)',
  primarySoftStrong: 'rgba(28,79,240,0.14)',

  /** Worker mode accent — visually distinguishes "in the field" screens from owner/dashboard screens. */
  worker: '#e2670f',
  workerDeep: '#a8460a',
  workerBright: '#ff9d4d',
  workerSoft: 'rgba(226,103,15,0.1)',

  success: '#0f9d58',
  successDeep: '#0a7a44',
  successBg: '#e5f7ed',
  successBorder: '#c3ecd6',
  successText: '#0b7a44',

  warning: '#e2670f',
  warningBg: '#fdefe1',
  warningBorder: '#fbdcb8',
  warningText: '#93430a',

  danger: '#d93025',
  dangerBg: '#fce8e6',
  dangerText: '#a50e0e',

  stale: '#9aa0b0',
  placeholderImage: '#e7e2d6',

  blueprint: '#eef2fb',
  blueprintLine: 'rgba(28,79,240,0.14)',

  overlayDark: 'rgba(8,9,18,0.94)',
  overlayScrim: 'rgba(8,9,18,0.5)',
  black: '#000000',
  white: '#ffffff',
} as const;

/** Named gradient stop-pairs. Feed straight into <LinearGradient colors={gradients.x}>. */
export const gradients = {
  primary: ['#2a5cf5', '#0a2ba8'] as const,
  primaryRadiant: ['#4f7bff', '#1c4ff0'] as const,
  worker: ['#ff8a3d', '#c4530a'] as const,
  ink: ['#1b2140', '#0b0e1c'] as const,
  success: ['#1cb872', '#0a7a44'] as const,
  sheen: ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'] as const,
  scrim: ['rgba(8,9,18,0)', 'rgba(8,9,18,0.78)'] as const,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 30,
  pill: 999,
} as const;

/**
 * Weight-specific PostScript names for Plus Jakarta Sans — React Native
 * needs the exact family name per weight for custom fonts (no synthetic
 * bolding across platforms). Loaded via useFonts in App.tsx.
 */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  eyebrow: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.1 },
  display: { fontFamily: fontFamily.extrabold, fontSize: 32, letterSpacing: -0.6, lineHeight: 36 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 26, letterSpacing: -0.4, lineHeight: 31 },
  heading: { fontFamily: fontFamily.bold, fontSize: 18, letterSpacing: -0.2, lineHeight: 23 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.7 },
  mono: { fontFamily: 'monospace' },
};

/** Cross-platform elevation. Spread into a style array alongside backgroundColor. */
export const shadow: Record<'sm' | 'md' | 'lg' | 'xl', ViewStyle> = Platform.select({
  ios: {
    sm: {
      shadowColor: '#0b0d16',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    md: {
      shadowColor: '#0b0d16',
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    lg: {
      shadowColor: '#0b0d16',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    xl: {
      shadowColor: '#0b0d16',
      shadowOpacity: 0.22,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 18 },
    },
  },
  default: {
    sm: { elevation: 2 },
    md: { elevation: 6 },
    lg: { elevation: 14 },
    xl: { elevation: 22 },
  },
})!;

/** Tinted "glow" shadows for gradient surfaces — colored ambient light instead of flat black. */
export function glow(color: string, opacity = 0.35): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 10 },
  })!;
}

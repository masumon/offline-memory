export const lightColors = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F7',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  onPrimary: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
  overlay: 'rgba(15, 23, 42, 0.08)',
} as const;

export const darkColors = {
  background: '#0B1220',
  surface: '#111B2E',
  surfaceMuted: '#17233A',
  primary: '#60A5FA',
  primaryPressed: '#3B82F6',
  onPrimary: '#07111F',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#263650',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#38BDF8',
  overlay: 'rgba(2, 6, 23, 0.32)',
} as const;

export type ThemeColors = typeof lightColors;

export function getThemeColors(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

// Backward-compatible light palette for legacy screens while they are migrated.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  label: { fontSize: 12 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 21 },
  title: { fontSize: 30, lineHeight: 38 },
  heading: { fontSize: 22, lineHeight: 29 },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const elevation = {
  card: {
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

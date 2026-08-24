export const lightColors = {
  background: '#F4F8F6',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF2EE',
  primary: '#006A4E',
  primaryPressed: '#00543E',
  onPrimary: '#FFFFFF',
  accent: '#F4C430',
  textPrimary: '#10231D',
  textSecondary: '#53665F',
  textMuted: '#879790',
  border: '#D9E5DF',
  success: '#16804A',
  warning: '#B86A00',
  danger: '#C73535',
  info: '#087EA4',
  overlay: 'rgba(16, 35, 29, 0.10)',
} as const;

export const darkColors = {
  background: '#081410',
  surface: '#10221B',
  surfaceMuted: '#183128',
  primary: '#54C49A',
  primaryPressed: '#35A97D',
  onPrimary: '#06130E',
  accent: '#F4C430',
  textPrimary: '#F2F8F5',
  textSecondary: '#C2D3CC',
  textMuted: '#8EA39A',
  border: '#29463A',
  success: '#55D18F',
  warning: '#F3B84B',
  danger: '#FF7B7B',
  info: '#55C3E5',
  overlay: 'rgba(0, 0, 0, 0.36)',
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export function getThemeColors(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export const colors = lightColors;

// 4dp-based spacing scale. Existing aliases are preserved for compatibility.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const layout = {
  compactHorizontal: 16,
  regularHorizontal: 24,
  contentMaxWidth: 760,
  expandedNavWidth: 104,
  compactNavHeight: 86,
  minTouchTarget: 48,
  iconButtonSize: 48,
} as const;

export const breakpoints = {
  expandedNavigation: 720,
  wideContent: 900,
} as const;

export const typography = {
  label: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 21 },
  title: { fontSize: 30, lineHeight: 38 },
  heading: { fontSize: 22, lineHeight: 29 },
  display: { fontSize: 36, lineHeight: 44 },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const control = {
  inputHeight: 52,
  buttonHeight: 48,
  rowMinHeight: 64,
  iconSize: 22,
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

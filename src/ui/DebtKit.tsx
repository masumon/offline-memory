// Shared shell for the Debt & Receivable module screens. Every screen in `app/debt/`
// needs the same header, chip row, progress bar and paisa formatter, so they live here
// once instead of being copied (and drifting) across seven files.

import { useCallback, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { AppText as Text } from './AppText';
import { AppIcon, type IconName } from './AppIcon';
import { tapLight } from './haptics';
import { useAppPreferences } from '../app/AppPreferences';
import { debtCopy } from '../i18n/debt';
import { formatPaisa } from '../services/debt/money';
import { border, control, elevation, icon, layout, radius, spacing, typography, type AccentRole, type ThemeAccents, type ThemeColors } from '../theme';

/** Theme + copy + a bn-aware money formatter, memoised once per screen. */
export function useDebt() {
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const s = useMemo(() => makeDebtStyles(colors), [colors]);
  const c = useMemo(() => debtCopy(language), [language]);
  const money = useCallback((p: number) => formatPaisa(p, { bnDigits: bn }), [bn]);
  return { colors, accents, language, bn, s, c, money };
}

export type DebtStyles = ReturnType<typeof makeDebtStyles>;

export function DebtHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { s, c, colors } = useDebt();
  return (
    <View style={s.headerWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/debt'))}
        style={({ pressed }) => StyleSheet.flatten([s.back, pressed && s.pressed])}
      >
        <AppIcon name="arrow-left" size={icon.md} color={colors.primary} />
        <Text style={s.backText}>{c.back}</Text>
      </Pressable>
      <View style={s.headerRow}>
        <View style={s.grow}>
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress, disabled }: { label: string; active: boolean; onPress: () => void; disabled?: boolean }) {
  const { s } = useDebt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => { tapLight(); onPress(); }}
      style={({ pressed }) => StyleSheet.flatten([s.chip, active && s.chipOn, disabled && s.disabled, pressed && s.pressed])}
    >
      <Text numberOfLines={1} style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** A 0-100 progress bar. `pct` is clamped, so callers can hand it raw percentages. */
export function Bar({ pct, tone }: { pct: number; tone: AccentRole }) {
  const { s } = useDebt();
  const width = `${Math.max(0, Math.min(100, Math.round(pct)))}%` as const;
  return (
    <View style={s.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[s.barFill, { width, backgroundColor: tone.base }]} />
    </View>
  );
}

/** One label/value line — the workhorse of the analytics and plan screens. */
export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: AccentRole }) {
  const { s } = useDebt();
  return (
    <View style={s.statRow}>
      <View style={s.grow}>
        <Text style={s.statLabel}>{label}</Text>
        {hint ? <Text style={s.statHint}>{hint}</Text> : null}
      </View>
      <Text numberOfLines={1} style={[s.statValue, tone ? { color: tone.on } : null]}>{value}</Text>
    </View>
  );
}

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { s } = useDebt();
  return (
    <View style={[s.card, style]}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function EmptyNote({ icon: ic, text }: { icon: IconName; text: string }) {
  const { s, colors } = useDebt();
  return (
    <View style={s.emptyBox}>
      <AppIcon name={ic} size={28} color={colors.textMuted} />
      <Text style={s.emptyHint}>{text}</Text>
    </View>
  );
}

function makeDebtStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl + spacing.xl },
    center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    headerWrap: { marginBottom: spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '700' },
    sub: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    grow: { flex: 1, minWidth: 0 },

    card: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md, ...elevation.soft },
    cardTitle: { color: colors.textMuted, ...typography.section, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
    sectionTitle: { color: colors.textMuted, ...typography.section, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },

    statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    statLabel: { color: colors.textSecondary, ...typography.bodySmall },
    statHint: { color: colors.textMuted, ...typography.caption, marginTop: 1 },
    statValue: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800', fontFamily: typography.numeric.fontFamily },

    big: { color: colors.textPrimary, ...typography.display, fontWeight: '800', fontFamily: typography.numeric.fontFamily },
    bigLabel: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },

    bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginTop: spacing.xs },
    barFill: { height: '100%', borderRadius: radius.pill },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { minHeight: 34, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textSecondary, ...typography.caption, fontWeight: '700' },
    chipTextOn: { color: colors.onPrimary },

    input: { minHeight: control.inputHeight, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.input },
    label: { color: colors.textSecondary, ...typography.caption, fontWeight: '700', marginBottom: spacing.xxs, marginTop: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

    primary: { minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    primaryText: { color: colors.onPrimary, ...typography.callout, fontWeight: '800' },
    ghost: { minHeight: control.buttonHeight, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    ghostText: { color: colors.primary, ...typography.callout, fontWeight: '800' },

    listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.xs, ...elevation.soft },
    listTitle: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    listMeta: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    listAmt: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800', fontFamily: typography.numeric.fontFamily },

    badge: { borderWidth: border.thin, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    badgeText: { ...typography.caption, fontWeight: '800' },

    emptyBox: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
    emptyHint: { color: colors.textSecondary, ...typography.caption, textAlign: 'center', paddingHorizontal: spacing.lg },

    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

export type { ThemeAccents, ThemeColors, AccentRole };

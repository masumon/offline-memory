import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../src/ui/AppText';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../src/app/AppPreferences';
import { useTaskStore } from '../src/store/task.store';
import { AppIcon } from '../src/ui/AppIcon';
import { tapSelect } from '../src/ui/haptics';
import { bangladeshDateKey, formatBangladeshMonthYear } from '../src/i18n/date-time';
import { border, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

const CLOSED = new Set(['COMPLETED', 'ARCHIVED', 'CANCELLED']);
const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

type Cell = { key: string; day: number; inMonth: boolean; isToday: boolean; count: number };

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language, weekStartsOn } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const loadTasks = useTaskStore((s) => s.load);
  const tasks = useTaskStore((s) => s.tasks);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(12, 0, 0, 0); return d; });

  useEffect(() => { void loadTasks(db); }, [db, loadTasks]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (CLOSED.has(t.status)) continue;
      const key = t.plannedDate || (t.dueAt ? bangladeshDateKey(t.dueAt) : null);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const todayKey = bangladeshDateKey(new Date());
  const weekHeader = useMemo(() => {
    const base = bn ? DAY_LABELS_BN : DAY_LABELS_EN;
    return Array.from({ length: 7 }, (_, i) => base[(weekStartsOn + i) % 7]);
  }, [bn, weekStartsOn]);

  const cells = useMemo<Cell[]>(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const lead = (first.getDay() - weekStartsOn + 7) % 7;
    const out: Cell[] = [];
    for (let i = 0; i < lead; i += 1) {
      const d = new Date(year, m, 1 - (lead - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, day: d.getDate(), inMonth: false, isToday: key === todayKey, count: counts.get(key) ?? 0 });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({ key, day, inMonth: true, isToday: key === todayKey, count: counts.get(key) ?? 0 });
    }
    while (out.length % 7 !== 0) {
      const lastKey = out[out.length - 1]!.key;
      const d = new Date(`${lastKey}T12:00:00`); d.setDate(d.getDate() + 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, day: d.getDate(), inMonth: false, isToday: key === todayKey, count: counts.get(key) ?? 0 });
    }
    return out;
  }, [month, weekStartsOn, counts, todayKey]);

  const shift = (delta: number) => { tapSelect(); setMonth((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; }); };
  const openDay = (key: string) => { tapSelect(); router.push({ pathname: '/planning', params: { date: key } }); };

  const c = bn
    ? { back: 'পরিকল্পনা', eyebrow: 'মাস', title: 'মাসিক ভিউ', today: 'আজ', sub: 'যেদিন কাজ আছে সেদিনে সংখ্যা দেখাবে — দিন চাপলে সেদিনের পরিকল্পনা খুলবে।' }
    : { back: 'Planning', eyebrow: 'MONTH', title: 'Month view', today: 'Today', sub: 'Days with work show a count — tap a day to open its plan.' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/planning'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{c.eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>{c.sub}</Text>
      </View>

      <View style={styles.monthBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'আগের মাস' : 'Previous month'} onPress={() => shift(-1)} style={({ pressed }) => StyleSheet.flatten([styles.navBtn, pressed && styles.pressed])}>
          <AppIcon name="chevron-left" size={icon.md} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatBangladeshMonthYear(month, language)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'পরের মাস' : 'Next month'} onPress={() => shift(1)} style={({ pressed }) => StyleSheet.flatten([styles.navBtn, pressed && styles.pressed])}>
          <AppIcon name="chevron-right" size={icon.md} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {weekHeader.map((d, i) => <Text key={i} style={styles.weekHeaderText}>{d}</Text>)}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <Pressable
            key={cell.key}
            accessibilityRole="button"
            accessibilityLabel={`${cell.day}${cell.count ? ` · ${cell.count}` : ''}`}
            onPress={() => openDay(cell.key)}
            style={({ pressed }) => StyleSheet.flatten([styles.cell, cell.isToday && styles.cellToday, pressed && styles.pressed])}
          >
            <Text style={[styles.cellDay, !cell.inMonth && styles.cellDayMuted, cell.isToday && styles.cellDayToday]}>{cell.day}</Text>
            {cell.count > 0 ? (
              <View style={[styles.badge, cell.isToday && styles.badgeToday]}>
                <Text style={[styles.badgeText, cell.isToday && styles.badgeTextToday]}>{cell.count}</Text>
              </View>
            ) : <View style={styles.badgeSpacer} />}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { paddingTop: spacing.sm, marginBottom: spacing.md },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '700', letterSpacing: 1 },
    title: { color: colors.textPrimary, ...typography.display, fontWeight: '700', marginTop: spacing.xs },
    sub: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.xs },
    monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    navBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '700' },
    weekHeader: { flexDirection: 'row', marginBottom: spacing.xs },
    weekHeaderText: { flex: 1, textAlign: 'center', color: colors.textMuted, ...typography.caption, fontWeight: '800' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: border.thin, borderColor: colors.border, marginRight: -border.thin, marginBottom: -border.thin, backgroundColor: colors.surface },
    cellToday: { backgroundColor: colors.primaryTint, borderColor: colors.primary, zIndex: 1 },
    cellDay: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700', fontFamily: typography.numeric.fontFamily },
    cellDayMuted: { color: colors.textMuted, opacity: 0.6 },
    cellDayToday: { color: colors.primary },
    badge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    badgeToday: { backgroundColor: colors.primary },
    badgeText: { color: colors.onPrimary, ...typography.caption, fontWeight: '800', fontSize: 10 },
    badgeTextToday: { color: colors.onPrimary },
    badgeSpacer: { height: 18 },
    pressed: { opacity: 0.78 },
  });
}

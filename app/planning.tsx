import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getDailyPlan, planInboxTasks, type DailyPlan } from '../src/services/planning-service';
import { useTaskStore } from '../src/store/task.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppButton, AppCard, AppState } from '../src/ui/AppSurface';
import { AppIcon } from '../src/ui/AppIcon';
import { RowLeading } from '../src/ui/RowLeading';
import { loadImageThumbs } from '../src/services/attachment-thumbs';
import { formatBangladeshDate, formatBangladeshRelativeDate, formatBangladeshNumber } from '../src/i18n/date-time';
import { border, control, elevation, icon, layout, opacity, radius, spacing, typography, priorityAccentName, type AccentRole, type ThemeAccents, type ThemeColors } from '../src/theme';
import type { TaskPriority } from '../src/types';

function priorityLabel(priority: TaskPriority, bn: boolean) {
  const labels: Record<TaskPriority, { en: string; bn: string }> = { URGENT: { en: 'Urgent', bn: 'জরুরি' }, HIGH: { en: 'High', bn: 'উচ্চ' }, MEDIUM: { en: 'Medium', bn: 'মাঝারি' }, LOW: { en: 'Low', bn: 'কম' } };
  return labels[priority][bn ? 'bn' : 'en'];
}
function planDateLabel(value: string, language: 'bn' | 'en') { try { return formatBangladeshDate(`${value}T00:00:00`, language); } catch { return value; } }
function addDays(base: Date, days: number) { const next = new Date(base); next.setHours(12, 0, 0, 0); next.setDate(next.getDate() + days); return next; }

export default function PlanningScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const bn = language === 'bn';
  const params = useLocalSearchParams<{ filter?: string }>();
  const [focusFilter, setFocusFilter] = useState<string | null>(params.filter ?? null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadTasks = useTaskStore(state => state.load);

  const loadPlan = useCallback(async (date: Date) => {
    setError(null);
    try { setPlan(await getDailyPlan(db, date)); }
    catch { setError(bn ? 'দৈনিক পরিকল্পনা লোড করা যায়নি' : 'Unable to load daily plan'); }
  }, [bn, db]);

  useEffect(() => { let active = true; void getDailyPlan(db, cursor).then(next => { if (active) { setError(null); setPlan(next); } }).catch(() => { if (active) setError(bn ? 'দৈনিক পরিকল্পনা লোড করা যায়নি' : 'Unable to load daily plan'); }); return () => { active = false; }; }, [bn, db, cursor]);

  const [thumbs, setThumbs] = useState<Map<string, string>>(() => new Map());
  const inboxIdKey = (plan?.inbox ?? []).map(t => t.id).join(',');
  useEffect(() => {
    let alive = true;
    loadImageThumbs(db, 'TASK', inboxIdKey ? inboxIdKey.split(',') : [])
      .then(map => { if (alive) setThumbs(map); })
      .catch(() => { if (alive) setThumbs(new Map()); });
    return () => { alive = false; };
  }, [db, inboxIdKey]);

  const planTask = async (id: string) => {
    if (busyId) return;
    setBusyId(id); setError(null);
    try { await planInboxTasks(db, [id], cursor); await Promise.all([loadPlan(cursor), loadTasks(db)]); }
    catch { setError(bn ? 'টাস্ক প্ল্যান করা যায়নি' : 'Unable to plan task'); }
    finally { setBusyId(null); }
  };

  const labels = bn
    ? { eyebrow: 'দৈনিক পরিকল্পনা', plan: 'প্ল্যান', newTask: 'নতুন টাস্ক', inbox: 'ইনবক্স', today: 'আজ', subtitle: 'একটি দিন বেছে নিন — সেদিনের টাস্কগুলো সময় অনুযায়ী সাজানো থাকে। নিচের ইনবক্স আইটেমে “প্ল্যান” চাপলে সেটি এই দিনে যোগ হয়।', overdue: 'বকেয়া', progress: 'চলমান', scheduled: 'আজ নির্ধারিত', inboxTitle: 'ইনবক্সে অপেক্ষমাণ', empty: 'ইনবক্স খালি — এই দিনের সব কিছু গোছানো আছে। ✨', noTime: 'সময় নেই', retry: 'আবার চেষ্টা করুন', prev: 'আগের দিন', next: 'পরের দিন' }
    : { eyebrow: 'DAILY PLANNING', plan: 'Plan', newTask: 'New task', inbox: 'Inbox', today: 'Today', subtitle: 'Pick a day — its tasks are laid out by time. Tap “Plan” on an inbox item below to drop it onto this day.', overdue: 'Overdue', progress: 'In progress', scheduled: 'Scheduled today', inboxTitle: 'Waiting in inbox', empty: 'Inbox is empty — this day is all set. ✨', noTime: 'No time', retry: 'Retry', prev: 'Previous day', next: 'Next day' };

  const todayKey = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, []);
  const isToday = plan?.date === todayKey;
  const relative = formatBangladeshRelativeDate(cursor, language);

  if (!plan && !error) return <AppState loading title={bn ? 'প্ল্যান লোড হচ্ছে…' : 'Loading plan…'} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>{labels.eyebrow}</Text>
            <Text style={styles.title}>{plan ? planDateLabel(plan.date, language) : labels.plan}</Text>
          </View>
          <Link href="/task-editor" asChild><AppButton label={labels.newTask} icon="plus" onPress={() => undefined} /></Link>
        </View>
        <Text style={styles.subtitle}>{labels.subtitle}</Text>

        <View style={styles.dateNav}>
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'আগের মাস' : 'Previous month'} onPress={() => setCursor(c => addDays(c, -30))} style={({ pressed }) => StyleSheet.flatten([styles.navArrow, pressed && styles.pressed])}>
            <AppIcon name="chevron-double-left" size={icon.md} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={labels.prev} onPress={() => setCursor(c => addDays(c, -1))} style={({ pressed }) => StyleSheet.flatten([styles.navArrow, pressed && styles.pressed])}>
            <AppIcon name="chevron-left" size={icon.md} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={labels.today} onPress={() => setCursor(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })} style={({ pressed }) => StyleSheet.flatten([styles.todayChip, isToday && styles.todayChipActive, pressed && styles.pressed])}>
            <AppIcon name={isToday ? 'circle-slice-8' : 'calendar-today'} size={icon.sm} color={isToday ? colors.onPrimary : colors.primary} />
            <Text numberOfLines={1} style={[styles.todayChipText, isToday && styles.todayChipTextActive]}>{relative}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={labels.next} onPress={() => setCursor(c => addDays(c, 1))} style={({ pressed }) => StyleSheet.flatten([styles.navArrow, pressed && styles.pressed])}>
            <AppIcon name="chevron-right" size={icon.md} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'পরের মাস' : 'Next month'} onPress={() => setCursor(c => addDays(c, 30))} style={({ pressed }) => StyleSheet.flatten([styles.navArrow, pressed && styles.pressed])}>
            <AppIcon name="chevron-double-right" size={icon.md} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.weekStrip}>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(cursor); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - d.getDay() + i);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const isSel = key === `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
            const n = new Date();
            const dayIsToday = key === `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
            const wd = (bn ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()];
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: isSel }} accessibilityLabel={`${wd} ${d.getDate()}`} onPress={() => setCursor(d)} style={({ pressed }) => StyleSheet.flatten([styles.weekDay, isSel && styles.weekDaySel, pressed && styles.pressed])}>
                <Text style={[styles.weekWd, isSel && styles.weekTextSel]}>{wd}</Text>
                <Text style={[styles.weekNum, isSel && styles.weekTextSel, !isSel && dayIsToday && styles.weekNumToday]}>{formatBangladeshNumber(d.getDate(), language)}</Text>
              </Pressable>
            );
          })}
        </View>

        {plan ? (
          <View style={styles.summaryRow}>
            <SummaryPill label={labels.overdue} count={plan.overdue.length} tone={accents.red} styles={styles} />
            <SummaryPill label={labels.progress} count={plan.inProgress.length} tone={accents.blue} styles={styles} />
            <SummaryPill label={labels.scheduled} count={plan.scheduled.length} tone={accents.green} styles={styles} />
          </View>
        ) : null}
      </View>

      {error ? (
        <AppState title={bn ? 'প্ল্যান লোড করা যায়নি' : 'Could not load plan'} description={bn ? 'লোকাল দৈনিক পরিকল্পনা প্রস্তুত করা যায়নি।' : 'The local daily plan could not be prepared.'} icon="alert-circle-outline" actionLabel={labels.retry} onAction={() => void loadPlan(cursor)} />
      ) : null}

      {focusFilter ? (
        <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'ফিল্টার সরান' : 'Clear filter'} onPress={() => setFocusFilter(null)} style={({ pressed }) => StyleSheet.flatten([styles.linkPill, { alignSelf: 'flex-start', marginBottom: spacing.sm }, pressed && styles.pressed])}>
          <Text style={styles.linkText}>{(bn ? { overdue: 'শুধু বকেয়া', due: 'শুধু আজকের', high: 'শুধু উচ্চ অগ্রাধিকার' } : { overdue: 'Overdue only', due: 'Due today only', high: 'High priority only' })[focusFilter] ?? focusFilter}</Text>
          <AppIcon name="close" size={icon.sm} color={colors.primary} />
        </Pressable>
      ) : null}

      {plan ? (() => {
        const seen = new Set<string>();
        const matchFilter = (t: DailyPlan['scheduled'][number]) => {
          if (focusFilter === 'high') return t.priority === 'HIGH' || t.priority === 'URGENT';
          return true;
        };
        const dayTasks = [...plan.scheduled, ...plan.inProgress].filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true))).filter(matchFilter);
        const overdueTasks = plan.overdue.filter(matchFilter);
        const order: BucketKey[] = ['morning', 'noon', 'evening', 'night', 'unset'];
        const bLabels: Record<BucketKey, string> = bn
          ? { morning: 'সকাল', noon: 'দুপুর', evening: 'বিকাল', night: 'সন্ধ্যা', unset: 'সময় নির্ধারিত নয়' }
          : { morning: 'Morning', noon: 'Afternoon', evening: 'Evening', night: 'Night', unset: 'No time set' };
        const groups = order
          .map(k => ({ key: k, label: bLabels[k], items: dayTasks.filter(t => bucketKey(t) === k).sort((a, b) => timeStr(a).localeCompare(timeStr(b))) }))
          .filter(g => g.items.length);
        return (
        <FlatList
          data={plan.inbox}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <>
              {overdueTasks.length ? <TimelineGroup label={labels.overdue} items={overdueTasks} accent={accents.red} styles={styles} colors={colors} accents={accents} language={language} /> : null}
              {groups.map(g => <TimelineGroup key={g.key} label={g.label} items={g.items} styles={styles} colors={colors} accents={accents} language={language} />)}
              {!overdueTasks.length && !groups.length ? <View style={styles.section}><Text style={styles.emptyDay}>{bn ? 'আজকের জন্য নির্ধারিত কোনো টাস্ক নেই।' : 'Nothing scheduled for this day.'}</Text></View> : null}
              <View style={styles.inboxSection}>
                <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.inboxFade} pointerEvents="none" />
                <View style={styles.inboxHeaderRow}>
                  <Text numberOfLines={1} style={[styles.sectionTitle, { flexShrink: 1, flexGrow: 1 }]}>{labels.inboxTitle} · {plan.inbox.length}</Text>
                  <Link href="/inbox" asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel={labels.inbox} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.linkPill, pressed && styles.pressed])}>
                      <Text style={styles.linkText}>{labels.inbox}</Text>
                      <AppIcon name="chevron-right" size={icon.sm} color={colors.primary} />
                    </Pressable>
                  </Link>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={<AppState title={labels.empty} icon="inbox" />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const tone = accents[priorityAccentName(item.priority)];
            return (
              <AppCard style={styles.row}>
                <View style={[styles.priorityBar, { backgroundColor: tone.base }]} />
                <RowLeading thumbUri={thumbs.get(item.id)} icon="inbox-arrow-down-outline" tone="orange" size={38} />
                <Link href={{ pathname: '/task-detail', params: { id: item.id } }} asChild>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${item.title}`} style={({ pressed }) => StyleSheet.flatten([styles.body, pressed && styles.pressed])}>
                    <Text numberOfLines={3} style={styles.task}>{item.title}</Text>
                    <Text style={[styles.meta, { color: tone.on }]}>{priorityLabel(item.priority, bn)}</Text>
                  </Pressable>
                </Link>
                <Pressable disabled={Boolean(busyId)} onPress={() => void planTask(item.id)} style={({ pressed }) => StyleSheet.flatten([styles.planButton, busyId && styles.disabled, pressed && styles.pressed])} accessibilityRole="button" accessibilityState={{ busy: busyId === item.id, disabled: Boolean(busyId) }} accessibilityLabel={`${labels.plan} ${item.title}`}>
                  {busyId === item.id ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="calendar-check-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.planText}>{labels.plan}</Text></>}
                </Pressable>
              </AppCard>
            );
          }}
        />
        );
      })() : null}
    </View>
  );
}

function SummaryPill({ label, count, tone, styles }: { label: string; count: number; tone: AccentRole; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.summaryPill, { backgroundColor: tone.soft, borderColor: tone.border }]}>
      <Text style={[styles.summaryCount, { color: tone.on }]}>{count}</Text>
      <Text numberOfLines={1} style={[styles.summaryLabel, { color: tone.on }]}>{label}</Text>
    </View>
  );
}

type BucketKey = 'morning' | 'noon' | 'evening' | 'night' | 'unset';
function bucketKey(task: DailyPlan['scheduled'][number]): BucketKey {
  if (!task.dueAt) return 'unset';
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', hour12: false }).format(new Date(task.dueAt)));
  if (Number.isNaN(h)) return 'unset';
  return h < 12 ? 'morning' : h < 16 ? 'noon' : h < 19 ? 'evening' : 'night';
}
function timeStr(task: DailyPlan['scheduled'][number]): string {
  if (!task.dueAt) return '—';
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(task.dueAt)); } catch { return '—'; }
}

function TimelineGroup({ label, items, accent, styles, colors, accents, language }: { label: string; items: DailyPlan['scheduled']; accent?: AccentRole; styles: ReturnType<typeof makeStyles>; colors: ThemeColors; accents: ThemeAccents; language: 'bn' | 'en' }) {
  const bn = language === 'bn';
  return (
    <View style={styles.section}>
      <Text style={styles.groupLabel}>{label} · {items.length}</Text>
      {items.slice(0, 12).map(task => {
        const tone = accent ?? accents[priorityAccentName(task.priority)];
        return (
          <Link key={task.id} href={{ pathname: '/task-detail', params: { id: task.id } }} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${task.title}`} style={({ pressed }) => StyleSheet.flatten([styles.tlRow, pressed && styles.pressed])}>
              <View style={styles.tlLeft}>
                <Text style={styles.tlTime}>{timeStr(task)}</Text>
                <View style={styles.tlLine}><View style={[styles.tlDot, { backgroundColor: tone.base, borderColor: tone.soft }]} /></View>
              </View>
              <View style={styles.tlCard}>
                <Text numberOfLines={2} style={styles.task}>{task.title}</Text>
                <Text style={[styles.compactMeta, { color: tone.on }]}>{priorityLabel(task.priority, bn)}</Text>
              </View>
              <AppIcon name="chevron-right" size={icon.sm} color={colors.textMuted} />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
    headingCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '900', letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.title, fontWeight: '900', marginTop: spacing.sm },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.sm },
    dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    navArrow: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    todayChip: { flex: 1, minHeight: control.iconButtonSize, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    todayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    todayChipText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    todayChipTextActive: { color: colors.onPrimary },
    weekStrip: { flexDirection: 'row', gap: spacing.xxs, marginTop: spacing.sm },
    weekDay: { flex: 1, minHeight: 54, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: spacing.xs },
    weekDaySel: { backgroundColor: colors.primary, borderColor: colors.primary },
    weekWd: { color: colors.textMuted, ...typography.section },
    weekNum: { color: colors.textPrimary, ...typography.meta, fontFamily: typography.numeric.fontFamily },
    weekTextSel: { color: colors.onPrimary },
    weekNumToday: { color: colors.primary },
    summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    summaryPill: { flex: 1, borderWidth: border.thin, borderRadius: radius.lg, paddingVertical: spacing.smd, paddingHorizontal: spacing.sm, alignItems: 'center' },
    summaryCount: { ...typography.heading, fontWeight: '900' },
    summaryLabel: { ...typography.caption, fontWeight: '700', marginTop: spacing.xxs },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    section: { marginBottom: spacing.md },
    sectionTitle: { color: colors.textPrimary, ...typography.cardTitle, marginBottom: spacing.sm },
    groupLabel: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, letterSpacing: 0.6, marginTop: spacing.sm, marginBottom: spacing.xs },
    emptyDay: { color: colors.textMuted, ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.md },
    tlRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm, marginBottom: spacing.xs },
    tlLeft: { width: 52, alignItems: 'center' },
    tlTime: { color: colors.textSecondary, ...typography.section, fontFamily: typography.numeric.fontFamily, marginBottom: spacing.xxs },
    tlLine: { flex: 1, width: 2, backgroundColor: colors.border, alignItems: 'center' },
    tlDot: { width: 12, height: 12, borderRadius: radius.pill, borderWidth: 3 },
    tlCard: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.smd, justifyContent: 'center', ...elevation.soft },
    inboxSection: { position: 'relative', marginTop: spacing.lg },
    inboxFade: { position: 'absolute', left: 0, right: 0, top: -spacing.xl, height: spacing.xl },
    inboxHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    linkPill: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingLeft: spacing.smd, paddingRight: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primaryTint, opacity: 0.5 },
    linkText: { color: colors.primary, ...typography.bodySmall, fontWeight: '900' },
    compact: { minHeight: control.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.xs, ...elevation.soft },
    compactIcon: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    compactCopy: { flex: 1, minWidth: 0 },
    compactMeta: { ...typography.section, color: colors.textMuted, marginTop: spacing.xxs, fontWeight: '700' },
    row: { minHeight: control.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm, overflow: 'hidden' },
    priorityBar: { width: 4, alignSelf: 'stretch', borderRadius: radius.pill },
    body: { flex: 1, minWidth: 0, minHeight: control.iconButtonSize, justifyContent: 'center', paddingHorizontal: spacing.xs },
    task: { color: colors.textPrimary, ...typography.meta, fontWeight: '700' },
    meta: { ...typography.section, marginTop: spacing.xxs, fontWeight: '800' },
    priority: { ...typography.section, fontWeight: '900', maxWidth: spacing.xxl + spacing.md, textAlign: 'right' },
    planButton: { minHeight: layout.minTouchTarget, minWidth: control.inputHeight, maxWidth: control.inputHeight + spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xxs },
    planText: { color: colors.onPrimary, fontWeight: '800', flexShrink: 1 },
    disabled: { opacity: opacity.disabled },
    pressed: { opacity: opacity.pressed },
  });
}

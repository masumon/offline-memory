import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { parseLocalNlp, type NlpResult } from '../ai/nlp';
import { useTaskStore } from '../store/task.store';
import { useMemoryStore } from '../store/memory.store';
import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from '../ui/AppIcon';
import { AppState } from '../ui/AppSurface';
import { formatBangladeshWeekdayDate } from '../i18n/date-time';
import { home } from '../i18n/common';
import { localizeTaskPriority, localizeTaskStatus } from '../i18n/domain-labels';
import { border, control, elevation, icon, layout, radius, spacing, typography, memoryKindAccentName, type AccentRole, type ThemeAccents, type ThemeColors } from '../theme';
import type { Task } from '../types/task-model';

const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
const pad = (value: number) => String(value).padStart(2, '0');
const clockLabel = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

type NlpPlan = { title: string; plannedDate: string | null; dueAt: string | null; dateLabel: string | null; timeLabel: string | null };

function buildPlan(result: NlpResult): NlpPlan | null {
  if (result.intent !== 'CREATE_TASK') return null;
  const title = result.entities.taskText?.trim();
  if (!title) return null;
  const isoDate = result.entities.date?.isoDate ?? null;
  const minutes = result.entities.time?.minutes;
  let dueAt: string | null = null;
  if (isoDate && typeof minutes === 'number') {
    const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
    dueAt = new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
  }
  return {
    title,
    plannedDate: isoDate && !dueAt ? isoDate : null,
    dueAt,
    dateLabel: result.entities.date ? result.entities.date.isoDate : null,
    timeLabel: typeof minutes === 'number' ? clockLabel(minutes) : null,
  };
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const copy = home(language);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [today, setToday] = useState(() => new Date());
  const tasks = useTaskStore(s => s.tasks);
  const isLoading = useTaskStore(s => s.isLoading);
  const error = useTaskStore(s => s.error);
  const load = useTaskStore(s => s.load);
  const create = useTaskStore(s => s.create);
  const complete = useTaskStore(s => s.complete);
  const memories = useMemoryStore(s => s.memories);
  const memoriesLoading = useMemoryStore(s => s.isLoading);
  const loadMemories = useMemoryStore(s => s.load);
  const createMemory = useMemoryStore(s => s.create);

  useEffect(() => {
    void load(db);
    void loadMemories(db);
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, [db, load, loadMemories]);

  const todayKey = dateKey(today);
  const hour = today.getHours();
  const greeting = bn
    ? (hour < 5 ? 'শুভ রাত্রি' : hour < 12 ? 'শুভ সকাল' : hour < 16 ? 'শুভ অপরাহ্ন' : hour < 19 ? 'শুভ বিকাল' : 'শুভ সন্ধ্যা')
    : (hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  const nlpPreview = useMemo<NlpResult | null>(() => (title.trim() ? parseLocalNlp(title.trim(), today) : null), [title, today]);
  const plan = useMemo(() => (nlpPreview ? buildPlan(nlpPreview) : null), [nlpPreview]);
  const active = useMemo(() => tasks.filter(task => !['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(task.status)), [tasks]);
  const focus = useMemo(() => ({
    overdue: active.filter(task => task.dueAt && new Date(task.dueAt).getTime() < today.getTime()).length,
    dueToday: active.filter(task => task.dueAt?.slice(0, 10) === todayKey || task.plannedDate === todayKey).length,
    highPriority: active.filter(task => task.priority === 'HIGH' || task.priority === 'URGENT').length,
  }), [active, today, todayKey]);
  const todayTasks = useMemo(() => active.filter(task => {
    const overdue = Boolean(task.dueAt && new Date(task.dueAt).getTime() < today.getTime());
    return overdue || task.dueAt?.slice(0, 10) === todayKey || task.plannedDate === todayKey || task.status === 'IN_PROGRESS';
  }).slice(0, 5), [active, today, todayKey]);

  const submitRaw = async () => {
    const value = title.trim();
    if (!value || creating) return;
    setCreating(true);
    try { if (await create(db, { title: value })) setTitle(''); } finally { setCreating(false); }
  };
  const confirmPlan = async () => {
    if (!plan || creating) return;
    setCreating(true);
    try {
      const created = await create(db, { title: plan.title, plannedDate: plan.plannedDate, dueAt: plan.dueAt });
      if (created) setTitle('');
    } finally { setCreating(false); }
  };
  const editPlan = () => {
    if (!plan) return;
    router.push({ pathname: '/task-editor', params: { title: plan.title, ...(plan.plannedDate ? { plannedDate: plan.plannedDate } : {}), ...(plan.dueAt ? { dueAt: plan.dueAt } : {}) } });
  };
  const saveMemory = async () => {
    const value = (plan?.title ?? title).trim();
    if (!value || creating) return;
    setCreating(true);
    try { if (await createMemory(db, { content: value })) setTitle(''); } finally { setCreating(false); }
  };
  const handleComplete = async (id: string) => {
    if (completingId) return;
    setCompletingId(id);
    try { await complete(db, id); } finally { setCompletingId(null); }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={todayTasks}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerCopy}>
                  <Text style={styles.greeting}>{greeting}{' '}👋</Text>
                  <Text style={styles.date}>{formatBangladeshWeekdayDate(today, language)}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'রিমাইন্ডার' : 'Reminders'} onPress={() => router.push('/reminders')} style={({ pressed }) => StyleSheet.flatten([styles.bellBtn, pressed && styles.pressed])}>
                  <AppIcon name="bell-outline" size={icon.md} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.offlineBadge}>
                <AppIcon name="shield-check-outline" size={icon.sm} color={colors.success} />
                <Text style={styles.offlineText}>{copy.offline}</Text>
              </View>
            </View>

            <View style={styles.capture}>
              <View style={styles.captureLabelRow}>
                <AppIcon name="lightning-bolt-outline" size={icon.sm} color={colors.primary} />
                <Text style={styles.captureLabel}>{copy.placeholder}</Text>
              </View>
              <View style={styles.composer}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={() => void (plan ? confirmPlan() : submitRaw())}
                  editable={!creating}
                  placeholder={copy.placeholder}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  multiline
                  style={styles.input}
                  accessibilityLabel={copy.placeholder}
                />
              </View>

              {plan ? (
                <View style={styles.understand}>
                  <View style={styles.understandHead}>
                    <AppIcon name="check-decagram-outline" size={icon.sm} color={accents.green.on} />
                    <Text style={styles.understandTitle}>{language === 'bn' ? 'আমি বুঝেছি' : 'Here’s what I understood'}</Text>
                  </View>
                  <UnderstandRow icon="clipboard-text-outline" iconColor={accents.green.on} label={language === 'bn' ? 'টাস্ক' : 'Task'} value={plan.title} styles={styles} />
                  {plan.dateLabel ? <UnderstandRow icon="calendar-month-outline" iconColor={accents.green.on} label={language === 'bn' ? 'তারিখ' : 'Date'} value={plan.dateLabel} styles={styles} /> : null}
                  {plan.timeLabel ? <UnderstandRow icon="clock-outline" iconColor={accents.green.on} label={language === 'bn' ? 'সময়' : 'Time'} value={plan.timeLabel} styles={styles} /> : null}
                  <View style={styles.understandActions}>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityState={{ busy: creating }} accessibilityLabel={bn ? 'টাস্ক তৈরি করুন' : 'Create task'} onPress={() => void confirmPlan()} style={({ pressed }) => StyleSheet.flatten([styles.confirmBtn, creating && styles.disabled, pressed && styles.pressed])}>
                      {creating ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.confirmText}>{bn ? 'টাস্ক তৈরি করুন' : 'Create task'}</Text></>}
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'মেমোরি হিসেবে রাখুন' : 'Save as memory'} onPress={() => void saveMemory()} style={({ pressed }) => StyleSheet.flatten([styles.ghostBtn, pressed && styles.pressed])}>
                      <AppIcon name="brain" size={icon.sm} color={accents.purple.on} />
                      <Text style={[styles.ghostText, { color: accents.purple.on }]}>{bn ? 'মেমোরি' : 'Memory'}</Text>
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'এডিট করুন' : 'Edit'} onPress={editPlan} style={({ pressed }) => StyleSheet.flatten([styles.ghostBtn, pressed && styles.pressed])}>
                      <AppIcon name="pencil-outline" size={icon.sm} color={colors.primary} />
                      <Text style={styles.ghostText}>{bn ? 'এডিট' : 'Edit'}</Text>
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'বাতিল' : 'Cancel'} onPress={() => setTitle('')} style={({ pressed }) => StyleSheet.flatten([styles.iconGhost, pressed && styles.pressed])}>
                      <AppIcon name="close" size={icon.sm} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.understandHint}>{copy.preview}</Text>
                </View>
              ) : title.trim() ? (
                <View style={styles.choiceCard}>
                  <Text style={styles.choiceQ}>{bn ? 'এটি কী হিসেবে রাখব?' : 'Save this as…'}</Text>
                  <View style={styles.understandActions}>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'টাস্ক করুন' : 'Make task'} onPress={() => void submitRaw()} style={({ pressed }) => StyleSheet.flatten([styles.confirmBtn, creating && styles.disabled, pressed && styles.pressed])}>
                      {creating ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="clipboard-check-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.confirmText}>{bn ? 'টাস্ক' : 'Task'}</Text></>}
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'মেমোরি করুন' : 'Make memory'} onPress={() => void saveMemory()} style={({ pressed }) => StyleSheet.flatten([styles.memoryBtn, creating && styles.disabled, pressed && styles.pressed])}>
                      <AppIcon name="brain" size={icon.sm} color={colors.onPrimary} />
                      <Text style={styles.confirmText}>{bn ? 'মেমোরি' : 'Memory'}</Text>
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'বাতিল' : 'Cancel'} onPress={() => setTitle('')} style={({ pressed }) => StyleSheet.flatten([styles.iconGhost, pressed && styles.pressed])}>
                      <AppIcon name="close" size={icon.sm} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{copy.taskLoadError}</Text> : null}

            <SectionHeader title={copy.focus} action={copy.plan} onPress={() => router.push('/planning')} styles={styles} />
            <View style={styles.focusGrid}>
              <FocusCard label={copy.overdue} value={focus.overdue} iconName="alert-circle-outline" tone={accents.red} onPress={() => router.push('/planning')} styles={styles} />
              <FocusCard label={copy.due} value={focus.dueToday} iconName="calendar-check-outline" tone={accents.blue} onPress={() => router.push('/planning')} styles={styles} />
              <FocusCard label={copy.high} value={focus.highPriority} iconName="flag-variant-outline" tone={accents.orange} onPress={() => router.push('/planning')} styles={styles} />
            </View>

            <SectionHeader title={copy.tasks} action={copy.view} onPress={() => router.push('/planning')} styles={styles} />
          </>
        }
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            completing={completingId === item.id}
            onComplete={() => void handleComplete(item.id)}
            onOpen={() => router.push({ pathname: '/task-detail', params: { id: item.id } })}
            colors={colors}
            styles={styles}
            language={language}
          />
        )}
        ListEmptyComponent={isLoading ? <AppState loading title={copy.loadTasks} /> : <AppState icon="white-balance-sunny" title={copy.emptyTask} description={copy.emptyTask} />}
        ListFooterComponent={
          <>
            <SectionHeader title={copy.memories} action={copy.view} onPress={() => router.push('/memory')} styles={styles} />
            {memoriesLoading ? (
              <AppState loading title={copy.loadMemories} />
            ) : memories.slice(0, 3).length ? (
              memories.slice(0, 3).map(memory => {
                const tone = accents[memoryKindAccentName(memory.kind)];
                return (
                  <Pressable
                    key={memory.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${copy.openMemory} ${memory.content.slice(0, 60)}`}
                    onPress={() => router.push({ pathname: '/memory-detail', params: { id: memory.id } })}
                    style={({ pressed }) => StyleSheet.flatten([styles.memoryCard, pressed && styles.pressed])}
                  >
                    <View style={[styles.memoryIcon, { backgroundColor: tone.soft }]}>
                      <AppIcon name="brain" size={icon.md} color={tone.on} />
                    </View>
                    <Text numberOfLines={2} style={styles.memoryTitle}>{memory.content}</Text>
                    <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
                  </Pressable>
                );
              })
            ) : (
              <AppState icon="brain" title={copy.emptyMemory} description={copy.emptyMemory} />
            )}
            <SectionHeader title={copy.more} action={copy.open} onPress={() => router.push('/more')} styles={styles} />
            <View style={styles.quickRow}>
              <QuickAction icon="magnify" label={language === 'bn' ? 'সার্চ' : 'Search'} onPress={() => router.push('/search')} tone={accents.blue} styles={styles} />
              <QuickAction icon="robot-outline" label={language === 'bn' ? 'অ্যাসিস্ট্যান্ট' : 'Assistant'} onPress={() => router.push('/assistant')} tone={accents.purple} styles={styles} />
              <QuickAction icon="inbox-arrow-down-outline" label={language === 'bn' ? 'ইনবক্স' : 'Inbox'} onPress={() => router.push('/inbox')} tone={accents.orange} styles={styles} />
            </View>

            <View style={styles.psychCard}>
              <Text style={styles.psychTitle}>{bn ? 'কেন সহজ' : 'Why this feels easy'}</Text>
              {(bn
                ? ['সহজ ভাষায় লিখুন — অ্যাপ বুঝে নেয়', 'রং ও আইকন এক নজরে অগ্রাধিকার বোঝায়', 'টাইমলাইন পুরো দিনটাকে সাজিয়ে দেয়', 'সব কিছু অফলাইন — কোনো দুশ্চিন্তা নেই']
                : ['Write in plain words — the app understands', 'Colour and icons show priority at a glance', 'The timeline organises your whole day', 'Everything stays offline — nothing to worry about']
              ).map(line => (
                <View key={line} style={styles.psychRow}>
                  <AppIcon name="check-circle-outline" size={icon.xs} color={colors.success} />
                  <Text style={styles.psychText}>{line}</Text>
                </View>
              ))}
            </View>
          </>
        }
      />
    </View>
  );
}

function SectionHeader({ title, action, onPress, styles }: { title: string; action: string; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={({ pressed }) => StyleSheet.flatten([styles.textAction, pressed && styles.pressed])}>
        <Text style={styles.textActionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function UnderstandRow({ icon: iconName, iconColor, label, value, styles }: { icon: 'clipboard-text-outline' | 'calendar-month-outline' | 'clock-outline'; iconColor: string; label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.understandRow}>
      <AppIcon name={iconName} size={icon.sm} color={iconColor} />
      <Text style={styles.understandRowLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.understandRowValue}>{value}</Text>
    </View>
  );
}

function FocusCard({ label, value, iconName, tone, onPress, styles }: { label: string; value: number; iconName: 'alert-circle-outline' | 'calendar-check-outline' | 'flag-variant-outline'; tone: AccentRole; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => StyleSheet.flatten([styles.focusCard, { borderColor: tone.border, backgroundColor: tone.soft }, pressed && styles.pressed])}>
      <View style={[styles.focusIcon, { backgroundColor: tone.border }]}>
        <AppIcon name={iconName} size={icon.sm} color={tone.on} />
      </View>
      <Text style={[styles.focusValue, { color: tone.on }]}>{value}</Text>
      <Text numberOfLines={2} style={[styles.focusLabel, { color: tone.on }]}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({ icon: iconName, label, onPress, tone, styles }: { icon: 'magnify' | 'robot-outline' | 'inbox-arrow-down-outline'; label: string; onPress: () => void; tone: AccentRole; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => StyleSheet.flatten([styles.quickAction, { borderColor: tone.border, backgroundColor: tone.soft }, pressed && styles.pressed])}>
      <AppIcon name={iconName} size={icon.md} color={tone.on} />
      <Text numberOfLines={1} style={[styles.quickLabel, { color: tone.on }]}>{label}</Text>
    </Pressable>
  );
}

function TaskRow({ task, completing, onComplete, onOpen, colors, styles, language }: { task: Task; completing: boolean; onComplete: () => void; onOpen: () => void; colors: ThemeColors; styles: ReturnType<typeof makeStyles>; language: 'bn' | 'en' }) {
  const completed = task.status === 'COMPLETED';
  const bn = language === 'bn';
  return (
    <View style={styles.taskRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, busy: completing }}
        accessibilityLabel={`${bn ? 'সম্পন্ন করুন' : 'Complete'} ${task.title}`}
        disabled={completed || completing}
        onPress={onComplete}
        style={({ pressed }) => StyleSheet.flatten([styles.checkbox, completed && styles.checkboxDone, completing && styles.disabled, pressed && styles.pressed])}
      >
        {completing ? <ActivityIndicator size="small" color={colors.primary} /> : completed ? <AppIcon name="check" size={icon.sm} color={colors.onPrimary} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${task.title}`} onPress={onOpen} style={({ pressed }) => StyleSheet.flatten([styles.taskBody, pressed && styles.pressed])}>
        <Text numberOfLines={3} style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskMeta}>{localizeTaskPriority(task.priority, bn)} · {localizeTaskStatus(task.status, bn)}</Text>
      </Pressable>
      <AppIcon name="chevron-right" size={icon.sm} color={colors.textMuted} />
    </View>
  );
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { marginBottom: spacing.md, paddingTop: spacing.sm },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    headerCopy: { flex: 1, minWidth: 0 },
    greeting: { color: colors.textPrimary, ...typography.title },
    eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.display, marginTop: spacing.sm },
    date: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.xxs },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.sm },
    bellBtn: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    offlineBadge: { alignSelf: 'flex-start', marginTop: spacing.smd, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderColor: colors.border, borderWidth: border.thin, borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs },
    offlineText: { color: colors.textSecondary, ...typography.caption, fontWeight: '800' },
    capture: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.sm, ...elevation.raised },
    captureLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    captureLabel: { color: colors.textSecondary, ...typography.label, fontWeight: '900', letterSpacing: 0.6 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    input: { flex: 1, minWidth: 0, minHeight: control.inputHeight, maxHeight: 132, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingTop: spacing.smd, paddingBottom: spacing.smd, ...typography.body, textAlignVertical: 'top' },
    addButton: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.lg, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    understand: { marginTop: spacing.md, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.lg, backgroundColor: accents.green.soft, padding: spacing.md },
    understandHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    understandTitle: { color: accents.green.on, ...typography.cardTitle, fontWeight: '900' },
    understandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    understandRowLabel: { color: accents.green.on, ...typography.caption, fontWeight: '900', minWidth: 56 },
    understandRowValue: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    understandActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.smd },
    confirmBtn: { minHeight: control.buttonHeight, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    confirmText: { color: colors.onPrimary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    memoryBtn: { minHeight: control.buttonHeight, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: accents.purple.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    ghostBtn: { minHeight: control.buttonHeight, minWidth: layout.minTouchTarget, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    ghostText: { color: colors.primary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    ghostTextMuted: { color: colors.textSecondary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    iconGhost: { minHeight: control.buttonHeight, minWidth: layout.minTouchTarget, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    choiceCard: { marginTop: spacing.md, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: spacing.md },
    choiceQ: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, marginBottom: spacing.sm },
    understandHint: { color: accents.green.on, ...typography.caption, marginTop: spacing.sm, opacity: 0.9 },
    hintPreview: { marginTop: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    hintEyebrow: { color: colors.primary, ...typography.label, fontWeight: '800' },
    hintValue: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700', marginTop: spacing.xxs },
    error: { color: colors.danger, ...typography.bodySmall, marginTop: spacing.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
    sectionTitle: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '900', flexShrink: 1 },
    textAction: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.xs },
    textActionText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    focusGrid: { flexDirection: 'row', gap: spacing.sm },
    focusCard: { flex: 1, minHeight: control.rowMinHeight + spacing.lg, borderWidth: border.thin, borderRadius: radius.lg, padding: spacing.md },
    focusIcon: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    focusValue: { ...typography.title, fontWeight: '900', marginTop: spacing.sm },
    focusLabel: { ...typography.caption, fontWeight: '700', marginTop: spacing.xxs },
    taskRow: { minHeight: control.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.sm, marginBottom: spacing.sm, ...elevation.card },
    checkbox: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
    taskBody: { flex: 1, minWidth: 0, minHeight: control.iconButtonSize, justifyContent: 'center' },
    taskTitle: { color: colors.textPrimary, ...typography.body, fontWeight: '800' },
    taskMeta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs },
    memoryCard: { minHeight: control.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.sm, marginBottom: spacing.sm, ...elevation.card },
    memoryIcon: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    memoryTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    psychCard: { marginTop: spacing.xl, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.lg, backgroundColor: accents.green.soft, padding: spacing.md, gap: spacing.xs },
    psychTitle: { color: accents.green.on, ...typography.caption, fontFamily: typography.label.fontFamily, letterSpacing: 0.6, marginBottom: spacing.xxs },
    psychRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    psychText: { flex: 1, color: colors.textSecondary, ...typography.caption, lineHeight: 18 },
    quickAction: { flex: 1, minHeight: control.rowMinHeight, borderWidth: border.thin, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.smd, paddingHorizontal: spacing.xs },
    quickLabel: { ...typography.caption, fontWeight: '800' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

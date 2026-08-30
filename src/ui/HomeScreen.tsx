import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { parseLocalNlp, type NlpPriority, type NlpResult } from '../ai/nlp';
import { useTaskStore } from '../store/task.store';
import { useMemoryStore } from '../store/memory.store';
import { useSubtaskStore } from '../store/subtask.store';
import { useAppPreferences } from '../app/AppPreferences';
import { getSuggestions, type Suggestion } from '../services/suggestion-service';
import { preferredIntent, recordDismissal, recordIntentChoice, suggestTime, topFrequentTasks } from '../services/learning-service';
import { getStreak } from '../services/streak-service';
import { editTask } from '../services/task-service';
import { useSpeech } from '../hooks/useSpeech';
import { AppIcon, type IconName } from '../ui/AppIcon';
import { AppState } from '../ui/AppSurface';
import { RowLeading } from '../ui/RowLeading';
import { HeroMascot } from '../ui/HeroMascot';
import { loadImageThumbs } from '../services/attachment-thumbs';
import { formatBangladeshWeekdayDate } from '../i18n/date-time';
import { home } from '../i18n/common';
import { localizeTaskPriority, localizeTaskStatus } from '../i18n/domain-labels';
import { border, control, elevation, gradients, icon, layout, radius, spacing, typography, memoryKindAccentName, memoryKindIcon, type AccentRole, type ThemeAccents, type ThemeColors } from '../theme';
import type { Task } from '../types/task-model';

const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
const pad = (value: number) => String(value).padStart(2, '0');
const clockLabel = (minutes: number) => { const h = Math.floor(minutes / 60); const h12 = h % 12 || 12; return `${h12}:${pad(minutes % 60)} ${h < 12 ? 'AM' : 'PM'}`; };

type NlpPlan = {
  kind: 'task' | 'memory';
  title: string;
  plannedDate: string | null;
  dueAt: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  timeSuggested: boolean;
  priority: NlpPriority | null;
  tags: string[];
};

const isoOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Always returns a plan when there is text: CREATE_MEMORY → memory, everything else →
// task (with an "actually a memory" switch in the UI). `suggestedMin` comes from the
// on-device learning layer ("gym" → usually 06:00).
function buildPlan(result: NlpResult, now: Date, suggestedMin: number | null, learnedIntent: 'TASK' | 'MEMORY' | null): NlpPlan | null {
  const raw = (result.entities.taskText ?? result.entities.memoryText ?? result.normalizedText)?.trim();
  if (!raw) return null;
  const asMemory = result.intent === 'CREATE_MEMORY' || (result.intent === 'UNKNOWN' && learnedIntent === 'MEMORY');
  if (asMemory) {
    return { kind: 'memory', title: raw, plannedDate: null, dueAt: null, dateLabel: null, timeLabel: null, timeSuggested: false, priority: null, tags: result.entities.tags ?? [] };
  }
  let minutes = result.entities.time?.minutes;
  let timeSuggested = false;
  if (typeof minutes !== 'number' && suggestedMin !== null) { minutes = suggestedMin; timeSuggested = true; }
  let isoDate = result.entities.date?.isoDate ?? null;
  let dateResolved = Boolean(result.entities.date);
  if (!isoDate && typeof minutes === 'number') {
    const candidate = new Date(now);
    candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 1);
    isoDate = isoOf(candidate);
    dateResolved = true;
  }
  let dueAt: string | null = null;
  if (isoDate && typeof minutes === 'number') {
    const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
    dueAt = new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
  }
  return {
    kind: 'task',
    title: result.entities.taskText?.trim() || raw,
    plannedDate: isoDate && !dueAt ? isoDate : null,
    dueAt,
    dateLabel: dateResolved ? isoDate : null,
    timeLabel: typeof minutes === 'number' ? clockLabel(minutes) : null,
    timeSuggested,
    priority: result.entities.priority ?? null,
    tags: result.entities.tags ?? [],
  };
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language, reduceMotion } = useAppPreferences();
  const bn = language === 'bn';
  const copy = useMemo(() => home(language), [language]);
  const anim = <T,>(a: T): T | undefined => (reduceMotion ? undefined : a);
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
  const subtaskProgress = useSubtaskStore(s => s.progress);
  const loadSubtaskProgress = useSubtaskStore(s => s.loadProgress);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [frequent, setFrequent] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [suggestedMin, setSuggestedMin] = useState<number | null>(null);
  const [learnedIntent, setLearnedIntent] = useState<'TASK' | 'MEMORY' | null>(null);
  const [showMore, setShowMore] = useState(false);
  // Voice goes straight into the capture field: while listening we show the live
  // transcript inside the same TextInput (appended after whatever was already typed),
  // and the mic turns into a pulsing "stop". No separate overlay or recording bar.
  const { supported: voiceSupported, listening: voiceListening, partial: voicePartial, lastError: voiceError, startListening: startVoiceRec, stopListening: stopVoiceRec } = useSpeech(language);
  const [voiceBase, setVoiceBase] = useState('');
  const startVoice = () => {
    const base = title.trim();
    setVoiceBase(base);
    void startVoiceRec((finalText) => setTitle((base ? base + ' ' : '') + finalText));
  };
  const voiceValue = voiceListening
    ? (voiceBase ? voiceBase + ' ' : '') + voicePartial
    : title;

  const refreshSmarts = useMemo(() => async () => {
    try { setSuggestions(await getSuggestions(db, new Date(), language)); } catch { setSuggestions([]); }
    try { setFrequent(await topFrequentTasks(db, 4)); } catch { setFrequent([]); }
    try { setStreak(await getStreak(db)); } catch { setStreak(0); }
  }, [db, language]);

  useEffect(() => {
    void load(db);
    void loadMemories(db);
    void loadSubtaskProgress(db);
    void Promise.resolve().then(() => refreshSmarts());
    // Only re-render when the wall-clock minute actually changes — avoids a full
    // list rebuild every 60s when nothing time-dependent moved.
    const timer = setInterval(() => {
      setToday(prev => {
        const now = new Date();
        return now.getMinutes() === prev.getMinutes() && now.getHours() === prev.getHours() && now.getDate() === prev.getDate() ? prev : now;
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [db, load, loadMemories, loadSubtaskProgress, refreshSmarts]);

  // Learn from what the user typed: preferred task/memory intent + a habitual time.
  useEffect(() => {
    const value = title.trim();
    let active = true;
    void Promise.resolve()
      .then((): Promise<[number | null, 'TASK' | 'MEMORY' | null]> => (value.length >= 3
        ? Promise.all([suggestTime(db, value), preferredIntent(db, value)])
        : Promise.resolve([null, null])))
      .then(([min, intent]) => { if (active) { setSuggestedMin(min); setLearnedIntent(intent); } })
      .catch(() => { if (active) { setSuggestedMin(null); setLearnedIntent(null); } });
    return () => { active = false; };
  }, [db, title]);

  const todayKey = dateKey(today);
  const hour = today.getHours();
  const greeting = bn
    ? (hour < 5 ? 'শুভ রাত্রি' : hour < 12 ? 'শুভ সকাল' : hour < 16 ? 'শুভ অপরাহ্ন' : hour < 19 ? 'শুভ বিকাল' : 'শুভ সন্ধ্যা')
    : (hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  // The capture box parses on a short debounce — a long line shouldn't re-run the whole
  // NLP pipeline on every keystroke. The "here's what I understood" card may lag a beat.
  const [nlpText, setNlpText] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setNlpText(title.trim()), 160);
    return () => clearTimeout(id);
  }, [title]);
  const nlpPreview = useMemo<NlpResult | null>(() => (nlpText ? parseLocalNlp(nlpText, today) : null), [nlpText, today]);
  const plan = useMemo(() => (nlpPreview ? buildPlan(nlpPreview, today, suggestedMin, learnedIntent) : null), [nlpPreview, today, suggestedMin, learnedIntent]);
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
  const inboxCount = useMemo(() => tasks.filter(t => t.status === 'INBOX').length, [tasks]);
  const [thumbs, setThumbs] = useState<Map<string, string>>(() => new Map());
  const todayTaskIdKey = todayTasks.map(t => t.id).join(',');
  useEffect(() => {
    let alive = true;
    loadImageThumbs(db, 'TASK', todayTaskIdKey ? todayTaskIdKey.split(',') : [])
      .then(map => { if (alive) setThumbs(map); })
      .catch(() => { if (alive) setThumbs(new Map()); });
    return () => { alive = false; };
  }, [db, todayTaskIdKey]);
  const progress = useMemo(() => {
    const isToday = (task: Task) => task.dueAt?.slice(0, 10) === todayKey || task.plannedDate === todayKey;
    const doneToday = tasks.filter(t => t.status === 'COMPLETED' && (t.completedAt?.slice(0, 10) === todayKey || isToday(t))).length;
    const plannedToday = active.filter(isToday).length + doneToday;
    return { done: doneToday, total: plannedToday, pct: plannedToday ? Math.round((doneToday / plannedToday) * 100) : 0 };
  }, [tasks, active, todayKey]);

  // The hero (gradient + the always-animating mascot + greeting) has nothing to do with
  // the capture box, so it's memoised out of the list header — otherwise every keystroke
  // reconciles the mascot's ~60-node SVG tree.
  const heroBlock = useMemo(() => (
    <LinearGradient colors={gradients.heroBrand} locations={[0, 0.42, 0.72, 1]} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={styles.hero}>
      <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.7 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.heroMascotSlot} pointerEvents="none"><HeroMascot /></View>
      <View style={styles.headerTop}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{formatBangladeshWeekdayDate(today, language)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'রিমাইন্ডার' : 'Reminders'} onPress={() => router.push('/reminders')} style={({ pressed }) => StyleSheet.flatten([styles.heroBell, pressed && styles.pressed])}>
          <AppIcon name="bell-outline" size={icon.md} color={colors.onPrimary} />
        </Pressable>
      </View>
      <View style={styles.heroBadge}>
        <AppIcon name="shield-check-outline" size={icon.sm} color={colors.onPrimary} />
        <Text style={styles.heroBadgeText}>{copy.offline}</Text>
      </View>
      <Text style={styles.heroPurpose}>{bn ? 'এক লাইনে লিখুন বা বলুন — অ্যাপ বুঝে টাস্ক বা মেমোরি বানায়, সময় হলে মনে করায়। সব এই ফোনেই।' : 'Type or say one line — the app turns it into a task or a memory and reminds you. All on this phone.'}</Text>
    </LinearGradient>
  ), [greeting, today, language, bn, styles, colors, copy]);

  const confirmPlan = async () => {
    if (!plan || creating) return;
    setCreating(true);
    try {
      if (plan.kind === 'memory') {
        if (await createMemory(db, { content: plan.title, tags: plan.tags })) { void recordIntentChoice(db, plan.title, 'MEMORY'); setTitle(''); }
      } else {
        const created = await create(db, { title: plan.title, plannedDate: plan.plannedDate, dueAt: plan.dueAt, priority: plan.priority ?? undefined });
        if (created) { void recordIntentChoice(db, plan.title, 'TASK'); setTitle(''); void refreshSmarts(); }
      }
    } finally { setCreating(false); }
  };
  const editPlan = () => {
    if (!plan) return;
    router.push({ pathname: '/task-editor', params: { title: plan.title, ...(plan.plannedDate ? { plannedDate: plan.plannedDate } : {}), ...(plan.dueAt ? { dueAt: plan.dueAt } : {}), ...(plan.priority ? { priority: plan.priority } : {}) } });
  };
  const saveMemory = async () => {
    const value = (plan?.title ?? title).trim();
    if (!value || creating) return;
    setCreating(true);
    try { if (await createMemory(db, { content: value, tags: plan?.tags })) { void recordIntentChoice(db, value, 'MEMORY'); setTitle(''); } } finally { setCreating(false); }
  };
  const switchPlanToTask = async () => {
    const value = (plan?.title ?? title).trim();
    if (!value || creating) return;
    setCreating(true);
    try { if (await create(db, { title: value })) { void recordIntentChoice(db, value, 'TASK'); setTitle(''); void refreshSmarts(); } } finally { setCreating(false); }
  };

  const runSuggestion = async (s: Suggestion) => {
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    const a = s.action;
    try {
      if (a.type === 'RESCHEDULE_OVERDUE') { for (const id of a.taskIds) await editTask(db, id, { dueAt: a.toIso }); await load(db); }
      else if (a.type === 'MAKE_RECURRING') { router.push({ pathname: '/task-editor', params: { title: a.title } }); }
      else if (a.type === 'OPEN_PLANNING') { router.push('/planning'); }
      else if (a.type === 'PREFILL_CAPTURE') { setTitle(a.text); }
      else if (a.type === 'OPEN_BACKUP') { router.push('/backup'); }
    } catch { /* best-effort */ }
    void refreshSmarts();
  };
  const dismissSuggestion = (s: Suggestion) => {
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    void recordDismissal(db, s.id).catch(() => {});
  };
  const handleComplete = useCallback(async (id: string) => {
    if (completingId) return;
    setCompletingId(id);
    try { await complete(db, id); } finally { setCompletingId(null); }
  }, [completingId, complete, db]);
  const openTask = useCallback((id: string) => router.push({ pathname: '/task-detail', params: { id } }), []);
  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TaskRow
      task={item}
      completing={completingId === item.id}
      onComplete={handleComplete}
      onOpen={openTask}
      colors={colors}
      accents={accents}
      styles={styles}
      language={language}
      subtasks={subtaskProgress[item.id]}
      thumbUri={thumbs.get(item.id)}
    />
  ), [completingId, handleComplete, openTask, colors, accents, styles, language, subtaskProgress, thumbs]);

  return (
    <View style={styles.container}>
      <FlatList
        data={todayTasks}
        keyExtractor={item => item.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {heroBlock}

            <View style={styles.capture}>
              <View style={styles.captureLabelRow}>
                <AppIcon name="lightning-bolt-outline" size={icon.sm} color={colors.primary} />
                <Text style={styles.captureLabel}>{copy.placeholder}</Text>
              </View>
              <View style={styles.composer}>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={voiceValue}
                    onChangeText={setTitle}
                    onSubmitEditing={() => { if (plan) void confirmPlan(); }}
                    editable={!creating && !voiceListening}
                    placeholder={copy.placeholder}
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    multiline
                    style={styles.input}
                    accessibilityLabel={copy.placeholder}
                  />
                  {voiceListening ? (
                    <View style={styles.voiceTag} pointerEvents="none" accessibilityLiveRegion="polite">
                      <PulseDot color={colors.danger} reduceMotion={reduceMotion} />
                      <Text style={styles.voiceTagText}>{voicePartial.trim() ? (bn ? 'শুনছি…' : 'Listening…') : (bn ? 'বলুন…' : 'Speak…')}</Text>
                    </View>
                  ) : null}
                </View>
                {voiceSupported ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={voiceListening ? (bn ? 'থামান' : 'Stop') : (bn ? 'কথা বলে যোগ করুন' : 'Add by voice')}
                    onPress={() => { if (voiceListening) stopVoiceRec(); else startVoice(); }}
                    disabled={creating}
                    style={({ pressed }) => StyleSheet.flatten([styles.micBtn, voiceListening && styles.micBtnActive, pressed && styles.pressed])}
                  >
                    <AppIcon name={voiceListening ? 'stop' : 'microphone-outline'} size={icon.md} color={voiceListening ? colors.onPrimary : colors.primary} />
                  </Pressable>
                ) : null}
              </View>

              {!voiceListening && (voiceError === 'permission' || voiceError === 'unavailable') ? (
                <Pressable
                  accessibilityRole={voiceError === 'permission' ? 'button' : 'text'}
                  onPress={voiceError === 'permission' ? () => void Linking.openSettings().catch(() => {}) : undefined}
                  style={styles.voiceNote}
                >
                  <AppIcon name={voiceError === 'permission' ? 'microphone-off' : 'microphone-question'} size={icon.xs} color={accents.orange.on} />
                  <Text style={styles.voiceNoteText}>
                    {voiceError === 'permission'
                      ? (bn ? 'মাইক্রোফোনের অনুমতি বন্ধ — চালু করতে সেটিংসে যান' : 'Microphone permission is off — tap to open Settings')
                      : (bn ? 'এই ডিভাইসে ভয়েস চালু হয়নি — টাইপ করে লিখুন' : 'Voice isn’t available here — please type instead')}
                  </Text>
                </Pressable>
              ) : null}

              {plan ? (
                <View style={[styles.understand, plan.kind === 'memory' && { borderColor: accents.purple.border, backgroundColor: accents.purple.soft }]}>
                  <View style={styles.understandHead}>
                    <AppIcon name={plan.kind === 'memory' ? 'bookmark-plus-outline' : 'check-decagram-outline'} size={icon.sm} color={plan.kind === 'memory' ? accents.purple.on : accents.green.on} />
                    <Text style={[styles.understandTitle, plan.kind === 'memory' && { color: accents.purple.on }]}>{bn ? 'আমি বুঝেছি' : 'Here’s what I understood'}</Text>
                  </View>
                  <UnderstandRow icon="clipboard-text-outline" iconColor={plan.kind === 'memory' ? accents.purple.on : accents.green.on} label={plan.kind === 'memory' ? (bn ? 'মেমোরি' : 'Memory') : (bn ? 'টাস্ক' : 'Task')} value={plan.title} styles={styles} />
                  {plan.dateLabel ? <UnderstandRow icon="calendar-month-outline" iconColor={accents.green.on} label={bn ? 'তারিখ' : 'Date'} value={plan.dateLabel} styles={styles} /> : null}
                  {plan.timeLabel ? <UnderstandRow icon="clock-outline" iconColor={accents.green.on} label={bn ? 'সময়' : 'Time'} value={plan.timeSuggested ? `${plan.timeLabel} ${bn ? '(সাধারণত)' : '(usual)'}` : plan.timeLabel} styles={styles} /> : null}
                  {plan.priority && plan.priority !== 'MEDIUM' ? <UnderstandRow icon="flag-variant-outline" iconColor={accents.orange.on} label={bn ? 'অগ্রাধিকার' : 'Priority'} value={localizeTaskPriority(plan.priority, bn)} styles={styles} /> : null}
                  {plan.tags.length ? <UnderstandRow icon="tag-outline" iconColor={accents.blue.on} label={bn ? 'ট্যাগ' : 'Tags'} value={plan.tags.map(t => `#${t}`).join(' ')} styles={styles} /> : null}
                  <Pressable disabled={creating} accessibilityRole="button" accessibilityState={{ busy: creating }} accessibilityLabel={plan.kind === 'memory' ? (bn ? 'মেমোরি সংরক্ষণ করুন' : 'Save memory') : (bn ? 'টাস্ক তৈরি করুন' : 'Create task')} onPress={() => void confirmPlan()} style={({ pressed }) => StyleSheet.flatten([styles.confirmBtn, plan.kind === 'memory' && { backgroundColor: accents.purple.base }, creating && styles.disabled, pressed && styles.pressed])}>
                    {creating ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.confirmText}>{plan.kind === 'memory' ? (bn ? 'মেমোরি সংরক্ষণ করুন' : 'Save memory') : (bn ? 'টাস্ক তৈরি করুন' : 'Create task')}</Text></>}
                  </Pressable>
                  <View style={styles.understandActions}>
                    {plan.kind === 'task' ? (
                      <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'বরং মেমোরি হিসেবে রাখুন' : 'Keep as a memory instead'} onPress={() => void saveMemory()} style={({ pressed }) => StyleSheet.flatten([styles.altBtn, { borderColor: accents.purple.border, backgroundColor: accents.purple.soft }, pressed && styles.pressed])}>
                        <AppIcon name="bookmark-plus-outline" size={icon.xs} color={accents.purple.on} />
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.altText, { color: accents.purple.on }]}>{bn ? 'মেমোরিতে বদলান' : 'Make it a memory'}</Text>
                      </Pressable>
                    ) : (
                      <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'বরং টাস্ক হিসেবে রাখুন' : 'Keep as a task instead'} onPress={() => void switchPlanToTask()} style={({ pressed }) => StyleSheet.flatten([styles.altBtn, { borderColor: accents.green.border, backgroundColor: accents.green.soft }, pressed && styles.pressed])}>
                        <AppIcon name="clipboard-check-outline" size={icon.xs} color={accents.green.on} />
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.altText, { color: accents.green.on }]}>{bn ? 'টাস্কে বদলান' : 'Make it a task'}</Text>
                      </Pressable>
                    )}
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'এডিট করুন' : 'Edit'} onPress={editPlan} style={({ pressed }) => StyleSheet.flatten([styles.ghostBtn, pressed && styles.pressed])}>
                      <AppIcon name="pencil-outline" size={icon.xs} color={colors.primary} />
                      <Text numberOfLines={1} style={styles.ghostText}>{bn ? 'এডিট' : 'Edit'}</Text>
                    </Pressable>
                    <Pressable disabled={creating} accessibilityRole="button" accessibilityLabel={bn ? 'বাতিল' : 'Cancel'} onPress={() => setTitle('')} style={({ pressed }) => StyleSheet.flatten([styles.iconGhost, pressed && styles.pressed])}>
                      <AppIcon name="close" size={icon.sm} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={[styles.understandHint, plan.kind === 'memory' && { color: accents.purple.on }]}>{copy.preview}</Text>
                </View>
              ) : null}

              <View style={styles.captureTools}>
                {!voiceSupported ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'কথা বলে যোগ করুন' : 'Add by voice'} onPress={() => router.push({ pathname: '/assistant', params: { voice: '1' } })} style={({ pressed }) => StyleSheet.flatten([styles.toolBtn, pressed && styles.pressed])}>
                    <AppIcon name="microphone-outline" size={icon.sm} color={colors.primary} />
                    <Text style={styles.toolText}>{bn ? 'বলুন' : 'Speak'}</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'অ্যাসিস্ট্যান্ট' : 'Assistant'} onPress={() => router.push('/assistant')} style={({ pressed }) => StyleSheet.flatten([styles.toolBtn, pressed && styles.pressed])}>
                  <AppIcon name="robot-happy-outline" size={icon.sm} color={colors.primary} />
                  <Text style={styles.toolText}>{bn ? 'অ্যাসিস্ট্যান্ট' : 'Assistant'}</Text>
                </Pressable>
              </View>

              {!title.trim() && frequent.length ? (
                <View style={styles.freqRow}>
                  {frequent.map(f => (
                    <Pressable key={f} accessibilityRole="button" accessibilityLabel={f} onPress={() => setTitle(f)} style={({ pressed }) => StyleSheet.flatten([styles.freqChip, pressed && styles.pressed])}>
                      <AppIcon name="history" size={icon.xs} color={colors.textSecondary} />
                      <Text numberOfLines={1} style={styles.freqText}>{f}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{copy.taskLoadError}</Text> : null}

            <View style={styles.psychCard}>
              <View style={styles.progressHead}>
                <Text numberOfLines={1} style={styles.psychTitle}>{bn ? 'আজকের অগ্রগতি' : "Today's progress"}</Text>
                <View style={styles.progressRight}>
                  {streak >= 2 ? (
                    <View style={styles.streakChip} accessibilityLabel={bn ? `${streak} দিন ধারাবাহিক` : `${streak} day streak`}>
                      <AppIcon name="fire" size={icon.xs} color={colors.accent} />
                      <Text style={styles.streakText}>{streak}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.progressCount}>{progress.done}/{progress.total || 0}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}><Animated.View layout={anim(LinearTransition.duration(400))} style={[styles.progressFill, { width: `${progress.total ? progress.pct : 0}%` }]} /></View>
              <Text style={styles.psychText}>
                {progress.total === 0
                  ? (bn ? 'আজকের জন্য কিছু যোগ করুন — উপরের বক্সে লিখুন।' : 'Add something for today — use the box above.')
                  : progress.done >= progress.total
                    ? (bn ? 'দারুণ! আজকের সব কাজ শেষ। 🎉' : 'All done for today. Nice work. 🎉')
                    : (bn ? `আর ${progress.total - progress.done}টি বাকি — চালিয়ে যান।` : `${progress.total - progress.done} to go — keep going.`)}
              </Text>
            </View>

            {suggestions.map((s, i) => (
              <Animated.View key={s.id} entering={anim(FadeInDown.delay(i * 60).duration(240))} style={styles.suggestCard}>
                <View style={styles.suggestIcon}><AppIcon name={s.icon} size={icon.md} color={accents.blue.on} /></View>
                <Text style={styles.suggestText}>{s.message}</Text>
                <View style={styles.suggestActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={s.actionLabel} onPress={() => void runSuggestion(s)} style={({ pressed }) => StyleSheet.flatten([styles.suggestGo, pressed && styles.pressed])}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.suggestGoText}>{s.actionLabel}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'বাতিল' : 'Dismiss'} onPress={() => dismissSuggestion(s)} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.suggestX, pressed && styles.pressed])}>
                    <AppIcon name="close" size={icon.sm} color={colors.textMuted} />
                  </Pressable>
                </View>
              </Animated.View>
            ))}

            <SectionHeader title={copy.tasks} action={copy.view} onPress={() => router.push('/planning')} styles={styles} colors={colors} />
            {todayTasks.length ? <Text style={styles.sectionHint}>{copy.tasksHint}</Text> : null}
          </>
        }
        renderItem={renderTask}
        ListEmptyComponent={isLoading ? <AppState loading title={copy.loadTasks} /> : <AppState icon="white-balance-sunny" title={copy.emptyTask} description={copy.emptyTaskHint} />}
        ListFooterComponent={
          <>
            <View style={styles.moreWrap}>
              {!showMore ? <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.moreFade} pointerEvents="none" /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showMore }}
                accessibilityLabel={showMore ? (bn ? 'কম দেখান' : 'Show less') : (bn ? 'আরও অপশন দেখান' : 'Show more options')}
                onPress={() => setShowMore(v => !v)}
                style={({ pressed }) => StyleSheet.flatten([styles.moreToggle, pressed && styles.pressed])}
              >
                <AppIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={icon.sm} color={colors.primary} />
                <Text numberOfLines={1} style={styles.moreToggleText}>{showMore ? (bn ? 'কম দেখান' : 'Show less') : (bn ? 'আরও অপশন দেখান' : 'More options')}</Text>
                <AppIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={icon.sm} color={colors.primary} />
              </Pressable>
            </View>
            {!showMore ? null : <>
            <SectionHeader title={copy.focus} action={copy.plan} onPress={() => router.push('/planning')} styles={styles} colors={colors} />
            <View style={styles.focusGrid}>
              <FocusCard label={copy.overdue} value={focus.overdue} iconName="alert-circle-outline" tone={accents.red} onPress={() => router.push({ pathname: '/planning', params: { filter: 'overdue' } })} styles={styles} />
              <FocusCard label={copy.due} value={focus.dueToday} iconName="calendar-check-outline" tone={accents.blue} onPress={() => router.push({ pathname: '/planning', params: { filter: 'due' } })} styles={styles} />
              <FocusCard label={copy.high} value={focus.highPriority} iconName="flag-variant-outline" tone={accents.orange} onPress={() => router.push({ pathname: '/planning', params: { filter: 'high' } })} styles={styles} />
            </View>
            <SectionHeader title={copy.memories} action={copy.view} onPress={() => router.push('/memory')} styles={styles} colors={colors} />
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
                      <AppIcon name={memoryKindIcon(memory.kind)} size={icon.md} color={tone.on} />
                    </View>
                    <Text numberOfLines={2} style={styles.memoryTitle}>{memory.content}</Text>
                    <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
                  </Pressable>
                );
              })
            ) : (
              <AppState icon="bookmark-outline" title={copy.emptyMemory} description={copy.emptyMemory} />
            )}
            <SectionHeader title={copy.more} action={copy.open} onPress={() => router.push('/more')} styles={styles} colors={colors} />
            <View style={styles.quickRow}>
              <QuickAction icon="magnify" label={bn ? 'সার্চ' : 'Search'} onPress={() => router.push('/search')} tone={accents.blue} styles={styles} />
              <QuickAction icon="calendar-month-outline" label={bn ? 'প্ল্যানিং' : 'Planning'} onPress={() => router.push('/planning')} tone={accents.green} styles={styles} />
              <QuickAction icon="inbox-arrow-down-outline" label={`${bn ? 'ইনবক্স' : 'Inbox'}${inboxCount ? ` (${inboxCount})` : ''}`} onPress={() => router.push('/inbox')} tone={accents.orange} styles={styles} />
            </View>
            </>}
          </>
        }
      />
    </View>
  );
}

function SectionHeader({ title, action, onPress, styles, colors }: { title: string; action: string; onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: ThemeColors }) {
  return (
    <View style={styles.sectionHeader}>
      <Text numberOfLines={1} style={styles.sectionTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.textAction, pressed && styles.pressed])}>
        <Text style={styles.textActionText}>{action}</Text>
        <AppIcon name="chevron-right" size={icon.sm} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function UnderstandRow({ icon: iconName, iconColor, label, value, styles }: { icon: IconName; iconColor: string; label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
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

function QuickAction({ icon: iconName, label, onPress, tone, styles }: { icon: IconName; label: string; onPress: () => void; tone: AccentRole; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => StyleSheet.flatten([styles.quickAction, { borderColor: tone.border, backgroundColor: tone.soft }, pressed && styles.pressed])}>
      <AppIcon name={iconName} size={icon.md} color={tone.on} />
      <Text numberOfLines={1} style={[styles.quickLabel, { color: tone.on }]}>{label}</Text>
    </Pressable>
  );
}

const TaskRow = memo(function TaskRow({ task, completing, onComplete, onOpen, colors, accents, styles, language, subtasks, thumbUri }: { task: Task; completing: boolean; onComplete: (id: string) => void; onOpen: (id: string) => void; colors: ThemeColors; accents: ThemeAccents; styles: ReturnType<typeof makeStyles>; language: 'bn' | 'en'; subtasks?: { done: number; total: number }; thumbUri?: string }) {
  const completed = task.status === 'COMPLETED';
  const bn = language === 'bn';
  const tone = task.priority === 'URGENT' ? 'red' : task.priority === 'HIGH' ? 'orange' : 'green';
  // The empty checkbox carries the task's priority colour so the row's urgency reads at
  // a glance (red = urgent, orange = high, green = normal) — and still says "tap to tick".
  const toneOn = accents[tone].on;
  return (
    <View style={styles.taskRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, busy: completing }}
        accessibilityLabel={`${bn ? 'সম্পন্ন করুন' : 'Complete'} ${task.title}`}
        disabled={completed || completing}
        onPress={() => onComplete(task.id)}
        style={({ pressed }) => StyleSheet.flatten([styles.checkbox, !completed && { borderColor: toneOn }, completed && styles.checkboxDone, completing && styles.disabled, pressed && styles.pressed])}
      >
        {completing ? <ActivityIndicator size="small" color={colors.primary} /> : completed ? <AppIcon name="check" size={icon.sm} color={colors.onPrimary} /> : <AppIcon name="circle-outline" size={icon.sm} color={toneOn} />}
      </Pressable>
      <RowLeading thumbUri={thumbUri} icon="clipboard-text-outline" tone={tone} size={42} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${task.title}`} onPress={() => onOpen(task.id)} style={({ pressed }) => StyleSheet.flatten([styles.taskBody, pressed && styles.pressed])}>
        <Text numberOfLines={3} style={styles.taskTitle}>{task.title}</Text>
        <View style={styles.taskMetaRow}>
          <Text style={styles.taskMeta}>{localizeTaskPriority(task.priority, bn)} · {localizeTaskStatus(task.status, bn)}</Text>
          {subtasks && subtasks.total > 0 ? (
            <View style={styles.stepChip} accessibilityLabel={bn ? `${subtasks.done}/${subtasks.total} ধাপ` : `${subtasks.done} of ${subtasks.total} steps`}>
              <AppIcon name="format-list-checks" size={icon.xs} color={colors.textSecondary} />
              <Text style={styles.stepChipText}>{subtasks.done}/{subtasks.total}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <AppIcon name="chevron-right" size={icon.sm} color={colors.textMuted} />
    </View>
  );
});

// A tiny live-recording indicator shown inside the capture field while voice is on.
function PulseDot({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) { s.value = 1; return; }
    s.value = withRepeat(withSequence(
      withTiming(1.6, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
  }, [reduceMotion, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 2 - s.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    hero: { position: 'relative', overflow: 'hidden', marginTop: spacing.xs, marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, borderRadius: radius.xxl, ...elevation.raised, shadowColor: colors.primary, shadowOpacity: 0.18 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    headerCopy: { flex: 1, minWidth: 0 },
    heroMascotSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 },
    greeting: { color: colors.onPrimary, ...typography.title },
    eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.display, marginTop: spacing.sm },
    date: { color: 'rgba(255,255,255,0.88)', ...typography.bodySmall, marginTop: spacing.xxs },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.sm },
    heroBell: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, borderWidth: border.thin, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
    heroBadge: { alignSelf: 'flex-start', marginTop: spacing.smd, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderColor: 'rgba(255,255,255,0.28)', borderWidth: border.thin, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: spacing.smd, paddingVertical: spacing.xs },
    heroBadgeText: { color: colors.onPrimary, ...typography.caption, fontWeight: '800' },
    heroPurpose: { color: 'rgba(255,255,255,0.92)', ...typography.caption, lineHeight: 18, marginTop: spacing.sm, maxWidth: '52%' },
    capture: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.sm, ...elevation.raised },
    captureLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    captureLabel: { color: colors.textSecondary, ...typography.label, fontWeight: '900', letterSpacing: 0.6 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    inputWrap: { flex: 1, minWidth: 0, position: 'relative' },
    input: { minWidth: 0, minHeight: control.inputHeight, maxHeight: 132, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingTop: spacing.smd, paddingBottom: spacing.smd, ...typography.body, textAlignVertical: 'top' },
    voiceTag: { position: 'absolute', top: spacing.xs, right: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border },
    voiceTagText: { color: colors.danger, ...typography.caption, fontWeight: '900' },
    micBtnActive: { backgroundColor: colors.danger, borderColor: colors.danger },
    voiceNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: border.thin, borderColor: accents.orange.border, backgroundColor: accents.orange.soft },
    voiceNoteText: { flex: 1, minWidth: 0, color: accents.orange.on, ...typography.caption, fontWeight: '700' },
    addButton: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.lg, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    micBtn: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.lg, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
    understand: { marginTop: spacing.md, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.lg, backgroundColor: accents.green.soft, padding: spacing.md },
    understandHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    understandTitle: { color: accents.green.on, ...typography.cardTitle, fontWeight: '900' },
    understandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    understandRowLabel: { color: accents.green.on, ...typography.caption, fontWeight: '900', minWidth: 56 },
    understandRowValue: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    understandActions: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
    confirmBtn: { minHeight: control.buttonHeight, alignSelf: 'stretch', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.smd },
    altBtn: { flex: 1, minHeight: control.buttonHeight, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: border.thin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
    altText: { ...typography.caption, fontFamily: typography.label.fontFamily },
    confirmText: { color: colors.onPrimary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    memoryBtn: { minHeight: control.buttonHeight, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: accents.purple.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    ghostBtn: { minHeight: control.buttonHeight, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
    ghostText: { color: colors.primary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    ghostTextMuted: { color: colors.textSecondary, ...typography.bodySmall, fontFamily: typography.label.fontFamily },
    iconGhost: { minHeight: control.buttonHeight, minWidth: layout.minTouchTarget, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    choiceCard: { marginTop: spacing.md, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: spacing.md },
    choiceQ: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, marginBottom: spacing.sm },
    purpose: { color: colors.textSecondary, ...typography.caption, lineHeight: 18, marginTop: spacing.sm },
    captureTools: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    toolBtn: { flex: 1, minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    toolText: { color: colors.primary, ...typography.caption, fontWeight: '800' },
    freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
    freqChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, maxWidth: 200, minHeight: 34, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    freqText: { flexShrink: 1, color: colors.textSecondary, ...typography.caption, fontWeight: '700' },
    suggestCard: { marginTop: spacing.sm, borderWidth: border.thin, borderColor: accents.blue.border, borderRadius: radius.lg, backgroundColor: accents.blue.soft, padding: spacing.md, gap: spacing.sm },
    suggestIcon: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    suggestText: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    suggestActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    suggestGo: { flex: 1, minHeight: control.buttonHeight, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: accents.blue.base, alignItems: 'center', justifyContent: 'center' },
    suggestGoText: { color: colors.onPrimary, ...typography.bodySmall, fontWeight: '900', textAlign: 'center' },
    suggestX: { width: 44, height: control.buttonHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    moreWrap: { marginTop: spacing.md, alignItems: 'center' },
    moreFade: { position: 'absolute', left: 0, right: 0, top: -spacing.xl, height: spacing.xl },
    moreToggle: { minHeight: control.buttonHeight, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, ...elevation.soft },
    moreToggleText: { color: colors.primary, ...typography.bodySmall, fontWeight: '900', textAlign: 'center' },
    understandHint: { color: accents.green.on, ...typography.caption, marginTop: spacing.sm, opacity: 0.9 },
    hintPreview: { marginTop: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    hintEyebrow: { color: colors.primary, ...typography.label, fontWeight: '800' },
    hintValue: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700', marginTop: spacing.xxs },
    error: { color: colors.danger, ...typography.bodySmall, marginTop: spacing.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
    sectionTitle: { color: colors.textPrimary, ...typography.heading, fontWeight: '900', flexShrink: 1, flexGrow: 1 },
    sectionHint: { color: colors.textMuted, ...typography.caption, lineHeight: 16, marginTop: -spacing.xxs, marginBottom: spacing.sm },
    textAction: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingLeft: spacing.smd, paddingRight: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primaryTint },
    textActionText: { color: colors.primary, ...typography.bodySmall, fontWeight: '900' },
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
    taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxs, flexWrap: 'wrap' },
    taskMeta: { color: colors.textMuted, ...typography.caption },
    stepChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
    stepChipText: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.numeric.fontFamily },
    memoryCard: { minHeight: control.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.sm, marginBottom: spacing.sm, ...elevation.card },
    memoryIcon: { width: control.iconButtonSize, height: control.iconButtonSize, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    memoryTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    psychCard: { marginTop: spacing.xl, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.lg, backgroundColor: accents.green.soft, padding: spacing.md, gap: spacing.sm },
    psychTitle: { flexShrink: 1, color: accents.green.on, ...typography.caption, fontFamily: typography.label.fontFamily },
    psychRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    psychText: { color: colors.textSecondary, ...typography.caption, lineHeight: 18 },
    progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    streakChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.accent, backgroundColor: accents.yellow.soft },
    streakText: { color: colors.accent, ...typography.caption, fontFamily: typography.numeric.fontFamily, fontWeight: '900' },
    progressCount: { color: accents.green.on, ...typography.cardTitle, fontFamily: typography.numeric.fontFamily },
    progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
    quickAction: { flex: 1, minHeight: control.rowMinHeight, borderWidth: border.thin, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.smd, paddingHorizontal: spacing.xs },
    quickLabel: { ...typography.caption, fontWeight: '800' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

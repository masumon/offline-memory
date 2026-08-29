import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSpeech } from '../src/hooks/useSpeech';
import { VoiceOverlay } from '../src/ui/VoiceOverlay';
import { orchestrate, type OrchestratedAction, type OrchestratorResult } from '../src/ai/orchestrator';
import { updateContext, type OrchestrationContext } from '../src/ai/context';
import { executeAssistantAction, resolveAssistantTaskChoice, type AssistantExecutionResult } from '../src/services/assistant-action-service';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppIcon } from '../src/ui/AppIcon';
import { AppState } from '../src/ui/AppSurface';
import { localizeMemoryKind, localizeTaskPriority, localizeTaskStatus } from '../src/i18n/domain-labels';
import { border, control, elevation, icon, layout, opacity, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

type ActionType = OrchestratedAction['type'];

function actionSummary(type: ActionType, bn: boolean): { title: string; icon: 'clipboard-plus-outline' | 'check-circle-outline' | 'format-list-checks' | 'calendar-clock-outline' | 'brain' | 'magnify' | 'help-circle-outline' } {
  switch (type) {
    case 'CREATE_TASK': return { title: bn ? 'একটি নতুন টাস্ক তৈরি করব' : 'Create a new task', icon: 'clipboard-plus-outline' };
    case 'COMPLETE_TASK': return { title: bn ? 'একটি টাস্ক সম্পন্ন হিসেবে চিহ্নিত করব' : 'Mark a task as done', icon: 'check-circle-outline' };
    case 'LIST_TASKS': return { title: bn ? 'আপনার টাস্কগুলো দেখাব' : 'Show your tasks', icon: 'format-list-checks' };
    case 'RESCHEDULE_TASK': return { title: bn ? 'একটি টাস্কের সময় পরিবর্তন করব' : 'Reschedule a task', icon: 'calendar-clock-outline' };
    case 'CREATE_MEMORY': return { title: bn ? 'একটি নতুন মেমোরি সংরক্ষণ করব' : 'Save a new memory', icon: 'brain' };
    case 'SEARCH_MEMORY': return { title: bn ? 'আপনার মেমোরিতে খুঁজব' : 'Search your memories', icon: 'magnify' };
    default: return { title: bn ? 'আরও তথ্য দরকার' : 'I need a little more detail', icon: 'help-circle-outline' };
  }
}

export default function AssistantScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const params = useLocalSearchParams<{ voice?: string }>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<AssistantExecutionResult | null>(null);
  const loadTasks = useTaskStore(s => s.load);
  const loadMemories = useMemoryStore(s => s.load);
  const { supported: voiceSupported, speak } = useSpeech(language);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voiceStarted = useRef(false);
  const spokenMode = useRef(false);
  const onVoiceResult = (text: string) => { spokenMode.current = true; setInput(text); setExecution(null); setError(null); };
  useEffect(() => {
    if (params.voice === '1' && voiceSupported && !voiceStarted.current) {
      voiceStarted.current = true;
      setVoiceOpen(true);
    }
  }, [params.voice, voiceSupported]);
  const [convoContext, setConvoContext] = useState<OrchestrationContext>({});
  const result = useMemo<OrchestratorResult | null>(() => { const value = input.trim(); return value ? orchestrate(value, new Date(), convoContext) : null; }, [input, convoContext]);
  const ready = result?.status === 'READY' && result.action.type !== 'CLARIFY';

  const execute = async () => {
    if (!result || result.status !== 'READY' || result.action.type === 'CLARIFY' || busy) return;
    const action = result.action;
    setBusy(true); setError(null); setExecution(null);
    try {
      const next = await executeAssistantAction(db, action);
      setExecution(next);
      if (spokenMode.current) { const msg = executionMessage(next, bn); if (msg) speak(msg); }
      setConvoContext(prev => updateContext(result.nlp.intent, result.nlp.entities, prev));
      await Promise.all([loadTasks(db), loadMemories(db)]);
    } catch { setError(bn ? 'লোকাল অ্যাকশন চালানো যায়নি' : 'Unable to run the local action'); }
    finally { setBusy(false); }
  };

  const pickTaskChoice = async (taskId: string) => {
    if (busy || execution?.type !== 'NEEDS_TASK_CHOICE') return;
    const pending = execution.pending;
    setBusy(true); setError(null);
    try {
      const next = await resolveAssistantTaskChoice(db, pending, taskId);
      setExecution(next);
      if (spokenMode.current) { const msg = executionMessage(next, bn); if (msg) speak(msg); }
      await Promise.all([loadTasks(db), loadMemories(db)]);
    } catch { setError(bn ? 'লোকাল অ্যাকশন চালানো যায়নি' : 'Unable to run the local action'); }
    finally { setBusy(false); }
  };

  const copy = bn
    ? { back: 'আরও', eyebrow: 'লোকাল অ্যাসিস্ট্যান্ট', title: 'কীভাবে সাহায্য করব?', subtitle: 'সবকিছু এই ডিভাইসেই বোঝা ও সম্পন্ন হয়। কোনো ক্লাউড সার্ভিসে ডেটা যায় না।', placeholder: 'যেমন: আগামীকাল সকাল ৯টায় supplier-কে ফোন করতে হবে', understanding: 'আমি যা বুঝেছি', task: 'টাস্ক', memory: 'মেমোরি', query: 'খোঁজা', date: 'তারিখ', time: 'সময়', priority: 'অগ্রাধিকার', tags: 'ট্যাগ', clarify: 'এই কমান্ডটি সম্পন্ন করার আগে আরও একটু তথ্য দিন।', unsupported: 'এটি বুঝতে পারিনি। আমি টাস্ক ও মেমোরি নিয়ে কাজ করি — যেমন "আগামীকাল ৯টায় মিটিং" বা "পাসওয়ার্ডটা মনে রাখো"।', execute: 'নিশ্চিত করে চালান', empty: 'একটি লোকাল কমান্ড লিখুন — আমি বুঝে নিয়ে দেখাব কী হবে।', completed: 'সম্পন্ন হয়েছে', planning: 'প্ল্যানিং খুলুন', memoryOpen: 'মেমোরি খুলুন', retry: 'আবার চেষ্টা করুন', command: 'লোকাল অ্যাসিস্ট্যান্ট কমান্ড', micStart: 'কথা বলে লিখুন', micStop: 'শোনা বন্ধ করুন', listening: 'শুনছি… বলুন', voiceOffline: 'ভয়েস এই ডিভাইসেই প্রক্রিয়া হয় — অফলাইনে কাজ করে' }
    : { back: 'More', eyebrow: 'LOCAL ASSISTANT', title: 'How can I help?', subtitle: 'Everything is understood and done on this device. Nothing is sent to a cloud service.', placeholder: 'e.g. আগামীকাল সকাল ৯টায় supplier-কে ফোন করতে হবে', understanding: 'Here’s what I understood', task: 'Task', memory: 'Memory', query: 'Search', date: 'Date', time: 'Time', priority: 'Priority', tags: 'Tags', clarify: 'Add a little more detail before this can run.', unsupported: 'I couldn’t interpret that. I work with tasks and memories — e.g. "meeting tomorrow at 9" or "remember this password".', execute: 'Confirm and run', empty: 'Type a local command — I’ll interpret it and show what will happen.', completed: 'Done', planning: 'Open planning', memoryOpen: 'Open memory', retry: 'Retry', command: 'Local assistant command', micStart: 'Speak instead of typing', micStop: 'Stop listening', listening: 'Listening… go ahead', voiceOffline: 'Voice is processed on this device — works offline' };

  const summary = result ? actionSummary(result.action.type, bn) : null;
  const time = result?.nlp.entities.time;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Link href="/more" asChild><Pressable accessibilityRole="button" accessibilityLabel={copy.back} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}><AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{copy.back}</Text></Pressable></Link>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}><AppIcon name="robot-happy-outline" size={icon.lg} color={accents.purple.on} /></View>
          <View style={styles.titleCopy}><Text style={styles.eyebrow}>{copy.eyebrow}</Text><Text style={styles.title}>{copy.title}</Text></View>
        </View>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        {voiceSupported ? (
          <View style={styles.voiceHint}><AppIcon name="microphone-outline" size={icon.xs} color={colors.textMuted} /><Text style={styles.voiceHintText}>{copy.voiceOffline}</Text></View>
        ) : null}
      </View>

      <View style={styles.inputBox}>
        <AppIcon name="message-processing-outline" size={icon.md} color={colors.textMuted} />
        <TextInput value={input} onChangeText={value => { spokenMode.current = false; setInput(value); setExecution(null); setError(null); }} placeholder={copy.placeholder} placeholderTextColor={colors.textMuted} multiline style={styles.input} accessibilityLabel={copy.command} />
        {voiceSupported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.micStart}
            onPress={() => setVoiceOpen(true)}
            style={({ pressed }) => StyleSheet.flatten([styles.micButton, pressed && styles.pressed])}
          >
            <AppIcon name="microphone-outline" size={icon.md} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <VoiceOverlay visible={voiceOpen} language={language} onResult={onVoiceResult} onClose={() => setVoiceOpen(false)} />

      {result && summary ? (
        <>
        <View style={styles.userBubbleRow}>
          <View style={styles.userBubble}><Text style={styles.userBubbleText}>{input.trim()}</Text></View>
        </View>
        <View style={[styles.card, result.status === 'UNSUPPORTED' && styles.cardMuted]}>
          <View style={styles.cardHead}>
            <View style={styles.cardHeadIcon}><AppIcon name={summary.icon} size={icon.md} color={accents.purple.on} /></View>
            <Text style={styles.cardEyebrow}>{copy.understanding}</Text>
          </View>
          {result.status === 'UNSUPPORTED' ? (
            <Text style={styles.plain}>{copy.unsupported}</Text>
          ) : (
            <>
              <Text style={styles.actionTitle}>{summary.title}</Text>
              {result.nlp.entities.taskText ? <Detail label={copy.task} value={result.nlp.entities.taskText} styles={styles} /> : null}
              {result.nlp.entities.memoryText ? <Detail label={copy.memory} value={result.nlp.entities.memoryText} styles={styles} /> : null}
              {result.nlp.entities.query ? <Detail label={copy.query} value={result.nlp.entities.query} styles={styles} /> : null}
              {result.nlp.entities.date ? <Detail label={copy.date} value={result.nlp.entities.date.isoDate} styles={styles} /> : null}
              {time ? <Detail label={copy.time} value={`${String(Math.floor(time.minutes / 60)).padStart(2, '0')}:${String(time.minutes % 60).padStart(2, '0')}`} styles={styles} /> : null}
              {result.nlp.entities.priority && result.nlp.entities.priority !== 'MEDIUM' ? <Detail label={copy.priority} value={localizeTaskPriority(result.nlp.entities.priority, bn)} styles={styles} /> : null}
              {result.nlp.entities.tags && result.nlp.entities.tags.length ? <Detail label={copy.tags} value={result.nlp.entities.tags.map(t => `#${t}`).join(' ')} styles={styles} /> : null}
              {ready ? (
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} onPress={() => void execute()} style={({ pressed }) => StyleSheet.flatten([styles.executeButton, busy && styles.disabled, pressed && styles.pressed])}>
                  {busy ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.executeText}>{copy.execute}</Text></>}
                </Pressable>
              ) : (
                <View style={styles.clarifyBox}><AppIcon name="information-outline" size={icon.sm} color={accents.blue.on} /><Text style={styles.clarifyText}>{copy.clarify}</Text></View>
              )}
            </>
          )}
        </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <AppIcon name="robot-outline" size={icon.xl} color={colors.textMuted} />
          <Text style={styles.empty}>{copy.empty}</Text>
          <Text style={styles.suggestLabel}>{bn ? 'যা বলে দেখতে পারেন' : 'Try saying'}</Text>
          <View style={styles.suggestRow}>
            {(bn
              ? ['আগামীকাল সকাল ৯টায় মাকে ফোন করব', 'বাসার wifi পাসওয়ার্ড মনে রাখো', 'আমার কাজগুলো দেখাও', 'রিপোর্ট খুঁজে দাও']
              : ['Call mom tomorrow at 9am', 'Remember the home wifi password', 'Show my tasks', 'Find the report']
            ).map(s => (
              <Pressable key={s} accessibilityRole="button" accessibilityLabel={s} onPress={() => { setInput(s); setExecution(null); setError(null); }} style={({ pressed }) => StyleSheet.flatten([styles.suggestChip, pressed && styles.pressed])}>
                <AppIcon name="lightbulb-outline" size={icon.xs} color={colors.primary} />
                <Text numberOfLines={2} style={styles.suggestChipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {error ? <AppState title={bn ? 'অ্যাকশন চালানো যায়নি' : 'Action failed'} description={bn ? 'লোকাল অ্যাকশনটি সম্পন্ন হয়নি।' : 'The local action did not complete.'} icon="alert-circle-outline" actionLabel={copy.retry} onAction={() => void execute()} /> : null}
      {execution?.type === 'NEEDS_TASK_CHOICE' ? (
        <View style={styles.execution}>
          <View style={styles.cardHead}><AppIcon name="help-circle-outline" size={icon.md} color={accents.blue.on} /><Text style={styles.executionLabel}>{bn ? 'কোন টাস্ক?' : 'Which task?'}</Text></View>
          {execution.candidates.map(task => (
            <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={task.title} disabled={busy} onPress={() => void pickTaskChoice(task.id)} style={({ pressed }) => StyleSheet.flatten([styles.linkButton, { alignSelf: 'stretch', justifyContent: 'flex-start' }, pressed && styles.pressed])}>
              <AppIcon name="clipboard-text-outline" size={icon.sm} color={colors.primary} />
              <Text numberOfLines={2} style={styles.linkText}>{task.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : execution ? <ExecutionCard result={execution} styles={styles} copy={copy} colors={colors} bn={bn} /> : null}
    </ScrollView>
  );
}

function Detail({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function executionMessage(result: AssistantExecutionResult, bn: boolean): string {
  switch (result.type) {
    case 'TASK_CREATED': return bn ? 'টাস্কটি তৈরি হয়েছে।' : 'Your task was created.';
    case 'TASK_COMPLETED': return bn ? 'টাস্কটি সম্পন্ন হিসেবে চিহ্নিত হয়েছে।' : 'The task was marked complete.';
    case 'TASK_RESCHEDULED': return bn ? 'টাস্কের সময় পরিবর্তন হয়েছে।' : 'The task was rescheduled.';
    case 'MEMORY_CREATED': return bn ? 'মেমোরিটি সংরক্ষণ করা হয়েছে।' : 'Your memory was saved.';
    case 'TASK_LIST': return result.tasks.length ? (bn ? `${result.tasks.length}টি টাস্ক পাওয়া গেছে।` : `Found ${result.tasks.length} task(s).`) : (bn ? 'কোনো টাস্ক নেই।' : 'No tasks yet.');
    case 'MEMORY_SEARCH': return result.memories.length ? (bn ? `${result.memories.length}টি মেমোরি পাওয়া গেছে।` : `Found ${result.memories.length} memory result(s).`) : (bn ? 'এই খোঁজে কোনো মেমোরি পাওয়া যায়নি।' : 'No memories matched that search.');
    default: return '';
  }
}

function ExecutionCard({ result, styles, copy, colors, bn }: { result: AssistantExecutionResult; styles: ReturnType<typeof makeStyles>; copy: Record<string, string>; colors: ThemeColors; bn: boolean }) {
  return (
    <View style={styles.execution}>
      <View style={styles.cardHead}><AppIcon name="check-decagram" size={icon.md} color={colors.success} /><Text style={styles.executionLabel}>{copy.completed}</Text></View>
      <Text style={styles.executionMessage}>{executionMessage(result, bn)}</Text>
      {result.type === 'TASK_LIST' ? result.tasks.slice(0, 10).map(task => (
        <View key={task.id} style={styles.listItemRow}><AppIcon name="clipboard-text-outline" size={icon.xs} color={colors.primary} /><View style={styles.listItemCopy}><Text style={styles.listItem}>{task.title}</Text><Text style={styles.listMeta}>{localizeTaskStatus(task.status, bn)} · {localizeTaskPriority(task.priority, bn)}</Text></View></View>
      )) : null}
      {result.type === 'MEMORY_SEARCH' ? result.memories.slice(0, 10).map(memory => (
        <View key={memory.id} style={styles.listItemRow}><AppIcon name="brain" size={icon.xs} color={colors.primary} /><View style={styles.listItemCopy}><Text style={styles.listItem}>{memory.content}</Text><Text style={styles.listMeta}>{localizeMemoryKind(memory.kind, bn)} · {bn ? 'গুরুত্ব' : 'importance'} {memory.importance}</Text></View></View>
      )) : null}
      <View style={styles.executionLinks}>
        {result.type === 'TASK_LIST' ? <Link href="/planning" asChild><Pressable accessibilityRole="button" style={({ pressed }) => StyleSheet.flatten([styles.linkButton, pressed && styles.pressed])}><AppIcon name="calendar-check-outline" size={icon.sm} color={colors.primary} /><Text style={styles.linkText}>{copy.planning}</Text></Pressable></Link> : null}
        {result.type === 'MEMORY_SEARCH' || result.type === 'MEMORY_CREATED' ? <Link href="/memory" asChild><Pressable accessibilityRole="button" style={({ pressed }) => StyleSheet.flatten([styles.linkButton, pressed && styles.pressed])}><AppIcon name="brain" size={icon.sm} color={colors.primary} /><Text style={styles.linkText}>{copy.memoryOpen}</Text></Pressable></Link> : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleIcon: { width: control.titleIconSize, height: control.titleIconSize, borderRadius: radius.lg, backgroundColor: accents.purple.soft, alignItems: 'center', justifyContent: 'center' },
    titleCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '900', letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '900', marginTop: spacing.xxs },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.md },
    voiceHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.sm },
    voiceHintText: { color: colors.textMuted, ...typography.caption },
    inputBox: { minHeight: spacing.xxl + control.inputHeight, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, ...elevation.card },
    input: { flex: 1, minHeight: spacing.xxl + spacing.lg + spacing.smd, color: colors.textPrimary, ...typography.body, textAlignVertical: 'top' },
    micButton: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    card: { marginTop: spacing.lg, borderWidth: border.thin, borderColor: accents.purple.border, borderRadius: radius.xl, backgroundColor: accents.purple.soft, padding: spacing.lg },
    cardMuted: { borderColor: colors.border, backgroundColor: colors.surface },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardHeadIcon: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    cardEyebrow: { color: accents.purple.on, ...typography.section, fontWeight: '900', letterSpacing: 0.8 },
    plain: { color: colors.textPrimary, ...typography.body, marginTop: spacing.md },
    actionTitle: { color: colors.textPrimary, ...typography.heading, fontWeight: '900', marginTop: spacing.smd },
    detail: { marginTop: spacing.md },
    detailLabel: { color: colors.textMuted, ...typography.section, fontWeight: '800' },
    detailValue: { color: colors.textPrimary, ...typography.meta, marginTop: spacing.xxs, fontWeight: '700' },
    clarifyBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, padding: spacing.sm, borderRadius: radius.md, backgroundColor: accents.blue.soft, borderWidth: border.thin, borderColor: accents.blue.border },
    clarifyText: { flex: 1, color: accents.blue.on, ...typography.bodySmall, fontWeight: '700' },
    executeButton: { minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, flexDirection: 'row', gap: spacing.xs },
    executeText: { color: colors.onPrimary, ...typography.bodySmall, fontWeight: '900' },
    disabled: { opacity: opacity.disabled },
    pressed: { opacity: opacity.pressed },
    userBubbleRow: { alignItems: 'flex-end', marginTop: spacing.md },
    userBubble: { maxWidth: '85%', backgroundColor: colors.primary, borderRadius: radius.lg, borderBottomRightRadius: radius.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    userBubbleText: { color: colors.onPrimary, ...typography.bodySmall },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
    suggestLabel: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, marginTop: spacing.md },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.xs },
    suggestChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, maxWidth: 260, minHeight: layout.minTouchTarget, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    suggestChipText: { flexShrink: 1, color: colors.textPrimary, ...typography.caption },
    empty: { color: colors.textSecondary, textAlign: 'center', ...typography.bodySmall },
    execution: { marginTop: spacing.lg, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.xl, backgroundColor: accents.green.soft, padding: spacing.lg },
    executionLabel: { color: colors.success, ...typography.section, fontWeight: '900', letterSpacing: 0.8 },
    executionMessage: { color: colors.textPrimary, ...typography.body, fontWeight: '800', marginTop: spacing.xs },
    listItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md },
    listItemCopy: { flex: 1, minWidth: 0 },
    listItem: { color: colors.textPrimary, ...typography.bodySmall },
    listMeta: { color: colors.textMuted, ...typography.section, marginTop: spacing.xxs },
    executionLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    linkButton: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    linkText: { color: colors.primary, fontWeight: '800' },
  });
}

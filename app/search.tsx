import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { searchAll, type UnifiedSearchResult } from '../src/services/unified-search-service';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppIcon } from '../src/ui/AppIcon';
import { AppState } from '../src/ui/AppSurface';
import { elevation, layout, spacing, type ThemeColors } from '../src/theme';
import { localizeMemoryKind, localizeTaskPriority, localizeTaskStatus } from '../src/i18n/domain-labels';

const EMPTY_RESULT: UnifiedSearchResult = { tasks: [], memories: [] };
type SearchFilter = 'ALL' | 'TASKS' | 'MEMORIES';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const { colors, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<UnifiedSearchResult>(EMPTY_RESULT);
  const [filter, setFilter] = useState<SearchFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const runSearch = useCallback((value: string, request: number) => {
    setLoading(true);
    setError(null);
    void searchAll(db, value)
      .then((next) => { if (request === requestId.current) setResult(next); })
      .catch(() => { if (request === requestId.current) setError(bn ? 'লোকাল সার্চে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'The local search could not be completed. Please try again.'); })
      .finally(() => { if (request === requestId.current) setLoading(false); });
  }, [bn, db]);

  useEffect(() => {
    const value = query.trim();
    const currentRequest = ++requestId.current;
    const timer = setTimeout(() => {
      if (!value) { setResult(EMPTY_RESULT); setError(null); setLoading(false); return; }
      runSearch(value, currentRequest);
    }, value ? 180 : 0);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const labels = bn
    ? { back: 'হোম', eyebrow: 'সার্চ', title: 'সবকিছু খুঁজুন', subtitle: 'এই ডিভাইসে থাকা টাস্ক ও সক্রিয় মেমোরি খুঁজুন।', placeholder: 'টাস্ক ও মেমোরি খুঁজুন', task: 'টাস্ক', tasks: 'টাস্ক', memories: 'মেমোরি', all: 'সব', importance: 'গুরুত্ব', empty: 'কোনো মিল পাওয়া যায়নি।', clear: 'সার্চ মুছুন', retry: 'আবার চেষ্টা করুন', searching: 'খোঁজা হচ্ছে…' }
    : { back: 'Home', eyebrow: 'SEARCH', title: 'Find anything', subtitle: 'Search tasks and active memories stored on this device.', placeholder: 'Search tasks and memories', task: 'Task', tasks: 'Tasks', memories: 'Memories', all: 'All', importance: 'Importance', empty: 'No matching local data.', clear: 'Clear search', retry: 'Retry', searching: 'Searching…' };
  const retry = () => { const value = query.trim(); if (value) runSearch(value, ++requestId.current); };
  const visibleTasks = filter === 'MEMORIES' ? [] : result.tasks;
  const visibleMemories = filter === 'TASKS' ? [] : result.memories;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}>
      <Link href="/" asChild><Pressable accessibilityRole="button" style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}><AppIcon name="arrow-left" size={20} color={colors.primary} /><Text style={styles.backText}>{labels.back}</Text></Pressable></Link>
      <View style={styles.titleRow}><View style={styles.titleIcon}><AppIcon name="magnify" size={26} color={colors.primary} /></View><View style={styles.titleCopy}><Text style={styles.eyebrow}>{labels.eyebrow}</Text><Text style={styles.title}>{labels.title}</Text><Text style={styles.subtitle}>{labels.subtitle}</Text></View><Link href="/task-editor" asChild><Pressable accessibilityRole="button" accessibilityLabel={labels.task} style={({ pressed }) => StyleSheet.flatten([styles.addButton, pressed && styles.pressed])}><AppIcon name="plus" size={19} color={colors.onPrimary} /><Text style={styles.addText}>{labels.task}</Text></Pressable></Link></View>
    </View>
    <View style={styles.searchBox}><AppIcon name="magnify" size={22} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder={labels.placeholder} placeholderTextColor={colors.textMuted} autoFocus style={styles.input} accessibilityLabel={labels.placeholder} />{query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={labels.clear} style={styles.clearButton}><AppIcon name="close-circle" size={20} color={colors.textMuted} /></Pressable> : null}</View>
    <View style={styles.filterRow} accessibilityRole="radiogroup">
      {([['ALL', labels.all], ['TASKS', labels.tasks], ['MEMORIES', labels.memories]] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: filter === value }} accessibilityLabel={label} onPress={() => setFilter(value)} style={({ pressed }) => StyleSheet.flatten([styles.filterChip, filter === value && styles.filterSelected, pressed && styles.pressed])}><Text style={[styles.filterText, filter === value && styles.filterSelectedText]}>{label}</Text></Pressable>)}
    </View>
    {loading ? <View style={styles.loadingRow}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>{labels.searching}</Text></View> : null}
    {error ? <AppState title={bn ? 'সার্চ করা যায়নি' : 'Search failed'} description={error} icon="alert-circle-outline" actionLabel={labels.retry} onAction={retry} /> : null}
    {query.trim() && !loading && !visibleTasks.length && !visibleMemories.length && !error ? <AppState icon="database-search-outline" title={labels.empty} description={labels.subtitle} /> : null}
    {visibleTasks.length ? <Section title={`${labels.tasks} · ${visibleTasks.length}`} styles={styles}>{visibleTasks.map((task) => <Link key={task.id} href={{ pathname: '/task-editor', params: { id: task.id } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${task.title}`} style={({ pressed }) => StyleSheet.flatten([styles.resultCard, pressed && styles.pressed])}><View style={styles.resultIcon}><AppIcon name="clipboard-text-outline" size={19} color={colors.primary} /></View><View style={styles.resultCopy}><Text numberOfLines={3} style={styles.resultTitle}>{task.title}</Text><Text style={styles.meta}>{localizeTaskStatus(task.status, bn)} · {localizeTaskPriority(task.priority, bn)}</Text></View><AppIcon name="chevron-right" size={20} color={colors.textMuted} /></Pressable></Link>)}</Section> : null}
    {visibleMemories.length ? <Section title={`${labels.memories} · ${visibleMemories.length}`} styles={styles}>{visibleMemories.map((memory) => <Link key={memory.id} href={{ pathname: '/memory-editor', params: { id: memory.id } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'মেমোরি খুলুন' : 'Open memory'} ${memory.content.slice(0, 60)}`} style={({ pressed }) => StyleSheet.flatten([styles.resultCard, pressed && styles.pressed])}><View style={styles.resultIcon}><AppIcon name="brain" size={19} color={colors.primary} /></View><View style={styles.resultCopy}><Text numberOfLines={3} style={styles.resultTitle}>{memory.content}</Text><Text style={styles.meta}>{localizeMemoryKind(memory.kind, bn)} · {labels.importance} {memory.importance}</Text></View><AppIcon name="chevron-right" size={20} color={colors.textMuted} /></Pressable></Link>)}</Section> : null}
  </ScrollView>;
}
function Section({ title, children, styles }: { title: string; children: ReactNode; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function makeStyles(colors: ThemeColors) { return StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl }, header: { paddingTop: spacing.sm, marginBottom: spacing.lg }, back: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg }, backText: { color: colors.primary, fontSize: 16, fontWeight: '800' }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, titleIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, titleCopy: { flex: 1, minWidth: 0 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', marginTop: 2 }, subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.xs }, addButton: { minHeight: 48, maxWidth: 110, paddingHorizontal: spacing.sm, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.xs }, addText: { color: colors.onPrimary, fontWeight: '800', flexShrink: 1 }, searchBox: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...elevation.card }, input: { flex: 1, minHeight: 52, color: colors.textPrimary, fontSize: 16 }, clearButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }, filterChip: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }, filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' }, filterSelectedText: { color: colors.onPrimary }, loadingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md }, loadingText: { color: colors.textSecondary, fontSize: 13 }, section: { marginTop: spacing.xl }, sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', marginBottom: spacing.sm }, resultCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.sm, marginBottom: spacing.sm, ...elevation.card }, resultIcon: { width: spacing.lgPlus, height: spacing.lgPlus, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, resultCopy: { flex: 1, minWidth: 0 }, resultTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '700' }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, pressed: { opacity: 0.78 } }); }

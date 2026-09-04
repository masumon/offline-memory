import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../src/ui/AppText';
import { Link, useRouter } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { searchAll, type UnifiedSearchResult } from '../src/services/unified-search-service';
import { useAppPreferences } from '../src/app/AppPreferences';
import { search } from '../src/i18n/search';
import { AppIcon } from '../src/ui/AppIcon';
import { AppState } from '../src/ui/AppSurface';
import { border, control, elevation, icon, layout, opacity, radius, spacing, typography, memoryKindAccentName, memoryKindIcon, priorityAccentName, type ThemeAccents, type ThemeColors } from '../src/theme';
import { localizeMemoryKind, localizeTaskPriority, localizeTaskStatus } from '../src/i18n/domain-labels';

const EMPTY_RESULT: UnifiedSearchResult = { tasks: [], memories: [] };
const RECENTS_KEY = 'searchHistory';
let recentSearches: string[] = [];
let recentsHydrated = false;
async function hydrateRecents(db: SQLiteDatabase) {
  if (recentsHydrated) return;
  recentsHydrated = true;
  try {
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_preferences WHERE key = ?", RECENTS_KEY);
    const parsed = row?.value ? JSON.parse(row.value) : [];
    if (Array.isArray(parsed)) recentSearches = parsed.filter((v): v is string => typeof v === 'string').slice(0, 6);
  } catch { /* history is a nicety, not critical */ }
}
function rememberSearch(db: SQLiteDatabase, value: string) {
  const v = value.trim();
  if (v.length < 2) return;
  const i = recentSearches.indexOf(v);
  if (i >= 0) recentSearches.splice(i, 1);
  recentSearches.unshift(v);
  if (recentSearches.length > 6) recentSearches.length = 6;
  void db.runAsync(
    "INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    RECENTS_KEY, JSON.stringify(recentSearches),
  ).catch(() => {});
}
type SearchFilter = 'ALL' | 'TASKS' | 'MEMORIES';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [, forceRender] = useState(0);
  useEffect(() => { void hydrateRecents(db).then(() => forceRender(n => n + 1)); }, [db]);
  const { colors, accents, language } = useAppPreferences();
  const copy = search(language);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
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
      .then((next) => { if (request === requestId.current) { setResult(next); if (next.tasks.length || next.memories.length) rememberSearch(db, value); } })
      .catch(() => { if (request === requestId.current) setError(copy.failedDescription); })
      .finally(() => { if (request === requestId.current) setLoading(false); });
  }, [copy.failedDescription, db]);

  useEffect(() => {
    const value = query.trim();
    const currentRequest = ++requestId.current;
    const timer = setTimeout(() => {
      if (!value) { setResult(EMPTY_RESULT); setError(null); setLoading(false); return; }
      runSearch(value, currentRequest);
    }, value ? 180 : 0);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const retry = () => { const value = query.trim(); if (value) runSearch(value, ++requestId.current); };
  const visibleTasks = filter === 'MEMORIES' ? [] : result.tasks;
  const visibleMemories = filter === 'TASKS' ? [] : result.memories;
  const totalCount = visibleTasks.length + visibleMemories.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}><AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{copy.back}</Text></Pressable>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}><AppIcon name="magnify" size={icon.lg} color={accents.blue.on} /></View>
          <View style={styles.titleCopy}><Text style={styles.eyebrow}>{copy.eyebrow}</Text><Text accessibilityRole="header" style={styles.title}>{copy.title}</Text></View>
        </View>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.searchBox}>
        <AppIcon name="magnify" size={icon.md} color={colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={copy.placeholder} placeholderTextColor={colors.textMuted} autoFocus style={styles.input} accessibilityLabel={copy.placeholder} returnKeyType="search" />
        {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={copy.clear} style={styles.clearButton}><AppIcon name="close-circle" size={icon.md} color={colors.textMuted} /></Pressable> : null}
      </View>

      <View style={styles.filterRow} accessibilityRole="radiogroup">
        {([['ALL', copy.all], ['TASKS', copy.tasks], ['MEMORIES', copy.memories]] as const).map(([value, label]) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: filter === value }} accessibilityLabel={label} onPress={() => setFilter(value)} style={({ pressed }) => StyleSheet.flatten([styles.filterChip, filter === value && styles.filterSelected, pressed && styles.pressed])}>
            <Text style={[styles.filterText, filter === value && styles.filterSelectedText]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <View style={styles.loadingRow}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>{copy.searching}</Text></View> : null}
      {error ? <AppState title={copy.failedTitle} description={error} icon="alert-circle-outline" actionLabel={copy.retry} onAction={retry} /> : null}
      {!query.trim() && !loading && recentSearches.length ? (
        <View style={styles.recentWrap}>
          <Text style={styles.recentLabel}>{language === 'bn' ? 'সাম্প্রতিক সার্চ' : 'Recent searches'}</Text>
          <View style={styles.recentRow}>
            {recentSearches.map((r) => (
              <Pressable key={r} accessibilityRole="button" accessibilityLabel={r} onPress={() => setQuery(r)} style={({ pressed }) => StyleSheet.flatten([styles.recentChip, pressed && styles.pressed])}>
                <AppIcon name="history" size={icon.xs} color={colors.textMuted} />
                <Text numberOfLines={1} style={styles.recentChipText}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {!query.trim() && !loading && !recentSearches.length ? <AppState icon="text-search" title={copy.title} description={copy.subtitle} /> : null}
      {query.trim() && !loading && !totalCount && !error ? <AppState icon="database-search-outline" title={copy.empty} description={copy.subtitle} /> : null}

      {visibleTasks.length ? (
        <Section title={`${copy.tasks} · ${visibleTasks.length}`} styles={styles}>
          {visibleTasks.map((task) => {
            const tone = accents[priorityAccentName(task.priority)];
            return (
              <Link key={task.id} href={{ pathname: '/task-detail', params: { id: task.id } }} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={`${copy.openTask} ${task.title}`} style={({ pressed }) => StyleSheet.flatten([styles.resultCard, pressed && styles.pressed])}>
                  <View style={[styles.resultIcon, { backgroundColor: tone.soft }]}><AppIcon name="clipboard-text-outline" size={icon.sm} color={tone.on} /></View>
                  <View style={styles.resultCopy}>
                    <Text numberOfLines={3} style={styles.resultTitle}>{task.title}</Text>
                    <Text style={styles.meta}>{localizeTaskStatus(task.status, language === 'bn')} · {localizeTaskPriority(task.priority, language === 'bn')}</Text>
                  </View>
                  <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
                </Pressable>
              </Link>
            );
          })}
        </Section>
      ) : null}

      {visibleMemories.length ? (
        <Section title={`${copy.memories} · ${visibleMemories.length}`} styles={styles}>
          {visibleMemories.map((memory) => {
            const tone = accents[memoryKindAccentName(memory.kind)];
            return (
              <Link key={memory.id} href={{ pathname: '/memory-detail', params: { id: memory.id } }} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={`${copy.openMemory} ${memory.content.slice(0, 60)}`} style={({ pressed }) => StyleSheet.flatten([styles.resultCard, pressed && styles.pressed])}>
                  <View style={[styles.resultIcon, { backgroundColor: tone.soft }]}><AppIcon name={memoryKindIcon(memory.kind)} size={icon.sm} color={tone.on} /></View>
                  <View style={styles.resultCopy}>
                    <Text numberOfLines={3} style={styles.resultTitle}>{memory.content}</Text>
                    <Text style={styles.meta}>{localizeMemoryKind(memory.kind, language === 'bn')} · {copy.importance} {memory.importance}</Text>
                  </View>
                  <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
                </Pressable>
              </Link>
            );
          })}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children, styles }: { title: string; children: ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleIcon: { width: control.titleIconSize, height: control.titleIconSize, borderRadius: radius.lg, backgroundColor: accents.blue.soft, alignItems: 'center', justifyContent: 'center' },
    titleCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '700', letterSpacing: 1.2 },
    title: { color: colors.textPrimary, ...typography.title, fontWeight: '700', marginTop: spacing.xxs },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.xs },
    searchBox: { minHeight: control.searchHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...elevation.card },
    input: { flex: 1, minHeight: control.inputHeight, color: colors.textPrimary, ...typography.body },
    clearButton: { width: control.iconButtonSize, height: control.iconButtonSize, alignItems: 'center', justifyContent: 'center' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
    recentWrap: { marginTop: spacing.xl },
    recentLabel: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, marginBottom: spacing.sm },
    recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    recentChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: layout.minTouchTarget, maxWidth: 200, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    recentChipText: { color: colors.textPrimary, ...typography.caption },
    filterChip: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
    filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: colors.textSecondary, ...typography.caption, fontWeight: '800' },
    filterSelectedText: { color: colors.onPrimary },
    loadingRow: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
    loadingText: { color: colors.textSecondary, ...typography.bodySmall },
    section: { marginTop: spacing.xl },
    sectionTitle: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '700', marginBottom: spacing.sm },
    resultCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...elevation.soft },
    resultIcon: { width: spacing.lgPlus, height: spacing.lgPlus, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    resultCopy: { flex: 1, minWidth: 0 },
    resultTitle: { color: colors.textPrimary, ...typography.bodySmall, lineHeight: 20, fontWeight: '700' },
    meta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs },
    pressed: { opacity: opacity.pressed },
  });
}

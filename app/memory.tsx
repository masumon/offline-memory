import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemoryStore } from '../src/store/memory.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppCard, AppState } from '../src/ui/AppSurface';
import { AppConfirmDialog } from '../src/ui/AppFeedback';
import { AppIcon } from '../src/ui/AppIcon';
import { border, control, elevation, icon, layout, opacity, radius, spacing, typography, memoryKindAccentName, type ThemeAccents, type ThemeColors } from '../src/theme';
import type { Memory } from '../src/types/memory-model';

const KIND_LABELS = {
  NOTE: { en: 'Note', bn: 'নোট' },
  FACT: { en: 'Fact', bn: 'তথ্য' },
  PREFERENCE: { en: 'Preference', bn: 'পছন্দ' },
  EVENT: { en: 'Event', bn: 'ঘটনা' },
  REFLECTION: { en: 'Reflection', bn: 'ভাবনা' },
} as const;

export default function MemoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Memory | null>(null);
  const { memories, isLoading, error, load, loadArchived, search, archive, restore, remove } = useMemoryStore();
  const listData = useMemo<({ header: string } | Memory)[]>(() => {
    if (showArchived || query.trim()) return memories;
    const important = memories.filter(m => m.importance >= 4);
    const rest = memories.filter(m => m.importance < 4);
    if (!important.length || !rest.length) return memories;
    return [{ header: bn ? 'গুরুত্বপূর্ণ' : 'Important' }, ...important, { header: bn ? 'সাম্প্রতিক' : 'Recent' }, ...rest];
  }, [memories, showArchived, query, bn]);

  useEffect(() => { void (showArchived ? loadArchived(db) : load(db)); }, [db, load, loadArchived, showArchived]);
  useEffect(() => {
    if (showArchived) return;
    const value = query.trim();
    if (!value) { void load(db); return; }
    const timer = setTimeout(() => void search(db, value), 180);
    return () => clearTimeout(timer);
  }, [db, query, load, search, showArchived]);

  const copy = bn
    ? { active: 'সক্রিয়', archived: 'আর্কাইভ', title: 'আপনার মেমোরি', archiveTitle: 'আর্কাইভ করা মেমোরি', subtitle: 'ব্যক্তিগত নোট ও গুরুত্বপূর্ণ তথ্য এই ডিভাইসেই থাকে।', search: 'মেমোরি খুঁজুন', add: 'যোগ', empty: 'এখনও কোনো মেমোরি নেই', emptyText: 'পরে মনে রাখার মতো গুরুত্বপূর্ণ কিছু ক্যাপচার করুন।', noMatch: 'কোনো মিল পাওয়া যায়নি', restoreText: 'আর্কাইভ করা মেমোরি প্রয়োজন হলে ফিরিয়ে আনুন।', first: 'প্রথম মেমোরি তৈরি করুন', edit: 'এডিট', restore: 'রিস্টোর', archive: 'আর্কাইভ', delete: 'মুছুন', importance: 'গুরুত্ব', retry: 'আবার চেষ্টা করুন', clear: 'সার্চ মুছুন', deleteTitle: 'মেমোরি মুছবেন?', deleteDescription: 'এই ডিভাইস থেকে মেমোরিটি স্থায়ীভাবে মুছে যাবে।', deleteConfirm: 'মুছুন', cancel: 'বাতিল' }
    : { active: 'Active', archived: 'Archived', title: 'Your memory', archiveTitle: 'Archived memories', subtitle: 'Private notes and facts stay on this device.', search: 'Search memories', add: 'Add', empty: 'No memories yet', emptyText: 'Capture something important to remember later.', noMatch: 'No matching memories', restoreText: 'Restore archived memories whenever you need them.', first: 'Create your first memory', edit: 'Edit', restore: 'Restore', archive: 'Archive', delete: 'Delete', importance: 'importance', retry: 'Retry', clear: 'Clear search', deleteTitle: 'Delete memory?', deleteDescription: 'This permanently removes the memory from this device.', deleteConfirm: 'Delete', cancel: 'Cancel' };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}><AppIcon name="brain" size={icon.lg} color={colors.primary} /></View>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>{bn ? 'মেমোরি' : 'MEMORY'}</Text>
            <Text style={styles.title}>{showArchived ? copy.archiveTitle : copy.title}</Text>
          </View>
          {!showArchived ? (
            <Link href="/memory-editor" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.add} style={({ pressed }) => StyleSheet.flatten([styles.addButton, pressed && styles.pressed])}>
                <AppIcon name="plus" size={icon.sm} color={colors.onPrimary} />
                <Text style={styles.addButtonText}>{copy.add}</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {!showArchived ? (
        <View style={styles.searchBox}>
          <AppIcon name="magnify" size={icon.md} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor={colors.textMuted} accessibilityLabel={copy.search} returnKeyType="search" style={styles.search} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={copy.clear} hitSlop={8}><AppIcon name="close-circle" size={icon.md} color={colors.textMuted} /></Pressable> : null}
        </View>
      ) : null}

      <View style={styles.viewToggle}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: !showArchived }} onPress={() => { setQuery(''); setShowArchived(false); }} style={[styles.toggleButton, !showArchived && styles.toggleSelected]}>
          <AppIcon name="brain" size={icon.sm} color={!showArchived ? colors.onPrimary : colors.textSecondary} />
          <Text style={[styles.toggleText, !showArchived && styles.toggleSelectedText]}>{copy.active}</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: showArchived }} onPress={() => { setQuery(''); setShowArchived(true); }} style={[styles.toggleButton, showArchived && styles.toggleSelected]}>
          <AppIcon name="archive-outline" size={icon.sm} color={showArchived ? colors.onPrimary : colors.textSecondary} />
          <Text style={[styles.toggleText, showArchived && styles.toggleSelectedText]}>{copy.archived}</Text>
        </Pressable>
      </View>

      {error ? <AppState title={bn ? 'মেমোরি লোড করা যায়নি' : 'Could not load memories'} description={bn ? 'লোকাল ডেটা লোড করতে আবার চেষ্টা করুন।' : 'Unable to load local memory data.'} icon="alert-circle-outline" actionLabel={copy.retry} onAction={() => void (showArchived ? loadArchived(db) : load(db))} /> : null}

      {isLoading ? (
        <AppState loading title={bn ? 'মেমোরি লোড হচ্ছে…' : 'Loading memories…'} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => 'header' in item ? `h:${item.header}` : item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={listData.length ? styles.list : styles.emptyList}
          ListEmptyComponent={error ? null : <AppState icon={showArchived ? 'archive-off-outline' : 'brain'} title={showArchived ? copy.archived : query ? copy.noMatch : copy.empty} description={showArchived ? copy.restoreText : query ? copy.noMatch : copy.emptyText} actionLabel={!showArchived && !query ? copy.first : undefined} onAction={!showArchived && !query ? () => router.push('/memory-editor') : undefined} />}
          renderItem={({ item }) => 'header' in item
            ? <Text style={styles.groupHeader}>{item.header}</Text>
            : <MemoryRow memory={item} archived={showArchived} onArchive={() => void archive(db, item.id)} onRestore={() => void restore(db, item.id)} onDelete={() => setPendingDelete(item)} styles={styles} colors={colors} accents={accents} copy={copy} bn={bn} />}
        />
      )}

      <AppConfirmDialog
        visible={Boolean(pendingDelete)}
        title={copy.deleteTitle}
        description={pendingDelete?.content.slice(0, 120) ?? copy.deleteDescription}
        confirmLabel={copy.deleteConfirm}
        cancelLabel={copy.cancel}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) void remove(db, pendingDelete.id); setPendingDelete(null); }}
      />
    </View>
  );
}

function ImportanceDots({ value, color, styles }: { value: number; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3, 4, 5].map(n => <View key={n} style={[styles.dot, { backgroundColor: n <= value ? color : 'transparent', borderColor: color }]} />)}
    </View>
  );
}

function MemoryRow({ memory, archived, onArchive, onRestore, onDelete, styles, colors, accents, copy, bn }: { memory: Memory; archived: boolean; onArchive: () => void; onRestore: () => void; onDelete: () => void; styles: ReturnType<typeof makeStyles>; colors: ThemeColors; accents: ThemeAccents; copy: Record<string, string>; bn: boolean }) {
  const kind = KIND_LABELS[memory.kind] ?? KIND_LABELS.NOTE;
  const tone = accents[memoryKindAccentName(memory.kind)];
  return (
    <AppCard style={styles.memoryRow}>
      <View style={styles.memoryTop}>
        <View style={[styles.kindBadge, { backgroundColor: tone.soft, borderColor: tone.border }]}>
          <Text style={[styles.kindText, { color: tone.on }]}>{bn ? kind.bn : kind.en}</Text>
        </View>
        <ImportanceDots value={memory.importance} color={tone.base} styles={styles} />
      </View>
      <Link href={{ pathname: '/memory-detail', params: { id: memory.id } }} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'মেমোরি খুলুন' : 'Open memory'}: ${memory.content.slice(0, 60)}`} style={({ pressed }) => StyleSheet.flatten([styles.memoryBody, pressed && styles.pressed])}>
          {memory.title ? <Text style={styles.memoryTitle}>{memory.title}</Text> : null}
          <Text style={styles.memoryContent} numberOfLines={4}>{memory.content}</Text>
        </Pressable>
      </Link>
      {memory.tags.length ? (
        <View style={styles.tagRow}>
          {memory.tags.slice(0, 6).map(tag => <View key={tag} style={styles.tagChip}><Text style={styles.tagText}>#{tag}</Text></View>)}
        </View>
      ) : null}
      <View style={styles.rowActions}>
        <Link href={{ pathname: '/memory-editor', params: { id: memory.id } }} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.edit} style={({ pressed }) => StyleSheet.flatten([styles.actionButton, pressed && styles.pressed])}>
            <AppIcon name="pencil-outline" size={icon.sm} color={colors.primary} /><Text style={styles.actionText}>{copy.edit}</Text>
          </Pressable>
        </Link>
        {archived ? (
          <Pressable accessibilityRole="button" accessibilityLabel={copy.restore} onPress={onRestore} style={({ pressed }) => StyleSheet.flatten([styles.actionButton, pressed && styles.pressed])}>
            <AppIcon name="backup-restore" size={icon.sm} color={colors.primary} /><Text style={styles.actionText}>{copy.restore}</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={copy.archive} onPress={onArchive} style={({ pressed }) => StyleSheet.flatten([styles.actionButton, pressed && styles.pressed])}>
            <AppIcon name="archive-outline" size={icon.sm} color={colors.primary} /><Text style={styles.actionText}>{copy.archive}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={copy.delete} onPress={onDelete} style={({ pressed }) => StyleSheet.flatten([styles.actionButton, pressed && styles.pressed])}>
          <AppIcon name="delete-outline" size={icon.sm} color={colors.danger} /><Text style={styles.deleteText}>{copy.delete}</Text>
        </Pressable>
      </View>
    </AppCard>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.md },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleIcon: { width: control.titleIconSize, height: control.titleIconSize, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    titleCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: colors.textPrimary, ...typography.title, fontWeight: '900', marginTop: spacing.xxs },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.md },
    addButton: { minHeight: layout.minTouchTarget, maxWidth: 110, paddingHorizontal: spacing.smd, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xxs },
    addButtonText: { color: colors.onPrimary, ...typography.bodySmall, fontWeight: '900', flexShrink: 1 },
    searchBox: { minHeight: control.searchHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md, paddingHorizontal: spacing.md, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, ...elevation.soft },
    search: { flex: 1, minHeight: control.inputHeight, color: colors.textPrimary, ...typography.body },
    viewToggle: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.xxs, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
    toggleButton: { flex: 1, minHeight: layout.minTouchTarget, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
    toggleSelected: { backgroundColor: colors.primary },
    toggleText: { color: colors.textSecondary, ...typography.meta, fontWeight: '800', flexShrink: 1 },
    toggleSelectedText: { color: colors.onPrimary },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
    groupHeader: { color: colors.textSecondary, ...typography.caption, fontFamily: typography.label.fontFamily, letterSpacing: 0.6, marginTop: spacing.sm, marginBottom: spacing.xxs },
    emptyList: { flexGrow: 1, paddingHorizontal: spacing.lg },
    memoryRow: { padding: spacing.md, gap: spacing.sm },
    memoryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    kindBadge: { borderWidth: border.thin, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
    kindText: { ...typography.caption, fontWeight: '900' },
    dots: { flexDirection: 'row', gap: spacing.xxs },
    dot: { width: 7, height: 7, borderRadius: radius.pill, borderWidth: border.thin },
    memoryBody: { gap: spacing.xs },
    memoryTitle: { color: colors.textPrimary, ...typography.body, fontWeight: '800' },
    memoryContent: { color: colors.textPrimary, ...typography.bodySmall, lineHeight: 22 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    tagChip: { borderRadius: radius.sm, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
    tagText: { color: colors.textSecondary, ...typography.caption, fontWeight: '700' },
    rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xxs, borderTopWidth: border.thin, borderTopColor: colors.border, paddingTop: spacing.sm },
    actionButton: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs },
    actionText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    deleteText: { color: colors.danger, ...typography.meta, fontWeight: '800' },
    pressed: { opacity: opacity.pressed },
  });
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Link } from 'expo-router';
import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';
import type { Memory } from '../src/types/memory-model';

export default function MemoryScreen() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { memories, isLoading, error, load, loadArchived, search, archive, restore, remove } = useMemoryStore();

  useEffect(() => { void (showArchived ? loadArchived(db) : load(db)); }, [db, load, loadArchived, showArchived]);
  useEffect(() => {
    if (showArchived) return;
    const value = query.trim();
    if (!value) { void load(db); return; }
    const timer = setTimeout(() => void search(db, value), 180);
    return () => clearTimeout(timer);
  }, [db, query, load, search, showArchived]);

  const confirmDelete = (memory: Memory) => Alert.alert(
    'Delete memory?',
    'This permanently removes the memory from this device.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove(db, memory.id) }],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Back to home" style={styles.backButton}><Text style={styles.back}>Home</Text></Pressable></Link>
          <Text style={styles.eyebrow}>MEMORY</Text>
        </View>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}><Text style={styles.title}>{showArchived ? 'Archived memories' : 'Your memory'}</Text><Text style={styles.subtitle}>Private notes and facts stay on this device.</Text></View>
          {!showArchived ? <Link href="/memory-editor" asChild><Pressable accessibilityRole="button" accessibilityLabel="Add memory" style={styles.addButton}><Text style={styles.addButtonText}>Add</Text></Pressable></Link> : null}
        </View>
      </View>

      {!showArchived ? <TextInput value={query} onChangeText={setQuery} placeholder="Search memories" placeholderTextColor={colors.textMuted} accessibilityLabel="Search memories" returnKeyType="search" style={styles.search} /> : null}
      <View style={styles.viewToggle}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !showArchived }} onPress={() => { setQuery(''); setShowArchived(false); }} style={[styles.toggleButton, !showArchived && styles.toggleSelected]}><Text style={[styles.toggleText, !showArchived && styles.toggleSelectedText]}>Active</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: showArchived }} onPress={() => { setQuery(''); setShowArchived(true); }} style={[styles.toggleButton, showArchived && styles.toggleSelected]}><Text style={[styles.toggleText, showArchived && styles.toggleSelectedText]}>Archived</Text></Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!isLoading && memories.length ? <Text style={styles.resultCount}>{query.trim() ? `${memories.length} matching memories` : `${memories.length} ${showArchived ? 'archived' : 'active'} memories`}</Text> : null}

      {isLoading ? <ActivityIndicator style={styles.loader} /> : <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={memories.length ? styles.list : styles.emptyList}
        ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>{showArchived ? 'No archived memories' : query ? 'No matching memories' : 'No memories yet'}</Text><Text style={styles.emptyText}>{showArchived ? 'Archived memories can be restored whenever you need them.' : query ? 'Try another search term.' : 'Capture something important to remember later.'}</Text>{!showArchived && !query ? <Link href="/memory-editor" asChild><Pressable accessibilityRole="button" style={styles.emptyAction}><Text style={styles.emptyActionText}>Create your first memory</Text></Pressable></Link> : null}</View>}
        renderItem={({ item }) => <MemoryRow memory={item} archived={showArchived} onArchive={() => void archive(db, item.id)} onRestore={() => void restore(db, item.id)} onDelete={() => confirmDelete(item)} />}
      />}
    </View>
  );
}

function MemoryRow({ memory, archived, onArchive, onRestore, onDelete }: { memory: Memory; archived: boolean; onArchive: () => void; onRestore: () => void; onDelete: () => void }) {
  return <View style={styles.memoryRow}>
    <Link href={{ pathname: '/memory-editor', params: { id: memory.id } }} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open memory: ${memory.content.slice(0, 60)}`} style={styles.memoryBody}>
        {memory.title ? <Text style={styles.memoryTitle}>{memory.title}</Text> : null}
        <Text style={styles.memoryContent} numberOfLines={4}>{memory.content}</Text>
        <Text style={styles.memoryMeta}>{memory.kind} · importance {memory.importance}{memory.tags.length ? ` · ${memory.tags.join(', ')}` : ''}</Text>
      </Pressable>
    </Link>
    <View style={styles.rowActions}>
      <Link href={{ pathname: '/memory-editor', params: { id: memory.id } }} asChild><Pressable accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Edit</Text></Pressable></Link>
      {archived ? <Pressable accessibilityRole="button" accessibilityLabel="Restore memory" onPress={onRestore} style={styles.actionButton}><Text style={styles.actionText}>Restore</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Archive memory" onPress={onArchive} style={styles.actionButton}><Text style={styles.actionText}>Archive</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Delete memory" onPress={onDelete} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: { minHeight: 40, justifyContent: 'center' },
  back: { color: colors.primary, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  titleCopy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs },
  addButton: { minHeight: 48, minWidth: 76, paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: colors.onPrimary, fontWeight: '700' },
  search: { minHeight: 50, marginHorizontal: spacing.xl, marginVertical: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: 16 },
  viewToggle: { flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: 3, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  toggleButton: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleSelected: { backgroundColor: colors.primary },
  toggleText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  toggleSelectedText: { color: colors.onPrimary },
  resultCount: { color: colors.textMuted, fontSize: 12, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  error: { color: colors.danger, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  loader: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl * 2 },
  emptyList: { flexGrow: 1, paddingHorizontal: spacing.xl },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
  emptyAction: { minHeight: 48, marginTop: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center' },
  emptyActionText: { color: colors.onPrimary, fontWeight: '700' },
  memoryRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  memoryBody: { gap: spacing.xs },
  memoryTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  memoryContent: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  memoryMeta: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.3 },
  rowActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});

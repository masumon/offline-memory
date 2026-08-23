import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Link } from 'expo-router';

import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';
import type { Memory } from '../src/types/memory-model';

export default function MemoryScreen() {
  const db = useSQLiteContext();
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const { memories, isLoading, error, load, create, search } = useMemoryStore();

  useEffect(() => {
    void load(db);
  }, [db, load]);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      void load(db);
      return;
    }
    const timer = setTimeout(() => void search(db, value), 180);
    return () => clearTimeout(timer);
  }, [db, query, load, search]);

  const handleCreate = async () => {
    const value = content.trim();
    if (!value) return;
    const memory = await create(db, { content: value });
    if (memory) setContent('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Link href="/" asChild><Pressable accessibilityRole="button"><Text style={styles.back}>Tasks</Text></Pressable></Link>
          <Text style={styles.eyebrow}>MEMORY</Text>
        </View>
        <Text style={styles.title}>Your memory</Text>
        <Text style={styles.subtitle}>Private notes and facts stay on this device.</Text>
      </View>

      <View style={styles.composer}>
        <TextInput value={content} onChangeText={setContent} placeholder="Remember something..." placeholderTextColor={colors.textMuted} multiline style={styles.textarea} />
        <Pressable accessibilityRole="button" accessibilityLabel="Save memory" onPress={() => void handleCreate()} style={styles.addButton}>
          <Text style={styles.addButtonText}>Save</Text>
        </Pressable>
      </View>

      <TextInput value={query} onChangeText={setQuery} placeholder="Search memories" placeholderTextColor={colors.textMuted} style={styles.search} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? <ActivityIndicator style={styles.loader} /> : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={memories.length ? styles.list : styles.emptyList}
          ListEmptyComponent={<Text style={styles.empty}>{query ? 'No matching memories.' : 'No memories yet.'}</Text>}
          renderItem={({ item }) => <MemoryRow memory={item} />}
        />
      )}
    </View>
  );
}

function MemoryRow({ memory }: { memory: Memory }) {
  return (
    <View style={styles.memoryRow}>
      <View style={styles.memoryBody}>
        {memory.title ? <Text style={styles.memoryTitle}>{memory.title}</Text> : null}
        <Text style={styles.memoryContent}>{memory.content}</Text>
        <Text style={styles.memoryMeta}>{memory.kind} · importance {memory.importance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { color: colors.primary, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 36, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: spacing.xs },
  composer: { margin: spacing.xl, marginBottom: spacing.md, gap: spacing.sm },
  textarea: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, fontSize: 16, textAlignVertical: 'top' },
  addButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: colors.onPrimary, fontWeight: '700' },
  search: { minHeight: 48, marginHorizontal: spacing.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: 16 },
  error: { color: colors.danger, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  loader: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center' },
  memoryRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  memoryBody: { gap: spacing.xs },
  memoryTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  memoryContent: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  memoryMeta: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.3 },
});

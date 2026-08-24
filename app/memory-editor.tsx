import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';
import type { MemoryKind } from '../src/types/memory-model';

const MEMORY_KINDS: MemoryKind[] = ['NOTE', 'FACT', 'PREFERENCE', 'EVENT', 'REFLECTION'];

export default function MemoryEditorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [kind, setKind] = useState<MemoryKind>('NOTE');
  const [importance, setImportance] = useState(3);
  const [initializing, setInitializing] = useState(Boolean(id));
  const { memories, load, create, update, error } = useMemoryStore();

  const existing = useMemo(() => memories.find((memory) => memory.id === id), [id, memories]);

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      if (!existing) await load(db);
      await Promise.resolve();
      setInitializing(false);
    };
    void run();
  }, [db, existing, id, load]);

  useEffect(() => {
    if (!existing) return;
    const run = async () => {
      await Promise.resolve();
      setContent(existing.content);
      setTagsInput(existing.tags.join(', '));
      setKind(existing.kind);
      setImportance(existing.importance);
    };
    void run();
  }, [existing]);

  const handleSave = async () => {
    const value = content.trim();
    if (!value) return;
    const tags = tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 30);
    const memory = id
      ? await update(db, id, { content: value, tags, kind, importance })
      : await create(db, { content: value, tags, kind, importance });
    if (memory) router.replace('/memory');
  };

  if (initializing) return <View style={styles.center}><ActivityIndicator /></View>;
  if (id && !existing) return <View style={styles.center}><Text style={styles.emptyTitle}>Memory not found</Text><Link href="/memory" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to memories</Text></Pressable></Link></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Link href="/memory" asChild><Pressable accessibilityRole="button" accessibilityLabel="Back to memories" style={styles.backButton}><Text style={styles.back}>Memory</Text></Pressable></Link>
      <Text style={styles.eyebrow}>{id ? 'EDIT MEMORY' : 'NEW MEMORY'}</Text>
      <Text style={styles.title}>{id ? 'Edit memory' : 'Remember something'}</Text>
      <Text style={styles.subtitle}>Stored privately on this device.</Text>
    </View>
    <View style={styles.form}>
      <Text style={styles.label}>Memory</Text>
      <TextInput value={content} onChangeText={setContent} placeholder="Write what you want to remember..." placeholderTextColor={colors.textMuted} multiline autoFocus={!id} style={styles.textarea} accessibilityLabel="Memory content" />
      <Text style={styles.label}>Tags</Text>
      <TextInput value={tagsInput} onChangeText={setTagsInput} placeholder="work, family, idea" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Memory tags" />
      <Text style={styles.label}>Type</Text>
      <View style={styles.chipRow}>{MEMORY_KINDS.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: kind === value }} accessibilityLabel={`Memory type ${value}`} onPress={() => setKind(value)} style={[styles.chip, kind === value && styles.chipSelected]}><Text style={[styles.chipText, kind === value && styles.chipTextSelected]}>{value}</Text></Pressable>)}</View>
      <Text style={styles.label}>Importance</Text>
      <View style={styles.importanceRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: importance === value }} accessibilityLabel={`Importance ${value}`} onPress={() => setImportance(value)} style={[styles.importanceButton, importance === value && styles.chipSelected]}><Text style={[styles.chipText, importance === value && styles.chipTextSelected]}>{value}</Text></Pressable>)}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}><Link href="/memory" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancel</Text></Pressable></Link><Pressable accessibilityRole="button" accessibilityLabel={id ? 'Update memory' : 'Save memory'} disabled={!content.trim()} onPress={() => void handleSave()} style={[styles.primaryButton, !content.trim() && styles.disabled]}><Text style={styles.primaryText}>{id ? 'Update' : 'Save memory'}</Text></Pressable></View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.xl, paddingBottom: spacing.xl * 2 }, header: { paddingTop: spacing.lg }, backButton: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }, back: { color: colors.primary, fontWeight: '700' }, eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.sm }, title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: spacing.sm }, subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs }, form: { marginTop: spacing.xl, gap: spacing.sm }, label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: spacing.sm }, textarea: { minHeight: 170, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, fontSize: 16, textAlignVertical: 'top' }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: 15 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, chip: { minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, justifyContent: 'center' }, chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, chipTextSelected: { color: colors.onPrimary }, importanceRow: { flexDirection: 'row', gap: spacing.sm }, importanceButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, error: { color: colors.danger, marginTop: spacing.sm }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg }, primaryButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }, primaryText: { color: colors.onPrimary, fontWeight: '700' }, secondaryButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }, secondaryText: { color: colors.textSecondary, fontWeight: '700' }, disabled: { opacity: 0.5 }, center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }, emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
});

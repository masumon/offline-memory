import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Link } from 'expo-router';
import { useTaskStore } from '../src/store/task.store';
import { colors, spacing, typography } from '../src/theme';
import type { Task } from '../src/types/task-model';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [title, setTitle] = useState('');
  const { tasks, isLoading, error, load, create, complete } = useTaskStore();
  useEffect(() => { void load(db); }, [db, load]);
  const handleCreate = async () => { const value = title.trim(); if (!value) return; const task = await create(db, { title: value }); if (task) setTitle(''); };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>OFFLINE MEMORY</Text><Text style={styles.title}>Today</Text></View>
          <View style={styles.headerActions}>
            <Link href="/planning" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open daily planning" style={styles.headerButton}><Text style={styles.headerButtonText}>Plan</Text></Pressable></Link>
            <Link href="/memory" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open memories" style={styles.headerButton}><Text style={styles.headerButtonText}>Memory</Text></Pressable></Link>
            <Link href="/backup" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open backup and restore" style={styles.headerButton}><Text style={styles.headerButtonText}>Backup</Text></Pressable></Link>
          </View>
        </View>
        <Text style={styles.subtitle}>Your tasks stay on this device.</Text>
      </View>
      <View style={styles.composer}>
        <TextInput value={title} onChangeText={setTitle} onSubmitEditing={() => void handleCreate()} placeholder="What needs to be done?" placeholderTextColor={colors.textMuted} returnKeyType="done" style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={() => void handleCreate()} style={styles.addButton}><Text style={styles.addButtonText}>Add</Text></Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isLoading ? <ActivityIndicator style={styles.loader} /> : <FlatList data={tasks} keyExtractor={(item) => item.id} contentContainerStyle={tasks.length ? styles.list : styles.emptyList} ListEmptyComponent={<Text style={styles.empty}>No tasks yet. Add your first task above.</Text>} renderItem={({ item }) => <TaskRow task={item} onComplete={() => void complete(db, item.id)} />} />}
    </View>
  );
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const completed = task.status === 'COMPLETED';
  return <View style={styles.taskRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: completed }} accessibilityLabel={`Complete ${task.title}`} disabled={completed} onPress={onComplete} style={[styles.checkbox, completed && styles.checkboxDone]}>{completed ? <Text style={styles.check}>✓</Text> : null}</Pressable><View style={styles.taskBody}><Text style={[styles.taskTitle, completed && styles.taskDone]}>{task.title}</Text><Text style={styles.taskMeta}>{task.priority} · {task.status}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 36, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: spacing.xs },
  headerButton: { minHeight: 42, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  headerButtonText: { color: colors.primary, fontWeight: '700' },
  composer: { flexDirection: 'row', gap: spacing.sm, margin: spacing.xl, marginBottom: spacing.md },
  input: { flex: 1, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: 16 },
  addButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: colors.onPrimary, fontWeight: '700' },
  error: { color: colors.danger, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  loader: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center', fontSize: 15 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.primary },
  check: { color: colors.onPrimary, fontWeight: '800' },
  taskBody: { flex: 1 },
  taskTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4, letterSpacing: 0.4 },
});

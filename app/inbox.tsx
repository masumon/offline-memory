import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { planInboxTasks } from '../src/services/planning-service';
import { useTaskStore } from '../src/store/task.store';
import { colors, spacing } from '../src/theme';
import type { Task } from '../src/types/task-model';

export default function InboxScreen() {
  const db = useSQLiteContext();
  const { tasks, isLoading, error, load } = useTaskStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { void load(db); }, [db, load]);

  const inbox = useMemo(() => tasks.filter((task) => task.status === 'INBOX'), [tasks]);

  const planTask = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await planInboxTasks(db, [id]);
      await load(db);
    } finally {
      setBusyId(null);
    }
  }, [db, load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to home" style={styles.back}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.eyebrow}>CAPTURE</Text>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>Things you captured but have not planned yet.</Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <FlatList
        data={inbox}
        keyExtractor={(item) => item.id}
        contentContainerStyle={inbox.length ? styles.list : styles.emptyList}
        ListEmptyComponent={isLoading ? <ActivityIndicator /> : <Text style={styles.empty}>Your inbox is clear.</Text>}
        renderItem={({ item }) => <InboxRow task={item} busy={busyId === item.id} onPlan={() => void planTask(item.id)} />}
      />
    </View>
  );
}

function InboxRow({ task, busy, onPlan }: { task: Task; busy: boolean; onPlan: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.task}>{task.title}</Text>
        <Text style={styles.meta}>{task.priority}</Text>
      </View>
      <Pressable disabled={busy} onPress={onPlan} accessibilityRole="button" accessibilityLabel={`Plan ${task.title}`} style={styles.planButton}>
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.planText}>Plan</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.xl, paddingTop: spacing.xl },
  back: { minHeight: 42, justifyContent: 'center', marginBottom: spacing.lg },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 36, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  error: { color: colors.danger, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  body: { flex: 1 },
  task: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  planButton: { minHeight: 44, minWidth: 76, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  planText: { color: colors.onPrimary, fontWeight: '800' },
});

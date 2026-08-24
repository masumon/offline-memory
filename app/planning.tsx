import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Link } from 'expo-router';

import { getDailyPlan, planInboxTasks, type DailyPlan } from '../src/services/planning-service';
import { useTaskStore } from '../src/store/task.store';
import { colors, spacing } from '../src/theme';

export default function PlanningScreen() {
  const db = useSQLiteContext();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadTasks = useTaskStore((state) => state.load);

  const loadPlan = useCallback(async () => {
    setError(null);
    try { setPlan(await getDailyPlan(db)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load daily plan'); }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const nextPlan = await getDailyPlan(db);
        if (!cancelled) setPlan(nextPlan);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load daily plan');
      }
    })();
    return () => { cancelled = true; };
  }, [db]);

  const planTask = async (id: string) => {
    setBusyId(id); setError(null);
    try {
      await planInboxTasks(db, [id]);
      await Promise.all([loadPlan(), loadTasks(db)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to plan task');
    } finally { setBusyId(null); }
  };

  if (!plan) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>DAILY PLANNING</Text><Text style={styles.title}>Plan {plan.date}</Text></View>
          <View style={styles.headerActions}>
            <Link href="/inbox" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open inbox" style={styles.link}><Text style={styles.linkText}>Inbox</Text></Pressable></Link>
            <Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Go to home" style={styles.link}><Text style={styles.linkText}>Today</Text></Pressable></Link>
          </View>
        </View>
        <Text style={styles.subtitle}>Move inbox tasks into a day without creating reminder times.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={plan.inbox}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<>
          <Section title="Overdue" tasks={plan.overdue} />
          <Section title="In progress" tasks={plan.inProgress} />
          <Section title="Scheduled today" tasks={plan.scheduled} />
          <Text style={styles.sectionTitle}>Inbox</Text>
        </>}
        ListEmptyComponent={<Text style={styles.empty}>No inbox tasks. Your daily plan is clear.</Text>}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.body}><Text style={styles.task}>{item.title}</Text><Text style={styles.meta}>{item.priority}</Text></View>
            <Pressable disabled={busyId === item.id} onPress={() => void planTask(item.id)} style={styles.planButton} accessibilityRole="button" accessibilityLabel={`Plan ${item.title}`}>
              {busyId === item.id ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.planText}>Plan</Text>}
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function Section({ title, tasks }: { title: string; tasks: DailyPlan['scheduled'] }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title} · {tasks.length}</Text>{tasks.slice(0, 5).map((task) => <View key={task.id} style={styles.compact}><Text style={styles.task}>{task.title}</Text><Text style={styles.meta}>{task.dueAt ?? 'No time'}</Text></View>)}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { padding: spacing.xl, paddingTop: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 21 },
  link: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '800' },
  error: { color: colors.danger, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  compact: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  body: { flex: 1 },
  task: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  planButton: { minHeight: 40, minWidth: 70, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  planText: { color: colors.onPrimary, fontWeight: '800' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
});

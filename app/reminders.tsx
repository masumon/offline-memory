import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { initializeNotifications, requestNotificationPermission } from '../src/services/notification.service';
import { runNotificationScheduler } from '../src/services/scheduler-runner';
import { getNotificationStatus, type NotificationStatus } from '../src/services/notification-status-service';
import { colors, spacing, typography } from '../src/theme';
import { useTaskStore } from '../src/store/task.store';

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasks = useTaskStore((state) => state.tasks);
  const loadTasks = useTaskStore((state) => state.load);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setStatus(await getNotificationStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read reminder status');
    }
  }, []);

  useEffect(() => {
    void loadTasks(db);
    void refresh();
  }, [db, loadTasks, refresh]);

  const enableReminders = async () => {
    setBusy(true);
    setError(null);
    try {
      await initializeNotifications();
      const granted = await requestNotificationPermission();
      if (!granted) {
        setError('Notification permission is not enabled on this device.');
        return;
      }
      await runNotificationScheduler(db);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to enable reminders');
    } finally {
      setBusy(false);
    }
  };

  const taskTitle = new Map(tasks.map((task) => [task.id, task.title]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Link href="/more" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to more" style={styles.back}>
            <Text style={styles.backText}>‹ More</Text>
          </Pressable>
        </Link>
        <Text style={styles.eyebrow}>REMINDERS</Text>
        <Text style={styles.title}>Task reminders</Text>
        <Text style={styles.subtitle}>Reminders are scheduled locally on this device from your existing task due times.</Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{status?.granted ? 'Reminders are enabled' : 'Reminders need permission'}</Text>
        <Text style={styles.cardText}>
          {status?.granted
            ? 'Offline Memory can schedule eligible task reminders locally.'
            : status?.canAskAgain === false
              ? 'Permission was denied. Enable notifications in Android settings.'
              : 'Allow notifications to schedule task reminders.'}
        </Text>
        {!status?.granted ? (
          <Pressable disabled={busy} onPress={() => void enableReminders()} accessibilityRole="button" style={styles.primaryButton}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Enable & schedule reminders</Text>}
          </Pressable>
        ) : (
          <Pressable disabled={busy} onPress={() => void enableReminders()} accessibilityRole="button" style={styles.secondaryButton}>
            {busy ? <ActivityIndicator /> : <Text style={styles.secondaryText}>Refresh scheduled reminders</Text>}
          </Pressable>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scheduled</Text>
        <Text style={styles.count}>{status?.scheduled.length ?? 0}</Text>
      </View>

      {status === null ? <ActivityIndicator style={styles.loader} /> : status.scheduled.length === 0 ? (
        <Text style={styles.empty}>No reminders are currently scheduled. Planned tasks with future due times can be scheduled here.</Text>
      ) : status.scheduled.map((item) => (
        <View key={item.id} style={styles.reminderRow}>
          <View style={styles.reminderBody}>
            <Text style={styles.reminderTitle}>{item.taskId ? taskTitle.get(item.taskId) ?? item.title : item.title}</Text>
            <Text style={styles.reminderMeta}>{item.dueAt ? new Date(item.dueAt).toLocaleString() : 'Scheduled reminder'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl },
  header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
  back: { minHeight: 42, justifyContent: 'center', marginBottom: spacing.lg },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.xl },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  primaryText: { color: colors.onPrimary, fontWeight: '800' },
  secondaryButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.primary, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  loader: { marginVertical: spacing.xl },
  empty: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', paddingVertical: spacing.lg },
  reminderRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  reminderBody: { gap: spacing.xs },
  reminderTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  reminderMeta: { color: colors.textMuted, fontSize: 12 },
});

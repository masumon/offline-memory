import { useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';

import { createBackupDocument } from '../src/services/backup-service';
import { pickBackupFile, shareBackupFile, writeBackupFile } from '../src/backup/file-adapter';
import { restoreBackupDocument } from '../src/services/restore-service';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';

export default function BackupScreen() {
  const db = useSQLiteContext();
  const loadTasks = useTaskStore((state) => state.load);
  const loadMemories = useMemoryStore((state) => state.load);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const backup = async () => {
    setBusy(true); setMessage('');
    try {
      const document = await createBackupDocument(db);
      const uri = await writeBackupFile(document);
      await shareBackupFile(uri);
      setMessage('Backup created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed');
    } finally { setBusy(false); }
  };

  const restore = async () => {
    Alert.alert(
      'Restore backup?',
      'Restoring replaces the current local tasks, memories and reminder history with the selected backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => void performRestore() },
      ],
    );
  };

  const performRestore = async () => {
    setBusy(true); setMessage('');
    try {
      const document = await pickBackupFile();
      if (!document) return;
      await restoreBackupDocument(db, document);
      await Promise.all([loadTasks(db), loadMemories(db)]);
      setMessage('Backup restored successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed');
    } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>DATA SAFETY</Text>
        <Text style={styles.title}>Backup & Restore</Text>
        <Text style={styles.subtitle}>Your backup stays local unless you explicitly share the file.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create backup</Text>
        <Text style={styles.cardText}>Exports tasks, subtasks, memories, notification delivery state and database metadata.</Text>
        <Pressable disabled={busy} onPress={() => void backup()} style={styles.primaryButton} accessibilityRole="button">
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Create & Share Backup</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Restore backup</Text>
        <Text style={styles.cardText}>Only a validated Offline Memory backup can be restored. Invalid data is rejected before the database is changed.</Text>
        <Pressable disabled={busy} onPress={() => void restore()} style={styles.secondaryButton} accessibilityRole="button">
          <Text style={styles.secondaryText}>Choose Backup File</Text>
        </Pressable>
      </View>

      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl },
  header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
  back: { color: colors.primary, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  primaryText: { color: colors.onPrimary, fontWeight: '800' },
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.primary, fontWeight: '800' },
  message: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: spacing.md },
});

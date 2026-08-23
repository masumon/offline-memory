import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';

import { runDiagnostics, type DiagnosticsReport } from '../src/services/diagnostics-service';
import { collectRuntimeHealth, type RuntimeHealth } from '../src/services/runtime-health-service';
import { colors, spacing, typography } from '../src/theme';

export default function DiagnosticsScreen() {
  const db = useSQLiteContext();
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [runtime, setRuntime] = useState<RuntimeHealth | null>(null);
  const [running, setRunning] = useState(false);

  const check = async () => {
    setRunning(true);
    try {
      const [diagnostics, health] = await Promise.all([runDiagnostics(db), collectRuntimeHealth(db)]);
      setReport(diagnostics);
      setRuntime(health);
    } finally {
      setRunning(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.eyebrow}>M8 · QA</Text>
      <Text style={styles.title}>Device diagnostics</Text>
      <Text style={styles.subtitle}>Verify the local database and Android reminder layer without sending data to a server.</Text>
      <Pressable disabled={running} accessibilityRole="button" accessibilityLabel="Run device diagnostics" onPress={() => void check()} style={styles.primaryButton}>
        {running ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Run diagnostics</Text>}
      </Pressable>
      {runtime ? <View style={styles.runtime}><Text style={styles.runtimeTitle}>Runtime</Text><Text style={styles.runtimeText}>Platform: {runtime.platform}</Text><Text style={styles.runtimeText}>Database: {runtime.databaseReadable ? 'Readable' : 'Unavailable'}</Text><Text style={styles.runtimeText}>Notifications: {runtime.notifications}</Text><Text style={styles.runtimeText}>Scheduled reminders: {runtime.scheduledNotificationCount}</Text></View> : null}
      {report ? <View style={styles.results}><Text style={[styles.summary, report.ok ? styles.ok : styles.fail]}>{report.ok ? 'All checks passed' : 'Action required'}</Text>{report.checks.map((item) => <View key={item.id} style={styles.card}><Text style={styles.cardTitle}>{item.ok ? '✓' : '!'} {item.label}</Text><Text style={styles.cardText}>{item.detail}</Text></View>)}<Text style={styles.timestamp}>Checked {new Date(report.generatedAt).toLocaleString()}</Text></View> : <Text style={styles.hint}>Run the check after installing the Android build to validate the device environment.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl },
  back: { color: colors.primary, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: typography.label.fontSize, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl },
  primaryText: { color: colors.onPrimary, fontWeight: '800' },
  runtime: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  runtimeTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  runtimeText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  results: { marginTop: spacing.xl },
  summary: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  ok: { color: colors.success },
  fail: { color: colors.danger },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  timestamp: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.xl },
});

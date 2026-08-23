import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../src/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>OFFLINE MEMORY</Text>
        <Text style={styles.title}>Your memory, organized.</Text>
        <Text style={styles.subtitle}>
          A private, offline-first productivity system built for tasks, reminders, memory, and local intelligence.
        </Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Foundation ready</Text>
          <Text style={styles.statusText}>Local application architecture is initialized.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label.fontSize,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 520,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});

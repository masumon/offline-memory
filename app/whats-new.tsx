import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../src/ui/AppText';
import { router } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useAppPreferences } from '../src/app/AppPreferences';
import { CHANGELOG, LATEST_VERSION } from '../src/content/changelog';
import { AppIcon } from '../src/ui/AppIcon';
import { formatBangladeshDate } from '../src/i18n/date-time';
import { border, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

// Remembering the newest version the reader has opened lets a future launch surface a
// quiet "what's new" hint without nagging on every start.
export async function markWhatsNewSeen(db: SQLiteDatabase): Promise<void> {
  try {
    await db.runAsync(
      'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'whatsNewSeenVersion',
      LATEST_VERSION,
    );
  } catch { /* best-effort */ }
}

export default function WhatsNewScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);

  useEffect(() => { void markWhatsNewSeen(db); }, [db]);

  const c = bn
    ? { back: 'আরও', eyebrow: 'আপডেট', title: 'নতুন কী আছে', sub: 'সাম্প্রতিক আপডেটে যা যা যুক্ত হয়েছে।', version: 'সংস্করণ' }
    : { back: 'More', eyebrow: 'UPDATES', title: "What's new", sub: 'What was added in the most recent updates.', version: 'Version' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{c.eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>{c.sub}</Text>
      </View>

      {CHANGELOG.map((entry) => (
        <View key={entry.version} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.badge}><Text style={styles.badgeText}>{c.version} {entry.version}</Text></View>
            <Text style={styles.date}>{formatBangladeshDate(`${entry.date}T00:00:00`, language)}</Text>
          </View>
          <Text style={styles.headline}>{entry.headline[language]}</Text>
          {entry.items.map((item, i) => (
            <View key={i} style={styles.item}>
              <AppIcon name="check-circle-outline" size={icon.sm} color={colors.primary} />
              <Text style={styles.itemText}>{item[language]}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { paddingTop: spacing.sm, marginBottom: spacing.md },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '700', letterSpacing: 1 },
    title: { color: colors.textPrimary, ...typography.display, fontWeight: '700', marginTop: spacing.xs },
    sub: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.xs },
    card: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md, ...elevation.soft },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.primaryTint },
    badgeText: { color: colors.primary, ...typography.caption, fontWeight: '800' },
    date: { color: colors.textMuted, ...typography.caption },
    headline: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '700', marginBottom: spacing.sm },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
    itemText: { flex: 1, minWidth: 0, color: colors.textSecondary, ...typography.bodySmall },
    pressed: { opacity: 0.78 },
  });
}

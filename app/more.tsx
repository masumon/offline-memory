import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import Constants from 'expo-constants';
import { useAppPreferences } from '../src/app/AppPreferences';
import { more } from '../src/i18n/more';
import { AppIcon, type IconName } from '../src/ui/AppIcon';
import {
  border,
  control,
  elevation,
  icon as iconToken,
  layout,
  radius,
  spacing,
  typography,
  type AccentName,
  type ThemeColors,
} from '../src/theme';

type Item = { href: string; icon: IconName; copyKey: string };
type Group = { key: string; accent: AccentName; items: Item[] };

const GROUPS: Group[] = [
  {
    key: 'Tools',
    accent: 'blue',
    items: [
      { href: '/search', icon: 'magnify', copyKey: 'search' },
      { href: '/assistant', icon: 'robot-happy-outline', copyKey: 'assistant' },
    ],
  },
  {
    key: 'Data',
    accent: 'green',
    items: [{ href: '/backup', icon: 'database-lock-outline', copyKey: 'backup' }],
  },
  {
    key: 'Notifications',
    accent: 'yellow',
    items: [{ href: '/reminders', icon: 'bell-ring-outline', copyKey: 'reminders' }],
  },
  {
    key: 'System',
    accent: 'purple',
    items: [
      { href: '/diagnostics', icon: 'heart-pulse', copyKey: 'diagnostics' },
      { href: '/settings', icon: 'cog-outline', copyKey: 'settings' },
      { href: '/about', icon: 'information-outline', copyKey: 'about' },
    ],
  },
];

type GroupCopy = { title: string; items: Record<string, { title: string; description: string }> };

export default function MoreScreen() {
  const { language, colors, accents } = useAppPreferences();
  const copy = more(language);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bn = language === 'bn';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.brandCard}>
        <View style={styles.brandBadge}>
          <AppIcon name="shield-check-outline" size={iconToken.md} color={colors.onPrimary} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>{bn ? 'অফলাইন মেমোরি' : 'Offline Memory'}</Text>
          <Text style={styles.brandMeta}>
            {bn ? 'সংস্করণ' : 'Version'} {Constants.expoConfig?.version ?? '0.1.0'} · {bn ? '১০০% অফলাইন' : '100% offline'}
          </Text>
        </View>
      </View>

      {GROUPS.map((group) => {
        const groupCopy = copy.groups[group.key as keyof typeof copy.groups] as GroupCopy;
        const tone = accents[group.accent];
        return (
          <View key={group.key} style={styles.group}>
            <View style={styles.sectionRow}>
              <View style={[styles.sectionDot, { backgroundColor: tone.base }]} />
              <Text style={styles.section}>{groupCopy.title}</Text>
            </View>
            <View style={styles.grid}>
              {group.items.map((item, i) => {
                const itemCopy = groupCopy.items[item.copyKey]!;
                const wide = group.items.length % 2 === 1 && i === group.items.length - 1;
                return (
                  <Pressable
                    key={item.href}
                    accessibilityRole="button"
                    accessibilityLabel={itemCopy.title}
                    onPress={() => router.push(item.href as never)}
                    style={({ pressed }) => StyleSheet.flatten([styles.tile, wide && styles.tileWide, pressed && styles.pressed])}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: tone.soft, borderColor: tone.border }]}>
                      <AppIcon name={item.icon} size={iconToken.md} color={tone.on} />
                    </View>
                    <Text numberOfLines={1} style={styles.tileTitle}>{itemCopy.title}</Text>
                    <Text numberOfLines={2} style={styles.tileDesc}>{itemCopy.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    header: { paddingTop: spacing.md, marginBottom: spacing.md },
    eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.display, marginTop: spacing.sm },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.sm, lineHeight: 19 },
    brandCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...elevation.soft },
    brandBadge: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    brandCopy: { flex: 1, minWidth: 0 },
    brandName: { color: colors.textPrimary, ...typography.body, fontFamily: typography.cardTitle.fontFamily },
    brandMeta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs },
    group: { marginBottom: spacing.lg },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    sectionDot: { width: 7, height: 7, borderRadius: radius.pill },
    section: { color: colors.textMuted, ...typography.section, fontWeight: '900', letterSpacing: 1.1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tile: { width: '47.8%', flexGrow: 1, maxWidth: '48.5%', minHeight: 132, backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, ...elevation.soft },
    tileWide: { width: '100%', maxWidth: '100%' },
    iconWrap: { width: control.listIconContainer, height: control.listIconContainer, borderRadius: radius.md, borderWidth: border.thin, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
    tileTitle: { color: colors.textPrimary, ...typography.body, fontWeight: '800' },
    tileDesc: { color: colors.textSecondary, ...typography.caption, lineHeight: 17 },
    pressed: { opacity: 0.78 },
  });
}

import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../src/ui/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppIcon } from '../src/ui/AppIcon';
import { AppIconButton } from '../src/ui/AppSurface';
import { DOCS, type DocId } from '../src/content/docs';
import { border, elevation, icon, layout, radius, spacing, typography, type ThemeColors } from '../src/theme';

// In-app document reader. Renders the shared bilingual block content — no external
// viewer, nothing leaves the app.
export default function DocScreen() {
  const { colors, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id?: string }>();
  const id = (params.id === 'legal' || params.id === 'ai-guide' ? params.id : 'legal') as DocId;
  const doc = DOCS[id];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppIconButton icon="arrow-left" label={bn ? 'ফিরুন' : 'Back'} variant="neutral" onPress={() => router.back()} />
        <Text style={styles.title}>{doc.title[language]}</Text>
        <Text style={styles.subtitle}>{doc.subtitle[language]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {doc.blocks.map((block, i) => {
          if (block.t === 'h1') return <Text key={i} style={styles.h1}>{block[language]}</Text>;
          if (block.t === 'h2') return <Text key={i} style={styles.h2}>{block[language]}</Text>;
          if (block.t === 'h3') return <Text key={i} style={styles.h3}>{block[language]}</Text>;
          if (block.t === 'p') return <Text key={i} style={[styles.p, block.muted && styles.pMuted]}>{block[language]}</Text>;
          if (block.t === 'li') return (
            <View key={i} style={styles.li}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.liText}>{block[language]}</Text>
            </View>
          );
          if (block.t === 'code') return (
            <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} style={styles.codeWrap} contentContainerStyle={styles.codeInner}>
              <Text style={styles.code}>{block.text}</Text>
            </ScrollView>
          );
          return <View key={i} style={styles.rule} />;
        })}
        <View style={styles.footerRow}>
          <AppIcon name="shield-check-outline" size={icon.xs} color={colors.success} />
          <Text style={styles.footer}>{bn ? '১০০% অফলাইন — কিছুই সার্ভারে যায় না।' : '100% offline — nothing is sent to a server.'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: border.thin, borderBottomColor: colors.border },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '700', marginTop: spacing.xs },
    subtitle: { color: colors.textMuted, ...typography.caption, fontWeight: '700', letterSpacing: 0.4, marginTop: spacing.xxs },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    h1: { color: colors.primary, ...typography.heading, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.xs },
    h2: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.xxs },
    h3: { color: colors.textMuted, ...typography.meta, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xxs },
    p: { color: colors.textSecondary, ...typography.bodySmall, lineHeight: 23, marginTop: spacing.xs },
    pMuted: { color: colors.textMuted, ...typography.caption },
    li: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, paddingRight: spacing.sm },
    bullet: { color: colors.primary, ...typography.bodySmall, fontWeight: '700', lineHeight: 23 },
    liText: { flex: 1, color: colors.textSecondary, ...typography.bodySmall, lineHeight: 23 },
    codeWrap: { marginTop: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, ...elevation.soft },
    codeInner: { padding: spacing.md },
    code: { color: colors.textPrimary, fontFamily: typography.numeric.fontFamily, fontSize: 12, lineHeight: 18 },
    rule: { height: border.thin, backgroundColor: colors.border, marginTop: spacing.lg, marginBottom: spacing.xs },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl, paddingTop: spacing.md, borderTopWidth: border.thin, borderTopColor: colors.border },
    footer: { color: colors.textMuted, ...typography.caption },
  });
}

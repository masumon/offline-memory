import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../src/ui/AppText';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../src/app/AppPreferences';
import { listAllMemories } from '../src/services/memory-repository';
import type { Memory } from '../src/types/memory-model';
import { AppIcon } from '../src/ui/AppIcon';
import { AppState } from '../src/ui/AppSurface';
import { tapSelect } from '../src/ui/haptics';
import { border, elevation, icon, layout, memoryKindIcon, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

type TagCount = { tag: string; count: number };

export default function TagsScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const [all, setAll] = useState<Memory[]>([]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void listAllMemories(db)
      .then((rows) => { if (alive) setAll(rows); })
      .catch(() => { /* keep empty */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [db]);

  // Count every tag across live memories, most-used first. Tag casing is preserved from
  // the first spelling seen; matching is case-insensitive so "Work" and "work" merge.
  const tags = useMemo<TagCount[]>(() => {
    const map = new Map<string, { tag: string; count: number }>();
    for (const m of all) {
      for (const raw of m.tags) {
        const key = raw.trim().toLowerCase();
        if (!key) continue;
        const hit = map.get(key);
        if (hit) hit.count += 1;
        else map.set(key, { tag: raw.trim(), count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [all]);

  const matches = useMemo(() => {
    if (!active) return [];
    const key = active.toLowerCase();
    return all.filter((m) => m.tags.some((t) => t.trim().toLowerCase() === key));
  }, [active, all]);

  const c = bn
    ? { back: 'আরও', eyebrow: 'ট্যাগ', title: 'ট্যাগ ব্রাউজার', sub: 'মেমোরিতে ব্যবহৃত সব ট্যাগ — কোনটায় কতগুলো, এক নজরে।', none: 'এখনও কোনো ট্যাগ নেই', pickHint: 'একটি ট্যাগ বেছে নিন', empty: 'এই ট্যাগে কিছু নেই' }
    : { back: 'More', eyebrow: 'TAGS', title: 'Tag browser', sub: 'Every tag used across your memories, with how many each one holds.', none: 'No tags yet', pickHint: 'Pick a tag', empty: 'Nothing under this tag' };

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

      {!ready ? null : tags.length === 0 ? (
        <AppState icon="tag-off-outline" title={c.none} />
      ) : (
        <>
          <View style={styles.chips}>
            {tags.map(({ tag, count }) => {
              const on = active?.toLowerCase() === tag.toLowerCase();
              return (
                <Pressable
                  key={tag.toLowerCase()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => { tapSelect(); setActive(on ? null : tag); }}
                  style={({ pressed }) => StyleSheet.flatten([styles.chip, on && styles.chipOn, pressed && styles.pressed])}
                >
                  <AppIcon name="tag-outline" size={icon.xs} color={on ? colors.onPrimary : colors.textMuted} />
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{tag}</Text>
                  <View style={[styles.badge, on && styles.badgeOn]}><Text style={[styles.badgeText, on && styles.badgeTextOn]}>{count}</Text></View>
                </Pressable>
              );
            })}
          </View>

          {!active ? (
            <Text style={styles.pickHint}>{c.pickHint}</Text>
          ) : matches.length === 0 ? (
            <AppState icon="bookmark-off-outline" title={c.empty} />
          ) : (
            matches.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={(m.title || m.content).slice(0, 60)}
                onPress={() => router.push({ pathname: '/memory-detail', params: { id: m.id } })}
                style={({ pressed }) => StyleSheet.flatten([styles.card, pressed && styles.pressed])}
              >
                <AppIcon name={memoryKindIcon(m.kind)} size={icon.sm} color={colors.textMuted} />
                <Text numberOfLines={2} style={styles.cardText}>{m.title || m.content}</Text>
                <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </>
      )}
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: layout.minTouchTarget, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textSecondary, ...typography.meta, fontWeight: '700' },
    chipTextOn: { color: colors.onPrimary },
    badge: { minWidth: 20, paddingHorizontal: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    badgeOn: { backgroundColor: colors.onPrimary },
    badgeText: { color: colors.textMuted, ...typography.caption, fontWeight: '800' },
    badgeTextOn: { color: colors.primary },
    pickHint: { color: colors.textMuted, ...typography.bodySmall, textAlign: 'center', marginTop: spacing.lg },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.sm, ...elevation.soft },
    cardText: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '600' },
    pressed: { opacity: 0.78 },
  });
}

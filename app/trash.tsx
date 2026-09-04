import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../src/ui/AppText';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../src/app/AppPreferences';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { listTrashedTasks, purgeTask, emptyTaskTrash, type TrashedTask } from '../src/services/task-repository';
import { listTrashedMemories, purgeMemory, emptyMemoryTrash, type TrashedMemory } from '../src/services/memory-repository';
import { AppIcon } from '../src/ui/AppIcon';
import { AppConfirmDialog } from '../src/ui/AppFeedback';
import { AppState } from '../src/ui/AppSurface';
import { formatBangladeshRelativeDate } from '../src/i18n/date-time';
import { border, control, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

const RETENTION_DAYS = 30;
type Tab = 'tasks' | 'memories';

export default function TrashScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const restoreTask = useTaskStore(s => s.restore);
  const untrashMemory = useMemoryStore(s => s.untrash);
  const [tab, setTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<TrashedTask[]>([]);
  const [memories, setMemories] = useState<TrashedMemory[]>([]);
  const [ready, setReady] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const reload = useCallback(
    () => Promise.all([listTrashedTasks(db), listTrashedMemories(db)])
      .then(([t, m]) => { setTasks(t); setMemories(m); })
      .catch(() => { /* keep the last good list */ })
      .finally(() => setReady(true)),
    [db],
  );
  useEffect(() => { void reload(); }, [reload]);

  const c = bn
    ? { back: 'সেটিংস', eyebrow: 'ট্র্যাশ', title: 'ট্র্যাশ', sub: `মুছে ফেলা জিনিস ${RETENTION_DAYS} দিন এখানে থাকে, তারপর নিজে থেকেই মুছে যায়।`, tasks: 'টাস্ক', memories: 'মেমোরি', restore: 'ফিরিয়ে আনুন', forever: 'স্থায়ীভাবে মুছুন', empty: 'ট্র্যাশ খালি করুন', none: 'ট্র্যাশ খালি', emptyTitle: 'সব স্থায়ীভাবে মুছবেন?', emptyDesc: 'ট্র্যাশের সব কিছু এই ডিভাইস থেকে চিরতরে মুছে যাবে।', ok: 'মুছুন', cancel: 'বাতিল', deleted: 'মুছে ফেলা হয়েছে' }
    : { back: 'Settings', eyebrow: 'TRASH', title: 'Trash', sub: `Deleted items stay here for ${RETENTION_DAYS} days, then clear themselves.`, tasks: 'Tasks', memories: 'Memories', restore: 'Restore', forever: 'Delete forever', empty: 'Empty trash', none: 'Trash is empty', emptyTitle: 'Delete everything for good?', emptyDesc: 'Everything in the trash is removed from this device permanently.', ok: 'Delete', cancel: 'Cancel', deleted: 'Deleted' };

  const onRestoreTask = async (id: string) => { await restoreTask(db, id); await reload(); };
  const onPurgeTask = async (id: string) => { await purgeTask(db, id).catch(() => {}); await reload(); };
  const onRestoreMemory = async (id: string) => { await untrashMemory(db, id); await reload(); };
  const onPurgeMemory = async (id: string) => { await purgeMemory(db, id).catch(() => {}); await reload(); };
  const onEmpty = async () => { setConfirmEmpty(false); await Promise.all([emptyTaskTrash(db), emptyMemoryTrash(db)]).catch(() => {}); await reload(); };

  const total = tasks.length + memories.length;
  const rows = tab === 'tasks' ? tasks : memories;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{c.eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>{c.sub}</Text>
      </View>

      <View style={styles.tabs}>
        {(['tasks', 'memories'] as const).map(t => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={({ pressed }) => StyleSheet.flatten([styles.tab, tab === t && styles.tabOn, pressed && styles.pressed])}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'tasks' ? c.tasks : c.memories} · {t === 'tasks' ? tasks.length : memories.length}</Text>
          </Pressable>
        ))}
      </View>

      {!ready ? null : total === 0 ? (
        <AppState icon="delete-empty-outline" title={c.none} />
      ) : rows.length === 0 ? (
        <AppState icon="delete-empty-outline" title={c.none} />
      ) : (
        <>
          {rows.map((row) => {
            const isTask = tab === 'tasks';
            const label = isTask ? (row as TrashedTask).title : ((row as TrashedMemory).title || (row as TrashedMemory).content);
            return (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <AppIcon name={isTask ? 'clipboard-text-outline' : 'bookmark-outline'} size={icon.sm} color={colors.textMuted} />
                  <Text numberOfLines={2} style={styles.cardTitle}>{label}</Text>
                </View>
                <Text style={styles.cardMeta}>{c.deleted} {formatBangladeshRelativeDate(row.deletedAt, language)}</Text>
                <View style={styles.cardActions}>
                  <Pressable accessibilityRole="button" onPress={() => void (isTask ? onRestoreTask(row.id) : onRestoreMemory(row.id))} style={({ pressed }) => StyleSheet.flatten([styles.actBtn, pressed && styles.pressed])}>
                    <AppIcon name="backup-restore" size={icon.xs} color={colors.primary} /><Text style={styles.actText}>{c.restore}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void (isTask ? onPurgeTask(row.id) : onPurgeMemory(row.id))} style={({ pressed }) => StyleSheet.flatten([styles.actBtn, pressed && styles.pressed])}>
                    <AppIcon name="delete-forever-outline" size={icon.xs} color={colors.danger} /><Text style={[styles.actText, { color: colors.danger }]}>{c.forever}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => setConfirmEmpty(true)} style={({ pressed }) => StyleSheet.flatten([styles.emptyBtn, pressed && styles.pressed])}>
            <AppIcon name="trash-can-outline" size={icon.sm} color={colors.danger} /><Text style={styles.emptyBtnText}>{c.empty}</Text>
          </Pressable>
        </>
      )}

      <AppConfirmDialog visible={confirmEmpty} title={c.emptyTitle} description={c.emptyDesc} confirmLabel={c.ok} cancelLabel={c.cancel} danger onCancel={() => setConfirmEmpty(false)} onConfirm={() => void onEmpty()} />
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
    tabs: { flexDirection: 'row', gap: spacing.xs, padding: spacing.xxs, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, marginBottom: spacing.md },
    tab: { flex: 1, minHeight: layout.minTouchTarget, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    tabOn: { backgroundColor: colors.primary },
    tabText: { color: colors.textSecondary, ...typography.meta, fontWeight: '800' },
    tabTextOn: { color: colors.onPrimary },
    card: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.sm, ...elevation.soft },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    cardTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    cardMeta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xs },
    cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, borderTopWidth: border.thin, borderTopColor: colors.border, paddingTop: spacing.sm },
    actBtn: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs },
    actText: { color: colors.primary, ...typography.caption, fontWeight: '800' },
    emptyBtn: { minHeight: control.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.danger, backgroundColor: colors.surface, marginTop: spacing.md },
    emptyBtnText: { color: colors.danger, ...typography.bodySmall, fontWeight: '800' },
    pressed: { opacity: 0.78 },
  });
}

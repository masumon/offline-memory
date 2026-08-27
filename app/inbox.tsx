import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { planInboxTasks } from '../src/services/planning-service';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppState } from '../src/ui/AppSurface';
import { AppConfirmDialog, useAppFeedback } from '../src/ui/AppFeedback';
import { AppIcon } from '../src/ui/AppIcon';
import { formatBangladeshTime } from '../src/i18n/date-time';
import { control, elevation, icon, layout, opacity, radius, spacing, typography, priorityAccentName, type ThemeAccents, type ThemeColors } from '../src/theme';
import type { Task } from '../src/types/task-model';

function tomorrow(): Date { const d = new Date(); d.setHours(9, 0, 0, 0); d.setDate(d.getDate() + 1); return d; }
function capturedLabel(iso: string, language: 'bn' | 'en'): string { try { return formatBangladeshTime(iso, language); } catch { return ''; } }

export default function InboxScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const { showSnackbar } = useAppFeedback();
  const { tasks, isLoading, error, load, remove } = useTaskStore();
  const createMemory = useMemoryStore(s => s.create);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  useEffect(() => { void load(db); }, [db, load]);
  const inbox = useMemo(() => tasks.filter(task => task.status === 'INBOX'), [tasks]);

  const c = bn
    ? { eyebrow: 'ক্যাপচার', title: 'ইনবক্স', subtitle: 'ক্যাপচার করা কিন্তু এখনও পরিকল্পনা না করা আইটেম।', banner: (n: number) => `আপনার ${n}টি আইটেম প্রসেস করার অপেক্ষায় আছে`, clear: 'আপনার ইনবক্স পরিষ্কার', clearText: 'নতুন কিছু ক্যাপচার করলে এখানে দেখা যাবে।', captured: 'ক্যাপচার', toTask: 'টাস্ক করুন', toMemory: 'মেমোরি করুন', later: 'পরে', del: 'মুছুন', processAll: (n: number) => `সব প্রসেস করুন (${n})`, retry: 'আবার চেষ্টা করুন', taskDone: 'দিনের পরিকল্পনায় যোগ হয়েছে', memDone: 'মেমোরি হিসেবে রাখা হয়েছে', laterDone: 'আগামীকালের পরিকল্পনায় নেওয়া হয়েছে', failed: 'কাজটি সম্পন্ন হয়নি', delTitle: 'আইটেম মুছবেন?', delDesc: 'এটি স্থায়ীভাবে মুছে যাবে।', delOk: 'মুছুন', cancel: 'বাতিল', add: 'নতুন' }
    : { eyebrow: 'CAPTURE', title: 'Inbox', subtitle: 'Items you captured but have not planned yet.', banner: (n: number) => `${n} item(s) waiting to be processed`, clear: 'Your inbox is clear', clearText: 'New captured items will appear here.', captured: 'Captured', toTask: 'Make task', toMemory: 'Make memory', later: 'Later', del: 'Delete', processAll: (n: number) => `Process all (${n})`, retry: 'Retry', taskDone: 'Added to today’s plan', memDone: 'Saved as a memory', laterDone: 'Moved to tomorrow’s plan', failed: 'That action did not complete', delTitle: 'Delete item?', delDesc: 'This permanently removes it.', delOk: 'Delete', cancel: 'Cancel', add: 'New' };

  const run = useCallback(async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    if (busyId || bulkBusy) return;
    setBusyId(id);
    try { await fn(); await load(db); showSnackbar(okMsg, 'success'); }
    catch { showSnackbar(c.failed, 'danger'); }
    finally { setBusyId(null); }
  }, [busyId, bulkBusy, load, db, showSnackbar, c.failed]);

  const toTask = (t: Task) => run(t.id, () => planInboxTasks(db, [t.id]), c.taskDone);
  const toLater = (t: Task) => run(t.id, () => planInboxTasks(db, [t.id], tomorrow()), c.laterDone);
  const toMemory = (t: Task) => run(t.id, async () => { const m = await createMemory(db, { content: t.title }); if (!m) throw new Error('memory'); await remove(db, t.id); }, c.memDone);
  const doDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id; setPendingDelete(null); setBusyId(id);
    try { await remove(db, id); await load(db); } catch { showSnackbar(c.failed, 'danger'); } finally { setBusyId(null); }
  };
  const processAll = async () => {
    if (!inbox.length || bulkBusy) return;
    setBulkBusy(true);
    try { await planInboxTasks(db, inbox.map(t => t.id)); await load(db); showSnackbar(c.taskDone, 'success'); }
    catch { showSnackbar(c.failed, 'danger'); }
    finally { setBulkBusy(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>{c.eyebrow}</Text>
            <Text style={styles.title}>{c.title}</Text>
          </View>
          <View style={styles.count}><Text style={styles.countText}>{inbox.length}</Text></View>
        </View>
        <Text style={styles.subtitle}>{c.subtitle}</Text>
      </View>

      {error ? (
        <AppState title={bn ? 'ইনবক্স লোড করা যায়নি' : 'Could not load inbox'} description={bn ? 'ডেটা লোড করতে আবার চেষ্টা করুন।' : 'Unable to load local inbox data.'} icon="alert-circle-outline" actionLabel={c.retry} onAction={() => void load(db)} />
      ) : isLoading && !inbox.length ? (
        <AppState loading title={bn ? 'ইনবক্স লোড হচ্ছে…' : 'Loading inbox…'} />
      ) : (
        <FlatList
          data={inbox}
          keyExtractor={item => item.id}
          contentContainerStyle={inbox.length ? styles.list : styles.emptyList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={inbox.length ? (
            <View style={styles.banner}>
              <View style={styles.bannerIcon}><AppIcon name="inbox-multiple-outline" size={icon.md} color={accents.purple.on} /></View>
              <Text style={styles.bannerText}>{c.banner(inbox.length)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={<AppState icon="check-circle-outline" title={c.clear} description={c.clearText} />}
          ListFooterComponent={inbox.length > 1 ? (
            <Pressable accessibilityRole="button" accessibilityState={{ busy: bulkBusy }} onPress={() => void processAll()} style={({ pressed }) => StyleSheet.flatten([styles.processAll, bulkBusy && styles.disabled, pressed && styles.pressed])}>
              {bulkBusy ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="checkbox-multiple-marked-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.processAllText}>{c.processAll(inbox.length)}</Text></>}
            </Pressable>
          ) : null}
          renderItem={({ item }) => {
            const tone = accents[priorityAccentName(item.priority)];
            const rowBusy = busyId === item.id;
            return (
              <View style={styles.card}>
                <View style={[styles.priorityBar, { backgroundColor: tone.base }]} />
                <View style={styles.cardBody}>
                  <Link href={{ pathname: '/task-detail', params: { id: item.id } }} asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'খুলুন' : 'Open'}: ${item.title}`} style={({ pressed }) => StyleSheet.flatten([styles.cardTap, pressed && styles.pressed])}>
                      <Text numberOfLines={3} style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardMeta}>{c.captured}: {capturedLabel(item.createdAt, language)}</Text>
                    </Pressable>
                  </Link>
                  {rowBusy ? (
                    <View style={styles.actionRowBusy}><ActivityIndicator color={colors.primary} /></View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${c.toTask}: ${item.title}`} onPress={() => void toTask(item)} style={({ pressed }) => StyleSheet.flatten([styles.actBtn, styles.actPrimary, pressed && styles.pressed])}>
                        <AppIcon name="calendar-check-outline" size={icon.xs} color={accents.green.on} />
                        <Text style={[styles.actText, { color: accents.green.on }]}>{c.toTask}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${c.toMemory}: ${item.title}`} onPress={() => void toMemory(item)} style={({ pressed }) => StyleSheet.flatten([styles.actBtn, styles.actMemory, pressed && styles.pressed])}>
                        <AppIcon name="brain" size={icon.xs} color={accents.purple.on} />
                        <Text style={[styles.actText, { color: accents.purple.on }]}>{c.toMemory}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${c.later}: ${item.title}`} onPress={() => void toLater(item)} style={({ pressed }) => StyleSheet.flatten([styles.actBtn, pressed && styles.pressed])}>
                        <AppIcon name="clock-outline" size={icon.xs} color={colors.textSecondary} />
                        <Text style={[styles.actText, { color: colors.textSecondary }]}>{c.later}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${c.del}: ${item.title}`} onPress={() => setPendingDelete(item)} style={({ pressed }) => StyleSheet.flatten([styles.actIcon, pressed && styles.pressed])}>
                        <AppIcon name="trash-can-outline" size={icon.sm} color={colors.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <Link href="/task-editor" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={c.add} style={({ pressed }) => StyleSheet.flatten([styles.fab, pressed && styles.pressed])}>
          <AppIcon name="plus" size={icon.lg} color={colors.onPrimary} />
        </Pressable>
      </Link>

      <AppConfirmDialog
        visible={Boolean(pendingDelete)}
        title={c.delTitle}
        description={pendingDelete?.title ?? c.delDesc}
        confirmLabel={c.delOk}
        cancelLabel={c.cancel}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void doDelete()}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.smd },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.titleLarge, marginTop: spacing.xxs },
    count: { minWidth: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
    countText: { color: colors.onPrimary, ...typography.meta, fontFamily: typography.numeric.fontFamily },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.sm },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + spacing.xl, gap: spacing.sm },
    emptyList: { flexGrow: 1, paddingHorizontal: spacing.lg },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: accents.purple.soft, borderColor: accents.purple.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.smd, marginBottom: spacing.sm },
    bannerIcon: { width: control.listIconContainer, height: control.listIconContainer, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    bannerText: { flex: 1, color: accents.purple.on, ...typography.callout },
    card: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', ...elevation.soft },
    priorityBar: { width: 4, alignSelf: 'stretch' },
    cardBody: { flex: 1, minWidth: 0, padding: spacing.smd, gap: spacing.sm },
    cardTap: { minHeight: control.iconButtonSize, justifyContent: 'center' },
    cardTitle: { color: colors.textPrimary, ...typography.body, fontFamily: typography.cardTitle.fontFamily },
    cardMeta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    actionRowBusy: { minHeight: layout.minTouchTarget, alignItems: 'flex-start', justifyContent: 'center' },
    actBtn: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.smd, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    actPrimary: { backgroundColor: accents.green.soft, borderColor: accents.green.border },
    actMemory: { backgroundColor: accents.purple.soft, borderColor: accents.purple.border },
    actText: { ...typography.caption, fontFamily: typography.label.fontFamily },
    actIcon: { minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    processAll: { minHeight: control.buttonHeight, marginTop: spacing.smd, borderRadius: radius.md, backgroundColor: accents.purple.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, ...elevation.raised },
    processAllText: { color: colors.onPrimary, ...typography.callout, fontFamily: typography.label.fontFamily },
    fab: { position: 'absolute', right: spacing.lg, bottom: layout.compactNavHeight + spacing.md, width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...elevation.floating },
    disabled: { opacity: opacity.disabled },
    pressed: { opacity: opacity.pressed },
  });
}

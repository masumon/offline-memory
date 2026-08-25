import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTaskStore } from '../src/store/task.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppConfirmDialog, useAppFeedback } from '../src/ui/AppFeedback';
import { AppIcon } from '../src/ui/AppIcon';
import { AttachmentPanel } from '../src/ui/AttachmentPanel';
import { AttachmentUploadError, discardStagedAttachments, finalizeStagedAttachments, stageAttachments, type StagedAttachment } from '../src/services/attachment-service';
import { DueDateTimeField, PlannedDateField } from '../src/ui/LocalizedDateTimeFields';
import { taskCopy } from '../src/i18n/task';
import { border, control, elevation, icon, layout, opacity, radius, spacing, typography, type ThemeColors } from '../src/theme';
import type { TaskPriority, TaskStatus } from '../src/types';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TaskEditorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, language } = useAppPreferences();
  const { showSnackbar } = useAppFeedback();
  const copy = taskCopy(language);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [plannedDate, setPlannedDate] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const stagedRef = useRef<StagedAttachment[]>([]);
  const { tasks, load, create, update, remove, error } = useTaskStore();
  const task = tasks.find(item => item.id === id);

  useEffect(() => {
    if (!id) return;
    void (async () => { if (!task) await load(db); setLoaded(true); })();
  }, [db, id, load, task]);
  useEffect(() => {
    if (task) { setTitle(task.title); setNotes(task.notes ?? ''); setPriority(task.priority); setPlannedDate(task.plannedDate ?? ''); setDueAt(task.dueAt ?? ''); }
  }, [task]);
  useEffect(() => () => { const pending = stagedRef.current; if (pending.length) void discardStagedAttachments(pending).catch(() => {}); }, []);

  const addDraftFiles = async () => {
    if (saving) return;
    try {
      const added = await stageAttachments();
      if (!added.length) return;
      stagedRef.current = [...stagedRef.current, ...added];
      setStaged(stagedRef.current);
      showSnackbar(copy.stagedReady(added.length), 'info');
    } catch (cause) {
      const count = cause instanceof AttachmentUploadError ? cause.selectedCount : 0;
      showSnackbar(count > 0 ? copy.stagedFailed(count) : copy.unablePrepare, 'danger');
    }
  };
  const removeDraftFile = async (item: StagedAttachment) => {
    try { await discardStagedAttachments([item]); const next = stagedRef.current.filter(value => value.id !== item.id); stagedRef.current = next; setStaged(next); }
    catch { showSnackbar(copy.unableRemoveStaged, 'danger'); }
  };
  const save = async () => {
    const value = title.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      const result = id ? await update(db, id, { title: value, notes: notes.trim() || null, priority, plannedDate: plannedDate || null, dueAt: dueAt || null }) : await create(db, { title: value, notes: notes.trim() || null, priority, plannedDate: plannedDate || null, dueAt: dueAt || null });
      if (!result) { showSnackbar(copy.saveFailed, 'danger'); return; }
      if (stagedRef.current.length) {
        try { await finalizeStagedAttachments(db, 'TASK', result.id, stagedRef.current); stagedRef.current = []; setStaged([]); }
        catch (cause) { if (!id) await remove(db, result.id); const count = cause instanceof AttachmentUploadError ? cause.selectedCount : staged.length; showSnackbar(copy.attachmentSaveFailed(count), 'danger'); return; }
      }
      showSnackbar(id ? copy.updated : copy.created, 'success');
      router.replace('/planning');
    } catch { showSnackbar(copy.saveFailed, 'danger'); }
    finally { setSaving(false); }
  };
  const mutate = async (input: Parameters<typeof update>[2]) => { if (!id || saving) return; setSaving(true); try { if (await update(db, id, input)) router.replace('/planning'); } finally { setSaving(false); } };
  const deleteTask = async () => { if (!id || saving) return; setSaving(true); try { if (await remove(db, id)) router.replace('/planning'); } finally { setSaving(false); setConfirmDelete(false); } };

  if (!loaded) return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyText}>{copy.loading}</Text></View>;
  if (id && !task) return <View style={styles.center}><AppIcon name="clipboard-alert-outline" size={icon.xl} color={colors.warning} /><Text style={styles.emptyTitle}>{copy.notFound}</Text><Link href="/planning" asChild><Pressable style={styles.secondary}><Text style={styles.secondaryText}>{copy.planning}</Text></Pressable></Link></View>;

  const status = task?.status;
  const statusLabel = status ? copy.statusLabels[status as TaskStatus] : null;
  const canComplete = Boolean(id && status && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(status));
  const canCancel = Boolean(id && status && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(status));
  const canArchive = Boolean(id && status !== 'ARCHIVED');

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Link href="/planning" asChild><Pressable accessibilityRole="button" accessibilityLabel={copy.back} style={styles.back}><AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{copy.planning}</Text></Pressable></Link>
      <View style={styles.badge}><AppIcon name={id ? 'clipboard-text-outline' : 'clipboard-plus-outline'} size={icon.sm} color={colors.primary} /><Text style={styles.badgeText}>{id ? copy.detailBadge : copy.newBadge}</Text></View>
      <Text style={styles.title}>{id ? copy.detailTitle : copy.createTitle}</Text><Text style={styles.subtitle}>{copy.subtitle}</Text>
    </View>
    <View style={styles.card}>
      {statusLabel ? <View style={styles.status}><AppIcon name="progress-check" size={icon.sm} color={colors.primary} /><Text style={styles.statusText}>{copy.status}: {statusLabel}</Text></View> : null}
      <Text style={styles.label}>{copy.title}</Text><TextInput value={title} onChangeText={setTitle} placeholder={copy.titlePlaceholder} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={copy.titlePlaceholder} />
      <Text style={styles.label}>{copy.notes}</Text><TextInput value={notes} onChangeText={setNotes} placeholder={copy.notesPlaceholder} placeholderTextColor={colors.textMuted} multiline style={styles.textarea} accessibilityLabel={copy.notes} />
      <Text style={styles.label}>{copy.priority}</Text>
      <View style={styles.chips}>{PRIORITIES.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: priority === value }} accessibilityLabel={`${copy.priority} ${copy.priorityLabels[value]}`} onPress={() => setPriority(value)} style={[styles.chip, priority === value && styles.selected]}><Text style={[styles.chipText, priority === value && styles.selectedText]}>{copy.priorityLabels[value]}</Text></Pressable>)}</View>
      <PlannedDateField value={plannedDate} onChange={setPlannedDate} /><DueDateTimeField value={dueAt} onChange={setDueAt} />
      {!id ? <View style={styles.draftSection}><View style={styles.draftHeader}><View style={styles.draftCopy}><Text style={styles.label}>{copy.attachments}</Text><Text style={styles.draftHint}>{copy.attachmentHint}</Text></View><Pressable disabled={saving} onPress={() => void addDraftFiles()} accessibilityRole="button" accessibilityLabel={copy.addAttachments} style={({ pressed }) => StyleSheet.flatten([styles.secondary, pressed && styles.pressed, saving && styles.disabled])}><AppIcon name="paperclip-plus" size={icon.sm} color={colors.primary} /><Text style={styles.secondaryText}>{copy.addFiles}</Text></Pressable></View>{staged.map(item => <View key={item.id} style={styles.draftItem}><View style={styles.draftIcon}><AppIcon name={item.mimeType.startsWith('image/') ? 'file-image-outline' : item.mimeType.startsWith('video/') ? 'file-video-outline' : item.mimeType.includes('pdf') ? 'file-pdf-box' : 'file-outline'} size={icon.md} color={colors.primary} /></View><View style={styles.draftFileCopy}><Text numberOfLines={2} style={styles.draftName}>{item.name}</Text><Text style={styles.draftMeta}>{copy.fileType(item.mimeType)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${copy.removeFile} ${item.name}`} onPress={() => void removeDraftFile(item)} style={styles.iconButton}><AppIcon name="close" size={icon.sm} color={colors.danger} /></Pressable></View>)}</View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{copy.error}</Text> : null}
      <View style={styles.actions}><Link href="/planning" asChild><Pressable disabled={saving} style={styles.secondary}><AppIcon name="close" size={icon.sm} color={colors.textSecondary} /><Text style={styles.secondaryText}>{copy.cancel}</Text></Pressable></Link><Pressable disabled={!title.trim() || saving} onPress={() => void save()} style={[styles.primary, (!title.trim() || saving) && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: !title.trim() || saving, busy: saving }}>{saving ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name={id ? 'content-save-outline' : 'plus'} size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryText}>{id ? copy.saveChanges : copy.create}</Text></>}</Pressable></View>
      {id ? <><View style={styles.secondaryActions}>{canComplete ? <Pressable disabled={saving} onPress={() => void mutate({ status: 'COMPLETED' })} style={styles.secondary}><AppIcon name="check-circle-outline" size={icon.sm} color={colors.success} /><Text style={styles.secondaryText}>{copy.complete}</Text></Pressable> : null}{canCancel ? <Pressable disabled={saving} onPress={() => void mutate({ status: 'CANCELLED' })} style={styles.secondary}><AppIcon name="cancel" size={icon.sm} color={colors.warning} /><Text style={styles.secondaryText}>{copy.cancelTask}</Text></Pressable> : null}{canArchive ? <Pressable disabled={saving} onPress={() => void mutate({ status: 'ARCHIVED' })} style={styles.secondary}><AppIcon name="archive-outline" size={icon.sm} color={colors.textSecondary} /><Text style={styles.secondaryText}>{copy.archive}</Text></Pressable> : null}{status === 'COMPLETED' ? <Pressable disabled={saving} onPress={() => void mutate({ status: 'IN_PROGRESS' })} style={styles.secondary}><AppIcon name="backup-restore" size={icon.sm} color={colors.primary} /><Text style={styles.secondaryText}>{copy.reopen}</Text></Pressable> : null}{status === 'CANCELLED' ? <Pressable disabled={saving} onPress={() => void mutate({ status: 'INBOX' })} style={styles.secondary}><AppIcon name="inbox-arrow-down-outline" size={icon.sm} color={colors.primary} /><Text style={styles.secondaryText}>{copy.moveInbox}</Text></Pressable> : null}</View><AttachmentPanel ownerType="TASK" ownerId={id} /><Pressable accessibilityRole="button" disabled={saving} onPress={() => setConfirmDelete(true)} style={styles.danger} accessibilityLabel={copy.deleteLabel}><AppIcon name="delete-outline" size={icon.md} color={colors.danger} /><Text style={styles.dangerText}>{copy.delete}</Text></Pressable></> : null}
    </View>
    <AppConfirmDialog visible={confirmDelete} title={copy.deleteTitle} description={copy.deleteDescription} confirmLabel={copy.deleteConfirm} cancelLabel={copy.deleteCancel} danger onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteTask()} />
  </ScrollView>;
}
function makeStyles(colors: ThemeColors) { return StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background}, content:{width:'100%',maxWidth:layout.contentMaxWidth,alignSelf:'center',paddingHorizontal:spacing.lg,paddingTop:spacing.md,paddingBottom:spacing.xxl}, header:{paddingTop:spacing.sm}, back:{minHeight:layout.minTouchTarget,flexDirection:'row',alignItems:'center',gap:spacing.xs,marginBottom:spacing.md}, backText:{color:colors.primary,...typography.body,fontWeight:'800'}, badge:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:spacing.xs,borderRadius:radius.pill,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,backgroundColor:colors.surfaceMuted}, badgeText:{color:colors.textSecondary,...typography.section,fontWeight:'900',letterSpacing:1.2}, title:{color:colors.textPrimary,...typography.titleLarge,fontWeight:'900',marginTop:spacing.md}, subtitle:{color:colors.textSecondary,...typography.input,marginTop:spacing.sm}, card:{marginTop:spacing.lg,borderWidth:border.thin,borderColor:colors.border,borderRadius:radius.xl,backgroundColor:colors.surface,padding:spacing.lg,...elevation.card}, status:{minHeight:layout.minTouchTarget,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,paddingHorizontal:spacing.sm}, statusText:{color:colors.primary,...typography.meta,fontWeight:'800'}, label:{color:colors.textSecondary,...typography.label,fontWeight:'800',marginTop:spacing.md,marginBottom:spacing.xs}, input:{minHeight:control.inputHeight,borderWidth:border.thin,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,color:colors.textPrimary,paddingHorizontal:spacing.md,...typography.input}, textarea:{minHeight:spacing.xxl+spacing.lg+spacing.smd,borderWidth:border.thin,borderColor:colors.border,borderRadius:radius.lg,backgroundColor:colors.surfaceMuted,color:colors.textPrimary,padding:spacing.md,...typography.input,textAlignVertical:'top'}, chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs}, chip:{minHeight:layout.minTouchTarget,borderWidth:border.thin,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:spacing.md,justifyContent:'center'}, selected:{backgroundColor:colors.primary,borderColor:colors.primary}, chipText:{color:colors.textSecondary,...typography.label,fontWeight:'800'}, selectedText:{color:colors.onPrimary}, draftSection:{marginTop:spacing.md,gap:spacing.xs}, draftHeader:{flexDirection:'row',alignItems:'center',gap:spacing.sm}, draftCopy:{flex:1,minWidth:0}, draftHint:{color:colors.textMuted,...typography.section}, draftItem:{minHeight:control.rowMinHeight,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:border.thin,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,backgroundColor:colors.surfaceMuted}, draftIcon:{width:layout.iconButtonSize,height:layout.iconButtonSize,borderRadius:radius.md,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface}, draftFileCopy:{flex:1,minWidth:0}, draftName:{color:colors.textPrimary,...typography.meta,fontWeight:'800'}, draftMeta:{color:colors.textSecondary,...typography.section,marginTop:spacing.xxs}, iconButton:{width:layout.iconButtonSize,height:layout.iconButtonSize,alignItems:'center',justifyContent:'center'}, error:{color:colors.danger,marginTop:spacing.md}, actions:{flexDirection:'row',justifyContent:'flex-end',gap:spacing.sm,marginTop:spacing.xl,flexWrap:'wrap'}, primary:{minHeight:layout.minTouchTarget,paddingHorizontal:spacing.md,borderRadius:radius.md,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:spacing.xs}, primaryText:{color:colors.onPrimary,fontWeight:'800'}, secondaryActions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginTop:spacing.md}, secondary:{minHeight:layout.minTouchTarget,minWidth:layout.minTouchTarget,paddingHorizontal:spacing.md,borderRadius:radius.md,borderWidth:border.thin,borderColor:colors.border,backgroundColor:colors.surface,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:spacing.xs}, secondaryText:{color:colors.textSecondary,fontWeight:'800'}, danger:{minHeight:layout.minTouchTarget,paddingHorizontal:spacing.lg,borderRadius:radius.md,borderWidth:border.thin,borderColor:colors.danger,backgroundColor:colors.surface,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:spacing.xs,marginTop:spacing.lg}, dangerText:{color:colors.danger,fontWeight:'800'}, disabled:{opacity:opacity.disabled}, pressed:{opacity:opacity.pressed}, center:{flex:1,backgroundColor:colors.background,alignItems:'center',justifyContent:'center',padding:spacing.xl,gap:spacing.md}, emptyTitle:{color:colors.textPrimary,...typography.cardTitle,fontWeight:'900'}, emptyText:{color:colors.textSecondary,...typography.body}
}); }

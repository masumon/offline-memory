import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTaskStore } from '../src/store/task.store';
import { colors, spacing, typography } from '../src/theme';
import type { TaskPriority } from '../src/types';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TaskEditorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [plannedDate, setPlannedDate] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [loaded, setLoaded] = useState(!id);
  const { tasks, load, create, update, complete, remove, error } = useTaskStore();
  const task = tasks.find((item) => item.id === id);

  useEffect(() => {
    if (!id) return;
    const run = async () => { if (!task) await load(db); setLoaded(true); };
    void run();
  }, [db, id, load, task]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title); setNotes(task.notes ?? ''); setPriority(task.priority); setPlannedDate(task.plannedDate ?? ''); setDueAt(task.dueAt ?? '');
  }, [task]);

  const save = async () => {
    const value = title.trim(); if (!value) return;
    const input = { title: value, notes: notes.trim() || null, priority, plannedDate: plannedDate.trim() || null, dueAt: dueAt.trim() || null };
    const result = id ? await update(db, id, input) : await create(db, input);
    if (result) router.replace('/planning');
  };
  const confirmDelete = () => { if (!id) return; Alert.alert('Delete task?', 'This permanently removes the task from this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (await remove(db, id)) router.replace('/planning'); } }]); };
  const markComplete = async () => { if (id && await complete(db, id)) router.replace('/planning'); };
  const archive = async () => { if (id && await update(db, id, { status: 'ARCHIVED' })) router.replace('/planning'); };
  const cancelTask = async () => { if (id && await update(db, id, { status: 'CANCELLED' })) router.replace('/planning'); };
  const reopenCompleted = async () => { if (id && await update(db, id, { status: 'IN_PROGRESS' })) router.replace('/planning'); };
  const restoreCancelled = async () => { if (id && await update(db, id, { status: 'INBOX' })) router.replace('/planning'); };

  if (!loaded) return <View style={styles.center}><Text style={styles.emptyText}>Loading task…</Text></View>;
  if (id && !task) return <View style={styles.center}><Text style={styles.emptyTitle}>Task not found</Text><Link href="/planning" asChild><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Back to planning</Text></Pressable></Link></View>;

  const status = task?.status;
  const canComplete = Boolean(id && status && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(status));
  const canCancel = Boolean(id && status && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(status));
  const canArchive = Boolean(id && status !== 'ARCHIVED');

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Link href="/planning" asChild><Pressable accessibilityRole="button" style={styles.back}><Text style={styles.backText}>‹ Planning</Text></Pressable></Link><Text style={styles.eyebrow}>{id ? 'TASK DETAIL' : 'NEW TASK'}</Text><Text style={styles.title}>{id ? 'Task details' : 'Create task'}</Text><Text style={styles.subtitle}>Plan, prioritize and manage this task locally.</Text></View>
    <View style={styles.form}>
      <Text style={styles.label}>Title</Text><TextInput value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Task title" />
      <Text style={styles.label}>Notes</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Optional notes" placeholderTextColor={colors.textMuted} multiline style={styles.textarea} accessibilityLabel="Task notes" />
      <Text style={styles.label}>Priority</Text><View style={styles.chips}>{PRIORITIES.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: priority === value }} onPress={() => setPriority(value)} style={[styles.chip, priority === value && styles.selected]}><Text style={[styles.chipText, priority === value && styles.selectedText]}>{value}</Text></Pressable>)}</View>
      <Text style={styles.label}>Planned date</Text><TextInput value={plannedDate} onChangeText={setPlannedDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Planned date" />
      <Text style={styles.label}>Due date/time</Text><TextInput value={dueAt} onChangeText={setDueAt} placeholder="ISO date/time, e.g. 2026-08-25T09:00:00" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Due date and time" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}><Link href="/planning" asChild><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable></Link><Pressable disabled={!title.trim()} onPress={() => void save()} style={[styles.primary, !title.trim() && styles.disabled]}><Text style={styles.primaryText}>{id ? 'Save changes' : 'Create task'}</Text></Pressable></View>
      {id ? <View style={styles.secondaryActions}>
        {canComplete ? <Pressable onPress={() => void markComplete()} style={styles.secondary}><Text style={styles.secondaryText}>Mark complete</Text></Pressable> : null}
        {canCancel ? <Pressable onPress={() => void cancelTask()} style={styles.secondary}><Text style={styles.secondaryText}>Cancel task</Text></Pressable> : null}
        {canArchive ? <Pressable onPress={() => void archive()} style={styles.secondary}><Text style={styles.secondaryText}>Archive</Text></Pressable> : null}
        {status === 'COMPLETED' ? <Pressable onPress={() => void reopenCompleted()} style={styles.secondary}><Text style={styles.secondaryText}>Reopen task</Text></Pressable> : null}
        {status === 'CANCELLED' ? <Pressable onPress={() => void restoreCancelled()} style={styles.secondary}><Text style={styles.secondaryText}>Move to inbox</Text></Pressable> : null}
      </View> : null}
      {id ? <Pressable onPress={confirmDelete} style={styles.dangerButton}><Text style={styles.dangerText}>Delete permanently</Text></Pressable> : null}
    </View>
  </ScrollView>;
}

const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.xl,paddingBottom:spacing.xl*2},header:{paddingTop:spacing.lg},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:34,fontWeight:'800',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},form:{marginTop:spacing.xl,gap:spacing.sm},label:{color:colors.textSecondary,fontSize:13,fontWeight:'700',marginTop:spacing.sm},input:{minHeight:50,borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.surface,color:colors.textPrimary,paddingHorizontal:spacing.md,fontSize:15},textarea:{minHeight:130,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,color:colors.textPrimary,padding:spacing.md,fontSize:15,textAlignVertical:'top'},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},chip:{minHeight:40,borderWidth:1,borderColor:colors.border,borderRadius:999,paddingHorizontal:spacing.md,justifyContent:'center'},selected:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{color:colors.textSecondary,fontSize:12,fontWeight:'700'},selectedText:{color:colors.onPrimary},error:{color:colors.danger,marginTop:spacing.sm},actions:{flexDirection:'row',justifyContent:'flex-end',gap:spacing.sm,marginTop:spacing.lg},primary:{minHeight:50,paddingHorizontal:spacing.lg,borderRadius:14,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center'},primaryText:{color:colors.onPrimary,fontWeight:'700'},secondaryActions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginTop:spacing.md},secondary:{minHeight:48,paddingHorizontal:spacing.md,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,justifyContent:'center',alignItems:'center'},secondaryText:{color:colors.textSecondary,fontWeight:'700'},disabled:{opacity:.5},dangerButton:{minHeight:50,paddingHorizontal:spacing.lg,borderRadius:14,borderWidth:1,borderColor:colors.danger,justifyContent:'center',alignItems:'center',marginTop:spacing.sm},dangerText:{color:colors.danger,fontWeight:'700'},center:{flex:1,backgroundColor:colors.background,alignItems:'center',justifyContent:'center',padding:spacing.xl,gap:spacing.md},emptyTitle:{color:colors.textPrimary,fontSize:18,fontWeight:'800'},emptyText:{color:colors.textSecondary}}
);

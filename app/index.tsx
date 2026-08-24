import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { parseLocalNlp, type NlpResult } from '../src/ai/nlp';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';
import type { Task } from '../src/types/task-model';

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function formatToday(date: Date) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(date); }

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [title, setTitle] = useState('');
  const [nlpPreview, setNlpPreview] = useState<NlpResult | null>(null);
  const { tasks, isLoading, error, load, create, complete } = useTaskStore();
  const { memories, load: loadMemories, isLoading: memoriesLoading } = useMemoryStore();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  useEffect(() => { void load(db); void loadMemories(db); }, [db, load, loadMemories]);
  useEffect(() => { const value = title.trim(); setNlpPreview(value ? parseLocalNlp(value, new Date()) : null); }, [title]);

  const handleCreate = async () => {
    const value = title.trim();
    if (!value) return;
    const task = await create(db, { title: value });
    if (task) setTitle('');
  };

  const focus = useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'COMPLETED' && task.status !== 'ARCHIVED' && task.status !== 'CANCELLED');
    return {
      overdue: active.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < today.getTime()).length,
      dueToday: active.filter((task) => task.dueAt?.slice(0, 10) === todayKey || task.plannedDate === todayKey).length,
      highPriority: active.filter((task) => task.priority === 'HIGH' || task.priority === 'URGENT').length,
    };
  }, [tasks, today, todayKey]);

  const todayTasks = useMemo(() => tasks.filter((task) => {
    if (task.status === 'ARCHIVED' || task.status === 'CANCELLED') return false;
    return task.dueAt?.slice(0, 10) === todayKey || task.plannedDate === todayKey || task.status === 'INBOX' || task.status === 'IN_PROGRESS';
  }).slice(0, 5), [tasks, todayKey]);
  const recentMemories = memories.slice(0, 3);

  return <View style={styles.container}><FlatList data={todayTasks} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
    ListHeaderComponent={<>
      <View style={styles.header}><View style={styles.headerTop}><View style={styles.headerCopy}><Text style={styles.eyebrow}>OFFLINE MEMORY</Text><Text style={styles.title}>Today</Text><Text style={styles.date}>{formatToday(today)}</Text></View><Text style={styles.offlineBadge}>● On device</Text></View><Text style={styles.subtitle}>Your tasks and memories stay on this device.</Text></View>
      <View style={styles.composer}><TextInput value={title} onChangeText={setTitle} onSubmitEditing={() => void handleCreate()} placeholder="What do you need to do?" placeholderTextColor={colors.textMuted} returnKeyType="done" style={styles.input} accessibilityLabel="Quick capture task"/><Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={() => void handleCreate()} style={styles.addButton}><Text style={styles.addButtonText}>Add</Text></Pressable></View>
      {nlpPreview ? <NlpPreview result={nlpPreview} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today’s focus</Text><Link href="/planning" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open daily planning" style={styles.textAction}><Text style={styles.textActionText}>Plan →</Text></Pressable></Link></View>
      <View style={styles.focusGrid}><FocusCard label="Overdue" value={focus.overdue}/><FocusCard label="Due today" value={focus.dueToday}/><FocusCard label="High priority" value={focus.highPriority}/></View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today’s tasks</Text><Link href="/planning" asChild><Pressable accessibilityRole="button" accessibilityLabel="View all tasks" style={styles.textAction}><Text style={styles.textActionText}>View all →</Text></Pressable></Link></View>
    </>}
    renderItem={({ item }) => <TaskRow task={item} onComplete={() => void complete(db, item.id)}/>} ListEmptyComponent={isLoading ? <ActivityIndicator style={styles.loader}/> : <Text style={styles.empty}>No tasks for today. Use Quick Capture above to add one.</Text>}
    ListFooterComponent={<>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent memories</Text><Link href="/memory" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open memories" style={styles.textAction}><Text style={styles.textActionText}>View all →</Text></Pressable></Link></View>
      {memoriesLoading ? <ActivityIndicator style={styles.loader}/> : recentMemories.length ? recentMemories.map((memory) => <Link key={memory.id} href={{ pathname: '/memory-editor', params: { id: memory.id } }} asChild><Pressable accessibilityRole="button" style={styles.memoryCard}><Text numberOfLines={2} style={styles.memoryTitle}>{memory.content}</Text></Pressable></Link>) : <Text style={styles.empty}>No memories yet.</Text>}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>More</Text><Link href="/more" asChild><Pressable accessibilityRole="button" accessibilityLabel="Open more tools" style={styles.textAction}><Text style={styles.textActionText}>Open →</Text></Pressable></Link></View>
    </>}/></View>;
}

function NlpPreview({ result }: { result: NlpResult }) {
  if (result.intent === 'UNKNOWN') return null;
  const parts = [result.intent.replaceAll('_', ' ').toLowerCase()];
  if (result.entities.date) parts.push(result.entities.date.isoDate);
  if (result.entities.time) parts.push(`${String(Math.floor(result.entities.time.minutes / 60)).padStart(2, '0')}:${String(result.entities.time.minutes % 60).padStart(2, '0')}`);
  return <View style={styles.nlpPreview}><Text style={styles.nlpLabel}>Local understanding</Text><Text style={styles.nlpText}>{parts.join(' · ')}</Text><Text style={styles.nlpHint}>Preview only — your task is still created from the entered text.</Text></View>;
}
function FocusCard({ label, value }: { label: string; value: number }) { return <View style={styles.focusCard}><Text style={styles.focusValue}>{value}</Text><Text style={styles.focusLabel}>{label}</Text></View>; }
function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) { const completed = task.status === 'COMPLETED'; return <View style={styles.taskRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: completed }} accessibilityLabel={`Complete ${task.title}`} disabled={completed} onPress={onComplete} style={[styles.checkbox, completed && styles.checkboxDone]}>{completed ? <Text style={styles.check}>✓</Text> : null}</Pressable><Link href={{ pathname: '/task-editor', params: { id: task.id } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open task ${task.title}`} style={styles.taskBody}><Text style={[styles.taskTitle, completed && styles.taskDone]}>{task.title}</Text><Text style={styles.taskMeta}>{task.priority} · {task.status}</Text></Pressable></Link></View>; }

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.xl,paddingTop:spacing.xl,paddingBottom:spacing.xl*2},header:{marginBottom:spacing.lg},headerTop:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:spacing.md},headerCopy:{flex:1},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:36,fontWeight:'800',marginTop:spacing.sm},date:{color:colors.textSecondary,fontSize:15,marginTop:spacing.xs},subtitle:{color:colors.textSecondary,fontSize:14,marginTop:spacing.sm},offlineBadge:{color:colors.primary,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:999,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,fontSize:12,fontWeight:'700'},composer:{flexDirection:'row',gap:spacing.sm,marginBottom:spacing.sm},input:{flex:1,minHeight:52,borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.surface,color:colors.textPrimary,paddingHorizontal:spacing.md,fontSize:16},addButton:{minHeight:52,paddingHorizontal:spacing.lg,borderRadius:14,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center'},addButtonText:{color:colors.onPrimary,fontWeight:'700'},nlpPreview:{borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.surface,padding:spacing.md,marginBottom:spacing.md},nlpLabel:{color:colors.primary,fontSize:12,fontWeight:'800'},nlpText:{color:colors.textPrimary,fontSize:14,fontWeight:'700',marginTop:spacing.xs},nlpHint:{color:colors.textMuted,fontSize:11,marginTop:spacing.xs},error:{color:colors.danger,marginBottom:spacing.md},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:spacing.lg,marginBottom:spacing.sm},sectionTitle:{color:colors.textPrimary,fontSize:19,fontWeight:'800'},textAction:{minHeight:40,justifyContent:'center',paddingHorizontal:spacing.xs},textActionText:{color:colors.primary,fontWeight:'700'},focusGrid:{flexDirection:'row',gap:spacing.sm},focusCard:{flex:1,minHeight:86,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:spacing.md,justifyContent:'center'},focusValue:{color:colors.textPrimary,fontSize:24,fontWeight:'800'},focusLabel:{color:colors.textSecondary,fontSize:12,marginTop:spacing.xs},loader:{marginVertical:spacing.lg},empty:{color:colors.textSecondary,textAlign:'center',fontSize:14,paddingVertical:spacing.lg},taskRow:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:spacing.md,marginBottom:spacing.sm},checkbox:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:colors.primary,alignItems:'center',justifyContent:'center'},checkboxDone:{backgroundColor:colors.primary},check:{color:colors.onPrimary,fontWeight:'800'},taskBody:{flex:1,minHeight:44,justifyContent:'center'},taskTitle:{color:colors.textPrimary,fontSize:16,fontWeight:'600'},taskDone:{textDecorationLine:'line-through',color:colors.textMuted},taskMeta:{color:colors.textMuted,fontSize:11,marginTop:4,letterSpacing:.4},memoryCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:spacing.md,marginBottom:spacing.sm},memoryTitle:{color:colors.textPrimary,fontSize:15,lineHeight:21}
});

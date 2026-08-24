import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getDailyPlan, planInboxTasks, type DailyPlan } from '../src/services/planning-service';
import { useTaskStore } from '../src/store/task.store';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppButton, AppCard, AppState } from '../src/ui/AppSurface';
import { AppIcon } from '../src/ui/AppIcon';
import { spacing, typography, type ThemeColors } from '../src/theme';

export default function PlanningScreen() {
  const db = useSQLiteContext();
  const { colors, language } = useAppPreferences();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bn = language === 'bn';
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadTasks = useTaskStore((state) => state.load);
  const loadPlan = useCallback(async () => {
    setError(null);
    try { setPlan(await getDailyPlan(db)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : (bn ? 'দৈনিক পরিকল্পনা লোড করা যায়নি' : 'Unable to load daily plan')); }
  }, [db, bn]);
  useEffect(() => { void loadPlan(); }, [loadPlan]);
  const planTask = async (id: string) => {
    if (busyId) return;
    setBusyId(id); setError(null);
    try { await planInboxTasks(db, [id]); await Promise.all([loadPlan(), loadTasks(db)]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : (bn ? 'টাস্ক প্ল্যান করা যায়নি' : 'Unable to plan task')); }
    finally { setBusyId(null); }
  };
  const labels = bn ? { eyebrow:'দৈনিক পরিকল্পনা', plan:'প্ল্যান', newTask:'নতুন টাস্ক', inbox:'ইনবক্স', today:'আজ', subtitle:'ইনবক্স টাস্কগুলোকে দিনের পরিকল্পনায় নিন।', overdue:'বকেয়া', progress:'চলমান', scheduled:'আজ নির্ধারিত', inboxTitle:'ইনবক্স', empty:'কোনো ইনবক্স টাস্ক নেই। দৈনিক পরিকল্পনা পরিষ্কার।', noTime:'সময় নেই', retry:'আবার চেষ্টা করুন' } : { eyebrow:'DAILY PLANNING', plan:'Plan', newTask:'New task', inbox:'Inbox', today:'Today', subtitle:'Move inbox tasks into your daily plan.', overdue:'Overdue', progress:'In progress', scheduled:'Scheduled today', inboxTitle:'Inbox', empty:'No inbox tasks. Your daily plan is clear.', noTime:'No time', retry:'Retry' };
  if (!plan && !error) return <AppState loading title={bn ? 'প্ল্যান লোড হচ্ছে…' : 'Loading plan…'} />;
  return <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerRow}><View style={styles.headingCopy}><Text style={styles.eyebrow}>{labels.eyebrow}</Text><Text style={styles.title}>{plan ? `${labels.plan} ${plan.date}` : labels.plan}</Text></View><Link href="/task-editor" asChild><AppButton label={labels.newTask} icon="plus" onPress={() => undefined} /></Link></View>
      <Text style={styles.subtitle}>{labels.subtitle}</Text>
      <View style={styles.navRow}><Link href="/inbox" asChild><Pressable style={styles.navPill} accessibilityRole="button"><AppIcon name="inbox-arrow-down-outline" size={18} color={colors.primary}/><Text style={styles.linkText}>{labels.inbox}</Text></Pressable></Link><Link href="/" asChild><Pressable style={styles.navPill} accessibilityRole="button"><AppIcon name="home-outline" size={18} color={colors.primary}/><Text style={styles.linkText}>{labels.today}</Text></Pressable></Link></View>
    </View>
    {error ? <AppState title={bn ? 'প্ল্যান লোড করা যায়নি' : 'Could not load plan'} description={error} icon="alert-circle-outline" actionLabel={labels.retry} onAction={() => void loadPlan()} /> : null}
    {plan ? <FlatList data={plan.inbox} keyExtractor={(item) => item.id} ListHeaderComponent={<><Section title={labels.overdue} tasks={plan.overdue} styles={styles} colors={colors} emptyLabel=""/><Section title={labels.progress} tasks={plan.inProgress} styles={styles} colors={colors} emptyLabel=""/><Section title={labels.scheduled} tasks={plan.scheduled} styles={styles} colors={colors} emptyLabel=""/><Text style={styles.sectionTitle}>{labels.inboxTitle}</Text></>} ListEmptyComponent={<AppState title={labels.empty} icon="inbox-check-outline" />} contentContainerStyle={styles.list} renderItem={({ item }) => <AppCard style={styles.row}><Link href={{ pathname:'/task-editor', params:{id:item.id} }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`${bn ? 'টাস্ক খুলুন' : 'Open task'} ${item.title}`} style={styles.body}><Text style={styles.task}>{item.title}</Text><Text style={styles.meta}>{item.priority}</Text></Pressable></Link><Pressable disabled={Boolean(busyId)} onPress={() => void planTask(item.id)} style={[styles.planButton, busyId && styles.disabled]} accessibilityRole="button" accessibilityState={{busy: busyId === item.id, disabled: Boolean(busyId)}} accessibilityLabel={`${labels.plan} ${item.title}`}>{busyId === item.id ? <ActivityIndicator color={colors.onPrimary}/> : <><AppIcon name="calendar-check-outline" size={18} color={colors.onPrimary}/><Text style={styles.planText}>{labels.plan}</Text></>}</Pressable></AppCard>} /> : null}
  </View>;
}
function Section({ title, tasks, styles, colors, emptyLabel }: { title:string; tasks:DailyPlan['scheduled']; styles:ReturnType<typeof makeStyles>; colors:ThemeColors; emptyLabel:string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title} · {tasks.length}</Text>{tasks.slice(0,5).map((task) => <Link key={task.id} href={{pathname:'/task-editor',params:{id:task.id}}} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open task ${task.title}`} style={styles.compact}><View style={styles.compactIcon}><AppIcon name="clipboard-text-outline" size={18} color={colors.primary}/></View><View style={styles.compactCopy}><Text style={styles.task}>{task.title}</Text><Text style={styles.meta}>{task.dueAt ?? emptyLabel || 'No time'}</Text></View><AppIcon name="chevron-right" size={19} color={colors.textMuted}/></Pressable></Link>)}</View>; }
function makeStyles(colors:ThemeColors){return StyleSheet.create({container:{flex:1,backgroundColor:colors.background},header:{paddingHorizontal:spacing.lg,paddingTop:spacing.md,paddingBottom:spacing.lg},headerRow:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:spacing.md},headingCopy:{flex:1},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'900',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:30,fontWeight:'900',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,marginTop:spacing.sm,lineHeight:21},navRow:{flexDirection:'row',gap:spacing.xs,marginTop:spacing.md},navPill:{minHeight:44,borderRadius:999,paddingHorizontal:spacing.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:4},linkText:{color:colors.primary,fontWeight:'800'},list:{paddingHorizontal:spacing.lg,paddingBottom:spacing.xl},section:{marginBottom:spacing.md},sectionTitle:{color:colors.textPrimary,fontSize:17,fontWeight:'900',marginBottom:spacing.sm},compact:{minHeight:62,flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:15,padding:spacing.sm,marginBottom:spacing.xs},compactIcon:{width:38,height:38,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},compactCopy:{flex:1},row:{minHeight:72,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,marginBottom:spacing.sm},body:{flex:1,minHeight:50,justifyContent:'center',paddingHorizontal:spacing.xs},task:{color:colors.textPrimary,fontSize:15,fontWeight:'700'},meta:{color:colors.textMuted,fontSize:11,marginTop:3},planButton:{minHeight:44,minWidth:78,paddingHorizontal:spacing.sm,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:3},planText:{color:colors.onPrimary,fontWeight:'800'},disabled:{opacity:.5}});}

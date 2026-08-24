import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { orchestrate, type OrchestratorResult } from '../src/ai/orchestrator';
import { executeAssistantAction, type AssistantExecutionResult } from '../src/services/assistant-action-service';
import { useTaskStore } from '../src/store/task.store';
import { useMemoryStore } from '../src/store/memory.store';
import { colors, spacing, typography } from '../src/theme';

export default function AssistantScreen() {
  const db = useSQLiteContext();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<AssistantExecutionResult | null>(null);
  const loadTasks = useTaskStore((state) => state.load);
  const loadMemories = useMemoryStore((state) => state.load);
  const result = useMemo<OrchestratorResult | null>(() => {
    const value = input.trim();
    return value ? orchestrate(value) : null;
  }, [input]);

  const execute = async () => {
    if (!result || result.status !== 'READY' || result.action.type === 'CLARIFY') return;
    setBusy(true); setError(null); setExecution(null);
    try {
      const next = await executeAssistantAction(db, result.action);
      setExecution(next);
      await Promise.all([loadTasks(db), loadMemories(db)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to execute the local action');
    } finally {
      setBusy(false);
    }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Link href="/more" asChild><Pressable accessibilityRole="button" style={styles.back}><Text style={styles.backText}>‹ More</Text></Pressable></Link>
      <Text style={styles.eyebrow}>LOCAL ASSISTANT</Text>
      <Text style={styles.title}>What should I do?</Text>
      <Text style={styles.subtitle}>Interpretation and execution happen locally. Nothing is sent to a cloud AI service.</Text>
    </View>
    <TextInput value={input} onChangeText={(value) => { setInput(value); setExecution(null); setError(null); }} placeholder="e.g. আগামীকাল সকাল ৯টায় supplier-কে ফোন করতে হবে" placeholderTextColor={colors.textMuted} multiline style={styles.input} accessibilityLabel="Local assistant command" />
    {result ? <View style={styles.result}>
      <Text style={styles.resultLabel}>UNDERSTANDING</Text>
      <Text style={styles.status}>{result.status}</Text>
      <Text style={styles.action}>{result.action.type}</Text>
      {result.nlp.entities.taskText ? <Detail label="Task" value={result.nlp.entities.taskText} /> : null}
      {result.nlp.entities.memoryText ? <Detail label="Memory" value={result.nlp.entities.memoryText} /> : null}
      {result.nlp.entities.query ? <Detail label="Query" value={result.nlp.entities.query} /> : null}
      {result.nlp.entities.date ? <Detail label="Date" value={result.nlp.entities.date.isoDate} /> : null}
      {result.nlp.entities.time ? <Detail label="Time" value={`${String(Math.floor(result.nlp.entities.time.minutes / 60)).padStart(2, '0')}:${String(result.nlp.entities.time.minutes % 60).padStart(2, '0')}`} /> : null}
      {result.action.type === 'CLARIFY' ? <Text style={styles.hint}>This command needs clarification before an action can be executed.</Text> : <Pressable accessibilityRole="button" accessibilityLabel="Execute local action" disabled={busy} onPress={() => void execute()} style={[styles.executeButton, busy && styles.disabled]}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.executeText}>Execute locally</Text>}</Pressable>}
    </View> : <Text style={styles.empty}>Type a local command to preview and execute the interpreted action.</Text>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {execution ? <ExecutionCard result={execution} /> : null}
  </ScrollView>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function ExecutionCard({ result }: { result: AssistantExecutionResult }) {
  return <View style={styles.execution}><Text style={styles.executionLabel}>COMPLETED</Text><Text style={styles.executionMessage}>{result.message}</Text>{result.type === 'TASK_LIST' ? result.tasks.slice(0, 10).map((task) => <Text key={task.id} style={styles.listItem}>• {task.title}</Text>) : null}{result.type === 'MEMORY_SEARCH' ? result.memories.slice(0, 10).map((memory) => <Text key={memory.id} style={styles.listItem}>• {memory.content}</Text>) : null}<View style={styles.executionLinks}>{result.type === 'TASK_LIST' ? <Link href="/planning" asChild><Pressable style={styles.linkButton}><Text style={styles.linkText}>Open planning</Text></Pressable></Link> : null}{result.type === 'MEMORY_SEARCH' || result.type === 'MEMORY_CREATED' ? <Link href="/memory" asChild><Pressable style={styles.linkButton}><Text style={styles.linkText}>Open memory</Text></Pressable></Link> : null}</View></View>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.xl,paddingBottom:spacing.xl*2},header:{paddingTop:spacing.lg,marginBottom:spacing.lg},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:34,fontWeight:'800',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},input:{minHeight:130,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,color:colors.textPrimary,padding:spacing.md,fontSize:16,textAlignVertical:'top'},result:{marginTop:spacing.lg,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,padding:spacing.lg},resultLabel:{color:colors.primary,fontSize:11,fontWeight:'800',letterSpacing:1},status:{color:colors.textSecondary,fontSize:13,fontWeight:'700',marginTop:spacing.xs},action:{color:colors.textPrimary,fontSize:20,fontWeight:'800',marginTop:spacing.sm},detail:{marginTop:spacing.md},detailLabel:{color:colors.textMuted,fontSize:11,fontWeight:'700'},detailValue:{color:colors.textPrimary,fontSize:15,marginTop:2},hint:{color:colors.textSecondary,fontSize:12,lineHeight:18,marginTop:spacing.lg},executeButton:{minHeight:50,borderRadius:14,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',marginTop:spacing.lg},executeText:{color:colors.onPrimary,fontWeight:'800'},disabled:{opacity:.55},empty:{color:colors.textSecondary,textAlign:'center',paddingVertical:spacing.xl},error:{color:colors.danger,marginTop:spacing.md},execution:{marginTop:spacing.lg,borderWidth:1,borderColor:colors.primary,borderRadius:16,backgroundColor:colors.surface,padding:spacing.lg},executionLabel:{color:colors.primary,fontSize:11,fontWeight:'800',letterSpacing:1},executionMessage:{color:colors.textPrimary,fontSize:16,fontWeight:'800',marginTop:spacing.xs},listItem:{color:colors.textSecondary,fontSize:14,lineHeight:21,marginTop:spacing.sm},executionLinks:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.md},linkButton:{minHeight:42,justifyContent:'center',paddingHorizontal:spacing.md,borderRadius:12,borderWidth:1,borderColor:colors.border},linkText:{color:colors.primary,fontWeight:'700'}
});

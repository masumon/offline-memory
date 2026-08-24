import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { orchestrate, type OrchestratorResult } from '../src/ai/orchestrator';
import { colors, spacing, typography } from '../src/theme';

export default function AssistantScreen() {
  const [input, setInput] = useState('');
  const result = useMemo<OrchestratorResult | null>(() => {
    const value = input.trim();
    return value ? orchestrate(value) : null;
  }, [input]);

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Link href="/more" asChild><Pressable accessibilityRole="button" style={styles.back}><Text style={styles.backText}>‹ More</Text></Pressable></Link>
      <Text style={styles.eyebrow}>LOCAL ASSISTANT</Text>
      <Text style={styles.title}>What should I do?</Text>
      <Text style={styles.subtitle}>Interpretation happens locally. Nothing is sent to a cloud AI service.</Text>
    </View>
    <TextInput value={input} onChangeText={setInput} placeholder="e.g. আগামীকাল সকাল ৯টায় supplier-কে ফোন করতে হবে" placeholderTextColor={colors.textMuted} multiline style={styles.input} accessibilityLabel="Local assistant command" />
    {result ? <View style={styles.result}>
      <Text style={styles.resultLabel}>UNDERSTANDING</Text>
      <Text style={styles.status}>{result.status}</Text>
      <Text style={styles.action}>{result.action.type}</Text>
      {result.nlp.entities.taskText ? <Detail label="Task" value={result.nlp.entities.taskText} /> : null}
      {result.nlp.entities.memoryText ? <Detail label="Memory" value={result.nlp.entities.memoryText} /> : null}
      {result.nlp.entities.query ? <Detail label="Query" value={result.nlp.entities.query} /> : null}
      {result.nlp.entities.date ? <Detail label="Date" value={result.nlp.entities.date.isoDate} /> : null}
      {result.nlp.entities.time ? <Detail label="Time" value={`${String(Math.floor(result.nlp.entities.time.minutes / 60)).padStart(2, '0')}:${String(result.nlp.entities.time.minutes % 60).padStart(2, '0')}`} /> : null}
      {result.action.type === 'CLARIFY' ? <Text style={styles.hint}>This command needs clarification before an action can be executed.</Text> : <Text style={styles.hint}>Preview only. No task or memory is changed from this screen.</Text>}
    </View> : <Text style={styles.empty}>Type a local command to preview the interpreted action.</Text>}
  </ScrollView>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.xl,paddingBottom:spacing.xl*2},header:{paddingTop:spacing.lg,marginBottom:spacing.lg},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:34,fontWeight:'800',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},input:{minHeight:130,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,color:colors.textPrimary,padding:spacing.md,fontSize:16,textAlignVertical:'top'},result:{marginTop:spacing.lg,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,padding:spacing.lg},resultLabel:{color:colors.primary,fontSize:11,fontWeight:'800',letterSpacing:1},status:{color:colors.textSecondary,fontSize:13,fontWeight:'700',marginTop:spacing.xs},action:{color:colors.textPrimary,fontSize:20,fontWeight:'800',marginTop:spacing.sm},detail:{marginTop:spacing.md},detailLabel:{color:colors.textMuted,fontSize:11,fontWeight:'700'},detailValue:{color:colors.textPrimary,fontSize:15,marginTop:2},hint:{color:colors.textSecondary,fontSize:12,lineHeight:18,marginTop:spacing.lg},empty:{color:colors.textSecondary,textAlign:'center',paddingVertical:spacing.xl}
});

import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../src/theme';

const items = [
  { href: '/search' as const, title: 'Search', description: 'Search tasks and active memories stored locally.' },
  { href: '/assistant' as const, title: 'Local Assistant', description: 'Preview deterministic local task and memory commands.' },
  { href: '/inbox' as const, title: 'Inbox', description: 'Review captured tasks and move them into planning.' },
  { href: '/planning' as const, title: 'Planning', description: 'Organize inbox tasks into your daily plan.' },
  { href: '/reminders' as const, title: 'Reminders', description: 'Enable and review task reminders scheduled on this device.' },
  { href: '/memory' as const, title: 'Memory', description: 'Create, search and manage local memories.' },
  { href: '/backup' as const, title: 'Backup & Restore', description: 'Protect or restore your local data.' },
  { href: '/diagnostics' as const, title: 'Diagnostics', description: 'Check local database and notification health.' },
];

export default function MoreScreen() {
  return <ScrollView contentContainerStyle={styles.container}><View style={styles.header}><Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Go to home" style={styles.back}><Text style={styles.backText}>‹ Home</Text></Pressable></Link><Text style={styles.eyebrow}>MORE</Text><Text style={styles.title}>More</Text><Text style={styles.subtitle}>Supporting tools and data controls for Offline Memory.</Text></View><View style={styles.list}>{items.map((item) => <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="button" accessibilityLabel={item.title} style={styles.card}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardDescription}>{item.description}</Text></Pressable></Link>)}</View></ScrollView>;
}

const styles = StyleSheet.create({container:{flexGrow:1,backgroundColor:colors.background,padding:spacing.xl},header:{paddingTop:spacing.lg,marginBottom:spacing.xl},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:36,fontWeight:'800',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},list:{gap:spacing.sm},card:{minHeight:86,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:spacing.lg,justifyContent:'center'},cardTitle:{color:colors.textPrimary,fontSize:17,fontWeight:'800'},cardDescription:{color:colors.textSecondary,fontSize:13,lineHeight:19,marginTop:spacing.xs}});

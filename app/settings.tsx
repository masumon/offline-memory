import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../src/theme';

const items = [
  { href: '/reminders' as const, title: 'Notifications', description: 'Manage local reminder permission and scheduled task reminders.' },
  { href: '/backup' as const, title: 'Data & Backup', description: 'Create, export or restore your local Offline Memory data.' },
  { href: '/diagnostics' as const, title: 'Diagnostics', description: 'Inspect local database and notification health.' },
];

export default function SettingsScreen() {
  return <ScrollView contentContainerStyle={styles.container}><View style={styles.header}><Link href="/more" asChild><Pressable accessibilityRole="button" style={styles.back}><Text style={styles.backText}>‹ More</Text></Pressable></Link><Text style={styles.eyebrow}>SETTINGS</Text><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Offline-first controls for your local data and reminders.</Text></View><View style={styles.localCard}><Text style={styles.localTitle}>Local by default</Text><Text style={styles.localText}>Core tasks and memories are stored on this device. No account or cloud connection is required for core use.</Text></View><View style={styles.list}>{items.map((item) => <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="button" style={styles.card}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardDescription}>{item.description}</Text></Pressable></Link>)}</View></ScrollView>;
}

const styles = StyleSheet.create({container:{flexGrow:1,backgroundColor:colors.background,padding:spacing.xl},header:{paddingTop:spacing.lg,marginBottom:spacing.lg},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'700',letterSpacing:1.2},title:{color:colors.textPrimary,fontSize:36,fontWeight:'800',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},localCard:{borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.surface,padding:spacing.lg,marginBottom:spacing.lg},localTitle:{color:colors.textPrimary,fontSize:17,fontWeight:'800'},localText:{color:colors.textSecondary,fontSize:13,lineHeight:20,marginTop:spacing.xs},list:{gap:spacing.sm},card:{minHeight:86,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:spacing.lg,justifyContent:'center'},cardTitle:{color:colors.textPrimary,fontSize:17,fontWeight:'800'},cardDescription:{color:colors.textSecondary,fontSize:13,lineHeight:19,marginTop:spacing.xs}});

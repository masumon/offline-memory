import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppPreferences } from '../src/app/AppPreferences';
import { colors, spacing, typography } from '../src/theme';

const items = [
  { href: '/reminders' as const, title: 'Notifications', description: 'Manage local reminder permission and scheduled task reminders.' },
  { href: '/backup' as const, title: 'Data & Backup', description: 'Create, export or restore your local Offline Memory data.' },
  { href: '/diagnostics' as const, title: 'Diagnostics', description: 'Inspect local database and notification health.' },
];

export default function SettingsScreen() {
  const { language, themeMode, setLanguage, setThemeMode } = useAppPreferences();
  const dark = themeMode === 'dark';
  const copy = language === 'bn' ? {
    back: '‹ আরও', eyebrow: 'সেটিংস', title: 'সেটিংস', subtitle: 'অফলাইন ডেটা, ভাষা, থিম ও রিমাইন্ডার নিয়ন্ত্রণ করুন।', localTitle: 'লোকাল-ফার্স্ট', localText: 'আপনার মূল টাস্ক ও মেমোরি এই ডিভাইসেই থাকে। মূল ব্যবহারের জন্য কোনো অ্যাকাউন্ট বা ক্লাউড প্রয়োজন নেই।', appearance: 'অ্যাপের চেহারা', darkMode: 'ডার্ক / নাইট মোড', darkDescription: 'কম আলোতে আরামদায়ক একটি ডার্ক ইন্টারফেস ব্যবহার করুন।', language: 'ভাষা', bengali: 'বাংলা', english: 'English', section: 'সিস্টেম',
  } : {
    back: '‹ More', eyebrow: 'SETTINGS', title: 'Settings', subtitle: 'Control offline data, language, appearance and reminders.', localTitle: 'Local-first', localText: 'Your core tasks and memories stay on this device. No account or cloud connection is required for core use.', appearance: 'Appearance', darkMode: 'Dark / Night mode', darkDescription: 'Use a comfortable dark interface for low-light environments.', language: 'Language', bengali: 'বাংলা', english: 'English', section: 'SYSTEM',
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Link href="/more" asChild><Pressable accessibilityRole="button" style={styles.back}><Text style={styles.backText}>{copy.back}</Text></Pressable></Link>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.localCard}>
        <View style={styles.badge}><View style={styles.badgeDot} /><Text style={styles.badgeText}>OFFLINE</Text></View>
        <Text style={styles.localTitle}>{copy.localTitle}</Text>
        <Text style={styles.localText}>{copy.localText}</Text>
      </View>

      <Text style={styles.section}>{copy.appearance}</Text>
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceCopy}><Text style={styles.cardTitle}>{copy.darkMode}</Text><Text style={styles.cardDescription}>{copy.darkDescription}</Text></View>
          <Switch value={dark} onValueChange={(value) => void setThemeMode(value ? 'dark' : 'light')} accessibilityLabel={copy.darkMode} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
        </View>
      </View>

      <View style={styles.preferenceCard}>
        <Text style={styles.cardTitle}>{copy.language}</Text>
        <View style={styles.segmented}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: language === 'bn' }} onPress={() => void setLanguage('bn')} style={StyleSheet.flatten([styles.segment, language === 'bn' && styles.segmentActive])}><Text style={StyleSheet.flatten([styles.segmentText, language === 'bn' && styles.segmentTextActive])}>{copy.bengali}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: language === 'en' }} onPress={() => void setLanguage('en')} style={StyleSheet.flatten([styles.segment, language === 'en' && styles.segmentActive])}><Text style={StyleSheet.flatten([styles.segmentText, language === 'en' && styles.segmentTextActive])}>{copy.english}</Text></Pressable>
        </View>
      </View>

      <Text style={styles.section}>{copy.section}</Text>
      <View style={styles.list}>{items.map((item) => <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="button" style={styles.card}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardDescription}>{item.description}</Text></Pressable></Link>)}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{flexGrow:1,backgroundColor:colors.background,padding:spacing.xl,paddingBottom:spacing.xxl},
  header:{paddingTop:spacing.lg,marginBottom:spacing.lg},back:{minHeight:42,justifyContent:'center',marginBottom:spacing.lg},backText:{color:colors.primary,fontSize:16,fontWeight:'700'},eyebrow:{color:colors.primary,fontSize:typography.label.fontSize,fontWeight:'800',letterSpacing:1.4},title:{color:colors.textPrimary,fontSize:36,fontWeight:'900',marginTop:spacing.sm},subtitle:{color:colors.textSecondary,fontSize:15,lineHeight:22,marginTop:spacing.sm},
  localCard:{borderWidth:1,borderColor:colors.border,borderRadius:20,backgroundColor:colors.surface,padding:spacing.lg,marginBottom:spacing.lg},badge:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,borderRadius:999,paddingHorizontal:10,paddingVertical:6,backgroundColor:colors.surfaceMuted,marginBottom:spacing.sm},badgeDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.success},badgeText:{fontSize:10,fontWeight:'900',letterSpacing:1,color:colors.textSecondary},localTitle:{color:colors.textPrimary,fontSize:18,fontWeight:'900'},localText:{color:colors.textSecondary,fontSize:13,lineHeight:20,marginTop:spacing.xs},
  section:{color:colors.textMuted,fontSize:11,fontWeight:'900',letterSpacing:1.2,marginBottom:spacing.sm,marginTop:spacing.sm},preferenceCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.md,marginBottom:spacing.sm},preferenceRow:{minHeight:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md},preferenceCopy:{flex:1},card:{minHeight:86,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.lg,justifyContent:'center'},cardTitle:{color:colors.textPrimary,fontSize:16,fontWeight:'800'},cardDescription:{color:colors.textSecondary,fontSize:13,lineHeight:19,marginTop:spacing.xs},list:{gap:spacing.sm},
  segmented:{flexDirection:'row',gap:spacing.xs,marginTop:spacing.md,padding:4,borderRadius:14,backgroundColor:colors.surfaceMuted},segment:{flex:1,minHeight:42,borderRadius:10,alignItems:'center',justifyContent:'center'},segmentActive:{backgroundColor:colors.primary},segmentText:{color:colors.textSecondary,fontSize:13,fontWeight:'800'},segmentTextActive:{color:colors.onPrimary}
});

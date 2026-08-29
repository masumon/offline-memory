import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppPreferences } from '../src/app/AppPreferences';
import { initializeNotifications, requestNotificationPermission } from '../src/services/notification.service';
import { AppIcon } from '../src/ui/AppIcon';
import { border, control, icon, layout, opacity, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

type SlideKey = 'privacy' | 'capture' | 'ready';
const SLIDES: SlideKey[] = ['privacy', 'capture', 'ready'];

export default function OnboardingScreen() {
  const { colors, accents, language, setLanguage, completeOnboarding } = useAppPreferences();
  const bn = language === 'bn';
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [remindersOn, setRemindersOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const t = bn
    ? {
        skip: 'বাদ দিন', next: 'পরবর্তী', start: 'শুরু করুন',
        privacyTitle: '১০০% অফলাইন, ১০০% আপনার',
        privacyBody: 'টাস্ক, মেমোরি, সার্চ, রিমাইন্ডার — সবকিছু এই ডিভাইসেই থাকে। কোনো অ্যাকাউন্ট নেই, কোনো সার্ভারে ডেটা যায় না।',
        captureTitle: 'সহজ ভাষায় লিখুন',
        captureBody: 'শুধু লিখুন কী করতে হবে — অ্যাপ নিজেই তারিখ ও সময় বুঝে টাস্ক বানিয়ে দেয়।',
        exampleInput: 'আগামীকাল সকাল ৯টায় সাপ্লায়ারকে ফোন করব',
        exTask: 'টাস্ক', exTaskV: 'সাপ্লায়ারকে ফোন করব', exDate: 'তারিখ', exDateV: 'আগামীকাল', exTime: 'সময়', exTimeV: '09:00',
        readyTitle: 'শুরু করার আগে',
        langLabel: 'ভাষা', bengali: 'বাংলা', english: 'English',
        remLabel: 'টাস্কের সময় হলে রিমাইন্ডার দিন',
        remOn: 'চালু', remOff: 'পরে', remGranted: 'রিমাইন্ডার চালু হয়েছে', remDenied: 'অনুমতি দেওয়া হয়নি — সেটিংসে পরে চালু করা যাবে',
      }
    : {
        skip: 'Skip', next: 'Next', start: 'Get started',
        privacyTitle: '100% offline, 100% yours',
        privacyBody: 'Tasks, memories, search and reminders all stay on this device. No account, nothing sent to a server.',
        captureTitle: 'Just type it in plain words',
        captureBody: 'Write what you need to do — the app reads the date and time and builds the task for you.',
        exampleInput: 'call the supplier tomorrow at 9am',
        exTask: 'Task', exTaskV: 'call the supplier', exDate: 'Date', exDateV: 'Tomorrow', exTime: 'Time', exTimeV: '09:00',
        readyTitle: 'Before you start',
        langLabel: 'Language', bengali: 'বাংলা', english: 'English',
        remLabel: 'Remind me when a task is due',
        remOn: 'On', remOff: 'Later', remGranted: 'Reminders enabled', remDenied: 'Permission not granted — you can enable it later in Settings',
      };

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const enableReminders = async () => {
    setBusy(true);
    try {
      await initializeNotifications();
      setRemindersOn(await requestNotificationPermission());
    } catch {
      setRemindersOn(false);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brand}><View style={styles.brandBadge}><Text style={styles.brandBadgeText}>OM</Text></View><Text style={styles.brandName}>Offline Memory</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.skip} onPress={() => void finish()} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.skip, pressed && styles.pressed])}>
          <Text style={styles.skipText}>{t.skip}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        <Slide width={width} styles={styles}>
          <IconBadge name="shield-check-outline" tone={accents.green} styles={styles} />
          <Text style={styles.title}>{t.privacyTitle}</Text>
          <Text style={styles.body}>{t.privacyBody}</Text>
        </Slide>

        <Slide width={width} styles={styles}>
          <IconBadge name="lightning-bolt-outline" tone={accents.blue} styles={styles} />
          <Text style={styles.title}>{t.captureTitle}</Text>
          <Text style={styles.body}>{t.captureBody}</Text>
          <View style={styles.demoInput}><AppIcon name="pencil-outline" size={icon.sm} color={colors.textMuted} /><Text style={styles.demoInputText}>{t.exampleInput}</Text></View>
          <View style={styles.demoCard}>
            <DemoRow label={t.exTask} value={t.exTaskV} styles={styles} />
            <DemoRow label={t.exDate} value={t.exDateV} styles={styles} />
            <DemoRow label={t.exTime} value={t.exTimeV} styles={styles} />
          </View>
        </Slide>

        <Slide width={width} styles={styles}>
          <IconBadge name="check-decagram-outline" tone={accents.green} styles={styles} />
          <Text style={styles.title}>{t.readyTitle}</Text>

          <Text style={styles.fieldLabel}>{t.langLabel}</Text>
          <View style={styles.segmented}>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: bn }} onPress={() => void setLanguage('bn')} style={({ pressed }) => StyleSheet.flatten([styles.segment, bn && styles.segmentOn, pressed && styles.pressed])}>
              <Text style={[styles.segmentText, bn && styles.segmentTextOn]}>{t.bengali}</Text>
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: !bn }} onPress={() => void setLanguage('en')} style={({ pressed }) => StyleSheet.flatten([styles.segment, !bn && styles.segmentOn, pressed && styles.pressed])}>
              <Text style={[styles.segmentText, !bn && styles.segmentTextOn]}>{t.english}</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>{t.remLabel}</Text>
          {remindersOn === null ? (
            <View style={styles.remRow}>
              <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={t.remOn} onPress={() => void enableReminders()} style={({ pressed }) => StyleSheet.flatten([styles.remPrimary, busy && styles.disabled, pressed && styles.pressed])}>
                <AppIcon name="bell-plus-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.remPrimaryText}>{t.remOn}</Text>
              </Pressable>
              <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={t.remOff} onPress={() => setRemindersOn(false)} style={({ pressed }) => StyleSheet.flatten([styles.remGhost, pressed && styles.pressed])}>
                <Text style={styles.remGhostText}>{t.remOff}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.remNote, remindersOn ? styles.remNoteOk : styles.remNoteWarn]}>
              <AppIcon name={remindersOn ? 'bell-check-outline' : 'information-outline'} size={icon.sm} color={remindersOn ? colors.success : colors.warning} />
              <Text style={styles.remNoteText}>{remindersOn ? t.remGranted : t.remDenied}</Text>
            </View>
          )}
        </Slide>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((key, i) => <View key={key} style={[styles.dot, i === index && styles.dotOn]} />)}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={index === SLIDES.length - 1 ? t.start : t.next}
          onPress={() => (index === SLIDES.length - 1 ? void finish() : go(index + 1))}
          style={({ pressed }) => StyleSheet.flatten([styles.cta, pressed && styles.pressed])}
        >
          <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? t.start : t.next}</Text>
          <AppIcon name={index === SLIDES.length - 1 ? 'check' : 'arrow-right'} size={icon.sm} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function Slide({ width, children, styles }: { width: number; children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}
function IconBadge({ name, tone, styles }: { name: 'shield-check-outline' | 'lightning-bolt-outline' | 'check-decagram-outline'; tone: { soft: string; on: string; border: string }; styles: ReturnType<typeof makeStyles> }) {
  return <View style={[styles.iconBadge, { backgroundColor: tone.soft, borderColor: tone.border }]}><AppIcon name={name} size={icon.xl} color={tone.on} /></View>;
}
function DemoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.demoRow}><Text style={styles.demoLabel}>{label}</Text><Text style={styles.demoValue}>{value}</Text></View>;
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    brandBadge: { width: control.smallIconContainer, height: control.smallIconContainer, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    brandBadgeText: { color: colors.onPrimary, ...typography.cardTitle, fontFamily: typography.numeric.fontFamily },
    brandName: { color: colors.textPrimary, ...typography.cardTitle, fontWeight: '900' },
    skip: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
    skipText: { color: colors.textSecondary, ...typography.meta, fontWeight: '800' },
    pager: { flex: 1 },
    slide: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, gap: spacing.md },
    iconBadge: { width: 96, height: 96, borderRadius: radius.xxl, borderWidth: border.thin, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '900', textAlign: 'center' },
    body: { color: colors.textSecondary, ...typography.body, textAlign: 'center', maxWidth: 420 },
    demoInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', maxWidth: 420, marginTop: spacing.md, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.smd },
    demoInputText: { flex: 1, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    demoCard: { alignSelf: 'stretch', maxWidth: 420, borderWidth: border.thin, borderColor: accents.green.border, borderRadius: radius.lg, backgroundColor: accents.green.soft, padding: spacing.md, gap: spacing.xs },
    demoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    demoLabel: { color: accents.green.on, ...typography.caption, fontWeight: '900', minWidth: 64 },
    demoValue: { flex: 1, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    fieldLabel: { alignSelf: 'stretch', maxWidth: 420, color: colors.textSecondary, ...typography.label, fontWeight: '900', marginTop: spacing.md },
    segmented: { flexDirection: 'row', alignSelf: 'stretch', maxWidth: 420, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    segment: { flex: 1, minHeight: layout.minTouchTarget, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    segmentOn: { backgroundColor: colors.primary },
    segmentText: { color: colors.textSecondary, ...typography.meta, fontWeight: '800' },
    segmentTextOn: { color: colors.onPrimary },
    remRow: { flexDirection: 'row', alignSelf: 'stretch', maxWidth: 420, gap: spacing.sm },
    remPrimary: { flex: 1, minHeight: control.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.primary },
    remPrimaryText: { color: colors.onPrimary, ...typography.bodySmall, fontWeight: '900' },
    remGhost: { minHeight: control.buttonHeight, minWidth: layout.minTouchTarget * 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    remGhostText: { color: colors.textSecondary, ...typography.bodySmall, fontWeight: '800' },
    remNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', maxWidth: 420, borderWidth: border.thin, borderRadius: radius.md, padding: spacing.md },
    remNoteOk: { borderColor: accents.green.border, backgroundColor: accents.green.soft },
    remNoteWarn: { borderColor: accents.orange.border, backgroundColor: accents.orange.soft },
    remNoteText: { flex: 1, color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: border.thin, borderTopColor: colors.border },
    dots: { flexDirection: 'row', gap: spacing.xs },
    dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
    dotOn: { backgroundColor: colors.primary, width: 22 },
    cta: { minHeight: control.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.primary },
    ctaText: { color: colors.onPrimary, ...typography.callout, fontWeight: '900' },
    disabled: { opacity: opacity.disabled },
    pressed: { opacity: opacity.pressed },
  });
}

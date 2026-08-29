import { useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAppPreferences } from '../app/AppPreferences';
import { useSpeech } from '../hooks/useSpeech';
import { AppIcon } from './AppIcon';
import { border, radius, spacing, typography } from '../theme';

// A small, premium "listening" strip that slides in just below the mic while a voice
// capture is running — a live pill with a pulsing dot, a moving waveform and the words
// as they are recognised. It hides itself the moment the capture ends. Mic permission is
// asked once; if refused it shows a compact prompt to open Settings. All on-device.
const BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function VoiceOverlay({
  visible,
  language,
  onResult,
  onClose,
}: {
  visible: boolean;
  language: 'bn' | 'en';
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const { accents, reduceMotion } = useAppPreferences();
  const bn = language === 'bn';
  const { listening, partial, lastError, startListening, stopListening } = useSpeech(language);
  const startedRef = useRef(false);
  const beganRef = useRef(false);
  useEffect(() => { if (listening) beganRef.current = true; }, [listening]);

  useEffect(() => {
    if (!visible) { startedRef.current = false; beganRef.current = false; return; }
    if (startedRef.current) return;
    startedRef.current = true;
    let closed = false;
    void startListening((text) => {
      if (closed) return;
      const clean = text.trim();
      if (clean) onResult(clean);
      onClose();
    });
    return () => { closed = true; stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // After the recogniser has actually run and then stopped with nothing to show, fold
  // the strip away. `beganRef` keeps it open through the permission / warm-up window.
  useEffect(() => {
    if (!visible || !beganRef.current || listening || partial) return;
    if (lastError === 'no-speech' || lastError === null) {
      const t = setTimeout(onClose, 2000);
      return () => clearTimeout(t);
    }
  }, [visible, listening, partial, lastError, onClose]);

  if (!visible) return null;

  const denied = lastError === 'permission';
  const unavailable = lastError === 'unavailable';

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(160)}
      exiting={reduceMotion ? undefined : FadeOut.duration(140)}
      style={[
        styles.panel,
        {
          borderColor: denied || unavailable ? accents.orange.border : accents.red.border,
          backgroundColor: denied || unavailable ? accents.orange.soft : accents.red.soft,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {denied || unavailable ? (
        <>
          <AppIcon name={denied ? 'microphone-off' : 'microphone-question'} size={18} color={accents.orange.on} />
          <Text style={[styles.text, { color: accents.orange.on }]} numberOfLines={2}>
            {denied
              ? (bn ? 'মাইক্রোফোনের অনুমতি বন্ধ আছে।' : 'Microphone permission is off.')
              : (bn ? 'এই ডিভাইসে ভয়েস চালু হয়নি — টাইপ করুন।' : 'Voice didn’t start here — please type.')}
          </Text>
          {denied ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: accents.orange.on }]}>{bn ? 'সেটিংস' : 'Settings'}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'বন্ধ' : 'Close'} onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <AppIcon name="close" size={16} color={accents.orange.on} />
          </Pressable>
        </>
      ) : (
        <>
          <PulseDot color={accents.red.base} reduceMotion={reduceMotion} />
          <View style={styles.wave}>
            {BARS.map((i) => <WaveBar key={i} index={i} color={accents.red.base} reduceMotion={reduceMotion} />)}
          </View>
          <Text style={[styles.text, { color: accents.red.on }]} numberOfLines={1}>
            {partial.trim() || (listening ? (bn ? 'শুনছি…' : 'Listening…') : (bn ? 'শুরু হচ্ছে…' : 'Starting…'))}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'থামান' : 'Stop'} onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <AppIcon name="close" size={16} color={accents.red.on} />
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

function PulseDot({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) { s.value = 1; return; }
    s.value = withRepeat(withSequence(
      withTiming(1.5, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
  }, [reduceMotion, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 2 - s.value }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotRing, { borderColor: color }, style]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

function WaveBar({ index, color, reduceMotion }: { index: number; color: string; reduceMotion: boolean }) {
  const h = useSharedValue(0.3);
  useEffect(() => {
    if (reduceMotion) { h.value = 0.4; return; }
    const peak = 0.4 + ((index * 41) % 55) / 100;
    h.value = withDelay(index * 55, withRepeat(withSequence(
      withTiming(peak, { duration: 300 + (index % 3) * 70, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.25, { duration: 300 + (index % 3) * 70, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, [index, reduceMotion, h]);
  const style = useAnimatedStyle(() => ({ height: `${Math.round(h.value * 100)}%` }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  panel: {
    marginTop: spacing.sm,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: border.thin,
  },
  dotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 },
  bar: { width: 3, borderRadius: 2, minHeight: 4 },
  text: { flex: 1, ...typography.bodySmall, fontWeight: '800' },
  linkBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, borderWidth: border.thin, borderColor: 'transparent' },
  linkText: { ...typography.caption, fontWeight: '900', textDecorationLine: 'underline' },
  closeBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
});

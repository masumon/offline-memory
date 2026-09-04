import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from './AppText';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { border, control, layout, opacity, radius, spacing, typography } from '../theme';

const GRACE_MS = 15000;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'] as const;

export function LockGate({ children }: PropsWithChildren) {
  const { appLockEnabled, verifyAppLockPin, colors, language, reduceMotion } = useAppPreferences();
  const bn = language === 'bn';
  const [unlocked, setUnlocked] = useState(false);
  const [entry, setEntry] = useState('');
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const bioTried = useRef(false);
  const [bioNonce, setBioNonce] = useState(0);
  const locked = appLockEnabled && !unlocked;
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  // Nudge the card sideways on a rejected PIN — the mutation lives in an effect (not a
  // memoised callback) so it plays well with the React Compiler immutability rule.
  useEffect(() => {
    if (!failed || reduceMotion) return;
    shake.set(withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-6, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, reduceMotion]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        if (backgroundedAt.current !== null && Date.now() - backgroundedAt.current > GRACE_MS) { setUnlocked(false); bioTried.current = false; }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // Offer Face/Fingerprint as the fast path; the PIN pad is always the fallback.
  useEffect(() => {
    if (!locked || bioTried.current) return;
    bioTried.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return;
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: bn ? 'আনলক করুন' : 'Unlock Offline Memory', fallbackLabel: bn ? 'পিন' : 'Use PIN' });
        if (!cancelled && res.success) setUnlocked(true);
      } catch { /* fall back to PIN */ }
    })();
    return () => { cancelled = true; };
  }, [locked, bioNonce, bn]);

  const press = useCallback((digit: string) => {
    setFailed(false);
    setEntry(prev => {
      const next = (prev + digit).slice(0, 8);
      if (next.length >= 4 && verifyAppLockPin(next)) { setUnlocked(true); return ''; }
      return next;
    });
  }, [verifyAppLockPin]);

  const submit = useCallback(() => {
    if (verifyAppLockPin(entry)) { setUnlocked(true); setEntry(''); }
    else { setFailed(true); setEntry(''); }
  }, [entry, verifyAppLockPin]);

  if (!appLockEnabled || !locked) return <>{children}</>;

  const styles = makeStyles(colors);
  const dotCount = Math.max(4, Math.min(8, entry.length || 4));
  return (
    <View style={styles.wrap} accessibilityViewIsModal accessibilityLabel={bn ? 'অ্যাপ লক' : 'App locked'}>
      <Animated.View style={[styles.card, shakeStyle]}>
        <View style={styles.badge}><AppIcon name="lock-check-outline" size={control.iconSize + 10} color={colors.primary} /></View>
        <Text style={styles.title}>{bn ? 'পিন দিন' : 'Enter your PIN'}</Text>
        <Text style={styles.subtitle}>{bn ? 'অ্যাপটি সুরক্ষিত — চালিয়ে যেতে পিন দিন' : 'This app is protected — enter your PIN to continue'}</Text>
        <View style={styles.dots}>
          {Array.from({ length: dotCount }, (_, i) => (
            <View key={i} style={[styles.dot, i < entry.length && styles.dotOn, failed && styles.dotFail]} />
          ))}
        </View>
        <Text style={[styles.error, !failed && styles.errorHidden]}>{bn ? 'ভুল পিন — আবার চেষ্টা করুন' : 'Wrong PIN — try again'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'বায়োমেট্রিক দিয়ে আনলক' : 'Unlock with biometrics'} onPress={() => { bioTried.current = false; setBioNonce(n => n + 1); }} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.bioBtn, pressed && styles.pressed])}>
          <AppIcon name="fingerprint" size={control.iconSize} color={colors.primary} />
          <Text style={styles.bioText}>{bn ? 'ফিঙ্গারপ্রিন্ট / ফেস' : 'Fingerprint / Face'}</Text>
        </Pressable>
      </Animated.View>
      <View style={styles.pad}>
        {KEYS.map((key, idx) => {
          if (key === 'back') {
            return (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={bn ? 'মুছুন' : 'Delete'}
                disabled={entry.length === 0}
                onPress={() => { setFailed(false); setEntry(prev => prev.slice(0, -1)); }}
                style={({ pressed }) => StyleSheet.flatten([styles.key, styles.keyGhost, entry.length === 0 && styles.keyDisabled, pressed && styles.pressed])}
              >
                <AppIcon name="backspace-outline" size={control.iconSize} color={colors.textSecondary} />
              </Pressable>
            );
          }
          if (key === 'ok') {
            return (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={bn ? 'নিশ্চিত' : 'Confirm'}
                disabled={entry.length < 4}
                onPress={submit}
                style={({ pressed }) => StyleSheet.flatten([styles.key, styles.keyOk, entry.length < 4 && styles.keyDisabled, pressed && styles.pressed])}
              >
                <AppIcon name="arrow-right" size={control.iconSize} color={colors.onPrimary} />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={idx}
              accessibilityRole="button"
              accessibilityLabel={key}
              onPress={() => press(key)}
              style={({ pressed }) => StyleSheet.flatten([styles.key, styles.keyFilled, pressed && styles.pressed])}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg, zIndex: layout.feedbackZIndex + 10 },
    card: { alignItems: 'center', gap: spacing.xs },
    badge: { width: 76, height: 76, borderRadius: radius.xxl, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    title: { color: colors.textPrimary, ...typography.heading, fontWeight: '900' },
    subtitle: { color: colors.textSecondary, ...typography.bodySmall, textAlign: 'center', maxWidth: 300 },
    dots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xs },
    dot: { width: 13, height: 13, borderRadius: radius.pill, borderWidth: border.medium, borderColor: colors.border },
    dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotFail: { borderColor: colors.danger },
    error: { color: colors.danger, ...typography.bodySmall, fontWeight: '800', marginTop: spacing.xs, minHeight: 20 },
    errorHidden: { opacity: 0 },
    bioBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: layout.minTouchTarget, paddingHorizontal: spacing.md, marginTop: spacing.xs, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface },
    bioText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    pad: { width: 264, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
    key: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
    keyFilled: { backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border },
    keyGhost: { backgroundColor: 'transparent' },
    keyOk: { backgroundColor: colors.primary },
    keyDisabled: { opacity: opacity.disabled },
    keyText: { color: colors.textPrimary, ...typography.title, fontFamily: typography.numeric.fontFamily },
    pressed: { opacity: opacity.pressed },
  });
}

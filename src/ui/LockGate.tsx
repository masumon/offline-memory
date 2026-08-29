import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { border, control, layout, opacity, radius, spacing, typography } from '../theme';

const GRACE_MS = 15000;

export function LockGate({ children }: PropsWithChildren) {
  const { appLockEnabled, verifyAppLockPin, colors, language } = useAppPreferences();
  const bn = language === 'bn';
  const [unlocked, setUnlocked] = useState(false);
  const [entry, setEntry] = useState('');
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const bioTried = useRef(false);
  const [bioNonce, setBioNonce] = useState(0);
  const locked = appLockEnabled && !unlocked;

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
  return (
    <View style={styles.wrap} accessibilityViewIsModal accessibilityLabel={bn ? 'অ্যাপ লক' : 'App locked'}>
      <View style={styles.badge}><AppIcon name="lock-outline" size={control.iconSize + 8} color={colors.primary} /></View>
      <Text style={styles.title}>{bn ? 'পিন দিন' : 'Enter PIN'}</Text>
      <View style={styles.dots}>
        {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, Math.max(4, entry.length)).map(i => (
          <View key={i} style={[styles.dot, i < entry.length && styles.dotOn]} />
        ))}
      </View>
      {failed ? <Text style={styles.error}>{bn ? 'ভুল পিন' : 'Wrong PIN'}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'বায়োমেট্রিক' : 'Use biometrics'} onPress={() => { bioTried.current = false; setBioNonce(n => n + 1); }} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.bioBtn, pressed && styles.pressed])}>
        <AppIcon name="fingerprint" size={control.iconSize} color={colors.primary} />
        <Text style={styles.bioText}>{bn ? 'ফিঙ্গারপ্রিন্ট / ফেস' : 'Fingerprint / Face'}</Text>
      </Pressable>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'ok'].map((key, idx) => key === '' ? <View key={idx} style={styles.key} /> : (
          <Pressable
            key={idx}
            accessibilityRole="button"
            accessibilityLabel={key === 'ok' ? (bn ? 'নিশ্চিত' : 'Confirm') : key}
            onPress={() => (key === 'ok' ? submit() : press(key))}
            style={({ pressed }) => StyleSheet.flatten([styles.key, styles.keyFilled, pressed && styles.pressed])}
          >
            {key === 'ok' ? <AppIcon name="check" size={control.iconSize} color={colors.onPrimary} /> : <Text style={styles.keyText}>{key}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, zIndex: layout.feedbackZIndex + 10 },
    badge: { width: 72, height: 72, borderRadius: radius.xxl, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.textPrimary, ...typography.heading, fontWeight: '900' },
    dots: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
    dot: { width: 12, height: 12, borderRadius: radius.pill, borderWidth: border.medium, borderColor: colors.border },
    dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    error: { color: colors.danger, ...typography.bodySmall, fontWeight: '800' },
    bioBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: layout.minTouchTarget, paddingHorizontal: spacing.md },
    bioText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    pad: { width: 264, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginTop: spacing.md },
    key: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
    keyFilled: { backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border },
    keyText: { color: colors.textPrimary, ...typography.title, fontFamily: typography.numeric.fontFamily },
    pressed: { opacity: opacity.pressed },
  });
}

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useAppPreferences } from '../app/AppPreferences';

// Branded hand-off. The native splash (emerald + spark) holds until this mounts, then
// the app logo settles in the centre as a live "3D" element — concentric ripple rings
// breathe outward from it (a calm sonar/water-drop pulse), plus a gentle perspective
// parallax (it tips a few degrees each way) and a slow breathing scale. Around it a
// field of coloured stars drifts up / down / left / right on its own
// Lissajous paths, each one twinkling (glow + scale) and slowly turning on a separate
// clock, so nothing pulses in unison. Below, the "POWERED BY ABO ENTERPRISE" credit is
// typed out letter by letter with a soft fade-and-rise, then holds still. The emerald
// cover lifts away to reveal the app — one background colour throughout, so there is no
// visible seam. "Reduce motion" collapses it to a plain cross-fade with the logo, stars
// and full credit shown at rest.
//
// Dismissal is driven by a plain timer, so the splash can never get stuck if a render
// interrupts the cover fade.

const BRAND = '#124E78';
// The mark is the bare spark on the brand colour — no rounded-square icon tile behind
// it (that tile is near the background colour and just reads as a faint box).
const LOGO = require('../../assets/spark-lg.png');
const LOGO_GOLD = require('../../assets/spark-gold.png');
const STAR = require('../../assets/spark-lg.png');
const CREDIT = 'POWERED BY ABO ENTERPRISE';
const HOLD_MS = 10000;
const FADE_MS = 520;
const TYPE_START_MS = 720;
const TYPE_STEP_MS = 62;

// Concentric rings that expand out of the logo and fade — three of them, evenly phased,
// so one is always mid-flight. Replaces the old solid halo disc with a lighter,
// more "premium" wave. Reduce-motion shows them frozen as a still ring set.
const RIPPLE_MS = 3000;
const RIPPLES = [0, 1, 2, 3] as const;

function Ripple({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const p = useSharedValue(reduceMotion ? 0.22 + index * 0.24 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) });
    p.value = withDelay(
      200 + index * (RIPPLE_MS / RIPPLES.length),
      withRepeat(withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.cubic) }), -1, false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fade in over the first ~18% of the travel, then ebb to nothing — so a ring never
  // pops in at the centre or clips out at the edge.
  const style = useAnimatedStyle(() => ({
    opacity: enter.value * Math.min(1, p.value * 5.5) * (1 - p.value) * 0.7,
    transform: [{ scale: 0.34 + p.value * 1.5 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.ripple, style]} />;
}

// Coloured stars scattered around the logo. x/y are the rest position from screen
// centre; rx/ry the drift amplitude; px/py the drift periods (kept unequal so the path
// is a slow figure-of-eight rather than a straight line); tw the twinkle period; spin
// the full-turn duration (negative = anticlockwise); delay staggers the entrances.
const STARS = [
  { color: '#8CF5D8', size: 32, x: -128, y: -168, rx: 20, ry: 26, px: 2200, py: 2900, tw: 900, spin: 16000, delay: 0 },
  { color: '#FFC94D', size: 52, x: 122, y: -132, rx: 26, ry: 18, px: 2700, py: 2100, tw: 1150, spin: -12000, delay: 160 },
  { color: '#F4D48A', size: 24, x: 158, y: 54, rx: 22, ry: 26, px: 3100, py: 2500, tw: 760, spin: 21000, delay: 340 },
  { color: '#B49CFF', size: 38, x: -150, y: 78, rx: 28, ry: 22, px: 2500, py: 3300, tw: 1020, spin: -18000, delay: 240 },
  { color: '#8FB6F2', size: 28, x: -34, y: 192, rx: 24, ry: 18, px: 2900, py: 2300, tw: 880, spin: 15000, delay: 520 },
  { color: '#5EEAD4', size: 22, x: 58, y: -204, rx: 18, ry: 22, px: 2000, py: 2700, tw: 700, spin: -23000, delay: 620 },
  { color: '#FFE08A', size: 26, x: 176, y: 182, rx: 22, ry: 24, px: 2650, py: 3050, tw: 960, spin: 17000, delay: 300 },
  { color: '#7CC4FF', size: 20, x: -186, y: -40, rx: 20, ry: 26, px: 2350, py: 2850, tw: 820, spin: -20000, delay: 440 },
] as const;

const drift = (to: number, ms: number) =>
  withRepeat(
    withSequence(
      withTiming(to, { duration: ms, easing: Easing.inOut(Easing.sin) }),
      withTiming(-to, { duration: ms, easing: Easing.inOut(Easing.sin) }),
    ),
    -1,
    true,
  );

const pulse = (from: number, to: number, ms: number) =>
  withRepeat(
    withSequence(
      withTiming(to, { duration: ms, easing: Easing.inOut(Easing.quad) }),
      withTiming(from, { duration: ms, easing: Easing.inOut(Easing.quad) }),
    ),
    -1,
    true,
  );

function Star({ cfg, reduceMotion }: { cfg: (typeof STARS)[number]; reduceMotion: boolean }) {
  // Copy every field into a plain local so the worklet below captures primitives,
  // never the frozen `as const` config object.
  const { color, size, x, y, rx, ry, px, py, tw: twMs, spin: spinMs, delay } = cfg;
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const tw = useSharedValue(reduceMotion ? 0.8 : 0.4);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.7)) }));
    tx.value = withDelay(delay, drift(rx, px));
    ty.value = withDelay(delay + 220, drift(ry, py));
    tw.value = withDelay(delay, pulse(0.32, 1, twMs));
    spin.value = withRepeat(withTiming(spinMs > 0 ? 360 : -360, { duration: Math.abs(spinMs), easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value * (0.28 + tw.value * 0.72),
    transform: [
      { translateX: x + tx.value },
      { translateY: y + ty.value },
      { rotate: `${spin.value}deg` },
      { scale: (0.5 + enter.value * 0.5) * (0.68 + tw.value * 0.5) },
    ],
  }));

  return (
    <Animated.Image
      source={STAR}
      resizeMode="contain"
      style={[{ position: 'absolute', width: size, height: size, tintColor: color }, style]}
    />
  );
}

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { reduceMotion } = useAppPreferences();
  const done = useRef(false);
  const typeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [typed, setTyped] = useState(reduceMotion ? CREDIT.length : 0);

  const cover = useSharedValue(1);
  const coverScale = useSharedValue(1);

  const logoIn = useSharedValue(reduceMotion ? 1 : 0);
  const logoTiltX = useSharedValue(0);
  const logoTiltY = useSharedValue(0);
  const logoBreathe = useSharedValue(1);

  const creditIn = useSharedValue(reduceMotion ? 1 : 0);
  const caret = useSharedValue(reduceMotion ? 0 : 1);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    const finish = () => { if (!done.current) { done.current = true; onFinish(); } };

    if (reduceMotion) {
      creditIn.value = withDelay(300, withTiming(1, { duration: 480 }));
      cover.value = withDelay(HOLD_MS - FADE_MS, withTiming(0, { duration: FADE_MS }));
      const t = setTimeout(finish, HOLD_MS);
      return () => clearTimeout(t);
    }

    // Logo settles in, then keeps breathing / tipping in perspective.
    logoIn.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.back(1.5)) });
    logoTiltY.value = withDelay(360, drift(9, 2400));
    logoTiltX.value = withDelay(360, drift(5, 3000));
    logoBreathe.value = withDelay(360, pulse(0.97, 1.05, 1500));

    creditIn.value = withDelay(560, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }));
    caret.value = withDelay(560, withRepeat(withSequence(withTiming(0.15, { duration: 420 }), withTiming(1, { duration: 420 })), -1, true));

    // Typewriter: reveal one character at a time.
    let n = 0;
    const startTimer = setTimeout(() => {
      const iv = setInterval(() => {
        n += 1;
        setTyped(n);
        if (n >= CREDIT.length) { clearInterval(iv); caret.value = withTiming(0, { duration: 260 }); }
      }, TYPE_STEP_MS);
      typeRef.current = iv;
    }, TYPE_START_MS);

    cover.value = withDelay(HOLD_MS - FADE_MS, withTiming(0, { duration: FADE_MS, easing: Easing.inOut(Easing.quad) }));
    coverScale.value = withDelay(HOLD_MS - FADE_MS, withTiming(1.08, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));

    const t = setTimeout(finish, HOLD_MS);
    return () => { clearTimeout(t); clearTimeout(startTimer); if (typeRef.current) clearInterval(typeRef.current); };
    // Run once on mount; shared values are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value, transform: [{ scale: coverScale.value }] }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value,
    transform: [
      { perspective: 800 },
      { rotateX: `${logoTiltX.value}deg` },
      { rotateY: `${logoTiltY.value}deg` },
      { scale: (0.6 + logoIn.value * 0.4) * logoBreathe.value },
    ],
  }));
  const creditStyle = useAnimatedStyle(() => ({
    opacity: creditIn.value,
    transform: [{ translateY: (1 - creditIn.value) * 8 }, { scale: 0.92 + creditIn.value * 0.08 }],
  }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <Animated.View pointerEvents="none" style={[styles.fill, coverStyle]}>
      <View style={styles.starField}>
        {STARS.map((cfg) => <Star key={cfg.color + cfg.x} cfg={cfg} reduceMotion={reduceMotion} />)}
      </View>
      <View style={styles.stage}>
        {RIPPLES.map((i) => <Ripple key={i} index={i} reduceMotion={reduceMotion} />)}
        <Animated.View style={[styles.mark, logoStyle]}>
          <Animated.Image source={LOGO} resizeMode="contain" style={styles.logo} />
          <Animated.Image source={LOGO_GOLD} resizeMode="contain" style={styles.logoGold} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.credit, creditStyle]}>
        <Animated.Text style={styles.creditText}>
          {CREDIT.slice(0, typed)}
        </Animated.Text>
        <Animated.View style={[styles.caret, caretStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  starField: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 172, height: 172, borderRadius: 86, borderWidth: 2, borderColor: '#8CF5D8' },
  mark: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 150, height: 150, tintColor: '#FFFFFF' },
  logoGold: { position: 'absolute', right: 0, bottom: 8, width: 62, height: 62 },
  credit: { position: 'absolute', bottom: 78, flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  creditText: { color: '#FFFFFF', fontSize: 15, letterSpacing: 2.6, fontWeight: '800' },
  caret: { width: 2.5, height: 16, marginLeft: 4, backgroundColor: '#8CF5D8' },
});

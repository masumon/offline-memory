import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAppPreferences } from '../app/AppPreferences';

// ── Why it is built this way ──────────────────────────────────────────────────
// The app runs the New Architecture (Fabric). On Fabric, react-native-svg drops an
// animated `transform` delivered to a <G> through Reanimated — so ONLY these animate:
//   • <Animated.View> styles (RN core), used here for the character's gross motion
//     (walk in, roam the card, peek out, walk off) and the "hi" bubble;
//   • animated props on LEAF svg shapes (Path/Rect/Circle/Ellipse) — each moving prop
//     (room, desk, chair, laptop, lid, mug, steam, code, spark, and every limb) is a
//     leaf drawn with its pivot at local (0,0) and moved with
//     transform:[{translateX},{translateY},{rotate},{scale}].
// A plain JS "director" async-loop plays a 3-phase scene: a cinematic set-up (room
// rolls in, she walks on and carries in the desk, chair, coffee and laptop, opens the
// lid and the AI glow spreads), a live human work phase (typing, sipping, stretching,
// yawning, waving hi, rolling around the card and peeking outside it — in a random
// order), then a graceful teardown (closes the lid, carries everything back off, the
// room rolls away and the card is clean) before it all repeats a little differently.
// No images, no extra native runtime — it barely adds to the app size.
// "Reduce motion" freezes her calmly at the desk with the lid open.

const APath = Animated.createAnimatedComponent(Path);
const ARect = Animated.createAnimatedComponent(Rect);
const ACircle = Animated.createAnimatedComponent(Circle);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const ALine = Animated.createAnimatedComponent(Line);

const SKIN = '#F0BD93';
const SKIN_DK = '#DDA271';
const HAIR = '#2A211C';
const HOODIE = '#FF7A4D';       // bright coral — pops against the green card
const HOODIE_DK = '#E85C33';
const HOODIE_HOOD = '#FFB27A';
const JOGGER = '#38449A';       // indigo
const JOGGER_DK = '#2C3680';
const SHOE = '#FFFFFF';
const SHOE_ACCENT = '#FFC43D';  // yellow sole
const DESK = '#E7DBC4';
const DESK_DK = '#CBBB98';
const CHAIR = '#5B6470';
const CHAIR_DK = '#464E58';
const LAPTOP = '#D7DCE0';
const LAPTOP_DK = '#AAB1B8';
const SCREEN = '#0A1D2C';
const GLOW = '#49E0FF';         // blue-cyan AI glow
const CODE = '#8CF5D8';
const MUG = '#FFFFFF';
const MUG_BAND = '#FF7A4D';

// rest positions of each prop (viewBox x) — the whole scene is shifted left via the
// viewBox so her head sits clear of the reminder bell
const DESK_HOME = 168;
const CHAIR_HOME = 214;
const LAP_HOME = 176;
const MUG_HOME = 150;
const OFF = 460;               // fully off the right edge

export function HeroMascot() {
  const { reduceMotion, language } = useAppPreferences();
  const bn = language === 'bn';

  // gross character motion (View transform)
  const cx = useSharedValue(OFF);
  const cy = useSharedValue(0);
  const cflip = useSharedValue(1);

  // props (leaf transforms, viewBox units)
  const deskX = useSharedValue(OFF);
  const chairX = useSharedValue(OFF);
  const lapX = useSharedValue(OFF);
  const mugX = useSharedValue(OFF);
  const lid = useSharedValue(0);          // 0 closed, 1 open
  const screenOn = useSharedValue(0);

  // character articulation
  const armF = useSharedValue(6);
  const armB = useSharedValue(-6);
  const legF = useSharedValue(0);
  const legB = useSharedValue(0);
  const bob = useSharedValue(0);
  const headT = useSharedValue(0);
  const hair = useSharedValue(0);
  const torso = useSharedValue(4);
  const sit = useSharedValue(0);
  const hi = useSharedValue(0);

  // ambient
  const blink = useSharedValue(1);
  const glow = useSharedValue(0.5);
  const spark = useSharedValue(0);
  const steam = useSharedValue(0);
  const type = useSharedValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reduceMotion) {
      // Frozen calmly seated at the desk (right-hand quadrant), lid open — matches the
      // animated rest pose so she never overlaps the headline on the left.
      cx.value = CHAIR_HOME + 4; cy.value = 4; cflip.value = 1;
      deskX.value = DESK_HOME; chairX.value = CHAIR_HOME; lapX.value = LAP_HOME; mugX.value = MUG_HOME;
      lid.value = 1; screenOn.value = 1; sit.value = 1;
      armF.value = 40; armB.value = 8; legF.value = 0; legB.value = 0; bob.value = 0;
      headT.value = 0; hair.value = 0; torso.value = 10; hi.value = 0;
      blink.value = 1; glow.value = 0.6; spark.value = 0; steam.value = 0; type.value = 0;
      return;
    }

    blink.value = withRepeat(withSequence(withTiming(1, { duration: 2600 }), withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 70 })), -1, false);
    glow.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    spark.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
    steam.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.linear }), -1, false);
    type.value = withRepeat(withSequence(withTiming(1, { duration: 95 }), withTiming(0, { duration: 140 })), -1, false);

    let alive = true;
    const clk = timers.current;
    const wait = (ms: number) => new Promise<void>((res) => { const id = setTimeout(res, ms); clk.push(id); });
    const E = Easing.inOut(Easing.quad);
    const T = (sv: typeof cx, v: number, ms: number, e: typeof E = E) => { sv.value = withTiming(v, { duration: ms, easing: e }); };
    const SEQ = (sv: typeof cx, steps: [number, number, (typeof E)?][]) => { sv.value = withSequence(...steps.map(([v, ms, e]) => withTiming(v, { duration: ms, easing: e ?? E }))); };
    const rnd = (n: number) => Math.random() * n;

    // gait: legs alternate + a vertical bob while cx is travelling
    const startGait = () => {
      legF.value = withRepeat(withSequence(withTiming(24, { duration: 220 }), withTiming(-24, { duration: 220 })), -1, true);
      legB.value = withRepeat(withSequence(withTiming(-24, { duration: 220 }), withTiming(24, { duration: 220 })), -1, true);
      armF.value = withRepeat(withSequence(withTiming(-18, { duration: 220 }), withTiming(18, { duration: 220 })), -1, true);
      armB.value = withRepeat(withSequence(withTiming(18, { duration: 220 }), withTiming(-18, { duration: 220 })), -1, true);
      bob.value = withRepeat(withSequence(withTiming(2, { duration: 220 }), withTiming(0, { duration: 220 })), -1, true);
      hair.value = withRepeat(withSequence(withTiming(6, { duration: 240 }), withTiming(-4, { duration: 240 })), -1, true);
    };
    const stopGait = () => {
      legF.value = withTiming(0, { duration: 200 }); legB.value = withTiming(0, { duration: 200 });
      armF.value = withTiming(6, { duration: 220 }); armB.value = withTiming(-6, { duration: 220 });
      bob.value = withTiming(0, { duration: 200 }); hair.value = withTiming(0, { duration: 400 });
    };
    const walkTo = async (x: number, ms: number) => { cflip.value = x < cx.value ? 1 : -1; startGait(); T(cx, x, ms, Easing.inOut(Easing.sin)); await wait(ms); stopGait(); await wait(160); };

    const neutral = () => { T(armF, sit.value > 0.5 ? 40 : 6, 280); T(armB, sit.value > 0.5 ? 8 : -6, 280); T(torso, sit.value > 0.5 ? 10 : 4, 280); T(headT, 0, 280); };

    // ── PHASE 1 ── cinematic set-up
    const roomIn = async () => { await wait(300); };
    const carryIn = async (prop: typeof deskX, home: number) => {
      await walkTo(OFF, 850);                      // walk right off the card to fetch it
      prop.value = OFF;
      startGait();
      T(cx, home + 24, 1150, Easing.inOut(Easing.sin));
      SEQ(prop, [[home + 26, 1150], [home - 4, 220, Easing.out(Easing.quad)], [home + 3, 160], [home, 140]]); // carry in, set down, settle bounce
      await wait(1170); stopGait();
      // nudge it square with a hand
      T(armF, -34, 220); await wait(260); T(armF, 6, 220); await wait(220);
    };
    const openLid = async () => {
      cflip.value = -1;
      T(armF, -46, 320); await wait(340);
      SEQ(lid, [[1, 520, Easing.out(Easing.back(1.4))]]);
      screenOn.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
      T(armF, 40, 360); await wait(560);
    };

    // ── PHASE 2 ── live work (random order)
    const sitDown = async () => { T(sit, 1, 380); T(cy, 4, 380); T(torso, 10, 380); T(armF, 40, 380); T(armB, 8, 380); await wait(520); };
    const workBeat = async (ms: number) => {
      const end = Date.now() + ms;
      while (alive && Date.now() < end) {
        SEQ(armF, [[36, 90], [44, 90], [38, 90], [44, 90], [40, 120]]);   // fingers on keys
        SEQ(headT, [[-4, 500], [4, 500], [0, 300]]);                       // eyes tracking code
        SEQ(cy, [[3, 600], [5, 600]]);
        await wait(1300 + rnd(1100));
      }
    };
    const sip = async () => { SEQ(mugX, [[MUG_HOME + 30, 420], [MUG_HOME + 30, 700], [MUG_HOME, 420]]); SEQ(armB, [[-70, 420], [-70, 700], [8, 420]]); SEQ(armF, [[-40, 420], [-40, 700], [40, 420]]); SEQ(headT, [[6, 420], [6, 700], [0, 420]]); await wait(1700); };
    const stretch = async () => { SEQ(armF, [[-150, 560], [-150, 700], [40, 560]]); SEQ(armB, [[-150, 560], [-150, 700], [8, 560]]); SEQ(torso, [[-14, 560], [-14, 700], [10, 560]]); SEQ(cy, [[-2, 560], [-2, 700], [4, 560]]); await wait(2000); };
    const yawn = async () => { SEQ(armB, [[-96, 400], [-96, 620], [8, 460]]); SEQ(torso, [[-8, 400], [-8, 620], [10, 460]]); blink.value = withSequence(withTiming(0.1, { duration: 320 }), withTiming(1, { duration: 240 }), withRepeat(withSequence(withTiming(1, { duration: 2600 }), withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 70 })), -1, false)); await wait(1700); };
    const waveHi = async () => {
      SEQ(headT, [[10, 260], [10, 1700], [0, 260]]);                       // turn to the viewer
      hi.value = withSequence(withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.7)) }), withTiming(1, { duration: 1500 }), withTiming(0, { duration: 220 }));
      SEQ(armF, [[-140, 240], [-112, 190], [-140, 190], [-112, 190], [-140, 190], [40, 300]]);
      await wait(2200);
    };
    const roamCard = async () => {
      // Keep her inside the right-hand quadrant — never drift left into the headline text.
      const to = CHAIR_HOME + (Math.random() < 0.5 ? -28 : 40);
      SEQ(headT, [[to < 0 ? -8 : 8, 300], [to < 0 ? -8 : 8, 1400], [0, 300]]);
      SEQ(cx, [[to, 900, Easing.inOut(Easing.cubic)], [to, 900], [CHAIR_HOME + 4, 900, Easing.inOut(Easing.cubic)]]);
      await wait(2900);
    };
    const peekOut = async () => {
      // Lean toward the viewer without leaving the right-hand quadrant.
      SEQ(cx, [[188, 850, Easing.inOut(Easing.cubic)], [188, 500], [198, 260], [188, 260], [CHAIR_HOME + 4, 900, Easing.inOut(Easing.cubic)]]);
      SEQ(headT, [[12, 400], [12, 1200], [0, 400]]);
      await wait(3000);
    };

    // ── PHASE 3 ── graceful exit
    const closeLid = async () => {
      cflip.value = -1; T(armF, -46, 320); await wait(340);
      screenOn.value = withTiming(0, { duration: 500 });
      SEQ(lid, [[0, 460, Easing.in(Easing.quad)]]);
      T(armF, 40, 320); await wait(520);
    };
    const standUp = async () => { T(sit, 0, 380); T(cy, 0, 380); T(torso, 4, 380); T(armF, 6, 380); T(armB, -6, 380); await wait(500); };
    const carryOut = async (prop: typeof deskX, from: number, returnAfter = true) => {
      T(armF, -30, 240); await wait(280);                 // pick it up
      startGait();
      T(cx, OFF, 1150, Easing.inOut(Easing.sin));
      SEQ(prop, [[from + 20, 250], [OFF, 1050]]);
      await wait(1200); stopGait();
      if (returnAfter) await walkTo(CHAIR_HOME, 950);     // come back for the next thing
    };
    const roomOut = async () => { await wait(300); };

    (async () => {
      while (alive) {
        // reset
        cx.value = OFF; cy.value = 0; cflip.value = 1; sit.value = 0; hi.value = 0;
        deskX.value = OFF; chairX.value = OFF; lapX.value = OFF; mugX.value = OFF;
        lid.value = 0; screenOn.value = 0;
        armF.value = 6; armB.value = -6; legF.value = 0; legB.value = 0; bob.value = 0; headT.value = 0; torso.value = 4;

        // PHASE 1
        await roomIn(); if (!alive) break;
        await walkTo(CHAIR_HOME + 10, 1200); if (!alive) break;
        await carryIn(deskX, DESK_HOME); if (!alive) break;   // 1. table
        await carryIn(chairX, CHAIR_HOME); if (!alive) break; // 2. chair
        await carryIn(lapX, LAP_HOME); if (!alive) break;     // 3. laptop
        await carryIn(mugX, MUG_HOME); if (!alive) break;     // 4. coffee mug
        await walkTo(CHAIR_HOME + 4, 700); if (!alive) break;
        await openLid(); if (!alive) break;

        // PHASE 2
        await sitDown(); if (!alive) break;
        await workBeat(3200 + rnd(3000)); if (!alive) break;
        const beats = [sip, stretch, yawn, waveHi, roamCard, peekOut,
          async () => { await workBeat(2600 + rnd(2600)); }];
        const n = 4 + Math.floor(rnd(4));
        for (let i = 0; i < n && alive; i++) {
          neutral();
          await wait(200 + rnd(500));
          await (beats[Math.floor(rnd(beats.length))] ?? beats[0]!)();
          if (!alive) break;
          await workBeat(1400 + rnd(1800));
        }
        if (!alive) break;

        // PHASE 3
        await closeLid(); if (!alive) break;
        await standUp(); if (!alive) break;
        await carryOut(mugX, MUG_HOME); if (!alive) break;    // mug + laptop first
        await carryOut(lapX, LAP_HOME); if (!alive) break;
        await carryOut(chairX, CHAIR_HOME); if (!alive) break; // then the chair
        await carryOut(deskX, DESK_HOME, false); if (!alive) break; // finally the desk, and stay off
        await roomOut(); if (!alive) break;
        await wait(2400 + rnd(6000));
      }
    })();

    return () => { alive = false; clk.forEach(clearTimeout); clk.length = 0; };
  }, [reduceMotion, cx, cy, cflip, deskX, chairX, lapX, mugX, lid, screenOn, armF, armB, legF, legB, bob, headT, hair, torso, sit, hi, blink, glow, spark, steam, type]);

  // ── bindings ──
  const hiStyle = useAnimatedStyle(() => ({ opacity: hi.value, transform: [{ scale: 0.7 + hi.value * 0.3 }, { translateY: (1 - hi.value) * 6 }] }));

  // room (3 leaves share roomX)
  // props
  const deskP = useAnimatedProps(() => ({ transform: [{ translateX: deskX.value - DESK_HOME }] } as never));
  const chairP = useAnimatedProps(() => ({ transform: [{ translateX: chairX.value - CHAIR_HOME }] } as never));
  const lapBaseP = useAnimatedProps(() => ({ transform: [{ translateX: lapX.value - LAP_HOME }] } as never));
  // lid drawn upright at the hinge (x≈184..211, y 30..64); closed = folded flat onto
  // the keyboard (≈88°), open = upright (0°). Rides the laptop via the lapX offset.
  const lidP = useAnimatedProps(() => ({ transform: [
    { translateX: lapX.value - LAP_HOME },
    { translateX: 184 }, { translateY: 64 }, { rotate: `${(1 - lid.value) * 88}deg` }, { translateX: -184 }, { translateY: -64 },
  ] } as never));
  const screenP = useAnimatedProps(() => ({ opacity: screenOn.value, transform: [{ translateX: lapX.value - LAP_HOME }] } as never));
  const glowP = useAnimatedProps(() => ({ opacity: screenOn.value * (0.12 + glow.value * 0.26), transform: [{ translateX: lapX.value - LAP_HOME }] } as never));
  const sparkP = useAnimatedProps(() => ({ opacity: screenOn.value, transform: [{ translateX: lapX.value - LAP_HOME + 196 }, { translateY: 12 }, { rotate: `${spark.value * 360}deg` }, { scale: (0.82 + Math.sin(spark.value * Math.PI * 2) * 0.18) * (0.4 + screenOn.value * 0.6) }] } as never));
  const keyP = useAnimatedProps(() => ({ opacity: screenOn.value * (type.value > 0.5 ? 0.9 : 0.25), transform: [{ translateX: lapX.value - LAP_HOME }] } as never));
  const mugP = useAnimatedProps(() => ({ transform: [{ translateX: mugX.value - MUG_HOME }] } as never));
  const steamA = useAnimatedProps(() => { const t = steam.value; return { opacity: 0.5 * (1 - t) * (mugX.value < OFF - 20 ? 1 : 0), transform: [{ translateX: mugX.value - MUG_HOME + 5 + Math.sin(t * 6) * 2 }, { translateY: -14 * t }, { scale: 0.6 + t * 0.7 }] } as never; });
  const steamB = useAnimatedProps(() => { const t = (steam.value + 0.5) % 1; return { opacity: 0.36 * (1 - t) * (mugX.value < OFF - 20 ? 1 : 0), transform: [{ translateX: mugX.value - MUG_HOME + 8 + Math.sin(t * 6 + 2) * 2 }, { translateY: -16 * t }, { scale: 0.55 + t * 0.7 }] } as never; });

  // character parts — a shared base point (feet-centre) that walks/roams via cx/cy,
  // then each part's own local offset + articulation angle. All leaf transforms.
  // seated: knees swing forward (toward the desk, -x since she faces left) and the
  // lower leg tucks (scaleY) so she reads as sitting rather than standing behind the desk
  const legBP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value + 1 - sit.value * 6 }, { translateY: cy.value + 82 - bob.value - sit.value * 4 }, { rotate: `${legB.value - sit.value * 26}deg` }, { scaleY: 1 - sit.value * 0.24 }] } as never));
  const legFP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 1 - sit.value * 8 }, { translateY: cy.value + 82 - bob.value - sit.value * 4 }, { rotate: `${legF.value - sit.value * 30}deg` }, { scaleY: 1 - sit.value * 0.24 }] } as never));
  const torsoP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value }, { translateY: cy.value + 52 - bob.value }, { rotate: `${torso.value * 0.35}deg` }, { scaleY: 1 - sit.value * 0.14 }] } as never));
  const armBP2 = useAnimatedProps(() => ({ transform: [{ translateX: cx.value + 6 }, { translateY: cy.value + 52 - bob.value }, { rotate: `${armB.value}deg` }] } as never));
  const armFP2 = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 6 }, { translateY: cy.value + 52 - bob.value }, { rotate: `${armF.value}deg` }] } as never));
  // head, hair, face all pinned to the same point at the top of the torso
  const HEAD_Y = 32;
  const headGP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 3 }, { translateY: cy.value + HEAD_Y - bob.value - sit.value * 4 }, { rotate: `${headT.value}deg` }] } as never));
  const hairP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 3 }, { translateY: cy.value + HEAD_Y - bob.value - sit.value * 4 }, { rotate: `${headT.value + hair.value}deg` }] } as never));
  const lidEyeP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 3 }, { translateY: cy.value + HEAD_Y - bob.value - sit.value * 4 }, { rotate: `${headT.value}deg` }, { scaleY: blink.value }] } as never));
  const neckP = useAnimatedProps(() => ({ transform: [{ translateX: cx.value - 3 }, { translateY: cy.value + HEAD_Y + 8 - bob.value - sit.value * 4 }] } as never));

  return (
    <View style={styles.wrap} pointerEvents="none">
      {/* viewBox shifted right (minX 64→-4) so the resting desk scene sits in the
          hero's bottom-right quadrant — her head lands near 70–75% of the width,
          feet at the bottom edge — leaving the left half clear for the headline. */}
      <Svg width="100%" height="100%" viewBox="-4 0 300 176" preserveAspectRatio="xMidYMax meet">
        <Ellipse cx="196" cy="123" rx="112" ry="7" fill="#000" opacity={0.09} />

        {/* desk */}
        <ARect animatedProps={deskP} x="150" y="66" width="150" height="9" rx="3" fill={DESK} />
        <ARect animatedProps={deskP} x="150" y="73" width="150" height="3" fill={DESK_DK} />
        <ARect animatedProps={deskP} x="158" y="75" width="7" height="44" rx="2" fill={DESK_DK} />
        <ARect animatedProps={deskP} x="286" y="75" width="7" height="44" rx="2" fill={DESK_DK} />

        {/* office chair (behind the desk) */}
        <ACircle animatedProps={chairP} cx="207" cy="117" r="4.5" fill={CHAIR_DK} />
        <ACircle animatedProps={chairP} cx="229" cy="117" r="4.5" fill={CHAIR_DK} />
        <ACircle animatedProps={chairP} cx="218" cy="119" r="4.5" fill={CHAIR_DK} />
        <ARect animatedProps={chairP} x="215" y="88" width="6" height="28" fill={CHAIR_DK} />
        <ARect animatedProps={chairP} x="200" y="80" width="36" height="10" rx="4" fill={CHAIR} />
        <ARect animatedProps={chairP} x="232" y="42" width="9" height="40" rx="4" fill={CHAIR} />

        {/* steaming coffee mug — sits on the desk near the laptop */}
        <AEllipse animatedProps={steamA} cx="182" cy="46" rx="2.6" ry="3.2" fill="#FFF" />
        <AEllipse animatedProps={steamB} cx="185" cy="46" rx="2.3" ry="2.9" fill="#FFF" />
        <ARect animatedProps={mugP} x="176" y="52" width="13" height="14" rx="2.6" fill={MUG} />
        <ARect animatedProps={mugP} x="176" y="55.5" width="13" height="3" fill={MUG_BAND} />
        <APath animatedProps={mugP} d="M189 55 q6 0 6 4.5 t-6 4.5" stroke={MUG_BAND} strokeWidth="2.4" fill="none" />
        <AEllipse animatedProps={mugP} cx="182.5" cy="52.4" rx="6" ry="1.8" fill="#6F4A38" />

        {/* laptop base + AI screen (screen leaves gated by screenOn) */}
        <AEllipse animatedProps={glowP} cx="196" cy="50" rx="30" ry="12" fill={GLOW} />
        <APath animatedProps={lapBaseP} d="M176 64 L214 64 L221 75 L169 75 Z" fill={LAPTOP} />
        <APath animatedProps={lapBaseP} d="M176 64 L214 64 L215 66 L175 66 Z" fill={LAPTOP_DK} />
        <ARect animatedProps={keyP} x="184" y="67" width="18" height="3" rx="1" fill={LAPTOP_DK} />
        {/* lid — drawn upright at the hinge, folds flat when closed */}
        <ARect animatedProps={lidP} x="184" y="31" width="27" height="33" rx="2" fill={LAPTOP_DK} />
        <ARect animatedProps={screenP} x="180.5" y="30.5" width="27" height="31" rx="2" fill={SCREEN} />
        <ALine animatedProps={screenP} x1="184" y1="38" x2="204" y2="38" stroke={CODE} strokeWidth="2" strokeLinecap="round" />
        <ALine animatedProps={screenP} x1="184" y1="44" x2="197" y2="44" stroke={CODE} strokeWidth="2" strokeLinecap="round" opacity={0.7} />
        <ALine animatedProps={screenP} x1="184" y1="50" x2="201" y2="50" stroke={CODE} strokeWidth="2" strokeLinecap="round" opacity={0.5} />
        <ALine animatedProps={screenP} x1="184" y1="56" x2="192" y2="56" stroke={CODE} strokeWidth="2" strokeLinecap="round" opacity={0.35} />
        <APath animatedProps={sparkP} d="M0 -7 C1.3 -2.2 2.2 -1.3 7 0 C2.2 1.3 1.3 2.2 0 7 C-1.3 2.2 -2.2 1.3 -7 0 C-2.2 -1.3 -1.3 -2.2 0 -7 Z" fill={GLOW} />

        {/* ── the teenager ── origin at feet-centre, drawn facing left */}
        <APath animatedProps={legBP} d="M-4 0 Q0 -2 4 0 L3 28 Q6 31 4 33 L-4 33 Q-6 31 -4 28 Z" fill={JOGGER_DK} />
        <APath animatedProps={legBP} d="M-7 30 L7 30 L7 36 Q7 38 5 38 L-7 38 Z" fill="#E4E4E4" />
        <APath animatedProps={legFP} d="M-4 0 Q0 -2 4 0 L3 29 Q6 32 4 34 L-5 34 Q-7 32 -4 29 Z" fill={JOGGER} />
        <APath animatedProps={legFP} d="M-8 31 L7 31 L7 37 Q7 39 5 39 L-8 39 Z" fill={SHOE} />
        <APath animatedProps={legFP} d="M-8 37 L7 37 L7 39.5 L-8 39.5 Z" fill={SHOE_ACCENT} />

        <APath animatedProps={armBP2} d="M-4 -2 Q0 -4 4 -2 L3 20 Q6 24 4 28 L-3 28 Q-6 24 -3 20 Z" fill={HOODIE_DK} />
        <ACircle animatedProps={armBP2} cx="0" cy="27" r="4" fill={SKIN_DK} />

        <APath animatedProps={torsoP} d="M-14 -2 Q0 -8 14 -2 L16 30 Q0 36 -16 30 Z" fill={HOODIE} />
        <APath animatedProps={torsoP} d="M-14 -2 Q-8 -5 -2 -5 L-3 32 Q-10 33 -14 30 Z" fill={HOODIE_DK} opacity={0.35} />
        <APath animatedProps={torsoP} d="M-8 -5 Q0 3 8 -5 L6 1 Q0 6 -6 1 Z" fill={HOODIE_HOOD} />
        <APath animatedProps={torsoP} d="M-1 -3 L-1.5 12 M1 -3 L1.5 12" stroke={HOODIE_HOOD} strokeWidth="1.6" strokeLinecap="round" />
        <APath animatedProps={torsoP} d="M-10 14 Q0 19 10 14 L8 24 Q0 27 -8 24 Z" fill={HOODIE_DK} opacity={0.45} />

        <APath animatedProps={armFP2} d="M-4 -2 Q0 -4 4 -2 L3 21 Q6 25 4 30 L-4 30 Q-7 25 -4 21 Z" fill={HOODIE} />
        <ACircle animatedProps={armFP2} cx="0" cy="29" r="4.2" fill={SKIN} />

        <ARect animatedProps={neckP} x="-3.5" y="0" width="7" height="11" rx="2" fill={SKIN_DK} />
        <ACircle animatedProps={headGP} cx="0" cy="0" r="11" fill={SKIN} />
        <ACircle animatedProps={headGP} cx="-9.5" cy="1" r="2.4" fill={SKIN_DK} />
        <APath animatedProps={hairP} d="M-10.5 -1 Q-13 -16 0 -18 Q13 -17 11.5 -2 Q10 -9 3 -11 Q6 -5 4 0 Q-1 -8 -7 -7 Q-10 -3 -10 3 Q-12 1 -10.5 -1 Z" fill={HAIR} />
        <APath animatedProps={hairP} d="M-7 -11 Q-2 -15 4 -13 M5 -14 Q10 -12 11 -6" stroke={HAIR} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <AEllipse animatedProps={lidEyeP} cx="-3.6" cy="-0.5" rx="1.4" ry="1.9" fill={HAIR} />
        <AEllipse animatedProps={lidEyeP} cx="3.4" cy="-0.5" rx="1.4" ry="1.9" fill={HAIR} />
        <APath animatedProps={headGP} d="M-4.6 -3.6 Q-3.6 -4.4 -2.4 -3.8 M2.4 -3.8 Q3.6 -4.4 4.6 -3.6" stroke={HAIR} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <APath animatedProps={headGP} d="M-2 4.5 Q0 6 2 4.5" stroke={SKIN_DK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <ACircle animatedProps={headGP} cx="-6.6" cy="2.5" r="1.7" fill="#F2A9A0" opacity={0.5} />
        <ACircle animatedProps={headGP} cx="6.6" cy="2.5" r="1.7" fill="#F2A9A0" opacity={0.5} />
      </Svg>

      <Animated.View style={[styles.hiBubble, hiStyle]}>
        <Text style={styles.hiText}>{bn ? 'হাই!  👋' : 'hi!  👋'}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // fills the hero card exactly; the card clips anything that walks past its edge
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 },
  hiBubble: { position: 'absolute', right: 96, top: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderBottomRightRadius: 3, zIndex: 3, elevation: 3 },
  hiText: { color: '#12916A', fontWeight: '900', fontSize: 12 },
});

// ── Offline Memory · design system v5 · "Sapphire & Gold" ───────────────────────────────
// Direction: premium, calm, Bengali-first. A deep royal-sapphire brand with an antique
// gold secondary accent, set on cool paper in light and deep navy-black in dark.
// Hairline structure; one soft shadow for floating surfaces; glass only on floating
// chrome. `success` is its own green (done ≠ brand). Type: Hind Siliguri + Inter.
// This file is the single source of truth — there is no second palette anywhere.

// Font family names as registered in app/_layout.tsx (weight-named — do not rely on fontWeight
// with custom families on Android; pick the family that carries the weight you want).
export const fonts={regular:'HindSiliguri_400Regular',medium:'HindSiliguri_500Medium',semibold:'HindSiliguri_600SemiBold',bold:'HindSiliguri_700Bold',numRegular:'Inter_400Regular',numMedium:'Inter_500Medium',numSemibold:'Inter_600SemiBold',numBold:'Inter_700Bold'} as const;

// textMuted meets WCAG AA (>=4.5:1) for body text on `surface`/`background` while
// staying visibly lighter than textSecondary so the hierarchy survives.
// `surface` is a whisper-tinted off-white — never a stark #FFF against the cool paper.
export const lightColors={background:'#F1F4FA',surface:'#FBFCFF',surfaceMuted:'#E7ECF6',surfaceSunken:'#DCE3F1',primary:'#2456C9',primaryPressed:'#1B429E',primaryTint:'#E1E9FB',onPrimary:'#FFFFFF',accent:'#B4832E',textPrimary:'#131720',textSecondary:'#464E60',textMuted:'#68707F',border:'#DBE1EF',borderStrong:'#C5CDE0',success:'#1E874A',warning:'#96690F',danger:'#C13B2E',info:'#2A79BE',overlay:'rgba(16, 20, 30, 0.46)'} as const;
export const darkColors={background:'#0A0E18',surface:'#161C2B',surfaceMuted:'#1F2637',surfaceSunken:'#10131E',primary:'#7AA2FF',primaryPressed:'#6389E6',primaryTint:'#172138',onPrimary:'#07122A',accent:'#D9B663',textPrimary:'#EFF2FA',textSecondary:'#B2BBCD',textMuted:'#8A93A7',border:'#2C3446',borderStrong:'#3F4A5F',success:'#46CE86',warning:'#E1A94E',danger:'#F0736A',info:'#5FB2E6',overlay:'rgba(0, 0, 0, 0.66)'} as const;
export type ThemeColors=typeof lightColors|typeof darkColors;
export function getThemeColors(mode:'light'|'dark'):ThemeColors{return mode==='dark'?darkColors:lightColors;}
export const colors=lightColors;

export const spacing={xxs:4,xs:4,sm:8,smd:12,md:16,lg:24,xl:32,xxl:48,mdPlus:20,lgPlus:40} as const;
export const layout={compactHorizontal:16,regularHorizontal:24,contentMaxWidth:760,expandedNavWidth:104,compactNavHeight:76,minTouchTarget:48,iconButtonSize:48,snackbarMaxWidth:680,dialogMaxWidth:520,feedbackZIndex:1000} as const;
export const breakpoints={compactWindow:600,mediumWindow:840,expandedNavigation:840,wideContent:900,largeWindow:1200} as const;
export type WindowSizeClass='compact'|'medium'|'expanded';
export function getWindowSizeClass(width:number):WindowSizeClass{return width<breakpoints.compactWindow?'compact':width<breakpoints.mediumWindow?'medium':'expanded';}

// Type scale — every token carries its own fontFamily so text never falls back to the
// system font. Screens may still add fontWeight; on Android the family wins, which is
// intentional (kills the "everything is 900" heaviness of the old build).
export const typography={
  label:{fontSize:12,lineHeight:16,letterSpacing:0.3,fontFamily:fonts.semibold},
  caption:{fontSize:12,lineHeight:17,fontFamily:fonts.medium},
  section:{fontSize:11,lineHeight:15,letterSpacing:0.4,fontFamily:fonts.semibold},
  meta:{fontSize:13,lineHeight:18,fontFamily:fonts.medium},
  input:{fontSize:15,lineHeight:22,fontFamily:fonts.regular},
  bodySmall:{fontSize:14,lineHeight:21,fontFamily:fonts.regular},
  body:{fontSize:15,lineHeight:23,fontFamily:fonts.regular},
  callout:{fontSize:14,lineHeight:20,fontFamily:fonts.medium},
  cardTitle:{fontSize:17,lineHeight:23,fontFamily:fonts.semibold},
  heading:{fontSize:20,lineHeight:26,fontFamily:fonts.semibold},
  dialogTitle:{fontSize:19,lineHeight:25,fontFamily:fonts.semibold},
  title:{fontSize:24,lineHeight:30,letterSpacing:-0.2,fontFamily:fonts.bold},
  titleLarge:{fontSize:27,lineHeight:34,letterSpacing:-0.3,fontFamily:fonts.bold},
  display:{fontSize:30,lineHeight:37,letterSpacing:-0.4,fontFamily:fonts.bold},
  numeric:{fontSize:15,lineHeight:20,fontFamily:fonts.numSemibold},
} as const;

export const radius={xs:6,sm:10,md:14,lg:18,xl:24,xxl:30,pill:999} as const;
export const control={inputHeight:52,buttonHeight:48,rowMinHeight:64,iconSize:22,iconButtonSize:48,smallIconContainer:40,listIconContainer:44,searchHeight:54,textareaMinHeight:200,titleIconSize:48,previewCloseSize:48} as const;
export const icon={xs:16,sm:18,md:22,lg:28,xl:36} as const;
export const opacity={disabled:0.45,pressed:0.92,muted:0.64,overlay:0.36} as const;
export const border={thin:1,medium:2} as const;
export const motion={fast:120,standard:200,slow:300} as const;

// Elevation — hairline borders do the structural work; shadows stay subtle and are only
// meaningful on genuinely floating surfaces (dialog, snackbar, quick-capture, primary CTA).
export const elevation={
  soft:{shadowColor:'#131A2E',shadowOpacity:0.06,shadowRadius:10,shadowOffset:{width:0,height:2},elevation:1},
  card:{shadowColor:'#131A2E',shadowOpacity:0.09,shadowRadius:14,shadowOffset:{width:0,height:4},elevation:2},
  raised:{shadowColor:'#131A2E',shadowOpacity:0.12,shadowRadius:20,shadowOffset:{width:0,height:8},elevation:4},
  floating:{shadowColor:'#0B1220',shadowOpacity:0.13,shadowRadius:26,shadowOffset:{width:0,height:14},elevation:10},
} as const;

// ── Accent families ────────────────────────────────────────────────────────────────────
// Retuned to low-chroma, sophisticated hues (no candy). Same shape in both modes so
// `ThemeAccents` can be indexed safely. base → emphasis · soft → container tint ·
// on → readable text/icon on `soft` · border → gentle container border.
export const lightAccents={
  green:{base:'#1E874A',soft:'#DFF1E7',on:'#0F5E31',border:'#C4E4D1'},
  blue:{base:'#2A79BE',soft:'#E1EEF9',on:'#1C5992',border:'#C9E0F1'},
  orange:{base:'#B5691E',soft:'#F5E9DC',on:'#824A12',border:'#E8D7C1'},
  yellow:{base:'#B4832E',soft:'#F3ECDA',on:'#7C5A1E',border:'#E6DBBC'},
  red:{base:'#C13B2E',soft:'#F8E6E3',on:'#8E2A20',border:'#EDCFCB'},
  purple:{base:'#6455A6',soft:'#EBE9F5',on:'#463B79',border:'#D7D1EA'},
} as const;
export const darkAccents={
  green:{base:'#46CE86',soft:'#102A1E',on:'#BFEAD2',border:'#264C39'},
  blue:{base:'#5FB2E6',soft:'#0F2436',on:'#C6E2F6',border:'#264860'},
  orange:{base:'#E2A94E',soft:'#2C2416',on:'#F1D7A9',border:'#4C3F24'},
  yellow:{base:'#D9B663',soft:'#292317',on:'#EEE1B7',border:'#463F26'},
  red:{base:'#F0736A',soft:'#301C1A',on:'#F6C9C3',border:'#523330'},
  purple:{base:'#AB9AE2',soft:'#1E1B33',on:'#DCD3F3',border:'#3A2F5E'},
} as const;
export type AccentName=keyof typeof lightAccents;
export type AccentRole={base:string;soft:string;on:string;border:string};
export type ThemeAccents=typeof lightAccents|typeof darkAccents;
export function getThemeAccents(mode:'light'|'dark'):ThemeAccents{return mode==='dark'?darkAccents:lightAccents;}
export const accents=lightAccents;

// ── Glass surfaces ─────────────────────────────────────────────────────────────────────
// Used ONLY on floating chrome (nav bar, dialog, snackbar) via expo-blur, always over an
// opaque scrim so text contrast never depends on what scrolls underneath. Never on
// content, editors, lists, or long-form text.
// `navSolid` is a near-opaque tinted surface for the Android bottom nav — it must never
// vanish or read as stark white (translucent Views over scrolling content can do both
// on aggressive OEMs). `navScrim` stays for the iOS BlurView's light tint.
export type GlassTokens={ tint:'light'|'dark'; intensity:number; scrim:string; navScrim:string; navSolid:string; border:string; highlight:string };
// Lower scrim so the blur is actually visible; a 1px top highlight sells the "glass" edge.
// navScrim is lighter still — the bottom bar reads as genuinely translucent, with the
// bumped BlurView intensity keeping labels legible over scrolling content.
// The bottom nav is intentionally the most translucent surface — a low scrim with a
// stronger blur so it reads as real glass while its solid-colour labels stay legible.
export const lightGlass:GlassTokens={ tint:'light', intensity:24, scrim:'rgba(255,255,255,0.56)', navScrim:'rgba(246,248,253,0.44)', navSolid:'rgba(244,247,252,0.95)', border:'rgba(19,23,32,0.08)', highlight:'rgba(255,255,255,0.5)' };
export const darkGlass:GlassTokens={ tint:'dark', intensity:28, scrim:'rgba(18,22,33,0.46)', navScrim:'rgba(14,17,26,0.44)', navSolid:'rgba(15,19,29,0.95)', border:'rgba(255,255,255,0.08)', highlight:'rgba(255,255,255,0.1)' };
export function getGlassTokens(mode:'light'|'dark'):GlassTokens{return mode==='dark'?darkGlass:lightGlass;}

// Gradient stop pairs (from→to) — plain colour arrays; stop [0] is a safe solid fallback.
// `heroBrand` is a soft, multi-hue blend (indigo → periwinkle → dusk-teal → warm gold
// edge) — deliberately hazy, never a flat blue. White text stays AA-legible on every stop.
export const gradients={brand:['#2456C9','#3F79EE'],heroBrand:['#2E4EA8','#4B54B4','#3E77AE','#6E6AB0'],hero:['#F3F5FB','#E7EDF9'],sky:['#E1EEF9','#EBE9F5'],warmth:['#F3ECDA','#F5E9DC'],surfaceLight:['#FFFFFF','#F1F4FB'],surfaceDark:['#141A29','#0C1019']} as const;
export type GradientName=keyof typeof gradients;

// Domain → colour mappings, centralized so screens stop re-implementing them.
export type PriorityToken='URGENT'|'HIGH'|'MEDIUM'|'LOW';
export type MemoryKindToken='NOTE'|'FACT'|'PREFERENCE'|'EVENT'|'REFLECTION';
export function priorityColor(colors:ThemeColors,priority:PriorityToken):string{return priority==='URGENT'?colors.danger:priority==='HIGH'?colors.warning:priority==='LOW'?colors.textMuted:colors.primary;}
export function priorityAccentName(priority:PriorityToken):AccentName{return priority==='URGENT'?'red':priority==='HIGH'?'orange':priority==='MEDIUM'?'blue':'green';}
export function memoryKindAccentName(kind:MemoryKindToken):AccentName{return kind==='FACT'?'blue':kind==='PREFERENCE'?'purple':kind==='EVENT'?'orange':kind==='REFLECTION'?'yellow':'green';}
// One refined icon per memory kind — used EVERYWHERE a memory is shown, so the crude
// generic "brain" glyph never appears. `MemoryLike` accepts a nullable kind for the
// places (assistant answer sources, unified search) that don't carry one.
export type MemoryKindIcon='note-text-outline'|'lightbulb-on-outline'|'heart-outline'|'calendar-star'|'thought-bubble-outline'|'bookmark-outline';
export function memoryKindIcon(kind:MemoryKindToken|null|undefined):MemoryKindIcon{
  switch(kind){
    case 'FACT':return 'lightbulb-on-outline';
    case 'PREFERENCE':return 'heart-outline';
    case 'EVENT':return 'calendar-star';
    case 'REFLECTION':return 'thought-bubble-outline';
    case 'NOTE':return 'note-text-outline';
    default:return 'bookmark-outline';
  }
}

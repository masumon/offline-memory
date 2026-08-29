// ── Offline Memory · design system v4 · "Emerald & Sand" ────────────────────────────────
// Direction: premium, warm, Bengali-first. A deep emerald brand with an antique-gold
// secondary accent (a restrained nod to Bangladesh's palette), set on warm sand paper in
// light and forest-black in dark. Hairline structure; one soft shadow for floating
// surfaces. Type: Hind Siliguri + Inter (numerals).

// Font family names as registered in app/_layout.tsx (weight-named — do not rely on fontWeight
// with custom families on Android; pick the family that carries the weight you want).
export const fonts={regular:'HindSiliguri_400Regular',medium:'HindSiliguri_500Medium',semibold:'HindSiliguri_600SemiBold',bold:'HindSiliguri_700Bold',numRegular:'Inter_400Regular',numMedium:'Inter_500Medium',numSemibold:'Inter_600SemiBold',numBold:'Inter_700Bold'} as const;

// textMuted meets WCAG AA (>=4.5:1) for body text on `surface`/`background` while
// staying visibly lighter than textSecondary so the hierarchy survives.
export const lightColors={background:'#F5F4EF',surface:'#FFFFFF',surfaceMuted:'#ECEBE3',surfaceSunken:'#E4E2D7',primary:'#0B7A55',primaryPressed:'#095F42',primaryTint:'#DEF0E6',onPrimary:'#FFFFFF',accent:'#B0812F',textPrimary:'#171C19',textSecondary:'#4A554D',textMuted:'#69726B',border:'#E1DED4',borderStrong:'#CECABD',success:'#0B7A55',warning:'#8A6212',danger:'#BB3B2E',info:'#2A66C4',overlay:'rgba(20, 26, 22, 0.46)'} as const;
export const darkColors={background:'#0A0D0B',surface:'#181F1B',surfaceMuted:'#212B25',surfaceSunken:'#101512',primary:'#43CE9A',primaryPressed:'#38B487',primaryTint:'#12291F',onPrimary:'#04140D',accent:'#D8B45E',textPrimary:'#F1F5F1',textSecondary:'#B3BDB6',textMuted:'#8D978F',border:'#313B35',borderStrong:'#44504A',success:'#43CE9A',warning:'#E2A94E',danger:'#F0736A',info:'#6FA5F2',overlay:'rgba(0, 0, 0, 0.66)'} as const;
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
  soft:{shadowColor:'#0B1220',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1},
  card:{shadowColor:'#0B1220',shadowOpacity:0.05,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:2},
  raised:{shadowColor:'#0B1220',shadowOpacity:0.08,shadowRadius:16,shadowOffset:{width:0,height:6},elevation:4},
  floating:{shadowColor:'#0B1220',shadowOpacity:0.13,shadowRadius:26,shadowOffset:{width:0,height:14},elevation:10},
} as const;

// ── Accent families ────────────────────────────────────────────────────────────────────
// Retuned to low-chroma, sophisticated hues (no candy). Same shape in both modes so
// `ThemeAccents` can be indexed safely. base → emphasis · soft → container tint ·
// on → readable text/icon on `soft` · border → gentle container border.
export const lightAccents={
  green:{base:'#0B7A55',soft:'#DEF0E6',on:'#0A4E38',border:'#C5E3D5'},
  blue:{base:'#2A66C4',soft:'#E5EDFA',on:'#1E4A94',border:'#CEDEF3'},
  orange:{base:'#B5691E',soft:'#F5E9DC',on:'#824A12',border:'#E8D7C1'},
  yellow:{base:'#B0812F',soft:'#F3EDDC',on:'#7A5A1E',border:'#E5DBBE'},
  red:{base:'#BB3B2E',soft:'#F7E6E3',on:'#8C2A20',border:'#ECD0CB'},
  purple:{base:'#6A57A8',soft:'#ECE9F5',on:'#493C7B',border:'#D9D2EB'},
} as const;
export const darkAccents={
  green:{base:'#43CE9A',soft:'#10271E',on:'#BEEAD7',border:'#264A3A'},
  blue:{base:'#6FA5F2',soft:'#11213A',on:'#CBDDF8',border:'#294263'},
  orange:{base:'#E2A94E',soft:'#2C2416',on:'#F1D7A9',border:'#4C3F24'},
  yellow:{base:'#D8B45E',soft:'#28241A',on:'#EEE0B4',border:'#453F27'},
  red:{base:'#F0736A',soft:'#301C1A',on:'#F6C9C3',border:'#523330'},
  purple:{base:'#A996E0',soft:'#1F1B33',on:'#DBD2F2',border:'#392F5C'},
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
export type GlassTokens={ tint:'light'|'dark'; intensity:number; scrim:string; navScrim:string; border:string; highlight:string };
// Lower scrim so the blur is actually visible; a 1px top highlight sells the "glass" edge.
// navScrim is lighter still — the bottom bar reads as genuinely translucent, with the
// bumped BlurView intensity keeping labels legible over scrolling content.
export const lightGlass:GlassTokens={ tint:'light', intensity:22, scrim:'rgba(255,255,255,0.56)', navScrim:'rgba(255,255,255,0.30)', border:'rgba(23,28,25,0.10)', highlight:'rgba(255,255,255,0.55)' };
export const darkGlass:GlassTokens={ tint:'dark', intensity:26, scrim:'rgba(16,20,17,0.46)', navScrim:'rgba(12,16,13,0.28)', border:'rgba(255,255,255,0.09)', highlight:'rgba(255,255,255,0.12)' };
export function getGlassTokens(mode:'light'|'dark'):GlassTokens{return mode==='dark'?darkGlass:lightGlass;}

// Gradient stop pairs (from→to) — plain colour arrays; stop [0] is a safe solid fallback.
export const gradients={brand:['#0B7A55','#0E9E6E'],hero:['#F5F4EF','#E9F1EC'],sky:['#E5EDFA','#ECE9F5'],warmth:['#F3EDDC','#F5E9DC'],surfaceLight:['#FFFFFF','#F3F2EC'],surfaceDark:['#141A17','#0C100E']} as const;
export type GradientName=keyof typeof gradients;

// Domain → colour mappings, centralized so screens stop re-implementing them.
export type PriorityToken='URGENT'|'HIGH'|'MEDIUM'|'LOW';
export type MemoryKindToken='NOTE'|'FACT'|'PREFERENCE'|'EVENT'|'REFLECTION';
export function priorityColor(colors:ThemeColors,priority:PriorityToken):string{return priority==='URGENT'?colors.danger:priority==='HIGH'?colors.warning:priority==='LOW'?colors.textMuted:colors.primary;}
export function priorityAccentName(priority:PriorityToken):AccentName{return priority==='URGENT'?'red':priority==='HIGH'?'orange':priority==='MEDIUM'?'blue':'green';}
export function memoryKindAccentName(kind:MemoryKindToken):AccentName{return kind==='FACT'?'blue':kind==='PREFERENCE'?'purple':kind==='EVENT'?'orange':kind==='REFLECTION'?'yellow':'green';}

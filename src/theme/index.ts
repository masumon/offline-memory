// ── Offline Memory · design system v3 ───────────────────────────────────────────────────
// Direction: calm precision (Linear) + warmth (Things 3), Bengali-first.
// One confident brand accent (jade green), a slate-neutral spine, hairline structure with
// a single soft shadow reserved for floating surfaces. Type: Hind Siliguri + Inter (numerals).

// Font family names as registered in app/_layout.tsx (weight-named — do not rely on fontWeight
// with custom families on Android; pick the family that carries the weight you want).
export const fonts={regular:'HindSiliguri_400Regular',medium:'HindSiliguri_500Medium',semibold:'HindSiliguri_600SemiBold',bold:'HindSiliguri_700Bold',numRegular:'Inter_400Regular',numMedium:'Inter_500Medium',numSemibold:'Inter_600SemiBold',numBold:'Inter_700Bold'} as const;

export const lightColors={background:'#F7F8F9',surface:'#FFFFFF',surfaceMuted:'#F0F2F4',surfaceSunken:'#EBEEF0',primary:'#0E8C63',primaryPressed:'#0B7351',primaryTint:'#E7F4EF',onPrimary:'#FFFFFF',accent:'#0E8C63',textPrimary:'#16181B',textSecondary:'#5B626B',textMuted:'#8A919B',border:'#E4E7EA',borderStrong:'#D3D7DC',success:'#0E8C63',warning:'#B4740E',danger:'#C6453D',info:'#2D6BB8',overlay:'rgba(15, 23, 32, 0.44)'} as const;
export const darkColors={background:'#0B0B0D',surface:'#151519',surfaceMuted:'#1E1E23',surfaceSunken:'#100F13',primary:'#3DBF92',primaryPressed:'#34A87F',primaryTint:'#132A22',onPrimary:'#06130E',accent:'#3DBF92',textPrimary:'#F4F5F6',textSecondary:'#A7ACB4',textMuted:'#70757D',border:'#28282E',borderStrong:'#3A3A42',success:'#3DBF92',warning:'#E0A44B',danger:'#E8756C',info:'#6FA8E0',overlay:'rgba(0, 0, 0, 0.62)'} as const;
export type ThemeColors=typeof lightColors|typeof darkColors;
export function getThemeColors(mode:'light'|'dark'):ThemeColors{return mode==='dark'?darkColors:lightColors;}
export const colors=lightColors;

export const spacing={xxs:4,xs:4,sm:8,smd:12,md:16,lg:24,xl:32,xxl:48,mdPlus:20,lgPlus:40} as const;
export const layout={compactHorizontal:16,regularHorizontal:24,contentMaxWidth:760,expandedNavWidth:104,compactNavHeight:86,minTouchTarget:48,iconButtonSize:48,snackbarMaxWidth:680,dialogMaxWidth:520,feedbackZIndex:1000} as const;
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
  green:{base:'#0E8C63',soft:'#E7F4EF',on:'#0B5C42',border:'#CDE8DF'},
  blue:{base:'#2D6BB8',soft:'#E9F0F9',on:'#204E88',border:'#D3E1F1'},
  orange:{base:'#B4740E',soft:'#F6EEE1',on:'#84540A',border:'#EADFC9'},
  yellow:{base:'#8F7415',soft:'#F3EFDF',on:'#655213',border:'#E4DDC2'},
  red:{base:'#C6453D',soft:'#F9EAE9',on:'#932F29',border:'#EFD4D2'},
  purple:{base:'#655BA6',soft:'#ECEBF4',on:'#453C7A',border:'#DAD6EA'},
} as const;
export const darkAccents={
  green:{base:'#3DBF92',soft:'#12261F',on:'#BFE8D8',border:'#26463A'},
  blue:{base:'#6FA8E0',soft:'#122234',on:'#CBE0F5',border:'#2A425C'},
  orange:{base:'#E0A44B',soft:'#2E2517',on:'#F0D6AC',border:'#4C3E24'},
  yellow:{base:'#CDB159',soft:'#28261A',on:'#EBE0B4',border:'#453F26'},
  red:{base:'#E8756C',soft:'#301D1B',on:'#F3C9C4',border:'#523430'},
  purple:{base:'#A79AD9',soft:'#201C33',on:'#DAD3F1',border:'#39335A'},
} as const;
export type AccentName=keyof typeof lightAccents;
export type AccentRole={base:string;soft:string;on:string;border:string};
export type ThemeAccents=typeof lightAccents|typeof darkAccents;
export function getThemeAccents(mode:'light'|'dark'):ThemeAccents{return mode==='dark'?darkAccents:lightAccents;}
export const accents=lightAccents;

// Gradient stop pairs (from→to) — plain colour arrays; stop [0] is a safe solid fallback.
export const gradients={brand:['#0E8C63','#13A87A'],hero:['#F7F8F9','#EEF4F1'],sky:['#E9F0F9','#ECEBF4'],warmth:['#F6EEE1','#F3EFDF'],surfaceLight:['#FFFFFF','#F4F6F7'],surfaceDark:['#151519','#0E0E11']} as const;
export type GradientName=keyof typeof gradients;

// Domain → colour mappings, centralized so screens stop re-implementing them.
export type PriorityToken='URGENT'|'HIGH'|'MEDIUM'|'LOW';
export type MemoryKindToken='NOTE'|'FACT'|'PREFERENCE'|'EVENT'|'REFLECTION';
export function priorityColor(colors:ThemeColors,priority:PriorityToken):string{return priority==='URGENT'?colors.danger:priority==='HIGH'?colors.warning:priority==='LOW'?colors.textMuted:colors.primary;}
export function priorityAccentName(priority:PriorityToken):AccentName{return priority==='URGENT'?'red':priority==='HIGH'?'orange':priority==='MEDIUM'?'blue':'green';}
export function memoryKindAccentName(kind:MemoryKindToken):AccentName{return kind==='FACT'?'blue':kind==='PREFERENCE'?'purple':kind==='EVENT'?'orange':kind==='REFLECTION'?'yellow':'green';}

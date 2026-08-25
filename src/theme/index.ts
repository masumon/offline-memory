export const lightColors={background:'#F4F8F6',surface:'#FFFFFF',surfaceMuted:'#EAF2EE',primary:'#006A4E',primaryPressed:'#00543E',onPrimary:'#FFFFFF',accent:'#F4C430',textPrimary:'#10231D',textSecondary:'#53665F',textMuted:'#879790',border:'#D9E5DF',success:'#16804A',warning:'#B86A00',danger:'#C73535',info:'#087EA4',overlay:'rgba(16, 35, 29, 0.10)'} as const;
export const darkColors={background:'#081410',surface:'#10221B',surfaceMuted:'#183128',primary:'#54C49A',primaryPressed:'#35A97D',onPrimary:'#06130E',accent:'#F4C430',textPrimary:'#F2F8F5',textSecondary:'#C2D3CC',textMuted:'#8EA39A',border:'#29463A',success:'#55D18F',warning:'#F3B84B',danger:'#FF7B7B',info:'#55C3E5',overlay:'rgba(0, 0, 0, 0.36)'} as const;
export type ThemeColors=typeof lightColors|typeof darkColors;
export function getThemeColors(mode:'light'|'dark'):ThemeColors{return mode==='dark'?darkColors:lightColors;}
export const colors=lightColors;
export const spacing={xxs:4,xs:4,sm:8,smd:12,md:16,lg:24,xl:32,xxl:48,mdPlus:20,lgPlus:40} as const;
export const layout={compactHorizontal:16,regularHorizontal:24,contentMaxWidth:760,expandedNavWidth:104,compactNavHeight:86,minTouchTarget:48,iconButtonSize:48} as const;
export const breakpoints={compactWindow:600,mediumWindow:840,expandedNavigation:840,wideContent:900,largeWindow:1200} as const;
export type WindowSizeClass='compact'|'medium'|'expanded';
export function getWindowSizeClass(width:number):WindowSizeClass{return width<breakpoints.compactWindow?'compact':width<breakpoints.mediumWindow?'medium':'expanded';}
export const typography={label:{fontSize:12,lineHeight:16},body:{fontSize:16,lineHeight:24},bodySmall:{fontSize:14,lineHeight:21},title:{fontSize:30,lineHeight:38},heading:{fontSize:22,lineHeight:29},display:{fontSize:36,lineHeight:44},caption:{fontSize:11,lineHeight:16},titleLarge:{fontSize:32,lineHeight:40},cardTitle:{fontSize:18,lineHeight:24},meta:{fontSize:13,lineHeight:20},input:{fontSize:15,lineHeight:22},section:{fontSize:11,lineHeight:16}} as const;
export const radius={sm:8,md:12,lg:18,xl:24,pill:999} as const;
export const control={inputHeight:52,buttonHeight:48,rowMinHeight:64,iconSize:22,iconButtonSize:48,smallIconContainer:40,listIconContainer:44,searchHeight:56} as const;
export const icon={xs:16,sm:18,md:22,lg:28,xl:36} as const;
export const opacity={disabled:0.5,pressed:0.78,muted:0.64,overlay:0.36} as const;
export const border={thin:1,medium:2} as const;
export const motion={fast:120,standard:220,slow:320} as const;
export const elevation={card:{shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:3},floating:{shadowOpacity:0.14,shadowRadius:16,shadowOffset:{width:0,height:8},elevation:6}} as const;

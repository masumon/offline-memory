import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText as Text } from './AppText';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { tapSelect } from './haptics';
import { border, elevation, getWindowSizeClass, icon as iconToken, layout, radius, spacing, typography, type AccentName } from '../theme';

const items = [
  { href: '/', icon: 'home-variant-outline' as const, activeIcon: 'home-variant' as const, tone: 'green' as AccentName, en: 'Home', bn: 'হোম' },
  { href: '/planning', icon: 'calendar-blank-outline' as const, activeIcon: 'calendar-blank' as const, tone: 'blue' as AccentName, en: 'Planning', bn: 'পরিকল্পনা' },
  { href: '/memory', icon: 'bookmark-multiple-outline' as const, activeIcon: 'bookmark-multiple' as const, tone: 'purple' as AccentName, en: 'Memory', bn: 'মেমোরি' },
  { href: '/debt', icon: 'wallet-outline' as const, activeIcon: 'wallet' as const, tone: 'red' as AccentName, en: 'Debt', bn: 'দেনা' },
  { href: '/inbox', icon: 'inbox-outline' as const, activeIcon: 'inbox' as const, tone: 'orange' as AccentName, en: 'Inbox', bn: 'ইনবক্স' },
  { href: '/more', icon: 'view-grid-outline' as const, activeIcon: 'view-grid' as const, tone: 'yellow' as AccentName, en: 'More', bn: 'আরও' },
];

export function PrimaryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, accents, glass, language } = useAppPreferences();
  const bn = language === 'bn';
  const windowClass = getWindowSizeClass(width);
  const expanded = windowClass === 'expanded';
  const medium = windowClass === 'medium';

  // iOS gets a genuine system blur over a light tint. Android uses a near-opaque tinted
  // surface (`navSolid`) — a fully translucent View over scrolling content can turn
  // white or drop its GPU layer on aggressive OEMs, so the bar here is always painted.
  const isIOS = Platform.OS === 'ios';
  const barStyle = [
    styles.bar,
    medium && styles.barMedium,
    expanded && styles.barExpanded,
    {
      backgroundColor: isIOS ? glass.navScrim : glass.navSolid,
      borderColor: glass.border,
      borderTopColor: glass.highlight,
      height: expanded ? undefined : layout.compactNavHeight + insets.bottom,
      paddingBottom: expanded ? spacing.lg : insets.bottom,
    },
  ];
  const Bar = isIOS ? BlurView : View;

  return (
    <View pointerEvents="box-none" style={[styles.host, expanded && styles.hostExpanded]}>
      <Bar
        {...(isIOS ? { intensity: glass.intensity, tint: glass.tint } : {})}
        style={barStyle}
      >
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const label = bn ? item.bn : item.en;
          const tone = accents[item.tone];
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              hitSlop={6}
              onPress={() => { if (!active) { tapSelect(); router.replace(item.href as never); } }}
              style={({ pressed }) => [styles.item, medium && styles.itemMedium, expanded && styles.itemExpanded, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.iconWrap,
                  expanded && styles.iconWrapExpanded,
                  active
                    ? { backgroundColor: tone.base, ...elevation.soft }
                    : { backgroundColor: tone.soft },
                ]}
              >
                <AppIcon name={active ? item.activeIcon : item.icon} size={iconToken.md} color={active ? colors.onPrimary : tone.base} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                maxFontSizeMultiplier={1.3}
                style={[styles.label, { color: active ? tone.base : colors.textMuted, fontFamily: active ? typography.label.fontFamily : typography.caption.fontFamily }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Bar>
    </View>
  );
}

// Nav styling is theme-independent (colours come from `accents`/`colors` inline), so the
// sheet is built once at module load rather than on every route change.
const styles = StyleSheet.create({
    host: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40 },
    hostExpanded: { top: 0, right: undefined, width: layout.expandedNavWidth, bottom: 0 },
    // A hairline top border + a small elevation for lift. `navSolid` keeps it painted.
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden', borderTopWidth: border.thin, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.sm, paddingHorizontal: spacing.xs, shadowColor: '#131A2E', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
    barMedium: { paddingHorizontal: spacing.lg },
    barExpanded: { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderRightWidth: border.thin, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, gap: spacing.xs },
    item: { flex: 1, maxWidth: 96, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs, borderRadius: radius.md, gap: spacing.xxs },
    itemMedium: { maxWidth: 132 },
    itemExpanded: { flex: 0, maxWidth: undefined, minHeight: 64, width: '100%', justifyContent: 'center', paddingHorizontal: spacing.xs },
    pressed: { opacity: 0.55 },
    iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    iconWrapExpanded: { width: 42, height: 42, borderRadius: 21 },
    label: { ...typography.caption, fontSize: 10.5, lineHeight: 13, maxWidth: 88, textAlign: 'center', marginTop: 1 },
});

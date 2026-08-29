import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { border, elevation, getWindowSizeClass, icon as iconToken, layout, radius, spacing, typography, type AccentName } from '../theme';

const items = [
  { href: '/', icon: 'home-variant-outline' as const, activeIcon: 'home-variant' as const, tone: 'green' as AccentName, en: 'Home', bn: 'হোম' },
  { href: '/planning', icon: 'calendar-blank-outline' as const, activeIcon: 'calendar-blank' as const, tone: 'blue' as AccentName, en: 'Planning', bn: 'পরিকল্পনা' },
  { href: '/memory', icon: 'brain' as const, activeIcon: 'brain' as const, tone: 'purple' as AccentName, en: 'Memory', bn: 'মেমোরি' },
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
  const styles = makeStyles();

  return (
    <View pointerEvents="box-none" style={[styles.host, expanded && styles.hostExpanded]}>
      <BlurView
        intensity={glass.intensity + 14}
        tint={glass.tint}
        style={[
          styles.bar,
          medium && styles.barMedium,
          expanded && styles.barExpanded,
          {
            backgroundColor: glass.navScrim,
            borderColor: glass.border,
            borderTopColor: glass.highlight,
            height: expanded ? undefined : layout.compactNavHeight + insets.bottom,
            paddingBottom: expanded ? spacing.lg : insets.bottom,
          },
        ]}
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
              onPress={() => { if (!active) router.replace(item.href as never); }}
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
                style={[styles.label, { color: active ? tone.base : colors.textMuted, fontFamily: active ? typography.label.fontFamily : typography.caption.fontFamily }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    hostExpanded: { top: 0, right: undefined, width: layout.expandedNavWidth, bottom: 0 },
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden', borderTopWidth: border.thin, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.sm, paddingHorizontal: spacing.xs, ...elevation.raised },
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
}

import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { border, elevation, getWindowSizeClass, icon as iconToken, layout, radius, spacing, typography } from '../theme';

const items = [
  { href: '/', icon: 'home-outline' as const, activeIcon: 'home' as const, en: 'Home', bn: 'হোম' },
  { href: '/planning', icon: 'calendar-blank-outline' as const, activeIcon: 'calendar-blank' as const, en: 'Planning', bn: 'পরিকল্পনা' },
  { href: '/memory', icon: 'brain' as const, activeIcon: 'brain' as const, en: 'Memory', bn: 'মেমোরি' },
  { href: '/inbox', icon: 'inbox-outline' as const, activeIcon: 'inbox' as const, en: 'Inbox', bn: 'ইনবক্স' },
  { href: '/more', icon: 'dots-horizontal' as const, activeIcon: 'dots-horizontal' as const, en: 'More', bn: 'আরও' },
];

export function PrimaryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, language } = useAppPreferences();
  const bn = language === 'bn';
  const windowClass = getWindowSizeClass(width);
  const expanded = windowClass === 'expanded';
  const medium = windowClass === 'medium';
  const styles = makeStyles();

  return (
    <View pointerEvents="box-none" style={[styles.host, expanded && styles.hostExpanded]}>
      <View
        style={[
          styles.bar,
          medium && styles.barMedium,
          expanded && styles.barExpanded,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            height: expanded ? undefined : layout.compactNavHeight + insets.bottom,
            paddingBottom: expanded ? spacing.lg : insets.bottom,
          },
        ]}
      >
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const label = bn ? item.bn : item.en;
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
              {active ? <View style={[styles.activeTick, { backgroundColor: colors.primary }]} /> : null}
              <View style={[styles.iconWrap, expanded && styles.iconWrapExpanded, active && { backgroundColor: colors.primary, ...elevation.soft, shadowColor: colors.primary, shadowOpacity: 0.28 }]}>
                <AppIcon name={active ? item.activeIcon : item.icon} size={iconToken.md} color={active ? colors.onPrimary : colors.textMuted} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.label, { color: active ? colors.primary : colors.textMuted, fontFamily: active ? typography.label.fontFamily : typography.caption.fontFamily }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    hostExpanded: { top: 0, right: undefined, width: layout.expandedNavWidth, bottom: 0 },
    bar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderTopWidth: border.thin, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.smd, paddingHorizontal: spacing.xs, ...elevation.raised },
    barMedium: { paddingHorizontal: spacing.lg },
    barExpanded: { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderRightWidth: border.thin, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, gap: spacing.xs },
    item: { flex: 1, maxWidth: 96, minHeight: 56, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: spacing.xxs, borderRadius: radius.md, gap: spacing.xxs },
    itemMedium: { maxWidth: 132, minHeight: 60 },
    itemExpanded: { flex: 0, maxWidth: undefined, minHeight: 64, width: '100%', justifyContent: 'center', paddingHorizontal: spacing.xs },
    pressed: { opacity: 0.55 },
    activeTick: { position: 'absolute', top: 0, width: 22, height: 3, borderRadius: radius.pill },
    iconWrap: { minWidth: 46, height: 34, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    iconWrapExpanded: { minWidth: 48, height: 36 },
    label: { ...typography.caption, fontSize: 11, lineHeight: 14, maxWidth: 88, textAlign: 'center', marginTop: 1 },
  });
}

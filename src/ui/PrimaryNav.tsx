import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { elevation, getWindowSizeClass, layout, radius, spacing } from '../theme';

const items = [
  { href: '/', icon: 'home' as const, en: 'Home', bn: 'হোম' },
  { href: '/planning', icon: 'calendar' as const, en: 'Planning', bn: 'পরিকল্পনা' },
  { href: '/memory', icon: 'brain' as const, en: 'Memory', bn: 'মেমোরি' },
  { href: '/inbox', icon: 'inbox' as const, en: 'Inbox', bn: 'ইনবক্স' },
  { href: '/more', icon: 'dots-horizontal' as const, en: 'More', bn: 'আরও' },
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

  return (
    <View pointerEvents="box-none" style={[styles.host, expanded && styles.hostExpanded]}>
      <View style={[styles.bar, medium && styles.barMedium, expanded && styles.barExpanded, { backgroundColor: colors.surface, borderColor: colors.border, height: expanded ? undefined : layout.compactNavHeight + insets.bottom, paddingBottom: expanded ? spacing.lg : insets.bottom }]}>
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const label = bn ? item.bn : item.en;
          return <Pressable key={item.href} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} hitSlop={4} onPress={() => { if (!active) router.replace(item.href as never); }} style={({ pressed }) => [styles.item, medium && styles.itemMedium, expanded && styles.itemExpanded, pressed && styles.pressed]}>
            <View style={[styles.iconWrap, active && { backgroundColor: colors.primary }]}><AppIcon name={item.icon} size={21} color={active ? colors.onPrimary : colors.textSecondary} /></View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.label, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
          </Pressable>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  hostExpanded: { top: 0, right: undefined, width: layout.expandedNavWidth, bottom: 0 },
  bar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: spacing.sm, ...elevation.floating },
  barMedium: { paddingHorizontal: spacing.lg },
  barExpanded: { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', borderTopWidth: 0, borderRightWidth: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, gap: spacing.sm },
  item: { flex: 1, maxWidth: 96, minHeight: 58, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: spacing.xs, paddingTop: 2, borderRadius: radius.md },
  itemMedium: { maxWidth: 132, minHeight: 62 },
  itemExpanded: { flex: 0, maxWidth: undefined, minHeight: 68, width: '100%', justifyContent: 'center', paddingHorizontal: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  iconWrap: { width: spacing.lgPlus, height: spacing.lgPlus, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '800', marginTop: 2, maxWidth: 84, textAlign: 'center' },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPreferences } from '../app/AppPreferences';
import { AppIcon } from './AppIcon';
import { elevation, radius, spacing } from '../theme';

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
  const { colors, language } = useAppPreferences();
  const bn = language === 'bn';

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const label = bn ? item.bn : item.en;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              hitSlop={4}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.iconWrap, active && { backgroundColor: colors.primary }]}>
                <AppIcon name={item.icon} size={21} color={active ? colors.onPrimary : colors.textSecondary} accessibilityLabel={label} />
              </View>
              <Text numberOfLines={1} style={[styles.label, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: spacing.sm, ...elevation.floating },
  item: { flex: 1, maxWidth: 96, minHeight: 58, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: spacing.xs, paddingTop: 2, borderRadius: radius.md },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  iconWrap: { width: 40, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '800', marginTop: 2, maxWidth: 84, textAlign: 'center' },
});

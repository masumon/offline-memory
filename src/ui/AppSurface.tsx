import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ComponentProps, type ReactNode, type StyleProp, type ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { elevation, radius, spacing, typography } from '../theme';
import { useAppPreferences } from '../app/AppPreferences';

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export function AppCard({ children, style, elevated = true }: AppCardProps) {
  const { colors } = useAppPreferences();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevated && elevation.card, style]}>
      {children}
    </View>
  );
}

type AppButtonProps = {
  label: string;
  icon?: ComponentProps<typeof AppIcon>['name'];
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, icon, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel, style }: AppButtonProps) {
  const { colors } = useAppPreferences();
  const disabledState = disabled || loading;
  const background = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surfaceMuted : 'transparent';
  const foreground = variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabledState, busy: loading }}
      disabled={disabledState}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: variant === 'ghost' ? 'transparent' : colors.border, opacity: disabledState ? 0.5 : pressed ? 0.82 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <AppIcon name={icon} size={19} color={foreground} accessibilityLabel={label} /> : null}
      {!loading ? <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text> : null}
    </Pressable>
  );
}

type AppStateProps = {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof AppIcon>['name'];
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function AppState({ title, description, icon = 'information-outline', loading = false, actionLabel, onAction }: AppStateProps) {
  const { colors } = useAppPreferences();
  return (
    <View style={styles.state} accessibilityRole={loading ? 'progressbar' : undefined}>
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : <View style={[styles.stateIcon, { backgroundColor: colors.surfaceMuted }]}><AppIcon name={icon} size={28} color={colors.primary} accessibilityLabel={title} /></View>}
      <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>{title}</Text>
      {description ? <Text style={[styles.stateDescription, { color: colors.textSecondary }]}>{description}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  button: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  buttonText: { ...typography.bodySmall, fontWeight: '800' },
  state: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.sm },
  stateIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  stateDescription: { ...typography.bodySmall, maxWidth: 420, textAlign: 'center' },
});

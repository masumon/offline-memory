import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useAppPreferences } from '../app/AppPreferences';
import { control, elevation, layout, opacity, radius, spacing, typography } from '../theme';

type SnackbarTone = 'success' | 'info' | 'warning' | 'danger';
type SnackbarState = { id: number; message: string; tone: SnackbarTone } | null;
type FeedbackContextValue = { showSnackbar: (message: string, tone?: SnackbarTone) => void };
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const sequence = useRef(0);
  const showSnackbar = useCallback((message: string, tone: SnackbarTone = 'info') => {
    sequence.current += 1;
    setSnackbar({ id: sequence.current, message, tone });
  }, []);
  useEffect(() => {
    if (!snackbar) return;
    const timeout = setTimeout(() => setSnackbar(current => current?.id === snackbar.id ? null : current), 2600);
    return () => clearTimeout(timeout);
  }, [snackbar]);
  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);
  return <FeedbackContext.Provider value={value}>{children}{snackbar ? <AppSnackbar {...snackbar} /> : null}</FeedbackContext.Provider>;
}
export function useAppFeedback() { const value = useContext(FeedbackContext); if (!value) throw new Error('useAppFeedback must be used inside AppFeedbackProvider'); return value; }
export function AppSnackbar({ message, tone }: { message: string; tone: SnackbarTone }) { const { colors } = useAppPreferences(); const icon = tone === 'success' ? 'check-circle-outline' : tone === 'warning' ? 'alert-outline' : tone === 'danger' ? 'alert-circle-outline' : 'information-outline'; const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.info; return <View pointerEvents="none" style={styles.snackbarWrap}><View style={[styles.snackbar, { backgroundColor: colors.surface, borderColor: colors.border }]}><AppIcon name={icon} size={control.iconSize} color={color} /><Text numberOfLines={3} style={[styles.snackbarText, { color: colors.textPrimary }]}>{message}</Text></View></View>; }
export function AppConfirmDialog({ visible, title, description, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: { visible: boolean; title: string; description?: string; confirmLabel: string; cancelLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) { const { colors } = useAppPreferences(); return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={[styles.backdrop, { backgroundColor: colors.overlay }]}><View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{title}</Text>{description ? <Text style={[styles.dialogDescription, { color: colors.textSecondary }]}>{description}</Text> : null}<View style={styles.dialogActions}><Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => StyleSheet.flatten([styles.dialogButton, { borderColor: colors.border }, pressed && styles.pressed])}><Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>{cancelLabel}</Text></Pressable><Pressable accessibilityRole="button" onPress={onConfirm} style={({ pressed }) => StyleSheet.flatten([styles.dialogButton, { backgroundColor: danger ? colors.danger : colors.primary, borderColor: danger ? colors.danger : colors.primary }, pressed && styles.pressed])}><Text style={[styles.dialogConfirmText, { color: colors.onPrimary }]}>{confirmLabel}</Text></Pressable></View></View></View></Modal>; }
const styles = StyleSheet.create({ snackbarWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, zIndex: 1000, alignItems: 'center' }, snackbar: { width: '100%', maxWidth: 680, minHeight: control.buttonHeight, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...elevation.floating }, snackbarText: { ...typography.bodySmall, fontWeight: '700', flex: 1 }, backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, dialog: { width: '100%', maxWidth: 520, borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, ...elevation.floating }, dialogTitle: { ...typography.titleLarge, fontWeight: '900' }, dialogDescription: { ...typography.bodySmall, marginTop: spacing.sm }, dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }, dialogButton: { minHeight: control.buttonHeight, minWidth: layout.minTouchTarget, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' }, dialogCancelText: { fontWeight: '800' }, dialogConfirmText: { fontWeight: '800' }, pressed: { opacity: opacity.pressed } });

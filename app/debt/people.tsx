import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../../src/ui/AppText';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../../src/app/AppPreferences';
import { useAppFeedback } from '../../src/ui/AppFeedback';
import { createPerson, listAccounts, listPeople } from '../../src/services/debt/repository';
import type { Account, Person } from '../../src/services/debt/types';
import { debtCopy } from '../../src/i18n/debt';
import { AppIcon } from '../../src/ui/AppIcon';
import { AppState } from '../../src/ui/AppSurface';
import { success, warn } from '../../src/ui/haptics';
import { border, control, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../../src/theme';

export default function PeopleScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const c = useMemo(() => debtCopy(language), [language]);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const { showSnackbar } = useAppFeedback();

  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([listPeople(db), listAccounts(db)]);
      setPeople(p); setAccounts(a);
    } catch { setPeople([]); }
    finally { setReady(true); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const countByPerson = useMemo(() => {
    const m = new Map<string, { debt: number; recv: number }>();
    for (const a of accounts) {
      const e = m.get(a.personId) ?? { debt: 0, recv: 0 };
      if (a.direction === 'DEBT') e.debt += 1; else e.recv += 1;
      m.set(a.personId, e);
    }
    return m;
  }, [accounts]);

  const add = async () => {
    const n = name.trim();
    if (!n || adding) { if (!n) { warn(); showSnackbar(c.required, 'danger'); } return; }
    setAdding(true);
    try {
      await createPerson(db, { name: n, phone: phone.trim() || null });
      success();
      setName(''); setPhone('');
      await load();
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : 'Failed', 'danger');
    } finally { setAdding(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/debt'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
        <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{c.people}</Text>

      <View style={styles.addBox}>
        <TextInput value={name} onChangeText={setName} placeholder={c.name} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.name} />
        <View style={styles.addRow}>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={c.phone} placeholderTextColor={colors.textMuted} style={[styles.input, styles.phoneInput]} accessibilityLabel={c.phone} />
          <Pressable accessibilityRole="button" accessibilityLabel={c.newPerson} disabled={adding} onPress={() => void add()} style={({ pressed }) => StyleSheet.flatten([styles.addBtn, adding && styles.disabled, pressed && styles.pressed])}>
            {adding ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <AppIcon name="account-plus-outline" size={icon.md} color={colors.onPrimary} />}
          </Pressable>
        </View>
      </View>

      {!ready ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : people.length === 0 ? (
        <AppState icon="account-multiple-outline" title={c.noPeople} />
      ) : (
        people.map((p) => {
          const cnt = countByPerson.get(p.id) ?? { debt: 0, recv: 0 };
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              onPress={() => router.push(`/debt/statement/${p.id}` as never)}
              style={({ pressed }) => StyleSheet.flatten([styles.row, pressed && styles.pressed])}
            >
              <View style={styles.avatar}><Text style={styles.avatarText}>{p.name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.rowName}>{p.name}</Text>
                <Text numberOfLines={1} style={styles.rowMeta}>
                  {p.phone ? `${p.phone} · ` : ''}
                  {bn ? `${cnt.debt} দেনা · ${cnt.recv} পাওনা` : `${cnt.debt} debts · ${cnt.recv} receivables`}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={icon.md} color={colors.textMuted} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl + spacing.xl },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    title: { color: colors.textPrimary, ...typography.display, fontWeight: '700', marginBottom: spacing.md },
    addBox: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md, ...elevation.soft },
    addRow: { flexDirection: 'row', gap: spacing.sm },
    input: { minHeight: control.inputHeight, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.input },
    phoneInput: { flex: 1 },
    addBtn: { width: control.buttonHeight, minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.sm, ...elevation.soft },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.textSecondary, ...typography.cardTitle, fontWeight: '800' },
    rowBody: { flex: 1, minWidth: 0 },
    rowName: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800' },
    rowMeta: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

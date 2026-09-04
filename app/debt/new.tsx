import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../../src/ui/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../../src/app/AppPreferences';
import { useAppFeedback } from '../../src/ui/AppFeedback';
import { createDebt, createReceivable } from '../../src/services/debt/debt-service';
import { createPerson, listPeople } from '../../src/services/debt/repository';
import { parseTakaToPaisa } from '../../src/services/debt/money';
import { DEFAULT_PURPOSES } from '../../src/services/debt/types';
import type { InterestType, Person, RatePeriod } from '../../src/services/debt/types';
import { debtCopy, purposeLabel } from '../../src/i18n/debt';
import { bangladeshDateKey } from '../../src/i18n/date-time';
import { AppIcon } from '../../src/ui/AppIcon';
import { success, warn } from '../../src/ui/haptics';
import { border, control, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../../src/theme';

const INTEREST_OPTS: { key: InterestType; bn: string; en: string }[] = [
  { key: 'NONE', bn: 'সুদ নেই', en: 'No interest' },
  { key: 'FLAT_TOTAL', bn: 'মোট ফেরত (flat)', en: 'Flat total' },
  { key: 'SIMPLE', bn: 'সরল %', en: 'Simple %' },
  { key: 'COMPOUND', bn: 'চক্রবৃদ্ধি %', en: 'Compound %' },
  { key: 'MONTHLY_FLAT', bn: 'মাসিক %', en: 'Monthly %' },
];
const PERIODS: RatePeriod[] = ['YEAR', 'MONTH', 'WEEK', 'DAY'];

export default function NewAccountScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ direction?: string }>();
  const direction = params.direction === 'RECEIVABLE' ? 'RECEIVABLE' : 'DEBT';
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const c = useMemo(() => debtCopy(language), [language]);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const { showSnackbar } = useAppFeedback();

  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [openedDate, setOpenedDate] = useState(bangladeshDateKey(new Date()));
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<string | null>(null);
  const [interestType, setInterestType] = useState<InterestType>('NONE');
  const [ratePct, setRatePct] = useState('');
  const [period, setPeriod] = useState<RatePeriod>('YEAR');
  const [flatTotal, setFlatTotal] = useState('');
  const [installments, setInstallments] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void listPeople(db).then(setPeople).catch(() => setPeople([])); }, [db]);

  const dirLabel = direction === 'DEBT' ? c.addDebt : c.addReceivable;
  const showRate = interestType === 'SIMPLE' || interestType === 'COMPOUND' || interestType === 'MONTHLY_FLAT';

  const save = async () => {
    if (saving) return;
    let paisa = 0;
    try { paisa = parseTakaToPaisa(amount); } catch { paisa = 0; }
    if (paisa <= 0) { warn(); showSnackbar(bn ? 'সঠিক পরিমাণ দিন' : 'Enter a valid amount', 'danger'); return; }
    const name = newName.trim();
    if (!personId && !name) { warn(); showSnackbar(bn ? 'ব্যক্তি বেছে নিন বা নাম দিন' : 'Pick a person or type a name', 'danger'); return; }

    setSaving(true);
    try {
      let pid = personId;
      if (!pid && name) pid = (await createPerson(db, { name })).id;
      const rateBps = showRate && ratePct.trim() ? Math.round(parseFloat(ratePct) * 100) : null;
      const input = {
        personId: pid!,
        title: title.trim() || null,
        principalPaisa: paisa,
        openedDate,
        purpose,
        interestType,
        interestRateBps: rateBps,
        interestPeriod: interestType === 'MONTHLY_FLAT' ? ('MONTH' as RatePeriod) : (showRate ? period : null),
        compoundPeriod: interestType === 'COMPOUND' ? period : null,
        manualTotalPayablePaisa: interestType === 'FLAT_TOTAL' && flatTotal.trim() ? parseTakaToPaisa(flatTotal) : null,
        installmentCount: installments.trim() ? Math.max(0, parseInt(installments, 10) || 0) : undefined,
        firstDueDate: openedDate,
        notes: notes.trim() || null,
      };
      const acc = direction === 'DEBT' ? await createDebt(db, input) : await createReceivable(db, input);
      success();
      showSnackbar(bn ? 'সংরক্ষিত হয়েছে' : 'Saved', 'success');
      router.replace(`/debt/account/${acc.id}` as never);
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'সংরক্ষণ ব্যর্থ' : 'Save failed'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/debt'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>{dirLabel}</Text>

        <Text style={styles.label}>{c.person}</Text>
        {people.length ? (
          <View style={styles.chipRow}>
            {people.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: personId === p.id }} onPress={() => { setPersonId(personId === p.id ? null : p.id); setNewName(''); }} style={({ pressed }) => StyleSheet.flatten([styles.chip, personId === p.id && styles.chipOn, pressed && styles.pressed])}>
                <Text style={[styles.chipText, personId === p.id && styles.chipTextOn]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextInput value={newName} onChangeText={(v) => { setNewName(v); if (v) setPersonId(null); }} placeholder={c.newPerson} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.newPerson} />

        <Text style={styles.label}>{c.amount} (৳)</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.amount} />

        <Text style={styles.label}>{bn ? 'শিরোনাম (ঐচ্ছিক)' : 'Title (optional)'}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={bn ? 'যেমন: ব্যাংক গাড়ি ঋণ' : 'e.g. Bank car loan'} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="title" />

        <Text style={styles.label}>{c.date}</Text>
        <TextInput value={openedDate} onChangeText={setOpenedDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.date} />

        <Text style={styles.label}>{c.purpose}</Text>
        <View style={styles.chipRow}>
          {DEFAULT_PURPOSES.map((p) => (
            <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: purpose === p }} onPress={() => setPurpose(purpose === p ? null : p)} style={({ pressed }) => StyleSheet.flatten([styles.chip, purpose === p && styles.chipOn, pressed && styles.pressed])}>
              <Text style={[styles.chipText, purpose === p && styles.chipTextOn]}>{purposeLabel(p, language)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{bn ? 'সুদ' : 'Interest'}</Text>
        <View style={styles.chipRow}>
          {INTEREST_OPTS.map((o) => (
            <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: interestType === o.key }} onPress={() => setInterestType(o.key)} style={({ pressed }) => StyleSheet.flatten([styles.chip, interestType === o.key && styles.chipOn, pressed && styles.pressed])}>
              <Text style={[styles.chipText, interestType === o.key && styles.chipTextOn]}>{bn ? o.bn : o.en}</Text>
            </Pressable>
          ))}
        </View>
        {interestType === 'FLAT_TOTAL' ? (
          <TextInput value={flatTotal} onChangeText={setFlatTotal} keyboardType="numeric" placeholder={bn ? 'মোট ফেরতযোগ্য (৳)' : 'Total repayable (৳)'} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="flat total" />
        ) : null}
        {showRate ? (
          <View style={styles.rateRow}>
            <TextInput value={ratePct} onChangeText={setRatePct} keyboardType="numeric" placeholder={bn ? 'হার %' : 'Rate %'} placeholderTextColor={colors.textMuted} style={[styles.input, styles.rateInput]} accessibilityLabel="rate percent" />
            {interestType !== 'MONTHLY_FLAT' ? (
              <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                  <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: period === p }} onPress={() => setPeriod(p)} style={({ pressed }) => StyleSheet.flatten([styles.periodChip, period === p && styles.chipOn, pressed && styles.pressed])}>
                    <Text style={[styles.chipText, period === p && styles.chipTextOn]}>{periodLabel(p, bn)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.label}>{bn ? 'কিস্তি সংখ্যা (ঐচ্ছিক)' : 'Installment count (optional)'}</Text>
        <TextInput value={installments} onChangeText={setInstallments} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="installments" />

        <Text style={styles.label}>{c.note}</Text>
        <TextInput value={notes} onChangeText={setNotes} multiline placeholder={c.note} placeholderTextColor={colors.textMuted} style={styles.textarea} accessibilityLabel={c.note} />
      </ScrollView>

      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace('/debt'))} style={({ pressed }) => StyleSheet.flatten([styles.secondary, pressed && styles.pressed])}>
          <Text style={styles.secondaryText}>{c.cancel}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ busy: saving }} disabled={saving} onPress={() => void save()} style={({ pressed }) => StyleSheet.flatten([styles.primary, saving && styles.disabled, pressed && styles.pressed])}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryText}>{c.save}</Text></>}
        </Pressable>
      </View>
    </View>
  );
}

function periodLabel(p: RatePeriod, bn: boolean): string {
  return { YEAR: bn ? 'বছর' : 'yr', MONTH: bn ? 'মাস' : 'mo', WEEK: bn ? 'সপ্তাহ' : 'wk', DAY: bn ? 'দিন' : 'day' }[p];
}

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    title: { color: colors.textPrimary, ...typography.display, fontWeight: '700', marginBottom: spacing.md },
    label: { color: colors.textSecondary, ...typography.label, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs },
    input: { minHeight: control.inputHeight, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.input },
    textarea: { minHeight: 96, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, ...typography.body, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { minHeight: 40, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textSecondary, ...typography.meta, fontWeight: '700' },
    chipTextOn: { color: colors.onPrimary },
    rateRow: { gap: spacing.xs, marginTop: spacing.xs },
    rateInput: {},
    periodRow: { flexDirection: 'row', gap: spacing.xs },
    periodChip: { flex: 1, minHeight: 40, borderRadius: radius.sm, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    bar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: border.thin, borderTopColor: colors.border, backgroundColor: colors.surface },
    secondary: { minHeight: control.buttonHeight, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: colors.textSecondary, ...typography.callout, fontWeight: '800' },
    primary: { flex: 1, minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, ...elevation.raised },
    primaryText: { color: colors.onPrimary, ...typography.callout, fontWeight: '800' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

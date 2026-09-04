import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../../../src/ui/AppText';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppPreferences } from '../../../src/app/AppPreferences';
import { useAppFeedback } from '../../../src/ui/AppFeedback';
import { getAccountView, recordPayment, recordReceipt, type AccountView } from '../../../src/services/debt/debt-service';
import { createPerson, listPeople } from '../../../src/services/debt/repository';
import { formatPaisa, parseTakaToPaisa } from '../../../src/services/debt/money';
import { DEFAULT_PAYMENT_METHODS, DEFAULT_PAYMENT_SOURCES, type Person } from '../../../src/services/debt/types';
import { debtCopy } from '../../../src/i18n/debt';
import { bangladeshDateKey } from '../../../src/i18n/date-time';
import { AppIcon } from '../../../src/ui/AppIcon';
import { success, warn } from '../../../src/ui/haptics';
import { border, control, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../../../src/theme';

type SourceLine = { key: string; amount: string; borrowFrom: string | null; newName: string };

export default function PaymentScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const c = useMemo(() => debtCopy(language), [language]);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const money = (p: number) => formatPaisa(p, { bnDigits: bn });
  const { showSnackbar } = useAppFeedback();

  const [view, setView] = useState<AccountView | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(bangladeshDateKey(new Date()));
  const [method, setMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [instId, setInstId] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceLine[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [v, ppl] = await Promise.all([getAccountView(db, id), listPeople(db)]);
      setView(v); setPeople(ppl);
    } catch { setView(null); }
    finally { setLoaded(true); }
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!loaded) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!view || !id) return <View style={styles.center}><Text style={styles.dim}>{bn ? 'পাওয়া যায়নি' : 'Not found'}</Text></View>;

  const isDebt = view.account.direction === 'DEBT';
  const paisa = safeParse(amount);
  const srcTotal = sources.reduce((s, l) => s + safeParse(l.amount), 0);
  const sourcesUsed = sources.some((l) => l.amount.trim());
  const srcOk = !sourcesUsed || srcTotal === paisa;

  const addSource = () => setSources((s) => [...s, { key: 'SALARY', amount: '', borrowFrom: null, newName: '' }]);
  const setSrc = (i: number, patch: Partial<SourceLine>) => setSources((s) => s.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const delSrc = (i: number) => setSources((s) => s.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (busy) return;
    if (paisa <= 0) { warn(); showSnackbar(bn ? 'সঠিক পরিমাণ দিন' : 'Enter a valid amount', 'danger'); return; }
    if (isDebt && sourcesUsed && !srcOk) { warn(); showSnackbar(bn ? 'উৎসের যোগফল মিলছে না' : 'Sources must sum to the amount', 'danger'); return; }
    setBusy(true);
    try {
      const allocations = instId ? [{ installmentId: instId, amountPaisa: paisa }] : undefined;
      if (isDebt) {
        let srcInput: { sourceKey: string; amountPaisa: number; linkedAccountId?: string | null; newBorrowAccount?: { personId: string; title?: string | null } | null }[] | undefined;
        if (sourcesUsed) {
          srcInput = [];
          for (const l of sources.filter((x) => x.amount.trim())) {
            const line: { sourceKey: string; amountPaisa: number; linkedAccountId?: string | null; newBorrowAccount?: { personId: string; title?: string | null } | null } = {
              sourceKey: l.key, amountPaisa: safeParse(l.amount),
            };
            if (l.key === 'BORROWED') {
              if (l.borrowFrom) line.linkedAccountId = l.borrowFrom;
              else if (l.newName.trim()) {
                const lender = await createPerson(db, { name: l.newName.trim() });
                line.newBorrowAccount = { personId: lender.id, title: bn ? 'ঋণ পরিশোধে ধার' : 'borrowed to repay' };
              }
            }
            srcInput.push(line);
          }
        }
        await recordPayment(db, { accountId: id, amountPaisa: paisa, txnDate: date, method, reference: reference.trim() || null, allocations, sources: srcInput });
      } else {
        await recordReceipt(db, { accountId: id, amountPaisa: paisa, txnDate: date, method, reference: reference.trim() || null, allocations });
      }
      success();
      showSnackbar(bn ? 'যোগ হয়েছে' : 'Recorded', 'success');
      router.replace(`/debt/account/${id}` as never);
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'ব্যর্থ' : 'Failed'), 'danger');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/debt/account/${id}` as never))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>{isDebt ? c.makePayment : c.recordReceipt}</Text>
        <Text style={styles.sub}>{view.person?.name ?? ''} · {c.remaining} {money(view.balance.remainingPaisa)}</Text>

        <Text style={styles.label}>{c.amount} (৳)</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.amount} />

        <Text style={styles.label}>{c.date}</Text>
        <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={c.date} />

        <Text style={styles.label}>{bn ? 'মাধ্যম' : 'Method'}</Text>
        <View style={styles.chipRow}>
          {DEFAULT_PAYMENT_METHODS.map((m) => (
            <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: method === m }} onPress={() => setMethod(method === m ? null : m)} style={({ pressed }) => StyleSheet.flatten([styles.chip, method === m && styles.chipOn, pressed && styles.pressed])}>
              <Text style={[styles.chipText, method === m && styles.chipTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{bn ? 'রেফারেন্স (ঐচ্ছিক)' : 'Reference (optional)'}</Text>
        <TextInput value={reference} onChangeText={setReference} placeholder={bn ? 'ট্রানজেকশন আইডি ইত্যাদি' : 'Transaction id etc.'} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="reference" />

        {view.installments.length ? (
          <>
            <Text style={styles.label}>{bn ? 'কিস্তিতে বণ্টন (ঐচ্ছিক)' : 'Apply to installment (optional)'}</Text>
            <View style={styles.chipRow}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: instId === null }} onPress={() => setInstId(null)} style={({ pressed }) => StyleSheet.flatten([styles.chip, instId === null && styles.chipOn, pressed && styles.pressed])}>
                <Text style={[styles.chipText, instId === null && styles.chipTextOn]}>{bn ? 'স্বয়ংক্রিয়' : 'Auto'}</Text>
              </Pressable>
              {view.installments.map((it) => (
                <Pressable key={it.id} accessibilityRole="button" accessibilityState={{ selected: instId === it.id }} onPress={() => setInstId(instId === it.id ? null : it.id)} style={({ pressed }) => StyleSheet.flatten([styles.chip, instId === it.id && styles.chipOn, pressed && styles.pressed])}>
                  <Text style={[styles.chipText, instId === it.id && styles.chipTextOn]}>#{it.seq} · {money(it.amountPaisa)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {isDebt ? (
          <>
            <View style={styles.srcHead}>
              <Text numberOfLines={1} style={[styles.label, styles.srcHeadLabel]}>{bn ? 'টাকার উৎস' : 'Payment source'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={bn ? 'উৎস যোগ' : 'Add source'} onPress={addSource} style={({ pressed }) => StyleSheet.flatten([styles.addSrc, pressed && styles.pressed])}>
                <AppIcon name="plus" size={icon.sm} color={colors.primary} /><Text style={styles.addSrcText}>{bn ? 'যোগ' : 'Add'}</Text>
              </Pressable>
            </View>
            {sources.map((l, i) => (
              <View key={i} style={styles.srcRow}>
                <View style={styles.srcTop}>
                  <View style={styles.srcChips}>
                    {DEFAULT_PAYMENT_SOURCES.map((k) => (
                      <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: l.key === k }} onPress={() => setSrc(i, { key: k })} style={({ pressed }) => StyleSheet.flatten([styles.miniChip, l.key === k && styles.chipOn, pressed && styles.pressed])}>
                        <Text style={[styles.miniChipText, l.key === k && styles.chipTextOn]}>{k}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="remove" onPress={() => delSrc(i)} hitSlop={8}><AppIcon name="close" size={icon.sm} color={colors.danger} /></Pressable>
                </View>
                <TextInput value={l.amount} onChangeText={(v) => setSrc(i, { amount: v })} keyboardType="numeric" placeholder={`${c.amount} (৳)`} placeholderTextColor={colors.textMuted} style={[styles.input, styles.srcInput]} accessibilityLabel={`source ${i} amount`} />
                {l.key === 'BORROWED' ? (
                  <View style={styles.borrowRow}>
                    <Text style={styles.borrowHint}>{bn ? 'কার কাছ থেকে ধার:' : 'Borrowed from:'}</Text>
                    <View style={styles.chipRow}>
                      {people.map((p) => (
                        <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: l.borrowFrom === p.id }} onPress={() => setSrc(i, { borrowFrom: p.id, newName: '' })} style={({ pressed }) => StyleSheet.flatten([styles.miniChip, l.borrowFrom === p.id && styles.chipOn, pressed && styles.pressed])}>
                          <Text style={[styles.miniChipText, l.borrowFrom === p.id && styles.chipTextOn]}>{p.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput value={l.newName} onChangeText={(v) => setSrc(i, { newName: v, borrowFrom: null })} placeholder={c.newPerson} placeholderTextColor={colors.textMuted} style={[styles.input, styles.srcInput]} accessibilityLabel="new lender" />
                  </View>
                ) : null}
              </View>
            ))}
            {sourcesUsed ? (
              <Text style={[styles.srcSum, { color: srcOk ? colors.success : colors.danger }]}>
                {bn ? 'উৎস মোট' : 'Sources total'}: {money(srcTotal)} / {money(paisa)}
                {sources.some((l) => l.key === 'BORROWED' && l.amount.trim()) ? (bn ? '  · ধার করা টাকায় আসল দেনা কমবে না' : '  · borrowed slice does not reduce net debt') : ''}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/debt/account/${id}` as never))} style={({ pressed }) => StyleSheet.flatten([styles.secondary, pressed && styles.pressed])}>
          <Text style={styles.secondaryText}>{c.cancel}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ busy }} disabled={busy} onPress={() => void submit()} style={({ pressed }) => StyleSheet.flatten([styles.primary, busy && styles.disabled, pressed && styles.pressed])}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <><AppIcon name="check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryText}>{c.save}</Text></>}
        </Pressable>
      </View>
    </View>
  );
}

function safeParse(s: string): number { try { return parseTakaToPaisa(s); } catch { return 0; } }

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl + spacing.xl },
    center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    dim: { color: colors.textMuted },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    title: { color: colors.textPrimary, ...typography.display, fontWeight: '700' },
    sub: { color: colors.textSecondary, ...typography.bodySmall, marginTop: spacing.xxs, marginBottom: spacing.sm },
    label: { color: colors.textSecondary, ...typography.label, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs },
    input: { minHeight: control.inputHeight, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.input },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { minHeight: 40, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textSecondary, ...typography.meta, fontWeight: '700' },
    chipTextOn: { color: colors.onPrimary },
    srcHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    srcHeadLabel: { flexShrink: 1 },
    addSrc: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: layout.minTouchTarget, paddingHorizontal: spacing.xs },
    addSrcText: { color: colors.primary, ...typography.meta, fontWeight: '800' },
    srcRow: { borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm, gap: spacing.xs, marginBottom: spacing.xs },
    srcTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    srcChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    miniChip: { minHeight: 32, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    miniChipText: { color: colors.textSecondary, ...typography.caption, fontWeight: '700' },
    srcInput: { backgroundColor: colors.surfaceMuted, minHeight: 44 },
    borrowRow: { gap: spacing.xxs, marginTop: spacing.xxs },
    borrowHint: { color: colors.textMuted, ...typography.caption },
    srcSum: { ...typography.caption, fontWeight: '700', marginTop: spacing.xs },
    bar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: border.thin, borderTopColor: colors.border, backgroundColor: colors.surface },
    secondary: { minHeight: control.buttonHeight, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: colors.textSecondary, ...typography.callout, fontWeight: '800' },
    primary: { flex: 1, minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, ...elevation.raised },
    primaryText: { color: colors.onPrimary, ...typography.callout, fontWeight: '800' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../../../src/ui/AppText';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppConfirmDialog, useAppFeedback } from '../../../src/ui/AppFeedback';
import { useAppPreferences } from '../../../src/app/AppPreferences';
import { getAccountView, reverseTransaction, settleAccount, writeOffReceivable, type AccountView } from '../../../src/services/debt/debt-service';
import { listInstallments } from '../../../src/services/debt/repository';
import { formatPaisa } from '../../../src/services/debt/money';
import type { Installment } from '../../../src/services/debt/types';
import { debtCopy, purposeLabel } from '../../../src/i18n/debt';
import { bangladeshDateKey } from '../../../src/i18n/date-time';
import { AppIcon } from '../../../src/ui/AppIcon';
import { DebtAttachments } from '../../../src/ui/DebtAttachments';
import { success, warn } from '../../../src/ui/haptics';
import { border, control, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../../../src/theme';

type Confirmable = { kind: 'SETTLE' } | { kind: 'WRITE_OFF' } | { kind: 'REVERSE'; txnId: string } | null;

export default function AccountDetail() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const c = useMemo(() => debtCopy(language), [language]);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const money = (p: number) => formatPaisa(p, { bnDigits: bn });
  const { showSnackbar } = useAppFeedback();

  const [view, setView] = useState<AccountView | null>(null);
  const [insts, setInsts] = useState<Installment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirmable>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [v, i] = await Promise.all([getAccountView(db, id), listInstallments(db, id)]);
      setView(v); setInsts(i);
    } catch { setView(null); }
    finally { setLoaded(true); }
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!loaded) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!view) return (
    <View style={styles.center}>
      <AppIcon name="wallet-outline" size={icon.xl} color={colors.warning} />
      <Text style={styles.notFound}>{bn ? 'হিসাব পাওয়া যায়নি' : 'Account not found'}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/debt')} style={styles.secondary}><Text style={styles.secondaryText}>{c.back}</Text></Pressable>
    </View>
  );

  const { account: a, person, balance: b } = view;
  const tone = a.direction === 'DEBT' ? accents.red : accents.green;
  const isDebt = a.direction === 'DEBT';

  // Every state change goes through a confirm dialog: settling, writing off and
  // reversing all rewrite what the ledger reports, so none of them fire on a stray tap.
  const runConfirmed = async () => {
    const task = confirm;
    setConfirm(null);
    if (!task || !id || busy) return;
    const today = bangladeshDateKey(new Date());
    setBusy(true);
    try {
      if (task.kind === 'SETTLE') await settleAccount(db, id, view.balance.paidPaisa, today);
      else if (task.kind === 'WRITE_OFF') await writeOffReceivable(db, id, today);
      else await reverseTransaction(db, task.txnId, today);
      success();
      showSnackbar(bn ? 'হয়েছে' : 'Done', 'success');
      await load();
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'ব্যর্থ' : 'Failed'), 'danger');
    } finally { setBusy(false); }
  };

  const confirmCopy = (): { title: string; description: string } => {
    if (confirm?.kind === 'SETTLE') return { title: bn ? 'মিটমাট করবেন?' : 'Settle this debt?', description: bn ? `পরিশোধিত ${money(b.paidPaisa)} ধরে হিসাবটি বন্ধ হবে। বাকি অংশ মাফ ধরা হবে।` : `Closes the account at ${money(b.paidPaisa)} paid; the rest is treated as forgiven.` };
    if (confirm?.kind === 'WRITE_OFF') return { title: bn ? 'অবলোপন করবেন?' : 'Write this off?', description: bn ? `${money(b.remainingPaisa)} অনাদায়ী ধরা হবে।` : `${money(b.remainingPaisa)} will be marked uncollectable.` };
    return { title: bn ? 'লেনদেন বাতিল করবেন?' : 'Reverse this transaction?', description: bn ? 'হিসাব থেকে বাদ যাবে, তবে খতিয়ানে চিহ্ন থাকবে।' : 'It stops counting, but stays visible in the ledger.' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/debt'))} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
        <AppIcon name="arrow-left" size={icon.md} color={colors.primary} /><Text style={styles.backText}>{c.back}</Text>
      </Pressable>

      <View style={styles.headRow}>
        <View style={[styles.kindIcon, { backgroundColor: tone.soft }]}><AppIcon name={isDebt ? 'arrow-up-bold-circle-outline' : 'arrow-down-bold-circle-outline'} size={icon.lg} color={tone.on} /></View>
        <View style={styles.headCopy}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{a.title || person?.name || (isDebt ? c.totalDebt : c.totalReceivable)}</Text>
          <Text style={styles.person}>{(a.title ? person?.name : (isDebt ? c.totalDebt : c.totalReceivable)) ?? '—'}{a.purpose ? ` · ${purposeLabel(a.purpose, language)}` : ''}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.soft, borderColor: tone.border }]}><Text style={[styles.badgeText, { color: tone.on }]}>{c.status[b.status]}</Text></View>
      </View>

      <View style={styles.balCard}>
        <Text style={[styles.balMain, { color: tone.on }]}>{money(b.remainingPaisa)}</Text>
        <Text style={styles.balMainLabel}>{c.remaining}</Text>
        <View style={styles.balGrid}>
          <BalCell styles={styles} label={bn ? 'মূল' : 'Principal'} value={money(b.principalPaisa)} />
          <BalCell styles={styles} label={bn ? 'সুদ' : 'Interest'} value={money(b.accruedInterestPaisa)} />
          <BalCell styles={styles} label={bn ? 'মোট প্রদেয়' : 'Total payable'} value={money(b.totalPayablePaisa)} />
          <BalCell styles={styles} label={c.paid} value={money(b.paidPaisa)} />
          {b.advancePaisa ? <BalCell styles={styles} label={bn ? 'অগ্রিম' : 'Advance'} value={money(b.advancePaisa)} /> : null}
          {b.adjustmentPaisa ? <BalCell styles={styles} label={bn ? 'সমন্বয়' : 'Adjustment'} value={money(b.adjustmentPaisa)} /> : null}
        </View>
      </View>

      {b.status !== 'COMPLETED' && b.status !== 'SETTLED' && b.status !== 'WRITTEN_OFF' && b.status !== 'CANCELLED' ? (
        <View style={styles.actionsRow}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/debt/pay/${id}` as never)} style={({ pressed }) => StyleSheet.flatten([styles.primary, styles.grow, pressed && styles.pressed])}>
            <AppIcon name="cash-check" size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryText}>{isDebt ? c.makePayment : c.recordReceipt}</Text>
          </Pressable>
          {isDebt ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirm({ kind: 'SETTLE' })} style={({ pressed }) => StyleSheet.flatten([styles.ghost, busy && styles.disabled, pressed && styles.pressed])}>
              <AppIcon name="handshake-outline" size={icon.sm} color={colors.primary} /><Text style={styles.ghostText}>{c.status.SETTLED}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirm({ kind: 'WRITE_OFF' })} style={({ pressed }) => StyleSheet.flatten([styles.ghost, busy && styles.disabled, pressed && styles.pressed])}>
              <AppIcon name="cancel" size={icon.sm} color={colors.primary} /><Text style={styles.ghostText}>{c.status.WRITTEN_OFF}</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {insts.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{bn ? 'কিস্তি' : 'Installments'} · {b.installmentsPaidCount}/{b.installmentsTotalCount}</Text>
          {insts.map((it) => (
            <View key={it.id} style={styles.instRow}>
              <Text style={styles.instSeq}>{it.seq}</Text>
              <View style={styles.instBody}>
                <Text style={styles.instAmt}>{money(it.amountPaisa)}</Text>
                <Text style={styles.instDue}>{it.dueDate ?? '—'}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{c.ledger}</Text>
        {view.transactions.filter((t) => !t.reversed).length === 0 ? (
          <Text style={styles.empty}>{bn ? 'কোনো লেনদেন নেই' : 'No transactions'}</Text>
        ) : (
          [...view.transactions].reverse().map((t) => {
            const reversible = !t.reversed && t.kind !== 'REVERSAL';
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityHint={reversible ? (bn ? 'বাতিল করতে চেপে ধরুন' : 'Long-press to reverse') : undefined}
                onPress={() => router.push(`/debt/txn/${t.id}` as never)}
                onLongPress={reversible ? () => setConfirm({ kind: 'REVERSE', txnId: t.id }) : undefined}
                style={({ pressed }) => StyleSheet.flatten([styles.txnRow, t.reversed && styles.txnReversed, pressed && reversible && styles.pressed])}
              >
                <AppIcon name={txnIcon(t.kind)} size={icon.sm} color={colors.textMuted} />
                <View style={styles.txnBody}>
                  <Text style={styles.txnKind}>{txnLabel(t.kind, bn)}{t.reversed ? (bn ? ' (বাতিল)' : ' (reversed)') : ''}</Text>
                  <Text style={styles.txnDate}>{t.txnDate}{t.note ? ` · ${t.note}` : ''}</Text>
                </View>
                <Text style={styles.txnAmt}>{money(t.amountPaisa)}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      {id ? <DebtAttachments ownerType="ACCOUNT" ownerId={id} /> : null}

      <AppConfirmDialog
        visible={confirm !== null}
        title={confirmCopy().title}
        description={confirmCopy().description}
        confirmLabel={bn ? 'হ্যাঁ' : 'Yes'}
        cancelLabel={c.cancel}
        danger
        icon="alert"
        onConfirm={() => void runConfirmed()}
        onCancel={() => setConfirm(null)}
      />
    </ScrollView>
  );
}

function BalCell({ styles, label, value }: { styles: ReturnType<typeof makeStyles>; label: string; value: string }) {
  return (
    <View style={styles.balCell}>
      <Text style={styles.balCellLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.balCellVal}>{value}</Text>
    </View>
  );
}
function txnIcon(kind: string): 'cash-plus' | 'cash-minus' | 'swap-horizontal' | 'tune' | 'handshake-outline' | 'close-circle-outline' {
  if (kind === 'NEW_DEBT' || kind === 'NEW_RECEIVABLE') return 'cash-plus';
  if (kind === 'PAYMENT' || kind === 'RECEIPT') return 'cash-minus';
  if (kind === 'REVERSAL') return 'close-circle-outline';
  if (kind === 'SETTLEMENT') return 'handshake-outline';
  if (kind === 'ADJUSTMENT') return 'tune';
  return 'swap-horizontal';
}
function txnLabel(kind: string, bn: boolean): string {
  const map: Record<string, [string, string]> = {
    NEW_DEBT: ['ঋণ গ্রহণ', 'Debt taken'], NEW_RECEIVABLE: ['ঋণ প্রদান', 'Loan given'],
    PAYMENT: ['পরিশোধ', 'Payment'], RECEIPT: ['আদায়', 'Receipt'], ADJUSTMENT: ['সমন্বয়', 'Adjustment'],
    REVERSAL: ['বাতিল', 'Reversal'], SETTLEMENT: ['মিটমাট', 'Settlement'], WRITE_OFF: ['অবলোপন', 'Write-off'],
    INTEREST_ACCRUAL: ['সুদ', 'Interest'],
  };
  const e = map[kind];
  return e ? (bn ? e[0] : e[1]) : kind;
}

function makeStyles(colors: ThemeColors, _accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl + spacing.xl },
    center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    notFound: { color: colors.textPrimary, ...typography.cardTitle },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    kindIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    headCopy: { flex: 1, minWidth: 0 },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '700' },
    person: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    badge: { borderWidth: border.thin, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    badgeText: { ...typography.caption, fontWeight: '800' },
    balCard: { marginTop: spacing.md, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, ...elevation.soft },
    balMain: { ...typography.display, fontWeight: '800', fontFamily: typography.numeric.fontFamily },
    balMainLabel: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    balGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    balCell: { width: '47%', flexGrow: 1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: spacing.sm },
    balCellLabel: { color: colors.textMuted, ...typography.caption },
    balCellVal: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800', fontFamily: typography.numeric.fontFamily, marginTop: 2 },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    grow: { flex: 1 },
    primary: { minHeight: control.buttonHeight, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    primaryText: { color: colors.onPrimary, ...typography.callout, fontWeight: '800' },
    ghost: { minHeight: control.buttonHeight, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    ghostText: { color: colors.primary, ...typography.callout, fontWeight: '800' },
    section: { marginTop: spacing.lg },
    sectionTitle: { color: colors.textMuted, ...typography.section, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
    instRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.xs },
    instSeq: { width: 22, textAlign: 'center', color: colors.textMuted, ...typography.meta, fontWeight: '800' },
    instBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
    instAmt: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700', fontFamily: typography.numeric.fontFamily },
    instDue: { color: colors.textSecondary, ...typography.caption },
    txnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: border.thin, borderBottomColor: colors.border },
    txnReversed: { opacity: 0.5 },
    txnBody: { flex: 1, minWidth: 0 },
    txnKind: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '700' },
    txnDate: { color: colors.textMuted, ...typography.caption, marginTop: 1 },
    txnAmt: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800', fontFamily: typography.numeric.fontFamily },
    empty: { color: colors.textMuted, ...typography.bodySmall },
    secondary: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: colors.textSecondary, ...typography.body, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.78 },
  });
}

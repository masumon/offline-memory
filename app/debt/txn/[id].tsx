import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../../../src/ui/AppText';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppConfirmDialog, useAppFeedback } from '../../../src/ui/AppFeedback';
import { getTransactionDetail, reverseTransaction, type TransactionDetail } from '../../../src/services/debt/debt-service';
import { bangladeshDateKey } from '../../../src/i18n/date-time';
import { AppIcon } from '../../../src/ui/AppIcon';
import { Card, DebtHeader, EmptyNote, Stat, useDebt } from '../../../src/ui/DebtKit';
import { DebtAttachments } from '../../../src/ui/DebtAttachments';
import { success, warn } from '../../../src/ui/haptics';
import { icon, spacing } from '../../../src/theme';

const KIND_LABEL: Record<string, [string, string]> = {
  NEW_DEBT: ['ঋণ গ্রহণ', 'Debt taken'], NEW_RECEIVABLE: ['ঋণ প্রদান', 'Loan given'],
  PAYMENT: ['পরিশোধ', 'Payment'], RECEIPT: ['আদায়', 'Receipt'], ADJUSTMENT: ['সমন্বয়', 'Adjustment'],
  REVERSAL: ['বাতিল', 'Reversal'], SETTLEMENT: ['মিটমাট', 'Settlement'], WRITE_OFF: ['অবলোপন', 'Write-off'],
  INTEREST_ACCRUAL: ['সুদ', 'Interest'],
};

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { s, c, bn, colors, accents, money } = useDebt();
  const { showSnackbar } = useAppFeedback();

  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setReady(true); return; }
    try { setDetail(await getTransactionDetail(db, id)); }
    catch { setDetail(null); }
    finally { setReady(true); }
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const doReverse = async () => {
    setConfirmOpen(false);
    if (!id || busy) return;
    setBusy(true);
    try {
      await reverseTransaction(db, id, bangladeshDateKey(new Date()));
      success();
      showSnackbar(bn ? 'বাতিল হয়েছে' : 'Reversed', 'success');
      await load();
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'ব্যর্থ' : 'Failed'), 'danger');
    } finally { setBusy(false); }
  };

  if (!ready) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!detail) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <DebtHeader title={c.ledger} />
        <EmptyNote icon="book-remove-outline" text={bn ? 'লেনদেন পাওয়া যায়নি' : 'Transaction not found'} />
      </ScrollView>
    );
  }

  const { txn: t, account, person, allocations, installments, sources } = detail;
  const instById = new Map(installments.map((i) => [i.id, i]));
  const label = bn ? KIND_LABEL[t.kind]?.[0] ?? t.kind : KIND_LABEL[t.kind]?.[1] ?? t.kind;
  const tone = t.reversed ? accents.orange : t.kind === 'PAYMENT' || t.kind === 'RECEIPT' ? accents.green : accents.blue;
  const reversible = !t.reversed && t.kind !== 'REVERSAL';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <DebtHeader title={label} subtitle={`${t.txnDate}${person ? ` · ${person.name}` : ''}`} />

      <Card>
        <Text style={[s.big, { color: tone.on }]}>{money(t.amountPaisa)}</Text>
        <Text style={s.bigLabel}>{t.reversed ? (bn ? 'বাতিল করা হয়েছে' : 'Reversed — not counted') : label}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Stat label={c.date} value={t.txnDate} />
          {account ? <Stat label={bn ? 'হিসাব' : 'Account'} value={account.title || (account.direction === 'DEBT' ? c.totalDebt : c.totalReceivable)} /> : null}
          {t.method ? <Stat label={bn ? 'মাধ্যম' : 'Method'} value={t.method} /> : null}
          {t.reference ? <Stat label={bn ? 'রেফারেন্স' : 'Reference'} value={t.reference} /> : null}
          {t.note ? <Stat label={c.note} value={t.note} /> : null}
        </View>
        {account ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/debt/account/${account.id}` as never)}
            style={({ pressed }) => StyleSheet.flatten([s.ghost, { marginTop: spacing.md }, pressed && s.pressed])}
          >
            <AppIcon name="wallet-outline" size={icon.sm} color={colors.primary} />
            <Text style={s.ghostText}>{bn ? 'হিসাব দেখুন' : 'Open account'}</Text>
          </Pressable>
        ) : null}
      </Card>

      {allocations.length ? (
        <Card title={bn ? 'কোন কিস্তিতে গেল' : 'Applied to'}>
          {allocations.map((al) => {
            const inst = al.installmentId ? instById.get(al.installmentId) : null;
            return (
              <Stat
                key={al.id}
                label={inst ? `${bn ? 'কিস্তি' : 'Instalment'} #${inst.seq}${inst.dueDate ? ` · ${inst.dueDate}` : ''}` : (al.role === 'ADVANCE' ? (bn ? 'অগ্রিম' : 'Advance') : al.role)}
                value={money(al.amountPaisa)}
              />
            );
          })}
        </Card>
      ) : null}

      {sources.length ? (
        <Card title={c.breakdownSource}>
          {sources.map((src) => (
            <Stat
              key={src.id}
              label={src.sourceKey}
              value={money(src.amountPaisa)}
              hint={src.sourceKey === 'BORROWED' ? c.realReductionHint : undefined}
              tone={src.sourceKey === 'BORROWED' ? accents.orange : undefined}
            />
          ))}
        </Card>
      ) : null}

      {id ? <DebtAttachments ownerType="TRANSACTION" ownerId={id} /> : null}

      {reversible ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => setConfirmOpen(true)}
          style={({ pressed }) => StyleSheet.flatten([s.ghost, busy && s.disabled, pressed && s.pressed])}
        >
          <AppIcon name="close-circle-outline" size={icon.sm} color={colors.primary} />
          <Text style={s.ghostText}>{bn ? 'লেনদেন বাতিল' : 'Reverse transaction'}</Text>
        </Pressable>
      ) : null}

      <AppConfirmDialog
        visible={confirmOpen}
        title={bn ? 'লেনদেন বাতিল করবেন?' : 'Reverse this transaction?'}
        description={bn ? 'হিসাব থেকে বাদ যাবে, তবে খতিয়ানে চিহ্ন থাকবে।' : 'It stops counting, but stays visible in the ledger.'}
        confirmLabel={bn ? 'হ্যাঁ' : 'Yes'}
        cancelLabel={c.cancel}
        danger
        icon="alert"
        onConfirm={() => void doReverse()}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScrollView>
  );
}

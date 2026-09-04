import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../../src/ui/AppText';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppConfirmDialog, useAppFeedback } from '../../src/ui/AppFeedback';
import { reverseTransaction } from '../../src/services/debt/debt-service';
import { listAccounts, listLedger, listPeople } from '../../src/services/debt/repository';
import type { Account, Person, Transaction, TxnKind } from '../../src/services/debt/types';
import { bangladeshDateKey } from '../../src/i18n/date-time';
import { AppIcon, type IconName } from '../../src/ui/AppIcon';
import { Card, Chip, DebtHeader, EmptyNote, useDebt } from '../../src/ui/DebtKit';
import { success, warn } from '../../src/ui/haptics';
import { icon, spacing } from '../../src/theme';

type Filter = 'ALL' | 'PAYMENT' | 'RECEIPT' | 'NEW' | 'OTHER';
const FILTERS: Filter[] = ['ALL', 'PAYMENT', 'RECEIPT', 'NEW', 'OTHER'];

const KIND_ICON: Record<string, IconName> = {
  NEW_DEBT: 'cash-plus', NEW_RECEIVABLE: 'cash-plus', PAYMENT: 'cash-minus', RECEIPT: 'cash-minus',
  ADJUSTMENT: 'tune', REVERSAL: 'close-circle-outline', SETTLEMENT: 'handshake-outline',
  WRITE_OFF: 'cancel', INTEREST_ACCRUAL: 'percent-outline',
};
const KIND_LABEL: Record<string, [string, string]> = {
  NEW_DEBT: ['ঋণ গ্রহণ', 'Debt taken'], NEW_RECEIVABLE: ['ঋণ প্রদান', 'Loan given'],
  PAYMENT: ['পরিশোধ', 'Payment'], RECEIPT: ['আদায়', 'Receipt'], ADJUSTMENT: ['সমন্বয়', 'Adjustment'],
  REVERSAL: ['বাতিল', 'Reversal'], SETTLEMENT: ['মিটমাট', 'Settlement'], WRITE_OFF: ['অবলোপন', 'Write-off'],
  INTEREST_ACCRUAL: ['সুদ', 'Interest'],
};

function matches(kind: TxnKind, f: Filter): boolean {
  if (f === 'ALL') return true;
  if (f === 'NEW') return kind === 'NEW_DEBT' || kind === 'NEW_RECEIVABLE';
  if (f === 'PAYMENT') return kind === 'PAYMENT' || kind === 'SETTLEMENT';
  if (f === 'RECEIPT') return kind === 'RECEIPT';
  return kind === 'ADJUSTMENT' || kind === 'REVERSAL' || kind === 'WRITE_OFF' || kind === 'INTEREST_ACCRUAL';
}

export default function DebtLedger() {
  const db = useSQLiteContext();
  const { s, c, bn, colors, accents, money } = useDebt();
  const { showSnackbar } = useAppFeedback();

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [ready, setReady] = useState(false);
  const [pendingReverse, setPendingReverse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, a, p] = await Promise.all([listLedger(db, { limit: 300 }), listAccounts(db, {}), listPeople(db)]);
      setTxns(t); setAccounts(a); setPeople(p);
    } catch { setTxns([]); }
    finally { setReady(true); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const accById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const rows = useMemo(() => txns.filter((t) => matches(t.kind, filter)), [txns, filter]);

  const doReverse = async () => {
    const txnId = pendingReverse;
    setPendingReverse(null);
    if (!txnId || busy) return;
    setBusy(true);
    try {
      await reverseTransaction(db, txnId, bangladeshDateKey(new Date()));
      success();
      showSnackbar(bn ? 'বাতিল হয়েছে' : 'Reversed', 'success');
      await load();
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'ব্যর্থ' : 'Failed'), 'danger');
    } finally { setBusy(false); }
  };

  const filterLabel = (f: Filter): string => {
    if (f === 'ALL') return c.all;
    if (f === 'NEW') return bn ? 'নতুন' : 'New';
    if (f === 'OTHER') return bn ? 'অন্যান্য' : 'Other';
    return bn ? KIND_LABEL[f]![0]! : KIND_LABEL[f]![1]!;
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <DebtHeader title={c.ledger} subtitle={bn ? 'সব লেনদেন — বাতিল করতে চেপে ধরুন।' : 'Every transaction — long-press to reverse.'} />

      <View style={[s.chipRow, { marginBottom: spacing.md }]}>
        {FILTERS.map((f) => <Chip key={f} label={filterLabel(f)} active={filter === f} onPress={() => setFilter(f)} />)}
      </View>

      {!ready ? (
        <ActivityIndicator color={colors.primary} />
      ) : rows.length === 0 ? (
        <EmptyNote icon="book-open-outline" text={bn ? 'কোনো লেনদেন নেই' : 'No transactions yet'} />
      ) : (
        <Card>
          {rows.map((t) => {
            const a = accById.get(t.accountId);
            const person = personById.get(t.personId);
            const reversible = !t.reversed && t.kind !== 'REVERSAL';
            const tone = t.kind === 'PAYMENT' || t.kind === 'SETTLEMENT' ? accents.green
              : t.kind === 'RECEIPT' ? accents.blue
                : t.kind === 'NEW_DEBT' ? accents.red : accents.orange;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityHint={reversible ? (bn ? 'বাতিল করতে চেপে ধরুন' : 'Long-press to reverse') : undefined}
                onPress={() => router.push(`/debt/txn/${t.id}` as never)}
                onLongPress={reversible ? () => setPendingReverse(t.id) : undefined}
                style={({ pressed }) => StyleSheet.flatten([s.listRow, t.reversed && s.disabled, pressed && s.pressed])}
              >
                <AppIcon name={KIND_ICON[t.kind] ?? 'swap-horizontal'} size={icon.sm} color={tone.on} />
                <View style={s.grow}>
                  <Text numberOfLines={1} style={s.listTitle}>
                    {bn ? KIND_LABEL[t.kind]?.[0] ?? t.kind : KIND_LABEL[t.kind]?.[1] ?? t.kind}
                    {t.reversed ? (bn ? ' (বাতিল)' : ' (reversed)') : ''}
                  </Text>
                  <Text numberOfLines={1} style={s.listMeta}>
                    {t.txnDate} · {person?.name ?? a?.title ?? '—'}{t.note ? ` · ${t.note}` : ''}
                  </Text>
                </View>
                <Text style={s.listAmt}>{money(t.amountPaisa)}</Text>
              </Pressable>
            );
          })}
        </Card>
      )}

      <AppConfirmDialog
        visible={pendingReverse !== null}
        title={bn ? 'লেনদেন বাতিল করবেন?' : 'Reverse this transaction?'}
        description={bn ? 'হিসাব থেকে বাদ যাবে, তবে খতিয়ানে চিহ্ন থাকবে।' : 'It stops counting, but stays visible in the ledger.'}
        confirmLabel={bn ? 'হ্যাঁ' : 'Yes'}
        cancelLabel={c.cancel}
        danger
        icon="alert"
        onConfirm={() => void doReverse()}
        onCancel={() => setPendingReverse(null)}
      />
    </ScrollView>
  );
}

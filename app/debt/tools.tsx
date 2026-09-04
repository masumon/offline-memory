import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../../src/ui/AppText';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppFeedback } from '../../src/ui/AppFeedback';
import { getDebtConsolidation, type DebtConsolidation } from '../../src/services/debt/statements';
import { getSetting, setSetting } from '../../src/services/debt/repository';
import { shareDebtExport, type DebtExportKind } from '../../src/services/debt/port';
import { syncDebtReminders } from '../../src/services/debt/reminders';
import { parseTakaToPaisa } from '../../src/services/debt/money';
import { AppIcon, type IconName } from '../../src/ui/AppIcon';
import { Card, DebtHeader, Stat, useDebt } from '../../src/ui/DebtKit';
import { success, warn } from '../../src/ui/haptics';
import { icon, spacing } from '../../src/theme';

const EXPORTS: { kind: DebtExportKind; icon: IconName; bn: string; en: string }[] = [
  { kind: 'accounts', icon: 'wallet-outline', bn: 'হিসাবসমূহ', en: 'Accounts' },
  { kind: 'ledger', icon: 'book-open-outline', bn: 'খতিয়ান', en: 'Ledger' },
  { kind: 'people', icon: 'account-multiple-outline', bn: 'ব্যক্তিবর্গ', en: 'People' },
];

export default function DebtTools() {
  const db = useSQLiteContext();
  const { s, c, bn, colors, accents, money } = useDebt();
  const { showSnackbar } = useAppFeedback();

  const [reminders, setReminders] = useState(true);
  const [startingText, setStartingText] = useState('');
  const [consolidation, setConsolidation] = useState<DebtConsolidation | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rem, starting, cons] = await Promise.all([
        getSetting(db, 'remindersEnabled'),
        getSetting(db, 'startingDebtPaisa'),
        getDebtConsolidation(db),
      ]);
      setReminders(rem !== '0');
      if (starting) setStartingText(String(Math.round(Number(starting) / 100)));
      setConsolidation(cons);
    } catch { setConsolidation(null); }
    finally { setReady(true); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Flipping the switch re-runs the reconciler, so turning reminders off cancels the
  // already-scheduled notifications instead of leaving orphans behind.
  const toggleReminders = async (next: boolean) => {
    setReminders(next);
    try {
      await setSetting(db, 'remindersEnabled', next ? '1' : '0');
      const count = await syncDebtReminders(db, new Date(), bn ? 'bn' : 'en');
      success();
      showSnackbar(next ? (bn ? `${count}টি রিমাইন্ডার সেট` : `${count} reminders set`) : (bn ? 'রিমাইন্ডার বন্ধ' : 'Reminders off'), 'success');
    } catch { warn(); }
  };

  const saveStarting = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let paisa = 0;
      try { paisa = parseTakaToPaisa(startingText); } catch { paisa = 0; }
      await setSetting(db, 'startingDebtPaisa', String(paisa));
      success();
      showSnackbar(bn ? 'সংরক্ষিত' : 'Saved', 'success');
    } catch { warn(); }
    finally { setBusy(false); }
  };

  const doExport = async (kind: DebtExportKind) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await shareDebtExport(db, kind);
      if (result === 'unavailable') showSnackbar(bn ? 'শেয়ার করা যাচ্ছে না' : 'Sharing unavailable', 'danger');
      else success();
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'ব্যর্থ' : 'Failed'), 'danger');
    } finally { setBusy(false); }
  };

  if (!ready) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <DebtHeader title={c.tools} subtitle={bn ? 'সেটিংস, রপ্তানি ও সারসংক্ষেপ' : 'Settings, export and summary'} />

      <Card title={c.remindersOn}>
        <View style={s.row}>
          <View style={s.grow}>
            <Text style={s.listTitle}>{c.remindersOn}</Text>
            <Text style={s.listMeta}>{c.remindersHint}</Text>
          </View>
          <Switch
            value={reminders}
            onValueChange={(v) => void toggleReminders(v)}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel={c.remindersOn}
          />
        </View>
      </Card>

      <Card title={bn ? 'শুরুর দেনা' : 'Starting debt'}>
        <Text style={s.listMeta}>{bn ? 'কত দেনা নিয়ে শুরু করেছিলেন — হ্রাসের শতাংশ এখান থেকে হিসাব হয়।' : 'Where you started from — the reduction % is measured against this.'}</Text>
        <TextInput
          style={[s.input, { marginTop: spacing.sm }]}
          value={startingText}
          onChangeText={setStartingText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={bn ? 'শুরুর দেনা' : 'Starting debt'}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void saveStarting()}
          style={({ pressed }) => StyleSheet.flatten([s.primary, { marginTop: spacing.sm }, busy && s.disabled, pressed && s.pressed])}
        >
          <AppIcon name="content-save-outline" size={icon.sm} color={colors.onPrimary} />
          <Text style={s.primaryText}>{c.save}</Text>
        </Pressable>
      </Card>

      {consolidation && consolidation.count > 0 ? (
        <Card title={bn ? 'দেনার সারসংক্ষেপ' : 'Debt summary'}>
          <Stat label={c.activeDebts} value={String(consolidation.count)} />
          <Stat label={c.outstandingDebt} value={money(consolidation.totalRemainingPaisa)} tone={accents.red} />
          <Stat label={bn ? 'গড়' : 'Average'} value={money(consolidation.averagePaisa)} />
          <Stat label={bn ? 'সবচেয়ে বড়' : 'Largest'} value={money(consolidation.largestPaisa)} />
          <Stat label={bn ? 'সবচেয়ে ছোট' : 'Smallest'} value={money(consolidation.smallestPaisa)} />
          <Stat label={bn ? 'এ মাসের কিস্তি' : 'This month due'} value={money(consolidation.monthlyObligationPaisa)} tone={accents.orange} />
          <Stat label={bn ? 'নিকটতম তারিখ' : 'Earliest due'} value={consolidation.earliestDueDate ?? '—'} />
        </Card>
      ) : null}

      <Card title={c.exportCsv}>
        <Text style={s.listMeta}>{bn ? 'ফাইলটি আপনার ডিভাইসেই তৈরি হয় — কোথাও পাঠানো হয় না।' : 'The file is built on your device — nothing is uploaded.'}</Text>
        <View style={[s.chipRow, { marginTop: spacing.sm }]}>
          {EXPORTS.map((e) => (
            <Pressable
              key={e.kind}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void doExport(e.kind)}
              style={({ pressed }) => StyleSheet.flatten([s.ghost, busy && s.disabled, pressed && s.pressed])}
            >
              <AppIcon name={e.icon} size={icon.sm} color={colors.primary} />
              <Text style={s.ghostText}>{bn ? e.bn : e.en}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title={c.importExcel}>
        <Text style={s.listMeta}>{c.pickFileHint}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/debt/import' as never)}
          style={({ pressed }) => StyleSheet.flatten([s.primary, { marginTop: spacing.sm }, pressed && s.pressed])}
        >
          <AppIcon name="file-excel-outline" size={icon.sm} color={colors.onPrimary} />
          <Text style={s.primaryText}>{c.importExcel}</Text>
        </Pressable>
      </Card>

    </ScrollView>
  );
}

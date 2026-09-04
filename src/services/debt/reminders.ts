// Offline local reminders for debt/receivable due dates (spec §41, §42, §40).
// Own notification channel; identifiers are deterministic (`dr:<accountId>:<dueDate>:<lead>`)
// so re-running the sync just reconciles — it never stacks duplicates.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { requestNotificationPermission } from '../notification.service';
import { getPortfolio } from './debt-service';
import { getSetting, listPromises, getPerson } from './repository';
import { formatPaisa } from './money';

export const DEBT_CHANNEL_ID = 'debt-reminders';
const BRAND = '#C13B2E';
const LEAD_DAYS = [7, 3, 1, 0]; // days before due
const ID_PREFIX = 'dr:';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(DEBT_CHANNEL_ID, {
      name: 'Debt reminders · দেনা-পাওনা রিমাইন্ডার',
      description: 'Due-date and overdue reminders for personal debts and receivables.',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      showBadge: true,
    });
  } catch { /* best-effort */ }
}

function dateKey(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function fireAt(dueDateIso: string, leadDays: number, hour = 9): Date {
  const d = new Date(`${dateKey(dueDateIso)}T00:00:00`);
  d.setDate(d.getDate() - leadDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Reconcile scheduled debt reminders with the current portfolio. Cancels ours that no
 * longer apply, then schedules 7/3/1/0-day reminders for every live upcoming due slice
 * plus follow-up reminders for open promises. No-op without notification permission or
 * when the user has turned debt reminders off.
 */
export async function syncDebtReminders(db: SQLiteDatabase, now = new Date(), language: 'bn' | 'en' = 'bn'): Promise<number> {
  const bn = language === 'bn';
  try {
    if ((await getSetting(db, 'remindersEnabled')) === '0') {
      await cancelAll();
      return 0;
    }
    const wanted = new Map<string, { date: Date; title: string; body: string; data: Record<string, unknown> }>();

    const { balances, accounts } = await getPortfolio(db, { asOf: now.toISOString() });
    const accById = new Map(accounts.map((a) => [a.id, a]));
    for (const b of balances) {
      if (!b.nextDueDate || b.nextDuePaisa <= 0) continue;
      if (['COMPLETED', 'SETTLED', 'WRITTEN_OFF', 'CANCELLED'].includes(b.status)) continue;
      const acc = accById.get(b.accountId);
      const isDebt = b.direction === 'DEBT';
      for (const lead of LEAD_DAYS) {
        const at = fireAt(b.nextDueDate, lead);
        if (at.getTime() <= now.getTime()) continue;
        const id = `${ID_PREFIX}${b.accountId}:${dateKey(b.nextDueDate)}:${lead}`;
        const when = bn ? (lead === 0 ? 'আজ' : `${lead} দিনে`) : (lead === 0 ? 'today' : `in ${lead} days`);
        wanted.set(id, {
          date: at,
          title: bn
            ? `${isDebt ? 'দেনা পরিশোধ' : 'পাওনা আদায়'} ${when}`
            : `${isDebt ? 'Payment due' : 'Collection due'} ${when}`,
          body: `${acc?.title ?? (bn ? (isDebt ? 'দেনা' : 'পাওনা') : (isDebt ? 'Debt' : 'Receivable'))} · ${formatPaisa(b.nextDuePaisa, { bnDigits: bn })}`,
          data: { drAccountId: b.accountId, route: `/debt/account/${b.accountId}` },
        });
      }
    }

    // Promise follow-ups
    for (const p of await listPromises(db)) {
      if (p.status !== 'OPEN') continue;
      const when = p.followUpDate ?? p.promisedDate;
      const at = fireAt(when, 0);
      if (at.getTime() <= now.getTime()) continue;
      const person = await getPerson(db, (await getPromiseAccount(db, p.accountId)) ?? '');
      const id = `${ID_PREFIX}promise:${p.id}`;
      wanted.set(id, {
        date: at,
        title: bn ? 'প্রতিশ্রুত টাকা' : 'Promised payment',
        body: `${person?.name ?? ''} · ${formatPaisa(p.amountPaisa, { bnDigits: bn })}`,
        data: { route: `/debt/account/${p.accountId}` },
      });
    }

    // Reconcile: cancel ours that aren't wanted, schedule the rest.
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const existingIds = new Set<string>();
    for (const n of existing) {
      const nid = n.identifier;
      if (!nid.startsWith(ID_PREFIX)) continue;
      existingIds.add(nid);
      if (!wanted.has(nid)) {
        try { await Notifications.cancelScheduledNotificationAsync(nid); } catch { /* ignore */ }
      }
    }
    // Only now ask for permission — a fresh install with no debts must never be prompted
    // for a module the user has not opened yet.
    const toSchedule = [...wanted].filter(([id]) => !existingIds.has(id));
    if (toSchedule.length === 0) return 0;
    if (!(await requestNotificationPermission())) return 0;
    await ensureChannel();

    let scheduled = 0;
    for (const [id, w] of toSchedule) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: { title: w.title, body: w.body, data: w.data, color: BRAND, priority: Notifications.AndroidNotificationPriority.HIGH },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: w.date,
            ...(Platform.OS === 'android' ? { channelId: DEBT_CHANNEL_ID } : {}),
          },
        });
        scheduled += 1;
      } catch { /* ignore one */ }
    }
    return scheduled;
  } catch {
    return 0;
  }
}

async function getPromiseAccount(db: SQLiteDatabase, accountId: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ person_id: string }>('SELECT person_id FROM dr_accounts WHERE id = ?', accountId);
  return r?.person_id ?? null;
}

async function cancelAll(): Promise<void> {
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.identifier.startsWith(ID_PREFIX)) {
        try { await Notifications.cancelScheduledNotificationAsync(n.identifier); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}
